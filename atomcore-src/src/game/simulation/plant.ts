import type { GameState, Site, SiteStats, Modifiers, Building } from '../types';
import { BUILDINGS, levelMult, upkeepAt, staffAt, isReactor } from '../buildings/defs';
import {
  BASE_GRID_TIE_MW, BASE_STAFF_CAP, BASE_FUEL_CAP, HOURS_PER_SECOND, SALARY_PER_STAFF, SURPLUS_PRICE_FACTOR,
  BASE_PRICE, DAY_LENGTH, BASE_CONTRACT_SLOTS,
} from '../constants';
import { getMods, companyMods } from './modifiers';
import { stepReactorPower, stepReactorTemp, exp1, reactorMaxThermal, canRestart, restart, scram } from './reactor';
import { LOCATION_BY_ID } from '../progression/locations';
import { demandForLevel } from '../progression/levels';
import { eventEffect, notify, pushLog } from '../events/events';
import { random } from '../rng';

export function emptyStats(): SiteStats {
  return {
    thermalMW: 0, steamCapMW: 0, steamUsedMW: 0, electricMW: 0, exportMW: 0, gridCapMW: 0, coolingCapMW: 0,
    heatRejectMW: 0, coolingRatio: 1, demandMW: 0, soldMW: 0, surplusMW: 0, curtailedMW: 0, storageMWh: 0,
    storageCapMWh: 0, storageFlowMW: 0, staffNeeded: 0, staffCap: 0, staffFactor: 1, efficiency: 0,
    researchRate: 0, upkeep: 0, salaries: 0, revenue: 0, price: BASE_PRICE, reactorsOnline: 0, reactorsTotal: 0,
    maxTempFrac: 0,
  };
}

// ── Market cycle ──────────────────────────────────────────────────────────

export function dayPhase(gameTime: number): number {
  return (gameTime % DAY_LENGTH) / DAY_LENGTH;
}

/** Demand factor over the day: low at night, morning ramp, evening peak. */
export function dailyDemand(gameTime: number): number {
  const p = dayPhase(gameTime);
  const base = 0.84 + 0.12 * Math.sin(2 * Math.PI * (p - 0.3));
  const evening = 0.13 * Math.exp(-Math.pow(p - 0.78, 2) / 0.004);
  return base + evening;
}

export function dailyPrice(gameTime: number): number {
  return 0.7 + (dailyDemand(gameTime) - 0.7) * 1.35;
}

export function regionalDemand(s: GameState, siteId: string, mods: Modifiers): number {
  const loc = LOCATION_BY_ID[siteId];
  return demandForLevel(s.level) * loc.demandMult * dailyDemand(s.gameTime) * eventEffect(s, siteId, 'demand') * mods.demand;
}

export function sitePrice(s: GameState, siteId: string, mods: Modifiers): number {
  return BASE_PRICE * mods.price * s.market.priceMult * dailyPrice(s.gameTime) * eventEffect(s, siteId, 'price');
}

// ── Capacity helpers ──────────────────────────────────────────────────────

export function isOperating(b: Building): boolean {
  return b.status === 'active' && b.enabled;
}

function stat(b: Building, key: keyof (typeof BUILDINGS)['turbine']['stats']): number {
  const def = BUILDINGS[b.type];
  const v = def.stats[key];
  if (!v) return 0;
  return v * levelMult(def, b.level);
}

export function siteCapacities(s: GameState, site: Site, mods: Modifiers) {
  let steam = 0, cooling = 0, grid = BASE_GRID_TIE_MW, storage = 0, rate = 0, staffCap = BASE_STAFF_CAP + mods.staffCap;
  let crews = 0, safety = 0, contractSlots = 0;
  for (const b of site.buildings) {
    if (b.status === 'constructing') continue;
    const def = BUILDINGS[b.type];
    const working = isOperating(b);
    // Staff capacity and contract slots come from admin offices even while they upgrade.
    if (def.stats.staffCap && b.status !== 'broken') staffCap += stat(b, 'staffCap');
    if (def.stats.contractSlots && b.status !== 'broken') contractSlots += def.stats.contractSlots;
    if (!working) continue;
    const cf = b.condition >= 60 ? 1 : 0.55 + 0.45 * (b.condition / 60);
    steam += stat(b, 'steamMW') * cf;
    cooling += stat(b, 'coolingMW') * cf;
    grid += stat(b, 'gridMW');
    storage += stat(b, 'storageMWh');
    rate += stat(b, 'storageRateMW');
    crews += stat(b, 'maintenance');
    safety += stat(b, 'safety');
  }
  steam *= mods.steamCap;
  cooling *= mods.cooling * eventEffect(s, site.id, 'cooling');
  grid *= mods.grid * eventEffect(s, site.id, 'grid');
  storage *= mods.storage;
  rate *= mods.storage;
  return { steam, cooling, grid, storage, rate, staffCap, crews, safety, contractSlots };
}

export function fuelCapacity(s: GameState): number {
  let cap = BASE_FUEL_CAP;
  for (const site of Object.values(s.sites))
    for (const b of site.buildings) if (b.type === 'fuel_depot' && b.status !== 'constructing') cap += stat(b, 'fuelCap');
  return cap;
}

export function contractSlots(s: GameState): number {
  const m = companyMods(s);
  let n = BASE_CONTRACT_SLOTS + m.contractSlots;
  for (const site of Object.values(s.sites))
    for (const b of site.buildings) if (b.type === 'admin' && b.status !== 'constructing' && b.status !== 'broken') n += 1;
  return Math.min(n, 8);
}

/** Safety rating 0..100 for a site: research, backup generators and equipment condition. */
export function safetyRating(s: GameState, siteId: string, mods: Modifiers): number {
  const site = s.sites[siteId];
  if (!site) return 0;
  let gens = 0;
  let condSum = 0;
  let n = 0;
  for (const b of site.buildings) {
    if (b.status === 'constructing') continue;
    if (b.type === 'generator_emergency' && b.status === 'active') gens += stat(b, 'safety');
    condSum += b.condition;
    n++;
  }
  const avgCond = n ? condSum / n : 100;
  const crews = site.buildings.some((b) => b.type === 'maintenance' && b.status === 'active') ? 8 : 0;
  return Math.max(0, Math.min(100, 30 + mods.safety + Math.min(30, gens) + crews + (avgCond - 50) * 0.4));
}

export function repairCost(b: Building): number {
  const def = BUILDINGS[b.type];
  const missing = (100 - b.condition) / 100;
  return Math.round(def.cost * Math.sqrt(levelMult(def, b.level)) * (0.04 + 0.16 * missing) * (b.status === 'broken' ? 1.3 : 1));
}

// ── Main plant step ───────────────────────────────────────────────────────

interface SitePass {
  site: Site;
  mods: Modifiers;
  exportAvail: number;
  demand: number;
  price: number;
  sold: number;
  surplus: number;
  storageCap: number;
  storageRate: number;
  peak: boolean;
  offPeak: boolean;
}

export function tickPlants(s: GameState, dt: number, offline: boolean): void {
  const fuelCap = fuelCapacity(s);
  let fuelNeeded = 0;
  const passes: SitePass[] = [];
  const priceCycle = dailyPrice(s.gameTime);
  const contractMW = s.contracts.reduce((a, c) => a + c.mw, 0);
  let totalCapacityForShare = 0;
  for (const id of s.unlockedSites) totalCapacityForShare += Math.max(1, s.sites[id].stats.electricMW);

  for (const siteId of s.unlockedSites) {
    const site = s.sites[siteId];
    const loc = LOCATION_BY_ID[siteId];
    const mods = getMods(s, siteId);
    const st = site.stats;
    const cap = siteCapacities(s, site, mods);
    const ambient = loc.ambient;

    // Staffing
    let staffNeeded = 0;
    for (const b of site.buildings) if (b.status !== 'constructing') staffNeeded += staffAt(BUILDINGS[b.type], b.level);
    const staffFactor = staffNeeded <= cap.staffCap ? 1 : Math.pow(cap.staffCap / staffNeeded, 0.8);

    const demand = regionalDemand(s, siteId, mods);
    const price = sitePrice(s, siteId, mods);

    // Load following (production optimisation automation)
    const reactors = site.buildings.filter((b) => b.reactor && b.status !== 'constructing');
    if (s.automation.loadFollow && reactors.length) {
      applyLoadFollow(s, site, reactors, mods, cap, demand, contractMW * (Math.max(1, st.electricMW) / totalCapacityForShare), dt);
    }

    // Reactor power
    const inp = { dt, mods, fuelAvailable: s.fuel > 0.01, gameTime: s.gameTime, ambient };
    let thermal = 0;
    let effWeighted = 0;
    let researchFromReactors = 0;
    for (const b of reactors) {
      stepReactorPower(b, inp);
      thermal += b.reactor!.thermal;
      const spec = BUILDINGS[b.type].reactor!;
      effWeighted += b.reactor!.thermal * (spec.efficiency + mods.thermalEff);
      if (spec.research) researchFromReactors += spec.research * b.reactor!.power * levelMult(BUILDINGS[b.type], b.level);
      fuelNeeded += (b.reactor!.fission * HOURS_PER_SECOND * dt / 10) * spec.fuelUse * mods.fuelUse;
    }
    const efficiency = thermal > 0 ? effWeighted / thermal : 0;
    const steamUsed = Math.min(thermal, cap.steam);
    const electric = steamUsed * efficiency * staffFactor;
    const heatReject = Math.max(0, thermal - electric);
    const coolingRatio = heatReject > 0.01 ? cap.cooling / heatReject : 10;

    let maxTempFrac = 0;
    let online = 0;
    for (const b of reactors) {
      const tripped = stepReactorTemp(b, inp, coolingRatio);
      const r = b.reactor!;
      if (tripped) {
        s.stats.scrams++;
        pushLog(s, 'bad', `SCRAM: ${BUILDINGS[b.type].short} at ${loc.name} tripped on high temperature.`);
        if (!offline) notify(s, { kind: 'scram', title: 'Reactor SCRAM', text: `${BUILDINGS[b.type].short} at ${loc.name} shut down automatically: cooling could not keep up.` });
      }
      if (r.scrammed && (s.automation.autoRestart || offline) && canRestart(b, mods, s.gameTime, ambient)) {
        restart(b);
        s.stats.restarts++;
        pushLog(s, 'info', `Monitoring system restarted ${BUILDINGS[b.type].short} at ${loc.name}.`);
      }
      // Badly degraded reactors may trip on their own.
      if (!offline && !r.scrammed && b.condition < 15 && r.power > 0.1 && random() < 0.01 * dt) {
        scram(r, 'Equipment degradation', s.gameTime);
        s.stats.scrams++;
        pushLog(s, 'bad', `SCRAM: ${BUILDINGS[b.type].short} at ${loc.name} tripped due to worn equipment.`);
        notify(s, { kind: 'scram', title: 'Reactor SCRAM', text: `${BUILDINGS[b.type].short} tripped due to worn equipment. Repair it soon.` });
      }
      const frac = (r.temp - ambient) / Math.max(1, (BUILDINGS[b.type].reactor!.nominalTemp - ambient) * (1.18 + mods.tripMargin));
      if (frac > maxTempFrac) maxTempFrac = frac;
      if (!r.scrammed && r.power > 0.02 && b.status === 'active') online++;
    }

    const net = electric * (1 - mods.transmissionLoss);
    const exportAvail = Math.min(net, cap.grid);
    const curtailed = net - exportAvail;
    passes.push({
      site, mods, exportAvail, demand, price, sold: 0, surplus: 0, storageCap: cap.storage, storageRate: cap.rate,
      peak: priceCycle > 1.02, offPeak: priceCycle < 0.86,
    });

    // Research
    const labs = site.buildings.reduce((a, b) => a + (isOperating(b) ? stat(b, 'research') : 0), 0);
    const researchRate = (labs * staffFactor + researchFromReactors) * mods.research;

    // Wear, maintenance crews, failures
    stepWear(s, site, mods, cap.crews, dt, offline);

    // Upkeep & salaries
    let upkeep = 0;
    for (const b of site.buildings) {
      if (b.status === 'constructing') continue;
      upkeep += upkeepAt(BUILDINGS[b.type], b.level) * (b.enabled ? 1 : 0.5);
    }
    upkeep *= mods.upkeep;
    const salaries = Math.min(staffNeeded, cap.staffCap) * SALARY_PER_STAFF * mods.salary;

    Object.assign(st, {
      thermalMW: thermal, steamCapMW: cap.steam, steamUsedMW: steamUsed, electricMW: electric, exportMW: exportAvail,
      gridCapMW: cap.grid, coolingCapMW: cap.cooling, heatRejectMW: heatReject, coolingRatio, demandMW: demand,
      curtailedMW: curtailed, storageCapMWh: cap.storage, staffNeeded, staffCap: cap.staffCap, staffFactor, efficiency,
      researchRate, upkeep, salaries, price, reactorsOnline: online, reactorsTotal: reactors.length, maxTempFrac,
      storageFlowMW: 0,
    } satisfies Partial<SiteStats>);
  }

  // ── Fuel consumption (company-wide stock) ─────────────────────────────
  s.fuel = Math.max(0, Math.min(fuelCap, s.fuel - fuelNeeded));

  // ── Contracts have priority: supplied from pooled export across sites ──
  const totalExportAvail = passes.reduce((a, p) => a + p.exportAvail, 0);
  let pool = totalExportAvail;
  let contractRevenue = 0;
  let contractMWDelivered = 0;
  const dtHc = HOURS_PER_SECOND * dt;
  for (const c of s.contracts) {
    let take = Math.min(c.mw, pool);
    pool -= take;
    // Batteries help fill contract shortfalls.
    for (const p of passes) {
      const need = c.mw - take;
      if (need <= 1e-6) break;
      const used = -p.site.stats.storageFlowMW;
      const fromBattery = Math.min(need, p.storageRate - used, p.site.storageMWh / dtHc);
      if (fromBattery > 0) {
        p.site.storageMWh -= fromBattery * dtHc;
        p.site.stats.storageFlowMW -= fromBattery;
        take += fromBattery;
      }
    }
    const mwh = take * dtHc;
    c.delivered += mwh;
    contractRevenue += mwh * c.price;
    contractMWDelivered += take;
  }
  // What is left after contracts goes to regional markets, site by site.
  const leftFrac = totalExportAvail > 0 ? pool / totalExportAvail : 0;
  for (const p of passes) {
    const avail = p.exportAvail * leftFrac;
    p.sold = Math.min(avail, p.demand);
    p.surplus = avail - p.sold;
  }

  // ── Storage and market sales per site ─────────────────────────────────
  let revenue = 0;
  let energySold = 0;
  let totalUpkeep = 0;
  let totalSalaries = 0;
  let totalResearch = 0;
  let totalExport = 0;
  for (const p of passes) {
    const st = p.site.stats;
    let surplus = p.surplus;
    let sold = p.sold;
    let flow = st.storageFlowMW < 0 ? st.storageFlowMW : 0;
    const dtH = HOURS_PER_SECOND * dt;
    const room = Math.max(0, p.storageCap - p.site.storageMWh);
    let rateLeft = p.storageRate + flow; // flow is negative if already discharged for contracts
    if (p.storageCap > 0) {
      const smart = s.automation.smartStorage;
      // Charge from surplus first.
      let charge = Math.min(surplus, rateLeft, room / dtH);
      // Smart dispatch also buys cheap off-peak energy (diverts low-price sales).
      if (smart && p.offPeak && charge < rateLeft) {
        const extra = Math.min(rateLeft - charge, sold * 0.5, room / dtH - charge);
        if (extra > 0) {
          sold -= extra;
          charge += extra;
        }
      }
      if (charge > 0) {
        p.site.storageMWh += charge * dtH * 0.92; // round-trip losses
        surplus -= Math.min(surplus, charge);
        flow += charge;
        rateLeft -= charge;
      }
      // Discharge into unmet demand (and, with smart dispatch, into the peak market).
      const deficit = p.demand - sold;
      let discharge = 0;
      if (charge <= 0) {
        const want = smart && p.peak ? rateLeft : Math.max(0, deficit);
        discharge = Math.max(0, Math.min(want, rateLeft, p.site.storageMWh / dtH));
      }
      if (discharge > 0) {
        p.site.storageMWh -= discharge * dtH;
        flow -= discharge;
        sold += discharge;
      }
      p.site.storageMWh = Math.max(0, Math.min(p.storageCap, p.site.storageMWh));
    } else {
      p.site.storageMWh = 0;
    }
    const siteRevenue = sold * dtH * p.price + Math.max(0, surplus) * dtH * p.price * SURPLUS_PRICE_FACTOR;
    revenue += siteRevenue;
    energySold += sold * dtH;
    totalExport += p.exportAvail;
    Object.assign(st, {
      soldMW: sold, surplusMW: Math.max(0, surplus), storageMWh: p.site.storageMWh, storageFlowMW: flow,
      revenue: siteRevenue / dt,
    });
    totalUpkeep += st.upkeep;
    totalSalaries += st.salaries;
    totalResearch += st.researchRate;
  }

  // ── Money ────────────────────────────────────────────────────────────
  const offlineEff = offline ? companyMods(s).offlineEff : 1;
  const income = (revenue + contractRevenue) * offlineEff;
  // Offline, the whole operating result (not just revenue) is scaled.
  const costs = (totalUpkeep + totalSalaries) * dt * offlineEff;
  s.money += income - costs;
  s.runEarned += income;
  s.lifetimeEarned += income;
  s.ledger.sales += revenue * offlineEff;
  s.ledger.contracts += contractRevenue * offlineEff;
  s.ledger.upkeep += totalUpkeep * dt;
  s.ledger.salaries += totalSalaries * dt;
  const mwhSold = energySold + contractMWDelivered * HOURS_PER_SECOND * dt;
  s.stats.energyMWh += mwhSold;
  s.xp += mwhSold * offlineEff;
  s.daily.counters.energy += mwhSold;
  s.daily.counters.earn += income;
  const totalElectric = totalExport;
  if (totalElectric > s.stats.peakMW) s.stats.peakMW = totalElectric;

  // ── Research progress ────────────────────────────────────────────────
  s.research.points += totalResearch * dt * (offline ? offlineEff : 1);
}

function stepWear(s: GameState, site: Site, mods: Modifiers, crews: number, dt: number, offline: boolean): void {
  const wearFactor = mods.wear / (1 + 0.45 * crews);
  let worst: Building | null = null;
  for (const b of site.buildings) {
    if (b.status !== 'active') continue;
    const def = BUILDINGS[b.type];
    const load = b.reactor ? 0.25 + 0.75 * b.reactor.power : b.enabled ? 1 : 0.2;
    b.condition = Math.max(0, b.condition - def.wear * load * wearFactor * dt);
    if (b.condition < 100 && (!worst || b.condition < worst.condition)) worst = b;
    // Very worn non-reactor equipment can fail.
    if (!offline && !isReactor(b.type) && b.condition < 20 && random() < 0.004 * dt) {
      b.status = 'broken';
      pushLog(s, 'bad', `${def.short} at ${LOCATION_BY_ID[site.id].name} broke down from wear.`);
      notify(s, { kind: 'bad', title: 'Equipment breakdown', text: `${def.short} is offline until repaired.` });
    }
  }
  // Workshops restore the most worn equipment over time.
  if (crews > 0 && worst) worst.condition = Math.min(100, worst.condition + 0.08 * crews * dt);
}

function applyLoadFollow(
  s: GameState, site: Site, reactors: Building[], mods: Modifiers,
  cap: ReturnType<typeof siteCapacities>, demand: number, contractShare: number, dt: number,
): void {
  const st = site.stats;
  let maxThermal = 0;
  let effSum = 0;
  for (const b of reactors) {
    if (b.status !== 'active' || !b.enabled || b.reactor!.scrammed) continue;
    const th = reactorMaxThermal(b, mods);
    maxThermal += th;
    effSum += th * (BUILDINGS[b.type].reactor!.efficiency + mods.thermalEff);
  }
  if (maxThermal <= 0) return;
  const eff = effSum / maxThermal;
  const storageRoom = cap.storage - site.storageMWh > 0.5 ? cap.rate : 0;
  const wantElectric = Math.min(cap.grid, demand + contractShare + storageRoom) / (1 - mods.transmissionLoss);
  const thermalForDemand = wantElectric / Math.max(0.05, eff * st.staffFactor);
  // Never ask for more heat than turbines can use or cooling can reject.
  const thermalLimit = Math.min(cap.steam * 1.0, (cap.cooling * 0.97) / Math.max(0.3, 1 - eff));
  const ratio = Math.max(0.1, Math.min(1, Math.min(thermalForDemand, thermalLimit) / maxThermal));
  for (const b of reactors) {
    const r = b.reactor!;
    if (r.scrammed || b.status !== 'active') continue;
    r.setpoint += (ratio - r.setpoint) * exp1(dt, 2.5);
  }
  void s;
}
