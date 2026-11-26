import type { Building, GameState, Site } from './types';
import { BUILDINGS } from './buildings/defs';
import { fuelCapacity, liveCap, liveHeat, liveLoad } from './simulation/plant';
import { supplyCaps } from './supply/fuelcycle';

// One small gauge per building for the map tags: how hard it is working or how
// full its store is, and whether that is a problem.

export type MeterTone = 'ok' | 'warn' | 'bad' | 'info' | 'idle' | 'build';

export interface Meter {
  /** Bar fill, 0..1. */
  value: number;
  tone: MeterTone;
  /** Short reading for the tag, e.g. "92%". */
  text: string;
  /** What the gauge measures. */
  what: string;
  /** Amount in use / stored and the limit, for the building panel. */
  used?: number;
  cap?: number;
  unit?: 'MW' | 'MWh' | 'm³/h' | 'm³' | 't' | 'units' | 'assemblies';
  /** What to do about it (only when it is a problem). */
  hint?: string;
}

const pct = (v: number) => `${Math.round(Math.min(1, Math.max(0, v)) * 100)}%`;

/** Busy is good until it is near the limit. */
function loadTone(v: number): MeterTone {
  return v >= 0.97 ? 'bad' : v >= 0.85 ? 'warn' : v > 0.01 ? 'ok' : 'idle';
}

/** A store that must not run low (fuel). */
function lowTone(v: number): MeterTone {
  return v < 0.15 ? 'bad' : v < 0.3 ? 'warn' : 'ok';
}

/** A store that must not fill up (output stockpiles, spent fuel). */
function highTone(v: number): MeterTone {
  return v >= 0.97 ? 'bad' : v >= 0.85 ? 'warn' : 'ok';
}

const STORES = new Set(['Stored energy', 'Water stored', 'Spent-fuel storage', 'Fuel stock', 'Ore stockpile', 'Yellowcake store', 'Enriched-uranium store', 'Fuel store (output)']);

/** Readings at or past the limit say so in words ("Full", "Max") instead of a number. */
const m = (value: number, tone: MeterTone, what: string, text?: string, extra: Partial<Meter> = {}): Meter => ({
  value: Math.max(0, Math.min(1, value)), tone, what,
  text: text ?? (value >= 0.995 ? (STORES.has(what) ? 'Full' : 'Max') : pct(value)),
  ...extra,
  hint: tone === 'warn' || tone === 'bad' ? extra.hint : undefined,
});

const HINT = {
  steam: 'This turbine hall is near its steam limit. Upgrade it, build another hall, or add a steam cross-tie so halls can share steam.',
  cooling: 'Near its cooling limit — heat that cannot be rejected forces the reactors down. Upgrade it or add cooling; hot, humid weather lowers capacity.',
  grid: 'Close to the most power it can pass. Upgrade it or add another switchyard and cable route — overloaded cables trip.',
  hot: 'The core is close to its trip temperature. Lower power or add cooling before it SCRAMs.',
  water: 'Almost all the water you can draw is in use. Build another intake or wells, or a tank as a buffer.',
  treated: 'Reactors need more clean water than you make. Build or upgrade a treatment plant.',
  output: 'Its output store is full, so it has to pause. Build the next step of the fuel chain, more storage, or sell on the Market.',
  fuel: 'Fuel is running low. Make more (mill → enrichment → fabrication) or buy fuel on the Market.',
  spent: 'Spent-fuel storage is nearly full. Build more dry casks or a vault, or ship spent fuel away.',
};

export interface MeterCtx {
  caps: ReturnType<typeof supplyCaps>;
  fuelCap: number;
}

export function meterContext(g: GameState): MeterCtx {
  return { caps: supplyCaps(g), fuelCap: fuelCapacity(g) };
}

export function buildingMeter(g: GameState, site: Site, b: Building, ctx: MeterCtx): Meter | null {
  const def = BUILDINGS[b.type];
  const st = def.stats;
  if (b.status === 'constructing' || b.status === 'upgrading') return m(b.progress, 'build', b.status === 'constructing' ? 'Construction' : 'Upgrade');
  if (b.status === 'destroyed') return null;
  if (b.status === 'broken') return m(1, 'bad', 'Broken', 'Broken');
  const load = liveLoad.get(site.id)?.get(b.id);
  const s = site.stats;
  if (b.reactor) {
    if (b.status === 'refueling') return m(0, 'info', 'Refuelling', 'Refuel');
    const heat = liveHeat.get(site.id)?.get(b.id) ?? 0;
    const p = load ?? b.reactor.power;
    const tone: MeterTone = b.reactor.scrammed ? 'bad' : heat >= 0.92 ? 'bad' : heat >= 0.82 ? 'warn' : p > 0.01 ? 'ok' : 'idle';
    return m(p, tone, 'Reactor power', b.reactor.scrammed ? 'SCRAM' : pct(p), { used: b.reactor.thermal, cap: BUILDINGS[b.type].reactor!.thermalMW, unit: 'MW', hint: HINT.hot });
  }
  if (!b.enabled) return m(0, 'idle', 'Switched off', 'Off');
  const cap = liveCap.get(site.id)?.get(b.id);
  const lv = load ?? 0;
  const at = cap !== undefined ? { used: lv * cap, cap, unit: 'MW' as const } : {};
  if (st.steamMW) return m(lv, loadTone(lv), 'Steam load', undefined, { ...at, hint: HINT.steam });
  if (st.coolingMW || st.dryMW) return m(lv, loadTone(lv), 'Cooling load', undefined, { ...at, hint: HINT.cooling });
  if (st.gridMW) return m(lv, loadTone(lv), 'Power through', undefined, { ...at, hint: HINT.grid });
  if (st.storageMWh) {
    const v = s.storageCapMWh > 0 ? s.storageMWh / s.storageCapMWh : 0;
    return m(v, 'info', 'Stored energy', undefined, { used: s.storageMWh, cap: s.storageCapMWh, unit: 'MWh' });
  }
  if (st.rawWater) {
    const used = s.rawToTreatment + s.evaporation;
    const v = s.rawSupply > 0 ? used / s.rawSupply : used > 0 ? 1 : 0;
    return m(v, loadTone(v), 'Water use', undefined, { used, cap: s.rawSupply, unit: 'm³/h', hint: HINT.water });
  }
  if (st.treatedWater) {
    const v = s.treatedSupply > 0 ? s.treatedDemand / s.treatedSupply : s.treatedDemand > 0 ? 1 : 0;
    return m(v, loadTone(v), 'Clean-water demand', undefined, { used: s.treatedDemand, cap: s.treatedSupply, unit: 'm³/h', hint: HINT.treated });
  }
  if (st.waterStorage) {
    const v = s.tankCapM3 > 0 ? s.tankM3 / s.tankCapM3 : 0;
    return m(v, v < 0.15 && s.evaporation > s.rawSupply ? 'warn' : 'info', 'Water stored', undefined, { used: s.tankM3, cap: s.tankCapM3, unit: 'm³', hint: HINT.water });
  }
  if (st.caskCap) {
    const v = s.caskCap > 0 ? site.spent.casks / s.caskCap : 0;
    return m(v, highTone(v), 'Spent-fuel storage', undefined, { used: site.spent.casks, cap: s.caskCap, unit: 'assemblies', hint: HINT.spent });
  }
  if (st.fuelCap) {
    const v = g.fuel / Math.max(1, ctx.fuelCap);
    return m(v, lowTone(v), 'Fuel stock', undefined, { used: g.fuel, cap: ctx.fuelCap, unit: 'assemblies', hint: HINT.fuel });
  }
  if (st.oreStock || st.oreRate) {
    const v = g.supply.ore / Math.max(1, ctx.caps.ore);
    return m(v, highTone(v), 'Ore stockpile', undefined, { used: g.supply.ore, cap: ctx.caps.ore, unit: 't', hint: HINT.output });
  }
  if (st.ycStock || st.ycRate) {
    const v = g.supply.yellowcake / Math.max(1, ctx.caps.yellowcake);
    return m(v, highTone(v), 'Yellowcake store', undefined, { used: g.supply.yellowcake, cap: ctx.caps.yellowcake, unit: 'units', hint: HINT.output });
  }
  if (st.enrStock) {
    const v = g.supply.enriched / Math.max(1, ctx.caps.enriched);
    return m(v, highTone(v), 'Enriched-uranium store', undefined, { used: g.supply.enriched, cap: ctx.caps.enriched, unit: 'units', hint: HINT.output });
  }
  if (st.fabRate || st.inspectRate) {
    const v = g.fuel / Math.max(1, ctx.fuelCap);
    return m(v, highTone(v), 'Fuel store (output)', undefined, { used: g.fuel, cap: ctx.fuelCap, unit: 'assemblies', hint: HINT.output });
  }
  return null;
}
