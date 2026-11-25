import { staffUp } from '../src/game/staff/staff';
import { describe, it, expect } from 'vitest';
import { createInitialState, makeBuilding } from '../src/game/state';
import { tick } from '../src/game/engine';
import * as A from '../src/game/actions';
import { migrate, toEnvelope } from '../src/systems/save/serialize';
import { GRID_TIE, autoWire, linkRating, linksOf, validTargets, classLockReason } from '../src/game/network/network';
import { diagnoseSite } from '../src/game/diagnostics';
import type { GameState } from '../src/game/types';
import { initEquilibrium } from '../src/game/simulation/reactor';

const run = (s: GameState, sec: number, dt = 0.1) => { for (let t = 0; t < sec; t += dt) tick(s, dt); };

function starter() {
  const s = createInitialState();
  s.nextEventIn = 1e9;
  const site = s.sites.riverside;
  const [reactor, turbine, cooler] = site.buildings;
  return { s, site, reactor, turbine, cooler };
}

describe('pipes and cables', () => {
  it('the starter plant comes wired and sells power', () => {
    const { s, site } = starter();
    expect(site.links.map((l) => l.kind).sort()).toEqual(['cooling', 'power', 'steam']);
    run(s, 20);
    expect(site.stats.exportMW).toBeGreaterThan(2);
    expect(site.stats.strandedMW).toBe(0);
  });

  it('a reactor without a steam line trips with a clear cause', () => {
    const { s, site, reactor } = starter();
    run(s, 5);
    const steam = site.links.find((l) => l.kind === 'steam')!;
    expect(A.removeLink(s, steam.id)).toBeNull();
    run(s, 2);
    expect(reactor.reactor!.scrammed).toBe(true);
    expect(reactor.reactor!.tripCause).toMatch(/No heat sink/);
    expect(diagnoseSite(s, site).some((i) => i.title.includes('has no steam line'))).toBe(true);
    run(s, 300, 1);
    expect(s.stats.coreDamage).toBe(0);
  });

  it('a turbine hall without cooling water trips its reactor, and power stops without a cable', () => {
    const { s, site, reactor } = starter();
    run(s, 5);
    A.removeLink(s, site.links.find((l) => l.kind === 'power')!.id);
    run(s, 2);
    expect(site.stats.exportMW).toBe(0);
    expect(site.stats.strandedMW).toBeGreaterThan(1);
    A.removeLink(s, site.links.find((l) => l.kind === 'cooling')!.id);
    run(s, 30);
    expect(reactor.reactor!.scrammed).toBe(true);
  });

  it('a new turbine counts only once it is piped, and steam avoids halls with no cooling', () => {
    const { s, site, reactor } = starter();
    s.money = 1e6;
    run(s, 10);
    const before = site.stats.steamCapMW;
    const t2 = makeBuilding(s, 'turbine', 11, 5, 0, true);
    site.buildings.push(t2);
    run(s, 2);
    expect(site.stats.steamCapMW).toBeCloseTo(before);
    expect(validTargets(site, 'steam', t2.id)).toContain(reactor.id);
    expect(A.buildLink(s, 'steam', t2.id, reactor.id, 0, 1)).toBeNull();
    run(s, 20);
    // Not cooled yet: the reactor must keep running on the first hall.
    expect(reactor.reactor!.scrammed).toBe(false);
    expect(site.stats.steamCapMW).toBeGreaterThan(before * 1.9);
    expect(A.buildLink(s, 'cooling', t2.id, site.buildings[2].id, 0, 1)).toBeNull();
    expect(A.buildLink(s, 'power', t2.id, GRID_TIE, 0, 1)).toBeNull();
    run(s, 20);
    expect(reactor.reactor!.scrammed).toBe(false);
  });

  it('rejects impossible links and voltages above what the equipment takes', () => {
    const { s, site, reactor, cooler } = starter();
    s.money = 1e9;
    expect(A.buildLink(s, 'steam', reactor.id, cooler.id, 0, 1)).toMatch(/must go to/);
    expect(A.buildLink(s, 'power', reactor.id, GRID_TIE, 0, 1)).not.toBeNull();
    const t = site.buildings[1];
    expect(classLockReason(s, site, 'power', 3, t.id, GRID_TIE)).toMatch(/Needs equipment rated/);
    expect(A.buildLink(s, 'steam', reactor.id, t.id, 0, 1)).toMatch(/Already connected/);
  });

  it('an overloaded cable heats up and its breaker trips, then recloses', () => {
    const s = createInitialState();
    s.nextEventIn = 1e9; s.money = 1e9; s.level = 15; s.fuel = 2000;
    const site = s.sites.riverside;
    site.size = 26; site.buildings = []; site.links = [];
    const add = (t: Parameters<typeof makeBuilding>[1], x: number, z: number, lvl = 1) => {
      const b = makeBuilding(s, t, x, z, 0, true);
      b.level = lvl;
      site.buildings.push(b);
      return b;
    };
    const pwr = add('reactor_pwr', 2, 2);
    const tb = add('turbine_large', 6, 2);
    add('cooling_tower', 11, 2, 2);
    add('water_intake', 15, 2, 4);
    add('water_treatment', 18, 2, 2);
    add('admin', 5, 7, 4);
    autoWire(s, site);
    staffUp(site);
    site.links = site.links.filter((l) => l.kind !== 'power');
    expect(A.buildLink(s, 'power', tb.id, GRID_TIE, 0, 1)).toBeNull(); // a single 40 MW MV cable
    pwr.reactor!.setpoint = 1;
    initEquilibrium(pwr, 18, 1);
    const cable = site.links.find((l) => l.kind === 'power')!;
    run(s, 2);
    expect(cable.flow).toBeGreaterThan(linkRating(cable) * 1.2);
    expect(site.stats.strandedMW).toBeGreaterThan(50);
    run(s, 25);
    expect(cable.trip).toBeGreaterThan(0);
    expect(s.log.some((l) => l.text.startsWith('Breaker tripped'))).toBe(true);
    expect(diagnoseSite(s, site).some((i) => i.title.startsWith('Breaker open'))).toBe(true);
    // Rebuild it as a high-voltage line: the breaker is reset and it carries the load.
    expect(A.upgradeLink(s, cable.id, 1, 1)).toBeNull();
    run(s, 5);
    expect(cable.trip).toBe(0);
    expect(cable.flow).toBeGreaterThan(40);
    expect(cable.flow).toBeLessThanOrEqual(linkRating(cable));
  });

  it('old saves are wired automatically on load', () => {
    const { s } = starter();
    s.money = 1e9;
    s.level = 15;
    const site = s.sites.riverside;
    for (const [t, x, z] of [['turbine', 11, 5], ['cooling_mech', 11, 9], ['substation', 15, 5], ['battery', 15, 9], ['reactor_smr', 2, 12]] as const)
      site.buildings.push(makeBuilding(s, t, x, z, 0, true));
    const env = JSON.parse(JSON.stringify(toEnvelope(s)));
    env.state.version = 3;
    env.version = 3;
    for (const x of Object.values(env.state.sites) as { links?: unknown }[]) delete x.links;
    const loaded = migrate(env);
    const ls = loaded.sites.riverside;
    for (const b of ls.buildings) expect(linksOf(ls, b.id).length, b.type).toBeGreaterThan(0);
    run(loaded, 30);
    expect(ls.stats.exportMW).toBeGreaterThan(2);
    expect(diagnoseSite(loaded, ls).filter((i) => i.title.includes('not connected') || i.title.includes('no steam'))).toEqual([]);
  });

  it('auto-wiring cross-ties turbine halls so spare capacity is shared', () => {
    const { s } = starter();
    const site = s.sites.riverside;
    site.links = [];
    site.buildings.push(makeBuilding(s, 'turbine', 11, 5, 0, true));
    site.buildings.push(makeBuilding(s, 'reactor_pilot', 2, 12, 0, true));
    autoWire(s, site);
    const t = site.buildings.filter((b) => b.type === 'turbine');
    expect(site.links.some((l) => l.kind === 'steam' && [l.a, l.b].includes(t[0].id) && [l.a, l.b].includes(t[1].id))).toBe(true);
  });

  it('demolishing a building removes its links', () => {
    const { s, site, cooler } = starter();
    expect(A.demolishBuilding(s, cooler.id)).toBeNull();
    expect(site.links.some((l) => l.a === cooler.id || l.b === cooler.id)).toBe(false);
  });
});
