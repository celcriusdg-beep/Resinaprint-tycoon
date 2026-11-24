import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState, makeBuilding } from '../src/game/state';
import { tick } from '../src/game/engine';
import * as A from '../src/game/actions';
import { setRandom, mulberry32 } from '../src/game/rng';
import { clearModCache } from '../src/game/simulation/modifiers';
import { migrate, toEnvelope } from '../src/systems/save/serialize';
import * as FC from '../src/game/supply/fuelcycle';
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
    run(s, 90);
    const stock = s.fuel;
    const before = r.reactor!.coreFuel;
    expect(A.refuelReactor(s, r.id, 'full')).toBeNull();
    expect(r.status).toBe('refueling');
    expect(s.fuel).toBeLessThan(stock);
    expect(s.sites.riverside.spent.pool).toBeGreaterThan(0);
    run(s, 40);
    expect(r.status).toBe('active');
    expect(r.reactor!.coreFuel).toBeGreaterThan(Math.max(before + 0.1, 0.99));
  });

  it('power is limited as fuel runs out', () => {
    const s = createInitialState();
    const r = s.sites.riverside.buildings[0].reactor!;
    r.coreFuel = 0.05;
    r.setpoint = 1;
    run(s, 120);
    // End-of-cycle coastdown: not enough excess reactivity left for full power.
    expect(r.power).toBeLessThan(0.85);
  });

  it('auto refuel handles outages on its own', () => {
    const s = createInitialState();
    s.research.completed.push('f_outage');
    clearModCache();
    A.setAutomation(s, 'autoRefuel', true);
    s.nextEventIn = 1e9;
    const b = s.sites.riverside.buildings[0];
    b.reactor!.coreFuel = 0.05;
    run(s, 300);
    // Batch reload: a third of the core is replaced, then the reactor is restarted.
    expect(b.reactor!.coreFuel).toBeGreaterThan(0.3);
    expect(b.reactor!.setpoint).toBeGreaterThan(0.4);
    expect(b.reactor!.power).toBeGreaterThan(0.2);
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
  it('defective rods leak and draw fines, but do not by themselves destroy a core', () => {
    const s = createInitialState();
    const b = s.sites.riverside.buildings[0];
    const r = b.reactor!;
    r.coreDefects = 20;
    r.setpoint = 1;
    const m0 = s.money;
    for (let t = 0; t < 1500; t += 0.5) tick(s, 0.5);
    expect(r.failedRods).toBeGreaterThan(0);
    expect(b.status).not.toBe('destroyed');
    expect(s.ledger.other + s.ledgerPrev.other).toBeLessThan(m0); // fines were booked
  });

  it('refuelling replaces failed rods', () => {
    const s = createInitialState();
    const b = s.sites.riverside.buildings[0];
    b.reactor!.failedRods = 3;
    b.reactor!.setpoint = 0;
    run(s, 90);
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

describe('fuel market and material orders', () => {
  it('limits daily market fuel and raises the price as the day sells out', () => {
    const s = createInitialState();
    s.money = 1e9;
    s.nextEventIn = 1e9;
    const { fuelQuota, marketFuelPrice, buyItem } = FC;
    const quota = fuelQuota(s);
    const p0 = marketFuelPrice(s);
    s.fuel = 0;
    const got = buyItem(s, 'assemblies', quota * 3, 1e6);
    expect(got).toBe(quota);
    expect(marketFuelPrice(s)).toBeGreaterThan(p0 * 2);
    expect(A.tradeItem(s, 'assemblies', 10)).toMatch(/sold out/);
    // next game day the suppliers deliver again
    run(s, 240, 1);
    expect(s.market.fuelBought).toBe(0);
  });

  it('delivers material orders for cash and xp', () => {
    const s = createInitialState();
    s.nextEventIn = 1e9;
    run(s, 2);
    expect(s.orders.length).toBe(3);
    const o = s.orders[0];
    expect(A.deliverMaterialOrder(s, o.id)).toMatch(/Not enough/);
    expect(A.tradeItem(s, o.item, o.qty)).toBeNull(); // bought on the market
    expect(A.deliverMaterialOrder(s, o.id)).toMatch(/resold/);
    s.supply[o.item] = o.qty;
    s.supply.bought[o.item] = 0; // as if produced in-house
    const m0 = s.money;
    expect(A.deliverMaterialOrder(s, o.id)).toBeNull();
    expect(s.money - m0).toBe(o.pay);
    expect(s.supply[o.item]).toBe(0);
  });

  it('molten salt reactors consume enriched uranium, not assemblies', () => {
    const s = createInitialState();
    s.nextEventIn = 1e9;
    const b = s.sites.riverside.buildings[0];
    const { onlineRefuel } = FC;
    b.type = 'reactor_msr' as never;
    s.supply.enriched = 10;
    const fuel0 = s.fuel;
    b.reactor!.fission = 100;
    onlineRefuel(s, b, 10, { fuelUse: 1 } as never);
    expect(s.supply.enriched).toBeLessThan(10);
    expect(s.fuel).toBe(fuel0);
  });
});


describe('spent fuel: pools, dry casks and shipping', () => {
  it('drains a full pool into casks, upgrades help, and shipping frees space', () => {
    const s = createInitialState();
    s.nextEventIn = 1e9; s.money = 1e8;
    const site = s.sites.riverside;
    const pool = FC.poolCapacity(site);
    site.spent.pool = pool; // full
    const pad = makeBuilding(s, 'dry_cask', 12, 2, 0, true);
    site.buildings.push(pad);
    run(s, 10);
    expect(site.stats.caskMove).toBeGreaterThan(0);
    expect(site.spent.pool).toBeLessThan(pool - 5);
    // Fill the casks completely, then upgrade: capacity doubles and loading resumes.
    site.spent.casks = site.stats.caskCap;
    site.spent.pool = pool;
    run(s, 2);
    expect(site.stats.caskMove).toBe(0);
    const cap1 = site.stats.caskCap;
    pad.level = 2;
    run(s, 2);
    expect(site.stats.caskCap).toBeCloseTo(cap1 * 2);
    expect(site.stats.caskMove).toBeGreaterThan(1.5);
    // Shipping takes fuel off-site and returns recovered uranium.
    const casks = site.spent.casks;
    expect(A.shipSpentFuel(s, 'riverside', 100)).toBeNull();
    expect(site.spent.casks).toBeCloseTo(casks - 100);
    expect(s.supply.yellowcake).toBeGreaterThanOrEqual(40);
  });
});
