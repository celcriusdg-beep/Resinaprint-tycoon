import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { tick } from '../src/game/engine';
import * as A from '../src/game/actions';
import { migrate, toEnvelope } from '../src/systems/save/serialize';
import { autoWire } from '../src/game/network/network';
import { reportIncident, licenceBlock, INSPECTION_INTERVAL, FINDING_DEADLINE } from '../src/game/regulator/regulator';
import { simulateOffline } from '../src/systems/offline/offline';
import { diagnoseSite } from '../src/game/diagnostics';
import { DAY_LENGTH } from '../src/game/constants';
import type { GameState } from '../src/game/types';

const run = (s: GameState, sec: number, dt = 0.5) => { for (let t = 0; t < sec; t += dt) tick(s, dt); };

function company(level = 6) {
  const s = createInitialState();
  s.nextEventIn = 1e9; s.money = 1e7; s.level = level; s.research.completed.push('r_smr');
  return s;
}

describe('regulator & licensing', () => {
  it('a reactor needs a construction permit, then an operating licence, then starts by itself', () => {
    const s = company();
    const site = s.sites.riverside;
    expect(A.placeBuilding(s, 'reactor_smr', 1, 1, 0)).toMatch(/permit/);
    expect(A.applyForPermit(s, 'reactor_smr')).toBeNull();
    expect(A.placeBuilding(s, 'reactor_smr', 1, 1, 0)).toMatch(/permit/);
    run(s, DAY_LENGTH * 0.2);
    expect(A.placeBuilding(s, 'reactor_smr', 1, 1, 0)).toBeNull();
    const smr = site.buildings.at(-1)!;
    expect(smr.licence).toBe('pending');
    autoWire(s, site, { pay: true });
    run(s, 60);
    expect(smr.status).toBe('active');
    expect(licenceBlock(s, site, smr)).toMatch(/licence/);
    expect(smr.reactor!.power).toBeLessThan(0.05);
    expect(diagnoseSite(s, site).some((i) => i.title.includes('awaiting operating licence'))).toBe(true);
    run(s, DAY_LENGTH * 0.6, 1);
    expect(smr.licence).toBe('operating');
    expect(smr.reactor!.scrammed).toBe(false);
    run(s, 120, 1);
    expect(smr.reactor!.power).toBeGreaterThan(0.1);
  });

  it('inspections raise findings; a missed major finding suspends a reactor until fixed', () => {
    const s = company(6);
    const site = s.sites.riverside;
    run(s, 5);
    site.buildings[2].condition = 10; // the fan cooling is a wreck
    site.reg.nextInspection = s.gameTime + 1;
    run(s, 2);
    expect(s.regulator.findings.some((f) => f.kind === 'condition')).toBe(true);
    // Not fixed: fine, then major, then suspension.
    run(s, FINDING_DEADLINE + 2, 1);
    expect(s.log.some((l) => /fined/.test(l.text))).toBe(true);
    expect(s.regulator.findings.find((f) => f.kind === 'condition')!.major).toBe(true);
    run(s, FINDING_DEADLINE + 2, 1);
    const reactor = site.buildings[0];
    expect(reactor.licence).toBe('suspended');
    expect(reactor.reactor!.scrammed).toBe(true);
    expect(A.restartReactor(s, reactor.id)).toMatch(/suspended/);
    // Fix it: repairs close the finding and the reactor comes back.
    site.buildings[2].condition = 100;
    site.buildings[2].status = 'active';
    run(s, 5);
    expect(s.regulator.findings.some((f) => f.kind === 'condition')).toBe(false);
    expect(reactor.licence).toBe('operating');
    // Held reactors start again by themselves; one that also tripped on its own needs a normal restart.
    expect(licenceBlock(s, site, reactor)).toBeNull();
    expect(A.restartReactor(s, reactor.id) ?? '').not.toMatch(/suspended/);
  });

  it('a young company is only fined, never suspended', () => {
    const s = company(3);
    const site = s.sites.riverside;
    run(s, 5);
    site.buildings[2].condition = 10;
    site.reg.nextInspection = s.gameTime + 1;
    run(s, FINDING_DEADLINE * 3, 1);
    expect(site.buildings[0].licence).not.toBe('suspended');
  });

  it('a core damage incident holds every reactor at the site and hurts public opinion', () => {
    const s = company();
    const site = s.sites.riverside;
    run(s, 5);
    const op = s.regulator.opinion;
    reportIncident(s, 'riverside', 'core');
    expect(s.regulator.opinion).toBeLessThan(op - 30);
    run(s, 2);
    expect(site.buildings[0].reactor!.scrammed).toBe(true);
    run(s, DAY_LENGTH + 5, 1);
    expect(licenceBlock(s, site, site.buildings[0])).toBeNull();
    expect(site.buildings[0].reactor!.scrammed).toBe(false);
  });

  it('nothing is fined or suspended while the player is away', () => {
    const s = company(8);
    const site = s.sites.riverside;
    run(s, 5);
    site.buildings[2].condition = 10;
    site.reg.nextInspection = s.gameTime + 1;
    run(s, 2);
    const finding = s.regulator.findings[0];
    expect(finding).toBeTruthy();
    simulateOffline(s, 6 * 3600);
    expect(site.buildings[0].licence).not.toBe('suspended');
    expect(s.log.some((l) => /fined/.test(l.text))).toBe(false);
  });

  it('older saves load with reactors licensed and an inspection schedule', () => {
    const s = createInitialState();
    const env = JSON.parse(JSON.stringify(toEnvelope(s)));
    env.state.version = 6;
    delete env.state.regulator;
    for (const x of Object.values(env.state.sites) as { reg?: unknown }[]) delete x.reg;
    const loaded = migrate(env);
    expect(loaded.regulator.opinion).toBeGreaterThan(0);
    expect(loaded.sites.riverside.reg.nextInspection).toBeGreaterThan(loaded.gameTime);
    expect(loaded.sites.riverside.reg.nextInspection).toBeLessThanOrEqual(loaded.gameTime + INSPECTION_INTERVAL);
    run(loaded, 10);
    expect(loaded.sites.riverside.buildings[0].reactor!.scrammed).toBe(false);
  });
});
