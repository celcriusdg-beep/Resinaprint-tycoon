import type { GameState, Site, SiteStats, Modifiers, Building } from '../types';
import { BUILDINGS, levelMult, upkeepAt, staffAt, isReactor } from '../buildings/defs';
import {
  BASE_GRID_TIE_MW, BASE_STAFF_CAP, BASE_FUEL_CAP, HOURS_PER_SECOND, SALARY_PER_STAFF, SURPLUS_PRICE_FACTOR,
  BASE_PRICE, DAY_LENGTH, BASE_CONTRACT_SLOTS, DATA_PRICE_FACTOR, H2_PRICE_FACTOR, IMPORT_PRICE_FACTOR,
} from '../constants';
import { getMods, companyMods } from './modifiers';
import { stepReactorPower, stepReactorTemp, exp1, reactorMaxThermal, canRestart, restart, scram, advisoryLimit } from './reactor';
import { LOCATION_BY_ID } from '../progression/locations';
import { demandForLevel } from '../progression/levels';
import { eventEffect, notify, pushLog } from '../events/events';
import { random } from '../rng';
import { stepWater } from '../supply/water';
import { mineOutput, tickSupply, onlineRefuel, stepFuelIntegrity, coreDamage, stepSpentFuel } from '../supply/fuelcycle';
import { ASSEMBLY_MWH } from '../constants';
import { solvePlant, gridSide, stepCables, GRID_TIE, KIND_LABEL, endpointName, type PlantNetInput } from '../network/network';

/** Battery-backed emergency feedwater lasts ≈ 6 game hours. */
export const BATTERY_SECONDS = 60;

export function emptyStats(): SiteStats {
  return {
    thermalMW: 0, industryMW: 0, importMW: 0, h2MW: 0, industryIncome: 0, steamCapMW: 0, steamUsedMW: 0, electricMW: 0, exportMW: 0, gridCapMW: 0, coolingCapMW: 0,
    heatRejectMW: 0, coolingRatio: 1, demandMW: 0, soldMW: 0, surplusMW: 0, curtailedMW: 0, storageMWh: 0,
    storageCapMWh: 0, storageFlowMW: 0, staffNeeded: 0, staffCap: 0, staffFactor: 1, efficiency: 0,
    researchRate: 0, upkeep: 0, salaries: 0, revenue: 0, price: BASE_PRICE, reactorsOnline: 0, reactorsTotal: 0,
    maxTempFrac: 0, rawSupply: 0, evaporation: 0, treatedSupply: 0, treatedDemand: 0, rawToTreatment: 0, tankM3: 0,
    tankCapM3: 0, waterFactor: 1, treatedFactor: 1, waterCost: 0, houseLoadMW: 0, oreRate: 0, digRate: 0, haulRate: 0,
    offsitePower: true, backupMW: 0, backupNeedMW: 0, pumpsPowered: true, batteryLeft: 60, poolCap: 0, caskCap: 0, caskMove: 0,
    strandedHeatMW: 0, strandedMW: 0, cableLossMW: 0,
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
  let steam = 0, cooling = 0, dryCooling = 0, grid = BASE_GRID_TIE_MW, storage = 0, rate = 0, staffCap = BASE_STAFF_CAP + mods.staffCap;
  let crews = 0, safety = 0, contractSlots = 0, effSum = 0, steamRaw = 0;
  const by = {
    steam: new Map<number, number>(), eff: new Map<number, number>(), wet: new Map<number, number>(), dry: new Map<number, number>(),
    grid: new Map<number, number>(), storage: new Map<number, number>(), rate: new Map<number, number>(),
  };
  for (const b of site.buildings) {
    if (b.status === 'constructing' || b.status === 'destroyed') continue;
    const def = BUILDINGS[b.type];
    const working = isOperating(b);
    // Staff capacity and contract slots come from admin offices even while they upgrade.
    if (def.stats.staffCap && b.status !== 'broken') staffCap += stat(b, 'staffCap');
    if (def.stats.contractSlots && b.status !== 'broken') contractSlots += def.stats.contractSlots;
    if (!working) continue;
    const cf = b.condition >= 60 ? 1 : 0.55 + 0.45 * (b.condition / 60);
    const st = stat(b, 'steamMW') * cf;
    steam += st;
    steamRaw += st;
    effSum += st * (def.stats.effBonus ?? 0);
    if (st > 0) {
      by.steam.set(b.id, st * mods.steamCap);
      by.eff.set(b.id, def.stats.effBonus ?? 0);
    }
    const wet = def.dry ? 0 : stat(b, 'coolingMW') * cf;
    const dry = (def.dry ? stat(b, 'coolingMW') : 0) * cf + stat(b, 'dryMW') * cf;
    cooling += wet;
    dryCooling += dry;
    if (def.category === 'cooling') {
      by.wet.set(b.id, wet);
      by.dry.set(b.id, dry);
    }
    grid += stat(b, 'gridMW');
    storage += stat(b, 'storageMWh');
    rate += stat(b, 'storageRateMW');
    if (def.stats.gridMW) by.grid.set(b.id, stat(b, 'gridMW'));
    if (def.stats.storageRateMW) {
      by.storage.set(b.id, stat(b, 'storageMWh'));
      by.rate.set(b.id, stat(b, 'storageRateMW'));
    }
    crews += stat(b, 'maintenance');
    safety += stat(b, 'safety');
  }
  steam *= mods.steamCap;
  cooling *= mods.cooling * eventEffect(s, site.id, 'cooling');
  // Dry cooling is not helped by evaporation but suffers in hot weather too.
  dryCooling *= mods.cooling * Math.min(1, eventEffect(s, site.id, 'cooling'));
  grid *= mods.grid * eventEffect(s, site.id, 'grid');
  storage *= mods.storage;
  rate *= mods.storage;
  const turbineEff = steamRaw > 0 ? effSum / steamRaw : 0;
  return { steam, cooling, wetCooling: cooling, dryCooling, grid, storage, rate, staffCap, crews, safety, contractSlots, turbineEff, by };
}

export function fuelCapacity(s: GameState): number {
  let cap = BASE_FUEL_CAP;
  for (const site of Object.values(s.sites))
    for (const b of site.buildings) if (BUILDINGS[b.type].stats.fuelCap && b.status !== 'constructing') cap += stat(b, 'fuelCap');
  return cap;
}

export function contractSlots(s: GameState): number {
  const m = companyMods(s);
  let n = BASE_CONTRACT_SLOTS + m.contractSlots;
  for (const site of Object.values(s.sites))
    for (const b of site.buildings) if (b.status !== 'constructing' && b.status !== 'broken') n += BUILDINGS[b.type].stats.contractSlots ?? 0;
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
    if (BUILDINGS[b.type].stats.backupMW && b.status === 'active') gens += stat(b, 'safety');
    condSum += b.condition;
    n++;
  }
  const avgCond = n ? condSum / n : 100;
  const crews = site.buildings.some((b) => BUILDINGS[b.type].stats.maintenance && b.status === 'active') ? 8 : 0;
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
  /** Electrolyser capacity still free to absorb unsold power. */
  h2Left: number;
  /** $/s from on-site industry (data centre, hydrogen, isotopes, visitors). */
  extra: number;
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
  s.supply.rates.salt = 0;
  let minedTotal = 0;
  let ycDirect = 0;
  let fines = 0;
  let waterCostTotal = 0;
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
    for (const b of site.buildings) if (b.status !== 'constructing' && b.status !== 'destroyed') staffNeeded += staffAt(BUILDINGS[b.type], b.level);
    const staffFactor = staffNeeded <= cap.staffCap ? 1 : Math.pow(cap.staffCap / staffNeeded, 0.8);

    const demand = regionalDemand(s, siteId, mods);
    const price = sitePrice(s, siteId, mods);

    // Water balance (uses last step's heat; the plant changes slowly)
    const wetShare = cap.wetCooling + cap.dryCooling > 0 ? cap.wetCooling / (cap.wetCooling + cap.dryCooling) : 1;
    const water = stepWater(s, site, mods, wetShare, st.heatRejectMW, st.thermalMW, dt);
    waterCostTotal += water.cost * (offline ? 0.5 : 1);
    // Without make-up water, wet cooling degrades but the basins keep some capacity.
    cap.cooling = cap.wetCooling * (0.35 + 0.65 * water.waterFactor) + cap.dryCooling;
    const wetF = mods.cooling * eventEffect(s, site.id, 'cooling') * (0.35 + 0.65 * water.waterFactor);
    const dryF = mods.cooling * Math.min(1, eventEffect(s, site.id, 'cooling'));
    const coolCap = new Map<number, number>();
    for (const [id, wet] of cap.by.wet) coolCap.set(id, wet * wetF + (cap.by.dry.get(id) ?? 0) * dryF);

    // Plant networks: only what is connected by pipes and cables counts.
    const condensers = new Set<number>();
    const powerUp = new Set<number>();
    for (const b of site.buildings) {
      const def = BUILDINGS[b.type];
      if (def.stats.steamMW && b.status !== 'constructing' && b.status !== 'destroyed') condensers.add(b.id);
      if ((def.stats.gridMW || def.stats.storageRateMW || def.stats.dataMW || def.stats.h2MW) && isOperating(b)) powerUp.add(b.id);
    }
    const side = gridSide(site, (id) => id === GRID_TIE || condensers.has(id) || powerUp.has(id));
    const gridF = mods.grid * eventEffect(s, site.id, 'grid');
    cap.grid = BASE_GRID_TIE_MW * gridF;
    for (const id of side.busSubs) cap.grid += (cap.by.grid.get(id) ?? 0) * gridF;
    cap.storage = 0;
    cap.rate = 0;
    for (const [id, cableCap] of side.busStores) {
      cap.storage += (cap.by.storage.get(id) ?? 0) * mods.storage;
      cap.rate += Math.min((cap.by.rate.get(id) ?? 0) * mods.storage, cableCap);
    }
    let connSteam = 0, connCool = 0;
    for (const [id, c] of cap.by.steam) if (site.links.some((l) => l.kind === 'steam' && (l.a === id || l.b === id))) connSteam += c;
    for (const [id, c] of coolCap) if (site.links.some((l) => l.kind === 'cooling' && (l.a === id || l.b === id))) connCool += c;

    // Mining
    let siteOre = 0, dig = 0, haul = 0, vehicleUpkeep = 0;
    for (const b of site.buildings) {
      if (b.type !== 'uranium_mine' || b.status === 'constructing') continue;
      const out = mineOutput(b, siteId, mods, staffNeeded <= cap.staffCap ? 1 : Math.pow(cap.staffCap / staffNeeded, 0.8));
      if (b.reserve !== undefined) b.reserve = Math.max(0, b.reserve - out.ore * dt);
      siteOre += out.ore;
      dig += out.dig;
      haul += out.haul;
      vehicleUpkeep += out.upkeep;
    }
    // Mines with their own crews (underground) and in-situ leaching need no vehicles.
    const staffF = staffNeeded <= cap.staffCap ? 1 : Math.pow(cap.staffCap / staffNeeded, 0.8);
    const grade = loc.oreGrade ?? 1;
    for (const b of site.buildings) {
      if (!isOperating(b)) continue;
      const cf = b.condition >= 60 ? 1 : 0.55 + 0.45 * (b.condition / 60);
      siteOre += stat(b, 'oreRate') * grade * mods.mining * cf * staffF;
      ycDirect += stat(b, 'ycRate') * grade * mods.mining * cf * staffF;
    }
    minedTotal += siteOre;

    // Load following (production optimisation automation)
    const reactors = site.buildings.filter((b) => b.reactor && b.status !== 'constructing');
    if (s.automation.loadFollow && reactors.length) {
      applyLoadFollow(s, site, reactors, mods, { ...cap, steam: connSteam, cooling: connCool }, demand, contractMW * (Math.max(1, st.electricMW) / totalCapacityForShare), dt);
    }

    // Offsite power and emergency diesel generators. Pumps and emergency core
    // cooling need electricity: from the grid, or from backup generators.
    const offsitePower = eventEffect(s, siteId, 'offsite') > 0.5;
    let backupMW = 0;
    for (const b of site.buildings) if (b.status === 'active' && BUILDINGS[b.type].stats.backupMW) backupMW += (BUILDINGS[b.type].stats.backupMW ?? 0) * levelMult(BUILDINGS[b.type], b.level) * mods.backupPower;
    let backupNeed = 0;
    for (const b of reactors) if (b.reactor && b.status !== 'destroyed') backupNeed += b.reactor.houseLoad * 0.3 + reactorMaxThermal(b, mods) * 0.002;
    const pumpsPowered = offsitePower || backupMW >= backupNeed;
    // Station batteries run steam-driven emergency feedwater for a limited time.
    site.blackoutTime = offsitePower ? 0 : (site.blackoutTime ?? 0) + dt;
    const batteryLeft = Math.max(0, BATTERY_SECONDS - site.blackoutTime);

    // Reactor power
    const inp = { dt, mods, gameTime: s.gameTime, ambient, treatedFactor: water.treatedFactor, pumpsPowered, offsitePower, offline, batteryCooling: batteryLeft > 0, blackoutTime: site.blackoutTime };
    let thermal = 0;
    let effWeighted = 0;
    let researchFromReactors = 0;
    let houseLoad = 0;
    for (const b of reactors) {
      if (b.status === 'destroyed') continue;
      stepReactorPower(b, inp);
      if (BUILDINGS[b.type].reactor!.onlineRefuel && b.status === 'active') onlineRefuel(s, b, dt, mods);
      houseLoad += b.reactor!.houseLoad;
      thermal += b.reactor!.thermal;
      const spec = BUILDINGS[b.type].reactor!;
      effWeighted += b.reactor!.thermal * (spec.efficiency + mods.thermalEff);
      if (spec.research) researchFromReactors += spec.research * b.reactor!.power * levelMult(BUILDINGS[b.type], b.level);
    }
    const efficiency = thermal > 0 ? effWeighted / thermal : 0;
    const netIn: PlantNetInput = {
      thermal: new Map(), steamCap: cap.by.steam, effBonus: cap.by.eff, condensers, coolCap, powerUp,
      baseEff: efficiency, staffFactor, houseLoad, overload: !offline,
    };
    for (const b of reactors) if (b.status !== 'destroyed') netIn.thermal.set(b.id, b.reactor!.thermal);
    const nw = solvePlant(site, netIn);
    const steamUsed = nw.steamUsed;
    const cycleEff = nw.cycleEff;
    const heatReject = nw.heatReject;
    const electric = nw.electric;
    let coolingRatio = 10;
    for (const [, rn] of nw.reactors) if (rn.ratio < coolingRatio) coolingRatio = rn.ratio;
    if (heatReject > 0.01) coolingRatio = Math.min(coolingRatio, nw.coolingMargin);
    if (!offline) {
      for (const l of stepCables(site, dt)) {
        pushLog(s, 'bad', `Breaker tripped: overloaded ${KIND_LABEL[l.kind].toLowerCase()} ${endpointName(site, l.a)} → ${endpointName(site, l.b)} at ${loc.name}.`);
        notify(s, { kind: 'bad', title: 'Cable breaker tripped', text: `${endpointName(site, l.a)} → ${endpointName(site, l.b)} was overloaded. It recloses in 30 s — upgrade it or add another route.` });
      }
    }

    let maxTempFrac = 0;
    let online = 0;
    for (const b of reactors) {
      if (b.status === 'destroyed') continue;
      const r = b.reactor!;
      const rn = nw.reactors.get(b.id);
      // Protection: a reactor at power whose heat has nowhere to go trips at once.
      if (rn && !r.scrammed && !r.tripCause && b.status === 'active' && r.power > 0.05 && rn.removed < 0.35) {
        const cause = !rn.connected ? 'No heat sink — no steam line to a turbine hall' : !rn.cooled ? 'Loss of condenser cooling — no cooling-water pipe' : null;
        if (cause) {
          scram(r, cause, s.gameTime);
          // Rods are in: prompt drop of fission power.
          r.power *= 0.12;
          r.precursors *= 0.5;
          r.fission *= 0.12;
          r.thermal = r.fission + r.decayHeat;
          s.stats.scrams++;
          pushLog(s, 'bad', `SCRAM: ${BUILDINGS[b.type].short} at ${loc.name} — ${cause}.`);
          if (!offline) notify(s, { kind: 'scram', title: 'Reactor SCRAM', text: `${BUILDINGS[b.type].short}: ${cause}.` });
        }
      }
      const res = stepReactorTemp(b, inp, rn ? rn.ratio : 0);
      const name = `${BUILDINGS[b.type].short} at ${loc.name}`;

      if (res.tripped && !res.atws) {
        s.stats.scrams++;
        pushLog(s, 'bad', `SCRAM: ${name} — ${res.tripped}.`);
        if (!offline) notify(s, { kind: 'scram', title: 'Reactor SCRAM', text: `${name} tripped: ${res.tripped}.` });
      }
      if (res.atws) {
        pushLog(s, 'bad', `ATWS: automatic trip of ${name} FAILED (${res.tripped}). Manual SCRAM required!`);
        if (!offline) notify(s, { kind: 'scram', title: 'FAILURE TO SCRAM', text: `${name}: the rods did not insert automatically (${res.tripped}). Open the reactor and press SCRAM now.` });
      }
      if (res.damaged) coreDamage(s, site, b, !pumpsPowered ? 'station blackout' : 'loss of core cooling');
      if (r.scrammed && (s.automation.autoRestart || offline) && (!rn || (rn.connected && rn.cooled)) && canRestart(b, mods, s.gameTime, ambient)) {
        restart(b);
        s.stats.restarts++;
        pushLog(s, 'info', `Monitoring system restarted ${BUILDINGS[b.type].short} at ${loc.name}.`);
      }
      // Badly degraded reactors may trip on their own.
      if (!offline && !r.scrammed && !r.tripCause && b.condition < 15 && r.power > 0.1 && random() < 0.01 * dt) {
        scram(r, 'Equipment degradation', s.gameTime);
        s.stats.scrams++;
        pushLog(s, 'bad', `SCRAM: ${BUILDINGS[b.type].short} at ${loc.name} tripped due to worn equipment.`);
        notify(s, { kind: 'scram', title: 'Reactor SCRAM', text: `${BUILDINGS[b.type].short} tripped due to worn equipment. Repair it soon.` });
      }
      const frac = (r.temp - ambient) / Math.max(1, (BUILDINGS[b.type].reactor!.nominalTemp - ambient) * (1.18 + mods.tripMargin));
      if (frac > maxTempFrac) maxTempFrac = frac;
      fines += stepFuelIntegrity(s, site, b, dt, offline);
      if (!r.scrammed && r.power > 0.02 && b.status === 'active') online++;
    }

    const net = nw.delivered * (1 - mods.transmissionLoss);
    // On-site industry runs behind the meter: it takes power before the grid
    // connection, so it needs no export capacity. Shortfalls are imported.
    let dataLoad = 0, fixedLoad = 0, h2Cap = 0, isoBase = 0, tourBase = 0, towers = 0;
    for (const b of site.buildings) {
      if (!isOperating(b)) continue;
      // Customer loads only run when cabled to the grid side.
      const feed = nw.busLoads.get(b.id) ?? 0;
      dataLoad += Math.min(stat(b, 'dataMW'), feed);
      fixedLoad += stat(b, 'loadMW');
      h2Cap += Math.min(stat(b, 'h2MW'), feed);
      isoBase += stat(b, 'isotopes');
      tourBase += stat(b, 'tourism');
      if (b.type === 'cooling_tower' || b.type === 'cooling_mega') towers += b.type === 'cooling_mega' ? 2 : 1;
    }
    const onsite = dataLoad + fixedLoad;
    const fromPlant = Math.min(net, onsite);
    const imported = onsite - fromPlant;
    const afterLoads = net - fromPlant;
    const exportAvail = Math.min(afterLoads, cap.grid);
    const overGrid = afterLoads - exportAvail;
    const h2Now = Math.min(h2Cap, overGrid);
    const curtailed = overGrid - h2Now;
    let fission = 0;
    let bigReactors = 0;
    for (const b of reactors) {
      if (!b.reactor) continue;
      fission += b.reactor.fission;
      if (b.status === 'active' && !b.reactor.scrammed && b.reactor.power > 0.05 && BUILDINGS[b.type].reactor!.thermalMW >= 600) bigReactors++;
    }
    const iso = isoBase * Math.min(1, fission / 1000) * staffFactor;
    const tourism = tourBase * (1 + 0.3 * online + 0.25 * towers + 0.5 * bigReactors) * staffFactor;
    const industryIncome = (dataLoad * price * DATA_PRICE_FACTOR - imported * price * IMPORT_PRICE_FACTOR + h2Now * price * H2_PRICE_FACTOR) * HOURS_PER_SECOND + iso + tourism;
    passes.push({
      h2Left: h2Cap - h2Now, extra: industryIncome,
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
      if (b.status === 'constructing' || b.status === 'destroyed') continue;
      upkeep += upkeepAt(BUILDINGS[b.type], b.level) * (b.enabled ? 1 : 0.5);
    }
    upkeep = (upkeep + vehicleUpkeep) * mods.upkeep;
    const salaries = Math.min(staffNeeded, cap.staffCap) * SALARY_PER_STAFF * mods.salary;

    Object.assign(st, {
      thermalMW: thermal, steamCapMW: nw.steamCapConnected, steamUsedMW: steamUsed, electricMW: electric, exportMW: exportAvail,
      gridCapMW: nw.tieConnected ? cap.grid : 0, coolingCapMW: nw.coolCapConnected, heatRejectMW: heatReject, coolingRatio, demandMW: demand,
      industryMW: fromPlant, importMW: imported, h2MW: h2Now, industryIncome,
      curtailedMW: curtailed, storageCapMWh: cap.storage, staffNeeded, staffCap: cap.staffCap, staffFactor,
      researchRate, upkeep, salaries, price, reactorsOnline: online, efficiency: cycleEff, reactorsTotal: reactors.length, maxTempFrac,
      storageFlowMW: 0,
      rawSupply: water.rawSupply, evaporation: water.evaporation, treatedSupply: water.treatedSupply,
      treatedDemand: water.treatedDemand, rawToTreatment: water.rawToTreatment, tankM3: water.tankM3, tankCapM3: water.tankCapM3,
      waterFactor: water.waterFactor, treatedFactor: water.treatedFactor, waterCost: water.cost, houseLoadMW: houseLoad,
      oreRate: siteOre, digRate: dig, haulRate: haul, offsitePower, backupMW, backupNeedMW: backupNeed, pumpsPowered, batteryLeft,
      strandedHeatMW: nw.strandedHeat, strandedMW: nw.stranded, cableLossMW: nw.cableLoss,
    } satisfies Partial<SiteStats>);
  }

  // ── Fuel cycle: mining, processing, fabrication (company-wide stocks) ──
  tickSupply(s, dt, minedTotal, fuelCap, ycDirect);
  stepSpentFuel(s, dt);
  let burn = 0;
  for (const id of s.unlockedSites)
    for (const b of s.sites[id].buildings)
      if (b.reactor) burn += (b.reactor.fission * HOURS_PER_SECOND * BUILDINGS[b.type].reactor!.fuelUse * companyMods(s).fuelUse) / ASSEMBLY_MWH;
  s.supply.rates.burn = burn;

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
    // Electrolysers soak up unsold power at the hydrogen price.
    const toH2 = Math.min(Math.max(0, surplus), p.h2Left);
    surplus -= toH2;
    st.h2MW += toH2;
    st.industryIncome += toH2 * dtH * p.price * H2_PRICE_FACTOR / dt;
    const siteRevenue = sold * dtH * p.price + Math.max(0, surplus) * dtH * p.price * SURPLUS_PRICE_FACTOR
      + toH2 * dtH * p.price * H2_PRICE_FACTOR + p.extra * dt;
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
  const costs = (totalUpkeep + totalSalaries) * dt * offlineEff + (waterCostTotal + fines) * dt;
  s.money += income - costs;
  // Interest on emergency credit (≈1.2% per minute) so debt is never free.
  if (s.money < 0) {
    const interest = -s.money * 0.0002 * dt;
    s.money -= interest;
    s.ledger.other -= interest;
  }
  s.runEarned += income;
  s.lifetimeEarned += income;
  s.ledger.sales += revenue * offlineEff;
  s.ledger.contracts += contractRevenue * offlineEff;
  s.ledger.upkeep += totalUpkeep * dt;
  s.ledger.salaries += totalSalaries * dt;
  s.ledger.water += waterCostTotal * dt;
  s.ledger.other -= fines * dt;
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
  // While the player is away a skeleton crew does basic upkeep: slower wear,
  // and equipment never drops below 50% so nobody returns to a wrecked plant.
  const wearFactor = (mods.wear / (1 + 0.45 * crews)) * (offline ? 0.3 : 1);
  const floor = offline ? 50 : 0;
  let worst: Building | null = null;
  for (const b of site.buildings) {
    if (b.status !== 'active') continue;
    const def = BUILDINGS[b.type];
    // Reactor wear rises with power and with the square of coolant pump speed.
    const load = b.reactor ? (0.25 + 0.75 * b.reactor.power) * Math.pow(b.reactor.pumpSpeed, 2) : b.enabled ? 1 : 0.2;
    if (b.condition > floor) b.condition = Math.max(floor, b.condition - def.wear * load * wearFactor * dt);
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
  // Reactor coolant pumps (house load) and cable losses come out of the generated power too.
  const thermalForDemand = (wantElectric + st.houseLoadMW + st.cableLossMW) / Math.max(0.05, eff * st.staffFactor);
  // Never ask for more heat than turbines can use or cooling can reject.
  const thermalLimit = Math.min(cap.steam * 1.0, (cap.cooling * 0.97) / Math.max(0.3, 1 - eff));
  const ratio = Math.max(0.1, Math.min(1, Math.min(thermalForDemand, thermalLimit) / maxThermal));
  for (const b of reactors) {
    const r = b.reactor!;
    if (r.scrammed || b.status !== 'active') continue;
    const target = Math.min(ratio, advisoryLimit(r.failedRods));
    r.setpoint += (target - r.setpoint) * exp1(dt, 2.5);
  }
  void s;
}
