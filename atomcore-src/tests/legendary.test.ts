import { describe, expect, it } from 'vitest';
import { RANDOM_INCIDENTS } from '../src/game/accidents/accidents';
import { createInitialState, makeBuilding } from '../src/game/state';
import { tick } from '../src/game/engine';
import { autoWire } from '../src/game/network/network';
import { staffUp } from '../src/game/staff/staff';
import { initEquilibrium } from '../src/game/simulation/reactor';
import { BUILDINGS } from '../src/game/buildings/defs';
import { RESEARCH } from '../src/game/research/tree';
import type { BuildingType } from '../src/game/types';

const NEW: BuildingType[] = [
  'reactor_stellarator', 'reactor_citadel', 'turbine_brayton', 'turbine_collector', 'cooling_vortex', 'cooling_spire',
  'storage_gravity', 'storage_smes', 'water_graphene', 'water_harvester', 'treatment_sieve', 'treatment_cathedral',
  'water_cistern', 'water_hanging', 'grid_mega', 'grid_beacon', 'fuel_silo', 'fuel_citadel', 'spent_borehole',
  'spent_transmute', 'mine_bore', 'mine_seawater', 'mill_plasma', 'mill_molecular', 'enrich_ring', 'enrich_quantum',
  'fab_printer', 'fab_foundry', 'qa_muon', 'qa_spire',
];

describe('T5 / T6 buildings', () => {
  it('each one is unlocked by a research node and sits in tier 5 or 6', () => {
    for (const t of NEW) {
      const d = BUILDINGS[t];
      expect(d, t).toBeDefined();
      expect([5, 6]).toContain(d.tier);
      expect(RESEARCH.some((r) => r.unlocks?.includes(t)), t).toBe(true);
    }
    expect(NEW.filter((t) => BUILDINGS[t].tier === 6)).toHaveLength(15);
  });

  it('a stellarator plant with T6 turbines, cooling and export runs and sells power', () => {
    RANDOM_INCIDENTS.on = false;
    const s = createInitialState();
    s.nextEventIn = 1e9;
    s.level = 30;
    s.money = 1e12;
    const site = s.sites.riverside;
    site.size = 48;
    site.buildings = [];
    site.links = [];
    site.reg.nextInspection = 1e9;
    const put = (t: BuildingType, x: number, z: number) => site.buildings.push(makeBuilding(s, t, x, z, 0, true));
    put('reactor_stellarator', 2, 2);
    put('turbine_collector', 10, 2);
    put('turbine_collector', 18, 2);
    put('cooling_spire', 10, 10);
    put('cooling_spire', 18, 10);
    put('grid_beacon', 26, 2);
    put('water_harvester', 26, 10);
    put('treatment_sieve', 2, 10);
    for (const b of site.buildings) if (b.reactor) initEquilibrium(b, 15, 1);
    autoWire(s, site);
    staffUp(site);
    s.fuel = 1e6;
    for (let i = 0; i < 300; i++) tick(s, 0.1);
    expect(site.stats.thermalMW).toBeGreaterThan(30_000);
    expect(site.stats.strandedHeatMW).toBeLessThan(1);
    expect(site.stats.exportMW).toBeGreaterThan(10_000);
  });
});
