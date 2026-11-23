import type { GameState } from '../../game/types';
import { tick } from '../../game/engine';
import { companyMods } from '../../game/simulation/modifiers';
import { RESEARCH_BY_ID } from '../../game/research/tree';

function researchTotal(s: GameState): number {
  return s.research.points + s.research.progress + s.research.completed.reduce((a, id) => a + (RESEARCH_BY_ID[id]?.cost ?? 0), 0);
}

export interface OfflineReport {
  elapsed: number; // real seconds away
  simulated: number; // seconds actually simulated (capped)
  capHours: number;
  efficiency: number;
  money: number;
  energyMWh: number;
  research: number;
  levels: number;
  completed: number; // constructions finished
}

/**
 * Advance the game for the time the player was away. Uses the real simulation
 * in coarse steps with random events disabled; revenue and research are scaled
 * by the offline efficiency. Elapsed time is capped by research.
 */
export function simulateOffline(s: GameState, elapsedSeconds: number): OfflineReport | null {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 30) return null;
  const mods = companyMods(s);
  const capSeconds = mods.offlineHours * 3600;
  const simulated = Math.min(elapsedSeconds, capSeconds);
  const before = {
    money: s.money,
    energy: s.stats.energyMWh,
    research: researchTotal(s),
    level: s.level,
    built: s.stats.buildingsBuilt + s.stats.upgrades,
  };
  const dt = simulated > 3600 ? 5 : 2;
  let t = 0;
  while (t < simulated) {
    const step = Math.min(dt, simulated - t);
    tick(s, step, { offline: true });
    t += step;
  }
  return {
    elapsed: elapsedSeconds,
    simulated,
    capHours: mods.offlineHours,
    efficiency: mods.offlineEff,
    money: s.money - before.money,
    energyMWh: s.stats.energyMWh - before.energy,
    research: Math.max(0, researchTotal(s) - before.research),
    levels: s.level - before.level,
    completed: s.stats.buildingsBuilt + s.stats.upgrades - before.built,
  };
}
