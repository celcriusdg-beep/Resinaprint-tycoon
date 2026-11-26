import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState } from '../src/game/state';
import { tick } from '../src/game/engine';
import * as A from '../src/game/actions';
import { setRandom, mulberry32 } from '../src/game/rng';
import { checkPlacement } from '../src/game/buildings/grid';
import { encodeSave, decodeSave, migrate, toEnvelope } from '../src/systems/save/serialize';
import { simulateOffline } from '../src/systems/offline/offline';
import { clearModCache } from '../src/game/simulation/modifiers';
import { RESEARCH, RESEARCH_BY_ID } from '../src/game/research/tree';
import { BUILDINGS } from '../src/game/buildings/defs';
import type { GameState } from '../src/game/types';

function run(s: GameState, seconds: number, dt = 0.2) {
  for (let t = 0; t < seconds; t += dt) tick(s, dt);
}

beforeEach(() => {
  setRandom(mulberry32(42));
  clearModCache();
});

describe('economy', () => {
  it('starter plant generates electricity and profit', () => {
    const s = createInitialState();
    const m0 = s.money;
    run(s, 30);
    const st = s.sites.riverside.stats;
    expect(st.electricMW).toBeGreaterThan(2);
    expect(st.exportMW).toBeGreaterThan(2);
    expect(s.money).toBeGreaterThan(m0);
  });

  it('more reactor power means more revenue', () => {
    const a = createInitialState();
    const b = createInitialState();
    A.setSetpoint(b, b.sites.riverside.buildings[0].id, 1);
    run(a, 60);
    run(b, 60);
    expect(b.runEarned).toBeGreaterThan(a.runEarned);
  });
});

describe('construction', () => {
  it('places, rejects overlap, and completes buildings', () => {
    const s = createInitialState();
    expect(A.placeBuilding(s, 'cooling_mech', 5, 5, 0)).toMatch(/occupied/);
    expect(A.placeBuilding(s, 'cooling_mech', -1, 0, 0)).toMatch(/Outside/);
    expect(A.placeBuilding(s, 'cooling_mech', 1, 1, 0)).toBeNull();
    const b = s.sites.riverside.buildings.at(-1)!;
    expect(b.status).toBe('constructing');
    run(s, BUILDINGS.cooling_mech.buildTime + 1, 0.5);
    expect(b.status).toBe('active');
    expect(s.stats.buildingsBuilt).toBe(1);
  });

  it('rotation swaps the footprint', () => {
    const s = createInitialState();
    const site = s.sites.riverside;
    // turbine is 3x2; rotated it is 2x3
    expect(checkPlacement(site, 'turbine', 11, 0, 0)).toBeNull();
    expect(checkPlacement(site, 'turbine', 12, 0, 0)).toBe('bounds');
    expect(checkPlacement(site, 'turbine', 12, 0, 1)).toBeNull();
  });

  it('upgrades raise the level after the upgrade time', () => {
    const s = createInitialState();
    s.money = 1e6;
    const t = s.sites.riverside.buildings[1];
    expect(A.upgradeBuilding(s, t.id)).toBeNull();
    expect(t.status).toBe('upgrading');
    run(s, 60, 0.5);
    expect(t.level).toBe(2);
    expect(t.status).toBe('active');
  });

  it('moves a building to a free spot for free', () => {
    const s = createInitialState();
    s.money = 1e6;
    const cooling = s.sites.riverside.buildings[2];
    expect(A.moveBuilding(s, cooling.id, 5, 5, 0)).toMatch(/occupied/); // onto the reactor
    const m0 = s.money;
    expect(A.moveBuilding(s, cooling.id, 1, 1, 1)).toBeNull();
    expect([cooling.x, cooling.z, cooling.rot]).toEqual([1, 1, 1]);
    expect(s.money).toBe(m0);
    // It may also shift by one cell, overlapping only its own old footprint
    expect(A.moveBuilding(s, cooling.id, 2, 1, 1)).toBeNull();
  });

  it('moving running reactors, turbines and upgrading buildings never interrupts them', () => {
    const s = createInitialState();
    s.money = 1e6; s.nextEventIn = 1e9;
    const site = s.sites.riverside;
    const [r, t] = site.buildings;
    run(s, 30, 0.1);
    const p0 = r.reactor!.power, e0 = site.stats.electricMW;
    expect(p0).toBeGreaterThan(0.5);
    expect(A.moveBuilding(s, r.id, 1, 1, 0)).toBeNull();
    expect(A.moveBuilding(s, t.id, 1, 9, 1)).toBeNull();
    expect(r.reactor!.power).toBe(p0);
    expect(r.reactor!.scrammed).toBe(false);
    run(s, 5, 0.1);
    expect(r.reactor!.scrammed).toBe(false);
    expect(site.stats.electricMW).toBeGreaterThan(e0 * 0.95);
    // An upgrade keeps its progress while being moved
    expect(A.upgradeBuilding(s, t.id)).toBeNull();
    run(s, 5, 0.5);
    const prog = t.progress;
    expect(A.moveBuilding(s, t.id, 9, 9, 0)).toBeNull();
    expect(t.status).toBe('upgrading');
    expect(t.progress).toBe(prog);
  });

  it('buying land grows the plot by 4 and keeps buildings in place', () => {
    const s = createInitialState();
    s.money = 1e7;
    const site = s.sites.riverside;
    const r0 = { x: site.buildings[0].x, z: site.buildings[0].z };
    expect(A.expandSite(s, 'riverside')).toBeNull();
    expect(site.size).toBe(18);
    expect(site.buildings[0].x).toBe(r0.x + 2);
    expect(site.buildings[0].z).toBe(r0.z + 2);
    for (let i = 0; i < 20; i++) A.expandSite(s, 'riverside');
    expect(site.size).toBe(38);
    expect(A.expandSite(s, 'riverside')).toMatch(/further/);
  });

  it('a broke company can still repair its only turbine on credit (no soft-lock)', () => {
    const s = createInitialState();
    s.nextEventIn = 1e9;
    const turbine = s.sites.riverside.buildings[1];
    turbine.status = 'broken';
    turbine.condition = 10;
    s.money = -2000;
    expect(A.placeBuilding(s, 'lab', 1, 1, 0)).toMatch(/money/i); // no new construction
    expect(A.repairBuilding(s, turbine.id)).toBeNull();
    expect(turbine.status).toBe('active');
    run(s, 120);
    expect(s.sites.riverside.stats.exportMW).toBeGreaterThan(2);
  });

  it('debt accrues interest', () => {
    const s = createInitialState();
    s.nextEventIn = 1e9;
    s.sites.riverside.buildings[0].reactor!.setpoint = 0; // no income
    s.money = -10_000;
    const ledger0 = s.ledger.other;
    run(s, 10);
    expect(s.ledger.other).toBeLessThan(ledger0);
  });

  it('locks buildings behind research', () => {
    const s = createInitialState();
    s.money = 1e6;
    expect(A.placeBuilding(s, 'reactor_smr', 1, 1, 0)).toMatch(/research/i);
    s.research.completed.push('r_smr');
    expect(A.placeBuilding(s, 'reactor_smr', 1, 1, 0)).toMatch(/permit/i);
    expect(A.applyForPermit(s, 'reactor_smr')).toBeNull();
    s.gameTime += 240;
    expect(A.placeBuilding(s, 'reactor_smr', 1, 1, 0)).toBeNull();
    expect(s.sites.riverside.buildings.at(-1)!.licence).toBe('pending');
  });
});

describe('research', () => {
  it('research completes using points from labs', () => {
    const s = createInitialState();
    s.money = 1e6;
    A.placeBuilding(s, 'lab', 1, 1, 0);
    expect(A.startResearch(s, 'r_fuel1')).toBeNull();
    run(s, 200, 0.5);
    expect(s.research.completed).toContain('r_fuel1');
  });

  it('every prerequisite exists and the tree has no cycles', () => {
    for (const n of RESEARCH) for (const r of n.requires) expect(RESEARCH_BY_ID[r], `${n.id} -> ${r}`).toBeDefined();
    const seen = new Set<string>();
    const visit = (id: string, stack: string[]) => {
      expect(stack).not.toContain(id);
      if (seen.has(id)) return;
      for (const r of RESEARCH_BY_ID[id].requires) visit(r, [...stack, id]);
      seen.add(id);
    };
    for (const n of RESEARCH) visit(n.id, []);
  });
});

describe('reactor safety model', () => {
  it('insufficient cooling raises temperature and SCRAMs the reactor', () => {
    const s = createInitialState();
    const site = s.sites.riverside;
    // Remove all cooling.
    site.buildings = site.buildings.filter((b) => b.type !== 'cooling_mech');
    A.setSetpoint(s, site.buildings[0].id, 1);
    run(s, 60);
    const r = site.buildings[0].reactor!;
    expect(r.scrammed).toBe(true);
    expect(s.stats.scrams).toBeGreaterThan(0);
    // Decay heat persists briefly after shutdown, then falls.
    expect(r.decayHeat).toBeGreaterThan(0);
    run(s, 400);
    expect(r.power).toBeLessThan(2e-3); // source range only
    expect(r.decayHeat).toBeLessThan(0.15);
  });

  it('automatic setback prevents a trip under mild overload', () => {
    const s = createInitialState();
    s.research.completed.push('s_setback');
    clearModCache();
    const site = s.sites.riverside;
    // Slightly undersized cooling: 30 MW cooling vs ~25 MW heat at 125% output.
    s.research.completed.push('r_fuel1');
    clearModCache();
    site.buildings[0].level = 2;
    A.setSetpoint(s, site.buildings[0].id, 1);
    run(s, 120);
    expect(site.buildings[0].reactor!.scrammed).toBe(false);
  });

  it('an empty core means no fission power', () => {
    const s = createInitialState();
    s.sites.riverside.buildings[0].reactor!.coreFuel = 0;
    run(s, 120);
    expect(s.sites.riverside.buildings[0].reactor!.fission).toBeLessThan(0.2);
  });
});

describe('saves', () => {
  it('round-trips through export codes', () => {
    const s = createInitialState();
    run(s, 20);
    const code = encodeSave(s);
    const back = decodeSave(code);
    expect(back.money).toBeCloseTo(s.money);
    expect(back.sites.riverside.buildings.length).toBe(3);
  });

  it('migrates partial saves by filling defaults', () => {
    const s = createInitialState();
    const env = toEnvelope(s) as unknown as { state: Record<string, unknown> };
    delete env.state.automation;
    delete env.state.daily;
    const back = migrate(env);
    expect(back.automation.autoFuel).toBe(false);
    expect(back.daily.counters.energy).toBe(0);
  });

  it('rejects garbage', () => {
    expect(() => decodeSave('hello world')).toThrow();
    expect(() => migrate(null)).toThrow();
  });
});

describe('offline progress', () => {
  it('earns money while away, capped by the offline limit', () => {
    const s = createInitialState();
    run(s, 10);
    const m0 = s.money;
    const rep = simulateOffline(s, 10 * 3600)!;
    expect(rep.simulated).toBe(4 * 3600);
    expect(rep.money).toBeGreaterThan(0);
    expect(s.money).toBeGreaterThan(m0);
  });

  it('does not wreck the plant while away', () => {
    const s = createInitialState();
    simulateOffline(s, 12 * 3600);
    for (const b of s.sites.riverside.buildings) {
      expect(b.condition).toBeGreaterThanOrEqual(50);
      expect(b.status).toBe('active');
    }
    expect(s.sites.riverside.buildings[0].reactor!.scrammed).toBe(false);
  });

  it('ignores very short absences', () => {
    const s = createInitialState();
    expect(simulateOffline(s, 5)).toBeNull();
  });
});

describe('prestige', () => {
  it('restructuring resets the run and grants shares', () => {
    const s = createInitialState();
    expect(A.prestige(s).error).toBeTruthy();
    s.runEarned = 200_000_000;
    const { state } = A.prestige(s);
    expect(state).toBeTruthy();
    expect(state!.prestige.shares).toBeGreaterThan(0);
    expect(state!.prestige.count).toBe(1);
  });
});
