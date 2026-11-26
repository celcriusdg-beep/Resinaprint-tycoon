import { reportIncident } from '../regulator/regulator';
import type { Building, GameState, MaterialOrder, Modifiers, Site, Vehicles } from '../types';
import { BUILDINGS, levelMult } from '../buildings/defs';
import {
  BASE_ORE_CAP, BASE_YC_CAP, BASE_ENR_CAP, ORE_PER_YELLOWCAKE, YELLOWCAKE_PER_ENRICHED, BASE_DEFECT_RATE,
  MARKET_DEFECT_RATE, ITEM_PRICE, SELL_FACTOR, HOURS_PER_SECOND, ASSEMBLY_MWH,
} from '../constants';
import { EXCAVATORS, TRUCKS, slotsFor, emptyVehicles, type VehicleDef } from './vehicles';
import { LOCATION_BY_ID } from '../progression/locations';
import { companyMods, getMods } from '../simulation/modifiers';
import { coreSize, canRefuel, scram, advisoryLimit } from '../simulation/reactor';
import { physicsFor } from '../simulation/physics';
import { notify, pushLog } from '../events/events';
import { random } from '../rng';

// The nuclear fuel cycle, simplified for play:
//   mine (ore) → mill (yellowcake) → conversion & enrichment → fabrication
//   (fuel assemblies) → reactor core. Each step is a building with a
//   throughput; stocks are company-wide (assume rail logistics between sites).

export type Item = 'ore' | 'yellowcake' | 'enriched' | 'assemblies';

function stat(b: Building, key: keyof (typeof BUILDINGS)['ore_mill']['stats']): number {
  const def = BUILDINGS[b.type];
  const v = def.stats[key];
  return v ? v * levelMult(def, b.level) : 0;
}

function working(b: Building): boolean {
  return b.status === 'active' && b.enabled;
}

function cond(b: Building): number {
  return b.condition >= 60 ? 1 : 0.55 + 0.45 * (b.condition / 60);
}

function allBuildings(s: GameState): Building[] {
  const out: Building[] = [];
  for (const id of s.unlockedSites) for (const b of s.sites[id].buildings) out.push(b);
  return out;
}

export function supplyCaps(s: GameState) {
  let ore = BASE_ORE_CAP, yc = BASE_YC_CAP, enr = BASE_ENR_CAP;
  for (const b of allBuildings(s)) {
    if (b.status === 'constructing') continue;
    ore += stat(b, 'oreStock');
    yc += stat(b, 'ycStock');
    enr += stat(b, 'enrStock');
  }
  return { ore, yellowcake: yc, enriched: enr };
}

// ── Mining ────────────────────────────────────────────────────────────────

export function vehiclesOf(b: Building): Vehicles {
  if (!b.vehicles) b.vehicles = emptyVehicles();
  // Saves from before a tier was added.
  while (b.vehicles.excavators.length < EXCAVATORS.length) b.vehicles.excavators.push(0);
  while (b.vehicles.trucks.length < TRUCKS.length) b.vehicles.trucks.push(0);
  return b.vehicles;
}

export interface MineOutput {
  dig: number;
  haul: number;
  ore: number;
  upkeep: number;
}

/** Ore per second a mine delivers: min(dig, haul) plus self-hauling machines. */
export function mineOutput(b: Building, siteId: string, mods: Modifiers, staffFactor = 1): MineOutput {
  const v = vehiclesOf(b);
  let dig = 0, selfDig = 0, haul = 0, upkeep = 0;
  EXCAVATORS.forEach((d, i) => {
    const n = v.excavators[i] ?? 0;
    if (d.selfHaul) selfDig += n * d.rate;
    else dig += n * d.rate;
    upkeep += n * d.upkeep;
  });
  TRUCKS.forEach((d, i) => {
    const n = v.trucks[i] ?? 0;
    haul += n * d.rate;
    upkeep += n * d.upkeep;
  });
  if (!working(b) || (b.reserve ?? 1) <= 0) return { dig: dig + selfDig, haul, ore: 0, upkeep };
  const grade = LOCATION_BY_ID[siteId]?.oreGrade ?? 1;
  const levelBonus = 1 + 0.1 * (b.level - 1);
  const ore = (Math.min(dig, haul) + selfDig) * grade * levelBonus * mods.mining * cond(b) * staffFactor;
  return { dig: dig + selfDig, haul: haul + selfDig, ore, upkeep };
}

export function vehicleLock(s: GameState, d: VehicleDef): string | null {
  if (s.level < d.level) return `Requires company level ${d.level}`;
  if (d.research && !s.research.completed.includes(d.research)) return d.research === 'f_bucket' ? 'Requires research: Bucket-Wheel Excavators' : 'Requires research: Heavy Mining Equipment';
  return null;
}

export function buyVehicle(s: GameState, siteId: string, buildingId: number, kind: 'excavator' | 'truck', tier: number): string | null {
  const b = s.sites[siteId]?.buildings.find((x) => x.id === buildingId);
  if (!b || b.type !== 'uranium_mine') return 'Mine not found.';
  if (b.status === 'constructing') return 'The mine is still under construction.';
  const list = kind === 'excavator' ? EXCAVATORS : TRUCKS;
  const d = list[tier];
  if (!d) return 'Unknown vehicle.';
  const lock = vehicleLock(s, d);
  if (lock) return lock;
  const v = vehiclesOf(b);
  const arr = kind === 'excavator' ? v.excavators : v.trucks;
  const used = arr.reduce((a, n) => a + n, 0);
  if (used >= slotsFor(kind, b.level)) return `No free ${kind} slots — upgrade the mine.`;
  if (s.money < d.cost) return 'Not enough money.';
  s.money -= d.cost;
  s.ledger.construction += d.cost;
  arr[tier]++;
  pushLog(s, 'info', `Bought a ${d.name} for the mine at ${LOCATION_BY_ID[siteId].name}.`);
  return null;
}

export function sellVehicle(s: GameState, siteId: string, buildingId: number, kind: 'excavator' | 'truck', tier: number): string | null {
  const b = s.sites[siteId]?.buildings.find((x) => x.id === buildingId);
  if (!b) return 'Mine not found.';
  const v = vehiclesOf(b);
  const arr = kind === 'excavator' ? v.excavators : v.trucks;
  if (!arr[tier]) return 'None to sell.';
  const d = (kind === 'excavator' ? EXCAVATORS : TRUCKS)[tier];
  arr[tier]--;
  const refund = Math.round(d.cost * 0.5);
  s.money += refund;
  s.ledger.other += refund;
  return null;
}

// ── Market ───────────────────────────────────────────────────────────────

/**
 * Fuel suppliers can only deliver so many assemblies per game day, and the
 * spot price climbs as you use up that day's capacity. Small utilities can
 * buy everything; large fleets need their own fuel cycle.
 */
export function fuelQuota(s: GameState): number {
  let bonus = 0;
  for (const id of s.unlockedSites)
    for (const b of s.sites[id].buildings) {
      const def = BUILDINGS[b.type];
      if (def.stats.fuelQuota && b.status !== 'constructing') bonus += def.stats.fuelQuota * levelMult(def, b.level);
    }
  return Math.round(120 * Math.pow(1.15, s.level - 1) * (1 + bonus));
}

export function fuelQuotaLeft(s: GameState): number {
  return Math.max(0, fuelQuota(s) - s.market.fuelBought);
}

/** Price of the next assembly bought today. */
export function marketFuelPrice(s: GameState, extra = 0): number {
  const used = (s.market.fuelBought + extra) / Math.max(1, fuelQuota(s));
  return s.market.fuelPrice * (1 + 2 * used * used);
}

export function itemPrice(s: GameState, item: Item): number {
  if (item === 'assemblies') return marketFuelPrice(s);
  return ITEM_PRICE[item] * (s.market.fuelPrice / ITEM_PRICE.assemblies);
}

export function stockOf(s: GameState, item: Item): number {
  return item === 'assemblies' ? s.fuel : s.supply[item];
}

export function capOf(s: GameState, item: Item, fuelCap: number): number {
  if (item === 'assemblies') return fuelCap;
  return supplyCaps(s)[item];
}

export function buyItem(s: GameState, item: Item, qty: number, fuelCap: number, credit = 0): number {
  const room = Math.max(0, capOf(s, item, fuelCap) - stockOf(s, item));
  let want = Math.floor(Math.min(qty, room));
  if (item === 'assemblies') want = Math.min(want, fuelQuotaLeft(s));
  if (want <= 0) return 0;
  // Assemblies get dearer as the day's supply is used: price the batch at its average.
  let n = want;
  let price = item === 'assemblies' ? marketFuelPrice(s, n / 2) : itemPrice(s, item);
  const budget = Math.max(0, s.money + credit);
  if (n * price > budget) {
    n = Math.floor(budget / price);
    if (item === 'assemblies') price = marketFuelPrice(s, n / 2);
  }
  if (n <= 0) return 0;
  s.money -= n * price;
  s.ledger.fuel += n * price;
  if (item === 'assemblies') s.market.fuelBought += n;
  if (item === 'assemblies') {
    s.supply.stockEnr = (s.supply.stockEnr * s.fuel + 4.2 * n) / (s.fuel + n);
    s.fuel += n;
    s.supply.defects += n * MARKET_DEFECT_RATE;
  } else {
    s.supply[item] += n;
    s.supply.bought[item] += n;
  }
  return n;
}

export function sellItem(s: GameState, item: Item, qty: number): number {
  const have = stockOf(s, item);
  const n = Math.floor(Math.min(qty, have));
  if (n <= 0) return 0;
  const value = n * itemPrice(s, item) * SELL_FACTOR;
  s.money += value;
  s.ledger.sales += value;
  if (item === 'assemblies') {
    // Sold assemblies take their share of hidden defects with them.
    s.supply.defects *= Math.max(0, (have - n) / have);
    s.fuel -= n;
  } else {
    s.supply[item] -= n;
    s.supply.bought[item] = Math.min(s.supply.bought[item], s.supply[item]);
  }
  return n;
}

// ── Processing chain ──────────────────────────────────────────────────────

export function fabDefectRate(s: GameState): number {
  const mods = companyMods(s);
  return BASE_DEFECT_RATE * (1 - 0.85 * s.supply.qa) * mods.defectRate;
}

/** Mining output (computed per site in the plant step) plus the processing chain. */
export function tickSupply(s: GameState, dt: number, minedOre: number, fuelCap: number, ycDirect = 0): void {
  const sup = s.supply;
  const caps = supplyCaps(s);
  const mods = companyMods(s);
  const rates = sup.rates;
  // Ore into the stockpile
  const oreIn = Math.min(minedOre * dt, Math.max(0, caps.ore - sup.ore));
  sup.ore += oreIn;
  rates.mined = minedOre;
  const ycIn = Math.min(ycDirect * dt, Math.max(0, caps.yellowcake - sup.yellowcake));
  sup.yellowcake += ycIn;
  rates.leached = ycIn / dt;

  let millCap = 0, enrichCap = 0, fabCap = 0, inspectCap = 0;
  for (const b of allBuildings(s)) {
    if (!working(b)) continue;
    millCap += stat(b, 'millRate') * cond(b);
    enrichCap += stat(b, 'enrichRate') * cond(b);
    fabCap += stat(b, 'fabRate') * cond(b);
    inspectCap += stat(b, 'inspectRate') * cond(b);
  }
  millCap *= mods.processing;
  enrichCap *= mods.processing;
  fabCap *= mods.processing * (1 - 0.5 * sup.qa); // careful QA slows the line

  // Mill: ore → yellowcake
  const ycRoom = Math.max(0, caps.yellowcake - sup.yellowcake);
  const millIn = Math.min(millCap * dt, sup.ore, ycRoom * ORE_PER_YELLOWCAKE);
  sup.ore -= millIn;
  sup.yellowcake += millIn / ORE_PER_YELLOWCAKE;
  rates.milled = millIn / dt;

  // Enrichment: yellowcake → enriched. Higher U-235 content needs more natural
  // uranium feed and more separative work per unit of product.
  const e = Math.max(3, Math.min(5, sup.enrichment || 4)) / 4;
  const feedPer = YELLOWCAKE_PER_ENRICHED * Math.pow(e, 1.3);
  const enrRoom = Math.max(0, caps.enriched - sup.enriched);
  const enrIn = Math.min((enrichCap / Math.pow(e, 0.3)) * dt, sup.yellowcake, enrRoom * feedPer);
  sup.yellowcake -= enrIn;
  sup.enriched += enrIn / feedPer;
  rates.enriched = enrIn / dt;

  // Fabrication: enriched → assemblies, some defective
  const asmRoom = Math.max(0, fuelCap - s.fuel);
  const fabIn = Math.min(fabCap * dt, sup.enriched, asmRoom);
  sup.enriched -= fabIn;
  const defectRate = fabDefectRate(s);
  let newDefects = fabIn * defectRate;
  // Inspection catches defects in the share of production it can keep up with.
  const inspected = Math.min(fabIn, inspectCap * dt);
  const caught = fabIn > 0 ? newDefects * (inspected / fabIn) * 0.95 : 0;
  newDefects -= caught;
  const made = fabIn - caught;
  if (made > 0) sup.stockEnr = (sup.stockEnr * s.fuel + (sup.enrichment || 4) * made) / (s.fuel + made);
  s.fuel += made;
  sup.defects += newDefects;
  // Rejected assemblies are recycled: half the material is recovered.
  sup.enriched = Math.min(caps.enriched, sup.enriched + caught * 0.5);
  rates.fabricated = fabIn / dt;
  rates.inspected = inspected / dt;
  rates.rejected = caught / dt;
  rates.defectRate = defectRate;
  sup.defects = Math.min(sup.defects, s.fuel);
  // Purchased material is processed first; what remains bought can't fill orders.
  const b = sup.bought;
  b.ore = Math.max(0, Math.min(sup.ore, b.ore - millIn));
  b.yellowcake = Math.max(0, Math.min(sup.yellowcake, b.yellowcake - enrIn));
  b.enriched = Math.max(0, Math.min(sup.enriched, b.enriched - fabIn - (rates.salt ?? 0) * dt));
}

/** Stock you produced yourself (buyers on the order board won't take resold market material). */
export function ownStock(s: GameState, item: MaterialOrder['item']): number {
  return Math.max(0, s.supply[item] - s.supply.bought[item]);
}

// ── Refuelling outages ───────────────────────────────────────────────────

/** Assemblies loaded in an outage: a third of the core (batch reload) or everything spent (full). */
export function refuelNeed(b: Building, mode: 'batch' | 'full' = 'batch'): number {
  const r = b.reactor!;
  const size = coreSize(b);
  const spent = Math.max(r.failedRods > 0 ? 0.05 : 0, 1 - r.coreFuel);
  const want = Math.ceil(spent * size);
  return Math.max(1, mode === 'full' ? want : Math.min(want, Math.ceil(size / 3)));
}

export function refuelDuration(s: GameState, b: Building): number {
  const spec = BUILDINGS[b.type].reactor!;
  return (spec.refuelTime * (0.8 + 0.1 * b.level)) / getMods(s, s.activeSite).refuelSpeed;
}

/** Start an outage: fresh assemblies come from stock; the same number of spent ones go to the pool. */
export function startRefuel(s: GameState, b: Building, mode: 'batch' | 'full' = 'batch'): string | null {
  const err = canRefuel(b);
  if (err) return err;
  const r = b.reactor!;
  const site = Object.values(s.sites).find((x) => x.buildings.includes(b));
  if (!site) return 'Site not found.';
  const need = refuelNeed(b, mode);
  const take = Math.min(need, Math.floor(s.fuel));
  if (take < 1) return 'No fuel assemblies in stock. Buy some or produce them.';
  const room = poolCapacity(site) - site.spent.pool;
  if (room < take) return `Spent fuel pool is full (${Math.floor(site.spent.pool)}/${Math.floor(poolCapacity(site))}). Build Dry Cask Storage to make room.`;
  const frac = s.fuel > 0 ? Math.min(1, s.supply.defects / s.fuel) : 0;
  const expected = take * frac;
  let loadedDefects = Math.floor(expected);
  if (random() < expected - loadedDefects) loadedDefects++;
  s.fuel -= take;
  s.supply.defects = Math.max(0, s.supply.defects - expected);
  // Spent assemblies are discharged to the pool now; fresh ones load over the outage.
  site.spent.pool += take;
  const size = Math.max(1, coreSize(b));
  const remaining = Math.max(0, r.coreFuel * size);
  r.coreEnr = (r.coreEnr * remaining + s.supply.stockEnr * take) / Math.max(1, remaining + take);
  r.loading = take;
  r.loadingDefects = loadedDefects;
  b.status = 'refueling';
  b.progress = 0;
  b.buildTotal = refuelDuration(s, b) * (0.4 + 0.6 * Math.min(1, take / (size / 3)));
  r.setpoint = 0;
  return null;
}

/** Called when an outage completes. */
export function finishRefuel(b: Building): void {
  const r = b.reactor!;
  const size = Math.max(1, coreSize(b));
  // Spent assemblies (including failed ones) are discharged; their share of defects goes with them.
  r.coreDefects = Math.round(r.coreDefects * Math.min(1, r.coreFuel)) + r.loadingDefects;
  r.failedRods = 0;
  r.coreFuel = Math.min(1, r.coreFuel + r.loading / size);
  // After an outage the core is cold and xenon-free; the trip is reset for a fresh startup.
  r.xenon = 0;
  r.iodine = 0;
  r.inventory = 1;
  r.tripCause = null;
  r.atws = false;
  r.rods = 0;
  r.power = 1e-7;
  r.precursors = 1e-7;
  r.loading = 0;
  r.loadingDefects = 0;
  r.scrammed = false;
  r.scramReason = null;
}

/**
 * Molten salt reactors have no fuel rods: enriched uranium is dissolved into the
 * fuel salt and topped up continuously while the reactor runs.
 */
export function onlineRefuel(s: GameState, b: Building, dt: number, mods: Modifiers): void {
  const r = b.reactor!;
  const spec = BUILDINGS[b.type].reactor!;
  const burned = (r.fission * HOURS_PER_SECOND * dt * spec.fuelUse * mods.fuelUse) / ASSEMBLY_MWH;
  if (burned <= 0) return;
  const take = Math.min(burned, s.supply.enriched);
  s.supply.enriched -= take;
  s.supply.bought.enriched = Math.min(s.supply.bought.enriched, s.supply.enriched);
  s.supply.rates.salt = (s.supply.rates.salt ?? 0) + take / dt;
  const short = burned - take;
  if (short <= 1e-9) r.coreFuel = Math.min(1, r.coreFuel + 0.002 * dt);
  else r.coreFuel = Math.max(0, r.coreFuel - short / Math.max(1, coreSize(b)));
}

// ── Fuel integrity: cladding failures and core damage ─────────────────────

/**
 * Defective rods may fail while the reactor runs. Pellet–cladding stress makes
 * failures far more likely when fuel runs hot (overpower). Failed rods leak
 * radioactivity into the coolant: the plant should stay below the recommended
 * power limit (fines above it) and replace them at the next outage. Fuel that
 * gets extremely hot in a power excursion fails in large numbers.
 */
export function stepFuelIntegrity(s: GameState, site: Site, b: Building, dt: number, offline: boolean): number {
  const r = b.reactor!;
  if (offline || b.status !== 'active' || r.power < 0.05) return 0;
  const mods = getMods(s, site.id);
  const loc = LOCATION_BY_ID[site.id];
  const p = physicsFor(b.type);
  const hot = Math.max(0, (r.fuelTemp - (r.temp + p.fuelDT * 1.05)) / Math.max(50, p.fuelDT * 0.5));
  const stress = r.power * (1 + 6 * hot);
  if (r.coreDefects > 0 && random() < r.coreDefects * 0.0005 * stress * mods.defectHazard * dt) {
    r.coreDefects--;
    r.failedRods++;
    pushLog(s, 'bad', `Fuel cladding failure in ${BUILDINGS[b.type].short} at ${loc.name}: coolant activity rising (${r.failedRods} failed).`);
    notify(s, { kind: 'bad', title: 'Fuel rod failure', text: `${BUILDINGS[b.type].short} at ${loc.name}: a rod is leaking. Keep power below the recommended limit and replace it at the next refuelling.` });
  }
  // Severe overheating (power excursion) fails intact rods too.
  if (r.fuelTemp > 1800 && random() < 0.5 * dt) {
    r.failedRods += 1 + Math.floor((r.fuelTemp - 1800) / 300);
    notify(s, { kind: 'bad', title: 'Fuel overheating', text: `${BUILDINGS[b.type].short}: fuel temperature ${Math.round(r.fuelTemp)} °C — rods are failing.` });
  }
  if (r.failedRods <= 0) return 0;
  const excess = r.power - advisoryLimit(r.failedRods);
  const base = r.failedRods * 0.4 * Math.sqrt(BUILDINGS[b.type].reactor!.thermalMW) * r.power;
  return excess > 0.02 ? base * 4 : base;
}

/**
 * Core damage incident: the fuel overheated (loss of cooling, station blackout
 * or a power excursion). Consequences scale with reactor size; a containment
 * building limits the release.
 */
export function coreDamage(s: GameState, site: Site, b: Building, cause: string): void {
  const r = b.reactor!;
  const def = BUILDINGS[b.type];
  const loc = LOCATION_BY_ID[site.id];
  const phys = physicsFor(b.type);
  b.status = 'destroyed';
  r.power = 0;
  r.fission = 0;
  r.scrammed = true;
  r.scramReason = 'Core damage';
  r.tripCause = 'Core damage';
  r.setpoint = 0;
  for (const o of site.buildings) if (o.reactor && o !== b && !o.reactor.scrammed) scram(o.reactor, 'Site emergency', s.gameTime);
  // INES-style severity from reactor size and containment.
  const severity = Math.min(7, Math.max(4, Math.round(4 + Math.log10(Math.max(10, def.reactor!.thermalMW)) - 1 + (phys.containment ? 0 : 2))));
  const fine = Math.round(def.cost * (0.3 + 0.1 * (severity - 4)));
  reportIncident(s, site.id, 'core');
  const outcry = Math.min(1800, 400 + (severity - 4) * 300);
  s.money -= fine;
  s.ledger.other -= fine;
  s.events = s.events.filter((e) => e.id !== 'outcry');
  s.events.push({ id: 'outcry', remaining: outcry, duration: outcry, siteId: null });
  s.stats.scrams++;
  s.stats.coreDamage++;
  pushLog(s, 'bad', `CORE DAMAGE (INES ${severity}): ${def.name} at ${loc.name} — ${cause}. Fine $${fine.toLocaleString('en-US')}.`);
  notify(s, {
    kind: 'scram',
    title: `CORE DAMAGE — INES level ${severity}`,
    text: `${def.short} at ${loc.name}: ${cause}. The fuel overheated and the core is destroyed${phys.containment ? '; the containment held most of the release' : ''}. Other reactors at the site tripped.`,
  });
}

export function decommissionCost(b: Building): number {
  return Math.round(BUILDINGS[b.type].cost * 0.8);
}

/** Current processing capacities (per second of input) for the UI. */
export function supplyCapacity(s: GameState) {
  const mods = companyMods(s);
  let mill = 0, enrich = 0, fab = 0, inspect = 0, mines = 0;
  for (const b of allBuildings(s)) {
    const md = BUILDINGS[b.type].stats;
    if ((b.type === 'uranium_mine' || md.oreRate || md.ycRate) && b.status !== 'constructing') mines++;
    if (!working(b)) continue;
    mill += stat(b, 'millRate') * cond(b);
    enrich += stat(b, 'enrichRate') * cond(b);
    fab += stat(b, 'fabRate') * cond(b);
    inspect += stat(b, 'inspectRate') * cond(b);
  }
  return { mill: mill * mods.processing, enrich: enrich * mods.processing, fab: fab * mods.processing * (1 - 0.5 * s.supply.qa), inspect, mines };
}


// ── Ore reserves ────────────────────────────────────────────────────────

/** Ore in a pit of a given level; upgrading deepens the pit and adds reserves. */
export function reserveFor(level: number): number {
  return 400_000 * Math.pow(3, level - 1);
}

// ── Spent fuel ──────────────────────────────────────────────────────────

/** Spent fuel pools sit next to each reactor: room for 1.5 cores each. */
export function poolCapacity(site: Site): number {
  let cap = 0;
  for (const b of site.buildings) if (b.reactor && b.status !== 'constructing' && b.status !== 'destroyed' && !BUILDINGS[b.type].reactor!.onlineRefuel) cap += coreSize(b) * 1.5;
  return Math.max(cap, site.spent.pool);
}

export function caskCapacity(site: Site): number {
  let cap = 0;
  for (const b of site.buildings) if (b.status !== 'constructing' && BUILDINGS[b.type].stats.caskCap) cap += (BUILDINGS[b.type].stats.caskCap ?? 0) * levelMult(BUILDINGS[b.type], b.level);
  return cap;
}

export const CASK_COST_PER_ASSEMBLY = 60;
/** Shipping spent fuel off-site to a reprocessing plant, per assembly. */
export const SHIP_COST_PER_ASSEMBLY = 180;
/** Reprocessed uranium recovered per shipped assembly (yellowcake units). */
export const SHIP_YELLOWCAKE_BACK = 0.4;

/** How fast the cask loading crews work at a site (assemblies per second). */
export function caskLoadRate(site: Site): number {
  let rate = 0;
  for (const b of site.buildings)
    if (b.status === 'active' && BUILDINGS[b.type].stats.caskRate) rate += BUILDINGS[b.type].stats.caskRate! * (1 + 0.6 * (b.level - 1));
  return rate;
}

/** Cooled spent fuel moves from the pools into dry casks when there is room. */
export function stepSpentFuel(s: GameState, dt: number): void {
  for (const id of s.unlockedSites) {
    const site = s.sites[id];
    const cap = caskCapacity(site);
    site.stats.poolCap = poolCapacity(site);
    site.stats.caskCap = cap;
    site.stats.caskMove = 0;
    if (cap <= site.spent.casks || site.spent.pool <= 0) continue;
    const move = Math.min(site.spent.pool, cap - site.spent.casks, caskLoadRate(site) * dt);
    const cost = move * CASK_COST_PER_ASSEMBLY;
    if (move <= 0 || s.money < cost) continue;
    site.spent.pool -= move;
    site.spent.casks += move;
    site.stats.caskMove = move / dt;
    s.money -= cost;
    s.ledger.maintenance += cost;
  }
}

/** Ship spent fuel from the casks (then the pools) off-site for reprocessing. */
export function shipSpentFuel(s: GameState, siteId: string, qty: number): string | null {
  const site = s.sites[siteId];
  const avail = site.spent.casks + site.spent.pool;
  const n = Math.floor(Math.min(qty, avail));
  if (n <= 0) return 'No spent fuel to ship.';
  const cost = n * SHIP_COST_PER_ASSEMBLY;
  if (s.money < cost) return `Shipping ${n} assemblies costs ${Math.round(cost).toLocaleString('en-US')} $.`;
  const fromCasks = Math.min(site.spent.casks, n);
  site.spent.casks -= fromCasks;
  site.spent.pool -= n - fromCasks;
  s.money -= cost;
  s.ledger.maintenance += cost;
  const back = n * SHIP_YELLOWCAKE_BACK;
  s.supply.yellowcake += back;
  pushLog(s, 'info', `Shipped ${n} spent assemblies for reprocessing. ${back.toFixed(0)} units of recovered uranium returned as yellowcake.`);
  return null;
}


// ── Material orders ────────────────────────────────────────────────────

const ORDER_BUYERS = {
  ore: ['Northfield Assay Labs', 'Granite Mills Co-op', 'Ridgeback Processing'],
  yellowcake: ['Eurasian Conversion Ltd', 'Pacific Fuel Services', 'Atlas Enrichment Group', 'Meridian Utilities'],
  enriched: ['Brightwater Fuel Fabricators', 'Coastal Research Reactor', 'Helios Isotopes', 'Nordic Fuel Works'],
} as const;

/** New buyer requests sized to the company's scale, paying a premium over the spot price. */
export function generateOrder(s: GameState): MaterialOrder {
  const items: MaterialOrder['item'][] = ['ore', 'yellowcake', 'yellowcake'];
  if (s.research.completed.includes('f_enrich')) items.push('enriched', 'enriched');
  const item = items[Math.floor(random() * items.length)];
  const scale = Math.pow(1.25, Math.max(0, s.level - 3));
  const base = { ore: 300, yellowcake: 25, enriched: 10 }[item];
  const qty = Math.max(1, Math.round(base * scale * (0.6 + random() * 0.8)));
  const premium = 1.5 + random() * 0.6;
  const pay = Math.round(qty * ITEM_PRICE[item] * premium);
  const buyers = ORDER_BUYERS[item];
  return { id: Math.floor(random() * 1e9), buyer: buyers[Math.floor(random() * buyers.length)], item, qty, pay, xp: Math.round(pay / 40) };
}

export function tickOrders(s: GameState, dt: number): void {
  s.nextOrderIn -= dt;
  if (s.nextOrderIn > 0 && s.orders.length >= 1) return;
  s.nextOrderIn = 150;
  if (s.orders.length >= 3) s.orders.shift();
  while (s.orders.length < 3) s.orders.push(generateOrder(s));
}

export function deliverOrder(s: GameState, id: number): string | null {
  const o = s.orders.find((x) => x.id === id);
  if (!o) return 'That order is gone.';
  const own = ownStock(s, o.item);
  if (own < o.qty) return `Not enough self-produced ${o.item === 'enriched' ? 'enriched uranium' : o.item} (${Math.floor(own)}/${o.qty}). Buyers don't accept resold market material.`;
  s.supply[o.item] -= o.qty;
  s.money += o.pay;
  s.ledger.sales += o.pay;
  s.xp += o.xp;
  s.orders = s.orders.filter((x) => x.id !== id);
  pushLog(s, 'good', `Delivered ${o.qty} ${o.item} to ${o.buyer} for $${o.pay.toLocaleString('en-US')}.`);
  return null;
}

/** Rough running cost of the own fuel chain per assembly made (upkeep of the chain ÷ output). */
export function ownFuelCost(s: GameState): number | null {
  const made = s.supply.rates.fabricated - s.supply.rates.rejected;
  if (made <= 1e-4) return null;
  let upkeep = 0;
  for (const id of s.unlockedSites) for (const b of s.sites[id].buildings) {
    if (b.status === 'constructing') continue;
    const def = BUILDINGS[b.type];
    if (def.category !== 'fuel' || def.stats.caskCap || def.stats.fuelCap) continue;
    upkeep += def.upkeep * levelMult(def, b.level);
    if (b.vehicles) upkeep += mineOutput(b, id, getMods(s, id)).upkeep;
  }
  return upkeep / made;
}
