import type { BuildingType, GameState } from './types';
import { createInitialState, makeBuilding } from './state';
import { RESEARCH } from './research/tree';
import { BUILDING_LIST } from './buildings/defs';
import { findFreeSpot } from './buildings/grid';

/** Debug sandbox (?showcase=1): every building type on one large plot. Never saved. */
export function createShowcaseState(): GameState {
  const s = createInitialState();
  s.money = 5e9;
  s.level = 25;
  s.research.completed = RESEARCH.map((r) => r.id);
  const site = s.sites.riverside;
  site.size = 26;
  site.buildings = [];
  const order: BuildingType[] = ['reactor_fusion', 'reactor_pwr', 'reactor_bwr', 'reactor_msr', 'cooling_tower', 'turbine_large',
    ...BUILDING_LIST.map((d) => d.type).filter((t) => !['reactor_fusion', 'reactor_pwr', 'reactor_bwr', 'reactor_msr', 'cooling_tower', 'turbine_large'].includes(t))];
  for (const t of order) {
    const spot = findFreeSpot(site, t, 0);
    if (!spot) continue;
    const b = makeBuilding(s, t, spot.x, spot.z, 0, true);
    if (b.reactor) {
      b.reactor.setpoint = 0.8;
      b.reactor.power = 0.8;
    }
    site.buildings.push(b);
  }
  s.automation = { autoFuel: true, autoRepair: true, autoRestart: true, loadFollow: false, smartStorage: true };
  s.fuel = 1e6;
  return s;
}
