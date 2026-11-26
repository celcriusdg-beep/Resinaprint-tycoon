import type { Building, GameState, Site } from './types';
import { BUILDINGS } from './buildings/defs';
import { fuelCapacity, liveHeat, liveLoad } from './simulation/plant';
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
  /** What the gauge measures (tooltips/tests). */
  what: string;
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
const m = (value: number, tone: MeterTone, what: string, text?: string): Meter => ({
  value: Math.max(0, Math.min(1, value)), tone, what,
  text: text ?? (value >= 0.995 ? (STORES.has(what) ? 'Full' : 'Max') : pct(value)),
});

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
    return m(p, tone, 'Reactor power', b.reactor.scrammed ? 'SCRAM' : pct(p));
  }
  if (!b.enabled) return m(0, 'idle', 'Switched off', 'Off');
  if (st.steamMW) return m(load ?? 0, loadTone(load ?? 0), 'Steam load');
  if (st.coolingMW || st.dryMW) return m(load ?? 0, loadTone(load ?? 0), 'Cooling load');
  if (st.gridMW) return m(load ?? 0, loadTone(load ?? 0), 'Power through');
  if (st.storageMWh) {
    const v = s.storageCapMWh > 0 ? s.storageMWh / s.storageCapMWh : 0;
    return m(v, 'info', 'Stored energy');
  }
  if (st.rawWater) {
    const used = s.rawToTreatment + s.evaporation;
    const v = s.rawSupply > 0 ? used / s.rawSupply : used > 0 ? 1 : 0;
    return m(v, loadTone(v), 'Water use');
  }
  if (st.treatedWater) {
    const v = s.treatedSupply > 0 ? s.treatedDemand / s.treatedSupply : s.treatedDemand > 0 ? 1 : 0;
    return m(v, loadTone(v), 'Clean-water demand');
  }
  if (st.waterStorage) {
    const v = s.tankCapM3 > 0 ? s.tankM3 / s.tankCapM3 : 0;
    return m(v, v < 0.15 && s.evaporation > s.rawSupply ? 'warn' : 'info', 'Water stored');
  }
  if (st.caskCap) {
    const v = s.caskCap > 0 ? site.spent.casks / s.caskCap : 0;
    return m(v, highTone(v), 'Spent-fuel storage');
  }
  if (st.fuelCap) {
    const v = g.fuel / Math.max(1, ctx.fuelCap);
    return m(v, lowTone(v), 'Fuel stock');
  }
  if (st.oreStock || st.oreRate) {
    const v = g.supply.ore / Math.max(1, ctx.caps.ore);
    return m(v, highTone(v), 'Ore stockpile');
  }
  if (st.ycStock || st.ycRate) {
    const v = g.supply.yellowcake / Math.max(1, ctx.caps.yellowcake);
    return m(v, highTone(v), 'Yellowcake store');
  }
  if (st.enrStock) {
    const v = g.supply.enriched / Math.max(1, ctx.caps.enriched);
    return m(v, highTone(v), 'Enriched-uranium store');
  }
  if (st.fabRate || st.inspectRate) {
    const v = g.fuel / Math.max(1, ctx.fuelCap);
    return m(v, highTone(v), 'Fuel store (output)');
  }
  return null;
}
