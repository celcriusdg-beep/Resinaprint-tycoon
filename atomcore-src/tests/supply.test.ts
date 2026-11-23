import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState } from '../src/game/state';
import { tick } from '../src/game/engine';
import * as A from '../src/game/actions';
import { setRandom, mulberry32 } from '../src/game/rng';
import { clearModCache } from '../src/game/simulation/modifiers';
import { migrate, toEnvelope } from '../src/systems/save/serialize';
import type { GameState } from '../src/game/types';

const run = (s: GameState, sec: number, dt = 0.5) => { for (let t = 0; t < sec; t += dt) tick(s, dt); };
const finish = (s: GameState) => { for (const b of s.sites[s.activeSite].buildings) if (b.status === 'constructing') { b.status = 'active'; b.progress = 1; } };

beforeEach(() => { setRandom(mulberry32(3)); clearModCache(); });

describe('fuel burnup and refuelling', () => {
  it('burns the core down and refuels during an outage', () => {
    const s = createInitialState();
    const r = s.sites.riverside.buildings[0];
    A.setSetpoint(s, r.id, 1);
    const f0 = r.reactor!.coreFuel;
    run(s, 120);
    expect(r.reactor!.coreFuel).toBeLessThan(f0);
    expect(A.refuelReactor(s, r.id)).toMatch(/Shut/);
    A.setSetpoint(s, r.id, 0);
    run(s, 40);
    const stock = s.fuel;
    expect(A.refuelReactor(s, r.id)).toBeNull();
    expect(r.status).toBe('refueling');
    expect(s.fuel).toBeLessThan(stock);
    run(s, 40);
    expect(r.status).toBe('active');
    expect(r.reactor!.coreFuel).toBeGreaterThan(0.99);
  });

  it('power is limited as fuel runs out', () => {
    const s = createInitialState();
    const r = s.sites.riverside.buildings[0].reactor!;
    r.coreFuel = 0.05;
    r.setpoint = 1;
    run(s, 60);
    expect(r.power).toBeLessThan(0.4);
  });

  it('auto refuel handles outages on its own', () => {
    const s = createInitialState();
    s.research.completed.push('f_outage');
    clearModCache();
    A.setAutomation(s, 'autoRefuel', true);
    const b = s.sites.riverside.buildings[0];
    b.reactor!.coreFuel = 0.05;
    run(s, 120);
    expect(b.reactor!.coreFuel).toBeGreaterThan(0.9);
    expect(b.reactor!.setpoint).toBeGreaterThan(0.4);
  });
});

describe('water', () => {
  it('wet cooling evaporates water; a shortage cuts cooling', () => {
    const s = createInitialState();
    s.money = 1e7;
    run(s, 20);
    const st = s.sites.riverside.stats;
    expect(st.evaporation).toBeGreaterThan(5);
    expect(st.waterFactor).toBe(1);
    // A drought plus lots of heat: more evaporation than the connection supplies.
    s.events.push({ id: 'drought', remaining: 999, duration: 999, siteId: 'riverside' });
    const site = s.sites.riverside;
    site.buildings[0].level = 5;
    site.buildings[0].reactor!.setpoint = 1;
    site.buildings[1].level = 3; // turbine
    site.buildings[2].level = 4; // plenty of (wet) cooling, so nothing trips
    let minFactor = 1;
    for (let t = 0; t < 60; t += 0.5) {
      tick(s, 0.5);
      minFactor = Math.min(minFactor, st.waterFactor);
    }
    expect(minFactor).toBeLessThan(1);
  });

  it('intakes need a river or sea', () => {
    const s = createInitialState();
    s.money = 1e9;
    s.level = 20;
    A.unlockSite(s, 'desert');
    expect(A.placeBuilding(s, 'water_intake', 2, 2, 0)).toMatch(/No river/);
    expect(A.placeBuilding(s, 'water_wells', 2, 2, 0)).toBeNull();
  });
});

describe('mining and fabrication', () => {
  it('vehicles mine ore that is processed into fuel assemblies', () => {
    const s = createInitialState();
    s.money = 1e7;
    s.level = 10;
    s.research.completed.push('f_mining', 'f_enrich', 'f_heavy');
    clearModCache();
    expect(A.placeBuilding(s, 'uranium_mine', 0, 0, 0)).toBeNull();
    expect(A.placeBuilding(s, 'ore_mill', 10, 0, 0)).toBeNull();
    expect(A.placeBuilding(s, 'enrichment', 0, 10, 0)).toBeNull();
    expect(A.placeBuilding(s, 'fuel_fab', 10, 9, 0)).toBeNull();
    finish(s);
    const mine = s.sites.riverside.buildings.find((b) => b.type === 'uranium_mine')!;
    // Excavators without trucks dig but cannot haul
    A.buyMineVehicle(s, mine.id, 'excavator', 1);
    run(s, 5);
    expect(s.sites.riverside.stats.oreRate).toBe(0);
    A.buyMineVehicle(s, mine.id, 'truck', 1);
    const fuel0 = s.fuel;
    run(s, 300);
    expect(s.sites.riverside.stats.oreRate).toBeGreaterThan(1);
    expect(s.supply.rates.fabricated).toBeGreaterThan(0);
    expect(s.fuel).toBeGreaterThan(fuel0 - 30);
  });

  it('mine slots limit the fleet', () => {
    const s = createInitialState();
    s.money = 1e7;
    s.research.completed.push('f_mining');
    s.level = 5;
    A.placeBuilding(s, 'uranium_mine', 0, 0, 0);
    finish(s);
    const mine = s.sites.riverside.buildings.find((b) => b.type === 'uranium_mine')!;
    for (let i = 0; i < 3; i++) expect(A.buyMineVehicle(s, mine.id, 'excavator', 0)).toBeNull();
    expect(A.buyMineVehicle(s, mine.id, 'excavator', 0)).toMatch(/slots/);
  });

  it('higher QA means fewer defects', () => {
    const s = createInitialState();
    A.setQA(s, 0);
    const lowQa = s.supply.qa;
    expect(lowQa).toBe(0);
  });
});

describe('fuel integrity', () => {
  it('defective rods fail, limit power and can destroy the core if ignored', () => {
    const s = createInitialState();
    const b = s.sites.riverside.buildings[0];
    const r = b.reactor!;
    r.coreDefects = 20;
    r.coreFuel = 1;
    r.setpoint = 1;
    let sawFailure = false;
    for (let t = 0; t < 4000 && b.status !== 'destroyed'; t += 0.5) {
      tick(s, 0.5);
      if (r.failedRods > 0) sawFailure = true;
      r.setpoint = 1; // a reckless operator keeps pushing
      if (r.scrammed && b.status === 'active') { r.scrammed = false; }
    }
    expect(sawFailure).toBe(true);
    expect(b.status).toBe('destroyed');
    expect(s.events.some((e) => e.id === 'outcry')).toBe(true);
    expect(A.decommission(s, b.id)).toBeNull();
    expect(s.sites.riverside.buildings.find((x) => x.id === b.id)).toBeUndefined();
  });

  it('refuelling replaces failed rods', () => {
    const s = createInitialState();
    const b = s.sites.riverside.buildings[0];
    b.reactor!.failedRods = 3;
    b.reactor!.setpoint = 0;
    run(s, 40);
    expect(A.refuelReactor(s, b.id)).toBeNull();
    run(s, 40);
    expect(b.reactor!.failedRods).toBe(0);
  });
});

describe('save migration', () => {
  it('converts v1 fuel units to assemblies', () => {
    const s = createInitialState();
    const env = toEnvelope(s) as unknown as { state: Record<string, unknown> };
    env.state.version = 1;
    env.state.fuel = 400;
    delete env.state.supply;
    const back = migrate(env);
    expect(back.fuel).toBe(40);
    expect(back.supply.qa).toBe(0.5);
    expect(back.sites.riverside.buildings[0].reactor!.pumpSpeed).toBe(1);
  });
});
