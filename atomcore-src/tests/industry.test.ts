import { staffUp } from '../src/game/staff/staff';
import { autoWire } from '../src/game/network/network';
import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState, makeBuilding } from '../src/game/state';
import { tick } from '../src/game/engine';
import { setRandom, mulberry32 } from '../src/game/rng';
import { clearModCache } from '../src/game/simulation/modifiers';
import { fuelQuota } from '../src/game/supply/fuelcycle';
import { initEquilibrium } from '../src/game/simulation/reactor';
import { LOCATION_BY_ID } from '../src/game/progression/locations';
import { BUILDING_LIST } from '../src/game/buildings/defs';
import { RESEARCH } from '../src/game/research/tree';
import type { BuildingType, GameState } from '../src/game/types';

beforeEach(() => { setRandom(mulberry32(5)); clearModCache(); });
const run = (s: GameState, sec: number, dt = 0.1) => { for (let t = 0; t < sec; t += dt) tick(s, dt); };

function plant(extra: [BuildingType, number, number][]) {
  const s = createInitialState();
  s.nextEventIn = 1e9; s.level = 14; s.money = 1e9;
  const site = s.sites.riverside; site.size = 40; site.buildings = [];
  const r = makeBuilding(s, 'reactor_epr', 4, 4, 0, true);
  site.buildings.push(r);
  initEquilibrium(r, LOCATION_BY_ID.riverside.ambient, 0); // as when construction finishes
  for (const [t, x, z] of [['turbine_large', 12, 4], ['turbine_large', 12, 8], ['turbine_large', 17, 4], ['cooling_mega', 4, 12], ['cooling_mega', 9, 12], ['substation', 22, 4], ['water_intake', 22, 9], ['admin', 26, 4], ['admin', 26, 8], ['admin', 30, 4], ['admin', 30, 8], ['water_treatment', 22, 12], ['water_treatment', 22, 15], ['water_treatment', 18, 15], ['water_intake', 18, 12], ['admin', 34, 4], ['admin', 34, 8], ['admin', 26, 12], ['admin', 30, 12]] as [BuildingType, number, number][])
    site.buildings.push(makeBuilding(s, t, x, z, 0, true));
  for (const [t, x, z] of extra) site.buildings.push(makeBuilding(s, t, x, z, 0, true));
  for (const b of site.buildings) if (b.type === 'turbine_large') b.level = 3;
  site.links = [];
  autoWire(s, site);
  staffUp(site);
  return { s, site, r };
}

describe('new buildings', () => {
  it('every new building is unlockable and has a model-worthy size', () => {
    for (const t of ['reactor_epr', 'cooling_mega', 'hvdc', 'datacenter', 'hydrogen', 'desal', 'isotopes', 'visitor', 'rail_terminal'] as BuildingType[]) {
      const def = BUILDING_LIST.find((d) => d.type === t)!;
      expect(def).toBeTruthy();
      if (def.unlock.research) expect(RESEARCH.find((r) => r.id === def.unlock.research)?.unlocks).toContain(t);
    }
  });

  it('gigawatt reactor starts from cold without tripping and makes > 1 GW', () => {
    const { s, site, r } = plant([['hvdc', 4, 20]]);
    r.reactor!.setpoint = 1;
    run(s, 900);
    expect(r.reactor!.scrammed).toBe(false);
    expect(site.stats.electricMW).toBeGreaterThan(1000);
  });

  it('data centre pays a premium behind the meter; hydrogen absorbs curtailed power', () => {
    const { s, site, r } = plant([['datacenter', 4, 20], ['hydrogen', 10, 20]]);
    r.reactor!.setpoint = 1;
    run(s, 900);
    const st = site.stats;
    expect(st.industryMW).toBeGreaterThan(79);
    expect(st.importMW).toBe(0);
    // Only one small substation: lots would be curtailed, the electrolyser takes some.
    expect(st.h2MW).toBeGreaterThan(100);
    expect(st.industryIncome).toBeGreaterThan(0);
  });

  it('a data centre with no generation imports its power at a loss', () => {
    const { s, site, r } = plant([['datacenter', 4, 20]]);
    r.reactor!.setpoint = 0;
    r.status = 'broken';
    run(s, 5);
    expect(site.stats.importMW).toBeGreaterThan(79);
    expect(site.stats.industryIncome).toBeLessThan(0);
  });

  it('rail terminals raise the daily fuel quota', () => {
    const { s } = plant([]);
    const q0 = fuelQuota(s);
    s.sites.riverside.buildings.push(makeBuilding(s, 'rail_terminal', 4, 30, 0, true));
    expect(Math.abs(fuelQuota(s) - q0 * 1.5)).toBeLessThan(2);
  });

  it('visitors pay more when reactors run', () => {
    const { s, site, r } = plant([['visitor', 4, 20]]);
    r.reactor!.setpoint = 1;
    run(s, 900);
    expect(site.stats.industryIncome).toBeGreaterThan(6 * 2);
  });
});
