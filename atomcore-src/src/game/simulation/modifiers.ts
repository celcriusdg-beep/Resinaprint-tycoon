import type { GameState, Modifiers, ModKey } from '../types';
import { RESEARCH_BY_ID } from '../research/tree';
import { prestigeMult } from '../progression/prestige';
import { LOCATION_BY_ID } from '../progression/locations';
import { TRANSMISSION_LOSS, OFFLINE_BASE_EFF, OFFLINE_BASE_HOURS } from '../constants';

// Research, prestige, staff training and location bonuses are folded into one
// Modifiers object. Multiplicative stats start at 1 and research adds to them
// (+0.1 → ×1.1); absolute stats are plain sums.

export function baseMods(): Modifiers {
  return {
    reactorOutput: 1, thermalEff: 0, steamCap: 1, cooling: 1, grid: 1, storage: 1, research: 1, wear: 1,
    fuelUse: 1, upkeep: 1, salary: 1, buildCost: 1, buildSpeed: 1, price: 1, demand: 1,
    transmissionLoss: TRANSMISSION_LOSS, safety: 0, offlineEff: OFFLINE_BASE_EFF, offlineHours: OFFLINE_BASE_HOURS,
    staffCap: 0, contractSlots: 0, tripMargin: 0, rampRate: 1, autoSetback: false,
    defectRate: 1, defectHazard: 1, refuelSpeed: 1, evaporation: 1, treatedUse: 1, mining: 1, processing: 1,
  };
}

const cache = new Map<string, { key: string; mods: Modifiers }>();

function cacheKey(s: GameState): string {
  return `${s.research.completed.join(",")}|${s.prestige.shares}|${s.staffTraining}`;
}

/** Company-wide modifiers (no location factors). */
export function companyMods(s: GameState): Modifiers {
  const key = cacheKey(s);
  const hit = cache.get('_company');
  if (hit && hit.key === key) return hit.mods;
  const m = baseMods();
  for (const id of s.research.completed) {
    const node = RESEARCH_BY_ID[id];
    if (!node) continue;
    if (node.autoSetback) m.autoSetback = true;
    if (!node.effects) continue;
    // Both multiplicative and absolute stats are additive sums of effects.
    for (const [k, v] of Object.entries(node.effects) as [ModKey, number][]) (m[k] as number) += v;
  }
  // Clamp multiplicative reductions so they never go below a sane floor.
  m.wear = Math.max(0.2, m.wear);
  m.defectRate = Math.max(0.1, m.defectRate);
  m.defectHazard = Math.max(0.1, m.defectHazard);
  m.evaporation = Math.max(0.3, m.evaporation);
  m.treatedUse = Math.max(0.3, m.treatedUse);
  m.fuelUse = Math.max(0.2, m.fuelUse);
  m.buildCost = Math.max(0.4, m.buildCost);
  m.upkeep = Math.max(0.4, m.upkeep);
  m.transmissionLoss = Math.max(0.005, m.transmissionLoss);
  m.offlineEff = Math.min(1, m.offlineEff);
  // Prestige shares.
  const pm = prestigeMult(s.prestige.shares);
  m.price *= pm;
  m.research *= pm;
  m.buildSpeed *= 1 + s.prestige.shares * 0.01;
  // Staff training: each level +4% output and research, +10% salaries.
  m.reactorOutput *= 1 + s.staffTraining * 0.04;
  m.research *= 1 + s.staffTraining * 0.04;
  m.salary *= 1 + s.staffTraining * 0.1;
  cache.set('_company', { key, mods: m });
  return m;
}

/** Modifiers including the location's natural bonuses. */
export function getMods(s: GameState, siteId: string): Modifiers {
  const key = cacheKey(s);
  const hit = cache.get(siteId);
  if (hit && hit.key === key) return hit.mods;
  const c = companyMods(s);
  const loc = LOCATION_BY_ID[siteId];
  const m: Modifiers = { ...c };
  if (loc) {
    m.cooling *= loc.coolingMult;
    m.price *= loc.priceMult;
    m.buildCost *= loc.buildCostMult;
  }
  cache.set(siteId, { key, mods: m });
  return m;
}

export function clearModCache(): void {
  cache.clear();
}
