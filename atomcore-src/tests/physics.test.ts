import { staffUp } from '../src/game/staff/staff';
import { autoWire } from '../src/game/network/network';
import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState, makeBuilding } from '../src/game/state';
import { tick } from '../src/game/engine';
import * as A from '../src/game/actions';
import { setRandom, mulberry32 } from '../src/game/rng';
import { clearModCache } from '../src/game/simulation/modifiers';
import { initEquilibrium, reactivityHeadroom } from '../src/game/simulation/reactor';
import { xenonEquilibrium, stepXenon, rodInserted, stepKinetics, physicsFor } from '../src/game/simulation/physics';
import type { GameState } from '../src/game/types';

const run = (s: GameState, sec: number, dt = 0.1) => { for (let t = 0; t < sec; t += dt) tick(s, dt); };
beforeEach(() => { setRandom(mulberry32(11)); clearModCache(); });

/** A riverside plant with one big PWR (and enough turbines/cooling/water for it). */
function pwrPlant(opts: { edg?: boolean } = {}) {
  const s = createInitialState();
  s.money = 1e9;
  s.level = 15;
  const site = s.sites.riverside;
  site.size = 26;
  site.buildings = [];
  const add = (t: Parameters<typeof makeBuilding>[1], x: number, z: number, lvl = 1) => {
    const b = makeBuilding(s, t, x, z, 0, true);
    b.level = lvl;
    site.buildings.push(b);
    return b;
  };
  const pwr = add('reactor_pwr', 2, 2);
  add('turbine_large', 6, 2);
  add('cooling_tower', 11, 2, 2);
  add('water_intake', 15, 2, 4);
  add('water_treatment', 18, 2, 2);
  add('substation', 2, 7, 6);
  add('admin', 5, 7, 4);
  if (opts.edg) { add('generator_emergency', 8, 7); add('generator_emergency', 8, 9); }
  site.links = [];
  autoWire(s, site);
  staffUp(site);
  pwr.reactor!.setpoint = 1;
  initEquilibrium(pwr, 18, 1);
  s.fuel = 2000;
  s.nextEventIn = 1e9; // no random events in physics tests
  return { s, pwr };
}

describe('kinetics', () => {
  it('reactivity below prompt critical gives the classic stable period', () => {
    const p = physicsFor('reactor_pwr');
    let n = 1, S = 1;
    for (let i = 0; i < 100; i++) ({ n, S } = stepKinetics(p, n, S, 100, 0.1));
    // T = (β − ρ)/(λρ) = 550 / 8 ≈ 69 s → after 10 s power ≈ e^(10/69) × prompt jump
    expect(n).toBeGreaterThan(1.25);
    expect(n).toBeLessThan(1.4);
  });

  it('negative reactivity gives a prompt drop then decay on the precursors', () => {
    const p = physicsFor('reactor_pwr');
    const { n } = stepKinetics(p, 1, 1, -3000, 0.05);
    expect(n).toBeLessThan(0.2); // prompt drop β/(β−ρ)
    expect(n).toBeGreaterThan(0.1);
  });

  it('rod worth curve is S-shaped', () => {
    expect(rodInserted(0)).toBeCloseTo(1);
    expect(rodInserted(1)).toBeCloseTo(0);
    expect(rodInserted(0.5)).toBeCloseTo(0.5);
    expect(rodInserted(0.1)).toBeGreaterThan(0.95); // tip of the rods is worth little
  });
});

describe('xenon', () => {
  it('equilibrium xenon saturates with power', () => {
    expect(xenonEquilibrium(1)).toBeCloseTo(1);
    expect(xenonEquilibrium(0.5)).toBeGreaterThan(0.6); // burnout makes it non-linear
  });

  it('peaks after a shutdown, then decays', () => {
    let I = 1, X = 1, peak = 1, tPeak = 0;
    for (let t = 0; t < 1200; t++) {
      [I, X] = stepXenon(I, X, 0, 1);
      if (X > peak) { peak = X; tPeak = t; }
    }
    expect(peak).toBeGreaterThan(1.5);
    expect(tPeak).toBeGreaterThan(40); // several game hours later
    expect(X).toBeLessThan(0.5);
  });

  it('a late-cycle trip can leave too little reactivity to restart (xenon dead time)', () => {
    const { s, pwr } = pwrPlant({ edg: true });
    const r = pwr.reactor!;
    r.coreFuel = 0.2;
    initEquilibrium(pwr, 18, 1);
    A.manualScram(s, pwr.id);
    let minHeadroom = Infinity;
    for (let t = 0; t < 120; t += 0.5) {
      tick(s, 0.5);
      minHeadroom = Math.min(minHeadroom, reactivityHeadroom(pwr));
    }
    expect(minHeadroom).toBeLessThan(0);
  });
});

describe('feedback and control', () => {
  it('automatic rod control reaches and holds a new power level', () => {
    const { s, pwr } = pwrPlant({ edg: true });
    pwr.reactor!.setpoint = 0.6;
    run(s, 180);
    expect(pwr.reactor!.power).toBeGreaterThan(0.55);
    expect(pwr.reactor!.power).toBeLessThan(0.65);
    expect(pwr.reactor!.tripCause).toBeNull();
  });

  it('boron dilution adds reactivity; manual rods let power rise until feedback balances it', () => {
    const { s, pwr } = pwrPlant({ edg: true });
    const r = pwr.reactor!;
    r.setpoint = 0.5;
    run(s, 150);
    r.autoRods = false;
    r.autoBoron = false;
    const p0 = r.power;
    r.boron -= 10; // +100 pcm
    run(s, 60);
    expect(r.power).toBeGreaterThan(p0 * 1.05);
    // Temperature feedback stops the rise without a trip
    expect(r.tripCause).toBeNull();
  });

  it('a rapid rod withdrawal trips the reactor before the fuel melts', () => {
    const { s, pwr } = pwrPlant({ edg: true });
    const r = pwr.reactor!;
    r.setpoint = 0.3;
    run(s, 120);
    r.autoRods = false;
    r.autoBoron = false;
    r.boron = Math.max(0, r.boron - 120); // ≈ +1200 pcm: beyond prompt critical
    run(s, 5, 0.05);
    expect(r.scrammed).toBe(true);
    expect(pwr.status).not.toBe('destroyed');
  });
});

describe('core damage requires losing cooling', () => {
  it('station blackout without backup power leads to core damage in a PWR', () => {
    const { s, pwr } = pwrPlant();
    s.events.push({ id: 'blackout', remaining: 900, duration: 900, siteId: 'riverside' });
    run(s, 60, 0.25);
    expect(pwr.status).toBe('active'); // batteries still running emergency feedwater
    run(s, 540, 0.25);
    expect(pwr.status).toBe('destroyed');
    expect(s.stats.coreDamage).toBe(1);
    expect(s.events.some((e) => e.id === 'outcry')).toBe(true);
    expect(A.decommission(s, pwr.id)).toBeNull();
  });

  it('emergency diesel generators keep the core cooled through the same blackout', () => {
    const { s, pwr } = pwrPlant({ edg: true });
    s.events.push({ id: 'blackout', remaining: 900, duration: 900, siteId: 'riverside' });
    run(s, 600, 0.25);
    expect(pwr.status).toBe('active');
    expect(pwr.reactor!.scrammed).toBe(true);
    expect(pwr.reactor!.inventory).toBeGreaterThan(0.9);
  });

  it('passive safety research also saves the core', () => {
    const { s, pwr } = pwrPlant();
    s.research.completed.push('s_setback', 's_passive');
    clearModCache();
    s.events.push({ id: 'blackout', remaining: 900, duration: 900, siteId: 'riverside' });
    run(s, 600, 0.25);
    expect(pwr.status).toBe('active');
  });

  it('the small pilot reactor survives a long blackout on natural circulation', () => {
    const s = createInitialState();
    s.nextEventIn = 1e9;
    s.events.push({ id: 'blackout', remaining: 900, duration: 900, siteId: 'riverside' });
    run(s, 600, 0.25);
    expect(s.sites.riverside.buildings[0].status).toBe('active');
  });
});

describe('loss of the main heat sink', () => {
  for (const dt of [0.1, 1, 5]) {
    it(`trips but does not melt when all cooling goes offline (step ${dt} s)`, () => {
      const s = createInitialState();
      s.nextEventIn = 1e9;
      const site = s.sites.riverside;
      site.buildings[0].reactor!.setpoint = 1;
      for (let t = 0; t < 30; t += 0.1) tick(s, 0.1);
      // e.g. the only cooling unit taken offline for an upgrade
      site.buildings[2].status = 'upgrading';
      site.buildings[2].buildTotal = 1e9;
      site.buildings[2].progress = 0;
      for (let t = 0; t < 300; t += dt) tick(s, dt);
      expect(site.buildings[0].reactor!.scrammed).toBe(true);
      expect(site.buildings[0].status).toBe('active');
      expect(s.stats.coreDamage).toBe(0);
    });
  }
});

describe('short blackouts', () => {
  it('a normal 70 s grid loss is ridden out on batteries even without generators', () => {
    const { s, pwr } = pwrPlant();
    s.events.push({ id: 'blackout', remaining: 70, duration: 70, siteId: 'riverside' });
    run(s, 300, 0.25);
    expect(pwr.status).toBe('active');
  });
});

describe('spent fuel', () => {
  it('a full pool blocks refuelling until dry casks make room', () => {
    const s = createInitialState();
    const b = s.sites.riverside.buildings[0];
    s.sites.riverside.spent.pool = 1000;
    b.reactor!.setpoint = 0;
    run(s, 90);
    expect(A.refuelReactor(s, b.id)).toMatch(/pool is full/i);
  });
});

describe('new PWR cold startup', () => {
  it('reaches its setpoint without a short-period trip, also after a SCRAM', async () => {
    const { createInitialState, makeBuilding } = await import('../src/game/state');
    const { tick } = await import('../src/game/engine');
    const A = await import('../src/game/actions');
    const s = createInitialState();
    s.nextEventIn = 1e9; s.money = 1e9; s.level = 12;
    const site = s.sites.riverside; site.size = 40; site.buildings = [];
    const r = makeBuilding(s, 'reactor_pwr', 5, 5, 0, false);
    r.progress = 0.999;
    site.buildings.push(r);
    for (const [t, x, z] of [['turbine_large', 15, 5], ['cooling_tower', 5, 15], ['cooling_tower', 12, 15], ['cooling_tower', 19, 15], ['substation', 25, 5], ['water_intake', 25, 15]] as const)
      site.buildings.push(makeBuilding(s, t, x, z, 0, true));
    site.links = [];
    autoWire(s, site);
    staffUp(site);
    let minPeriod = Infinity;
    for (let t = 0; t < 1800; t += 0.1) {
      tick(s, 0.1);
      const x = r.reactor!;
      if (x.period > 0) minPeriod = Math.min(minPeriod, x.period);
      expect(x.tripCause === 'Short reactor period').toBe(false);
      if (Math.abs(t - 600) < 0.05) { expect(x.power).toBeGreaterThan(0.45); A.manualScram(s, r.id); }
      if (Math.abs(t - 800) < 0.05) expect(A.restartReactor(s, r.id)).toBeNull();
    }
    expect(r.reactor!.power).toBeGreaterThan(0.45);
    expect(minPeriod).toBeGreaterThan(15);
  });
});
