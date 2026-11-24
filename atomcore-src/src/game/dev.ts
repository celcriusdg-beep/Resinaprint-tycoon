import type { BuildingType, GameState } from './types';
import { createInitialState, makeBuilding, makeSite } from './state';
import { initEquilibrium } from './simulation/reactor';
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
  site.size = 50;
  site.buildings = [];
  const order: BuildingType[] = ['reactor_epr', 'cooling_mega', 'hvdc', 'datacenter', 'hydrogen', 'rail_terminal', 'visitor', 'isotopes', 'desal', 'reactor_fusion', 'reactor_pwr', 'reactor_bwr', 'reactor_msr', 'cooling_tower', 'turbine_large',
    ...BUILDING_LIST.map((d) => d.type).filter((t) => !['reactor_epr', 'cooling_mega', 'hvdc', 'datacenter', 'hydrogen', 'rail_terminal', 'visitor', 'isotopes', 'desal', 'reactor_fusion', 'reactor_pwr', 'reactor_bwr', 'reactor_msr', 'cooling_tower', 'turbine_large'].includes(t))];
  for (const t of order) {
    const spot = findFreeSpot(site, t, 0);
    if (!spot) continue;
    const b = makeBuilding(s, t, spot.x, spot.z, 0, true);
    if (b.reactor) {
      b.reactor.setpoint = 0.8;
      initEquilibrium(b, 18, 0.8);
    }
    if (b.vehicles) b.vehicles = { excavators: [1, 1, 1, 1, 1], trucks: [1, 1, 1, 2] };
    site.buildings.push(b);
  }
  // Other sites, with a small plant each, so every biome can be inspected.
  for (const id of ['coastal', 'desert', 'arctic']) {
    const other = makeSite(id);
    s.sites[id] = other;
    s.unlockedSites.push(id);
    for (const t of ['reactor_pwr', 'cooling_tower', 'turbine_large', 'substation', 'admin'] as BuildingType[]) {
      const spot = findFreeSpot(other, t, 0);
      if (spot) other.buildings.push(makeBuilding(s, t, spot.x, spot.z, 0, true));
    }
  }
  s.automation = { autoFuel: true, autoRefuel: true, autoRepair: true, autoRestart: true, loadFollow: false, smartStorage: true };
  s.fuel = 1e6;
  return s;
}
