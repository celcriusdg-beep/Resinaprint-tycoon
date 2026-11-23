import type { Building, GameState, Modifiers, Site, Vehicles } from '../types';
import { BUILDINGS, levelMult } from '../buildings/defs';
import {
  BASE_ORE_CAP, BASE_YC_CAP, BASE_ENR_CAP, ORE_PER_YELLOWCAKE, YELLOWCAKE_PER_ENRICHED, BASE_DEFECT_RATE,
  MARKET_DEFECT_RATE, ITEM_PRICE, SELL_FACTOR, HOURS_PER_SECOND, ASSEMBLY_MWH,
} from '../constants';
import { EXCAVATORS, TRUCKS, slotsFor, emptyVehicles, type VehicleDef } from './vehicles';
import { LOCATION_BY_ID } from '../progression/locations';
import { companyMods, getMods } from '../simulation/modifiers';
import { coreSize, canRefuel, scram, advisoryLimit } from '../simulation/reactor';
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
  if (!working(b)) return { dig: dig + selfDig, haul, ore: 0, upkeep };
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

export function itemPrice(s: GameState, item: Item): number {
  if (item === 'assemblies') return s.market.fuelPrice;
  return ITEM_PRICE[item] * (s.market.fuelPrice / ITEM_PRICE.assemblies);
}

export function stockOf(s: GameState, item: Item): number {
  return item === 'assemblies' ? s.fuel : s.supply[item];
}

export function capOf(s: GameState, item: Item, fuelCap: number): number {
  if (item === 'assemblies') return fuelCap;
  return supplyCaps(s)[item];
}

export function buyItem(s: GameState, item: Item, qty: number, fuelCap: number): number {
  const price = itemPrice(s, item);
  const room = Math.max(0, capOf(s, item, fuelCap) - stockOf(s, item));
  const n = Math.floor(Math.min(qty, room, s.money / price));
  if (n <= 0) return 0;
  s.money -= n * price;
  s.ledger.fuel += n * price;
  if (item === 'assemblies') {
    s.fuel += n;
    s.supply.defects += n * MARKET_DEFECT_RATE;
  } else s.supply[item] += n;
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
  } else s.supply[item] -= n;
  return n;
}

// ── Processing chain ──────────────────────────────────────────────────────

export function fabDefectRate(s: GameState): number {
  const mods = companyMods(s);
  return BASE_DEFECT_RATE * (1 - 0.85 * s.supply.qa) * mods.defectRate;
}

/** Mining output (computed per site in the plant step) plus the processing chain. */
export function tickSupply(s: GameState, dt: number, minedOre: number, fuelCap: number): void {
  const sup = s.supply;
  const caps = supplyCaps(s);
  const mods = companyMods(s);
  const rates = sup.rates;
  // Ore into the stockpile
  const oreIn = Math.min(minedOre * dt, Math.max(0, caps.ore - sup.ore));
  sup.ore += oreIn;
  rates.mined = minedOre;

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

  // Enrichment: yellowcake → enriched
  const enrRoom = Math.max(0, caps.enriched - sup.enriched);
  const enrIn = Math.min(enrichCap * dt, sup.yellowcake, enrRoom * YELLOWCAKE_PER_ENRICHED);
  sup.yellowcake -= enrIn;
  sup.enriched += enrIn / YELLOWCAKE_PER_ENRICHED;
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
  s.fuel += fabIn - caught;
  sup.defects += newDefects;
  // Rejected assemblies are recycled: half the material is recovered.
  sup.enriched = Math.min(caps.enriched, sup.enriched + caught * 0.5);
  rates.fabricated = fabIn / dt;
  rates.inspected = inspected / dt;
  rates.rejected = caught / dt;
  rates.defectRate = defectRate;
  sup.defects = Math.min(sup.defects, s.fuel);
}

// ── Refuelling outages ───────────────────────────────────────────────────

export function refuelNeed(b: Building): number {
  const r = b.reactor!;
  const spent = r.failedRods > 0 ? Math.max(1 - r.coreFuel, 0.05) : 1 - r.coreFuel;
  return Math.max(1, Math.ceil(spent * coreSize(b)));
}

export function refuelDuration(s: GameState, b: Building): number {
  const spec = BUILDINGS[b.type].reactor!;
  return (spec.refuelTime * (0.8 + 0.1 * b.level)) / getMods(s, s.activeSite).refuelSpeed;
}

/** Start an outage: assemblies are taken from stock immediately and loaded over the outage. */
export function startRefuel(s: GameState, b: Building): string | null {
  const err = canRefuel(b);
  if (err) return err;
  const r = b.reactor!;
  const need = refuelNeed(b);
  const take = Math.min(need, Math.floor(s.fuel));
  if (take < 1) return 'No fuel assemblies in stock. Buy some or produce them.';
  const frac = s.fuel > 0 ? Math.min(1, s.supply.defects / s.fuel) : 0;
  // Defective assemblies come along at the stock's defect rate (randomly rounded).
  const expected = take * frac;
  let loadedDefects = Math.floor(expected);
  if (random() < expected - loadedDefects) loadedDefects++;
  s.fuel -= take;
  s.supply.defects = Math.max(0, s.supply.defects - expected);
  r.loading = take;
  r.loadingDefects = loadedDefects;
  b.status = 'refueling';
  b.progress = 0;
  b.buildTotal = refuelDuration(s, b);
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
  r.loading = 0;
  r.loadingDefects = 0;
  r.scrammed = false;
  r.scramReason = null;
}

/** Liquid-fuel reactors (MSR) draw assemblies-equivalent fuel continuously from stock. */
export function onlineRefuel(s: GameState, b: Building, dt: number, mods: Modifiers): void {
  const r = b.reactor!;
  const spec = BUILDINGS[b.type].reactor!;
  const burned = (r.fission * HOURS_PER_SECOND * dt * spec.fuelUse * mods.fuelUse) / ASSEMBLY_MWH;
  if (burned <= 0) return;
  if (s.fuel >= burned) {
    const frac = s.fuel > 0 ? s.supply.defects / s.fuel : 0;
    s.fuel -= burned;
    s.supply.defects = Math.max(0, s.supply.defects - burned * frac);
    r.coreFuel = 1;
  } else {
    r.coreFuel = Math.max(0, r.coreFuel - (burned - s.fuel) / Math.max(1, coreSize(b)));
    s.fuel = 0;
  }
}

// ── Fuel integrity: cladding failures and core damage ─────────────────────

/**
 * Defective rods may fail while the reactor runs, more likely at high power
 * and temperature. Failed rods limit power and draw regulator fines until a
 * refuelling outage replaces them. Running hard with many failed rods risks a
 * core damage incident that destroys the reactor. Abstract game mechanics.
 */
export function stepFuelIntegrity(s: GameState, site: Site, b: Building, tempFrac: number, dt: number, offline: boolean): number {
  const r = b.reactor!;
  if (offline || b.status !== 'active' || r.power < 0.05) return 0;
  const mods = getMods(s, site.id);
  const loc = LOCATION_BY_ID[site.id];
  const stress = r.power * (1 + 4 * Math.max(0, tempFrac - 0.8));
  if (r.coreDefects > 0 && random() < r.coreDefects * 0.0005 * stress * mods.defectHazard * dt) {
    r.coreDefects--;
    r.failedRods++;
    pushLog(s, 'bad', `Fuel cladding failure in ${BUILDINGS[b.type].short} at ${loc.name}: coolant activity rising (${r.failedRods} failed).`);
    notify(s, {
      kind: 'bad',
      title: 'Fuel rod failure',
      text: `${BUILDINGS[b.type].short} at ${loc.name}: a defective rod has failed. Power is limited until you refuel to replace it.`,
    });
  }
  // Running above the recommended limit with several failed rods risks core damage.
  const advisory = advisoryLimit(r.failedRods);
  const excess = r.power - advisory;
  if (r.failedRods >= 3 && excess > 0.02) {
    const p = 0.01 * (r.failedRods - 2) * (excess / 0.3) * (tempFrac > 0.9 ? 2 : 1) * mods.defectHazard * dt;
    if (random() < p) coreDamage(s, site, b);
  }
  // Regulator fines while operating with failed fuel ($/s), much higher above the limit.
  if (r.failedRods <= 0) return 0;
  const base = r.failedRods * 0.4 * Math.sqrt(BUILDINGS[b.type].reactor!.thermalMW) * r.power;
  return excess > 0.02 ? base * 4 : base;
}

export function coreDamage(s: GameState, site: Site, b: Building): void {
  const r = b.reactor!;
  const def = BUILDINGS[b.type];
  const loc = LOCATION_BY_ID[site.id];
  b.status = 'destroyed';
  r.power = 0;
  r.fission = 0;
  r.scrammed = true;
  r.scramReason = 'Core damage';
  r.setpoint = 0;
  // Every reactor at the site trips; the site is evacuated.
  for (const o of site.buildings) if (o.reactor && o !== b && !o.reactor.scrammed) scram(o.reactor, 'Site emergency', s.gameTime);
  const fine = Math.round(def.cost * 0.5);
  s.money -= fine;
  s.ledger.other -= fine;
  s.events = s.events.filter((e) => e.id !== 'outcry');
  s.events.push({ id: 'outcry', remaining: 600, duration: 600, siteId: null });
  s.stats.scrams++;
  s.stats.coreDamage++;
  pushLog(s, 'bad', `CORE DAMAGE: ${def.name} at ${loc.name} was destroyed after operating with failed fuel. Fine $${fine.toLocaleString('en-US')}.`);
  notify(s, {
    kind: 'scram',
    title: 'CORE DAMAGE INCIDENT',
    text: `${def.short} at ${loc.name} is destroyed. All reactors at the site tripped, prices fall while trust recovers, and the ruin must be decommissioned.`,
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
    if (b.type === 'uranium_mine' && b.status !== 'constructing') mines++;
    if (!working(b)) continue;
    mill += stat(b, 'millRate') * cond(b);
    enrich += stat(b, 'enrichRate') * cond(b);
    fab += stat(b, 'fabRate') * cond(b);
    inspect += stat(b, 'inspectRate') * cond(b);
  }
  return { mill: mill * mods.processing, enrich: enrich * mods.processing, fab: fab * mods.processing * (1 - 0.5 * s.supply.qa), inspect, mines };
}
