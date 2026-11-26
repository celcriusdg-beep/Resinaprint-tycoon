import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/game/state';
import { tick } from '../src/game/engine';
import { RANDOM_INCIDENTS } from '../src/game/accidents/accidents';
import { buildingMeter, meterContext } from '../src/game/meters';
import { BUILDINGS } from '../src/game/buildings/defs';

describe('building meters', () => {
  it('gives reactors, turbines and cooling a live load reading', () => {
    RANDOM_INCIDENTS.on = false;
    const g = createInitialState();
    g.nextEventIn = 1e9;
    const site = g.sites.riverside;
    for (let i = 0; i < 200; i++) tick(g, 0.1);
    const ctx = meterContext(g);
    for (const b of site.buildings) {
      const cat = BUILDINGS[b.type].category;
      const mt = buildingMeter(g, site, b, ctx);
      if (cat === 'reactor' || cat === 'power' || cat === 'cooling' || cat === 'grid') {
        expect(mt, b.type).not.toBeNull();
        expect(mt!.value).toBeGreaterThanOrEqual(0);
        expect(mt!.value).toBeLessThanOrEqual(1);
        expect(mt!.text).toMatch(/^(\d+%|Max|Full|SCRAM|Off|Refuel|Broken)$/);
      }
    }
    const turbine = site.buildings.find((b) => BUILDINGS[b.type].category === 'power')!;
    expect(buildingMeter(g, site, turbine, ctx)!.value).toBeGreaterThan(0);
  });
});
