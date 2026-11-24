import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState, makeBuilding } from '../src/game/state';
import { tick } from '../src/game/engine';
import { setRandom, mulberry32 } from '../src/game/rng';
import { clearModCache } from '../src/game/simulation/modifiers';
import { initEquilibrium } from '../src/game/simulation/reactor';
import { LOCATION_BY_ID } from '../src/game/progression/locations';
import { BUILDING_LIST, SECTIONS } from '../src/game/buildings/defs';
import { RESEARCH } from '../src/game/research/tree';
import { caskLoadRate } from '../src/game/supply/fuelcycle';
import type { BuildingType, GameState } from '../src/game/types';

beforeEach(() => { setRandom(mulberry32(9)); clearModCache(); });
const run = (s: GameState, sec: number, dt = 0.1) => { for (let t = 0; t < sec; t += dt) tick(s, dt); };

function site(types: [BuildingType, number, number][], reactor?: BuildingType) {
  const s = createInitialState();
  s.nextEventIn = 1e9; s.level = 25; s.money = 1e10;
  const st = s.sites.riverside; st.size = 40; st.buildings = [];
  let r;
  if (reactor) {
    r = makeBuilding(s, reactor, 2, 2, 0, true);
    st.buildings.push(r);
    initEquilibrium(r, LOCATION_BY_ID.riverside.ambient, 0);
  }
  for (const [t, x, z] of types) st.buildings.push(makeBuilding(s, t, x, z, 0, true));
  return { s, st, r };
}

describe('build menu tiers', () => {
  it('every building has a section that exists in its category and a tier 1–5', () => {
    for (const d of BUILDING_LIST) {
      expect(SECTIONS[d.category].some((x) => x.id === d.section), d.type).toBe(true);
      expect(d.tier).toBeGreaterThanOrEqual(1);
      expect(d.tier).toBeLessThanOrEqual(5);
      if (d.unlock.research) expect(RESEARCH.find((r) => r.id === d.unlock.research)?.unlocks ?? [], d.type).toContain(d.type);
    }
    for (const [cat, secs] of Object.entries(SECTIONS)) for (const x of secs) expect(BUILDING_LIST.some((d) => d.category === cat && d.section === x.id), `${cat}/${x.id}`).toBe(true);
  });

  it('higher-tier turbines raise plant efficiency', () => {
    const base: [BuildingType, number, number][] = [['cooling_mega', 10, 2], ['substation_400', 20, 2], ['water_treatment', 20, 8], ['water_treatment', 24, 8], ['admin', 28, 2], ['admin', 28, 6]];
    const a = site([...base, ['turbine_large', 2, 10]], 'reactor_pwr');
    const b = site([...base, ['turbine_sco2', 2, 10]], 'reactor_pwr');
    for (const x of [a, b]) { x.r!.reactor!.setpoint = 1; run(x.s, 600); }
    expect(b.st.stats.efficiency - a.st.stats.efficiency).toBeCloseTo(0.05, 2);
    expect(b.st.stats.electricMW).toBeGreaterThan(a.st.stats.electricMW * 1.1);
  });

  it('water-free cooling evaporates nothing', () => {
    const wet = site([['turbine_large', 2, 10], ['cooling_mega', 10, 2], ['water_treatment', 20, 8], ['water_treatment', 24, 8], ['admin', 28, 2]], 'reactor_pwr');
    const dry = site([['turbine_large', 2, 10], ['cooling_sky', 10, 2], ['water_treatment', 20, 8], ['water_treatment', 24, 8], ['admin', 28, 2]], 'reactor_pwr');
    for (const x of [wet, dry]) { x.r!.reactor!.setpoint = 1; run(x.s, 400); }
    expect(wet.st.stats.evaporation).toBeGreaterThan(100);
    expect(dry.st.stats.evaporation).toBeLessThan(1);
    expect(dry.r!.reactor!.scrammed).toBe(false);
  });

  it('underground mines and ISR produce without vehicles', () => {
    const { s } = site([['mine_underground', 2, 2], ['mine_isr', 8, 2], ['admin', 20, 2], ['admin', 24, 2]]);
    run(s, 5);
    expect(s.supply.rates.mined).toBeGreaterThan(14);
    expect(s.supply.rates.leached ?? 0).toBeGreaterThan(7);
    expect(s.supply.yellowcake).toBeGreaterThan(30);
  });

  it('the spent-fuel vault loads much faster than a cask pad', () => {
    const a = site([['dry_cask', 2, 2]]);
    const b = site([['spent_vault', 2, 2]]);
    expect(caskLoadRate(b.st)).toBeCloseTo(caskLoadRate(a.st) * 6);
  });

  for (const t of ['reactor_sfr', 'reactor_smr_park'] as BuildingType[]) {
    it(`${t} starts from cold without a trip`, () => {
      const { s, r } = site([['turbine_super', 10, 2], ['cooling_mega', 2, 10], ['cooling_fanassist', 8, 10], ['hvdc', 20, 2], ['treatment_edi', 20, 8], ['intake_large', 20, 14], ['admin', 28, 2], ['admin', 28, 6], ['hq', 28, 10]], t);
      r!.reactor!.setpoint = 1;
      run(s, 900);
      expect(r!.reactor!.scrammed, r!.reactor!.tripCause ?? '').toBe(false);
      expect(r!.reactor!.power).toBeGreaterThan(0.9);
    });
  }
});
