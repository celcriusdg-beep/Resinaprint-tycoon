import { describe, it, expect, afterEach } from 'vitest';
import { createInitialState, makeBuilding } from '../src/game/state';
import { tick } from '../src/game/engine';
import * as A from '../src/game/actions';
import { migrate, toEnvelope } from '../src/systems/save/serialize';
import { queueEmergency, preparedness, EMERGENCIES, RANDOM_INCIDENTS, riskFactor } from '../src/game/accidents/accidents';
import { setRandom, mulberry32 } from '../src/game/rng';
import { simulateOffline } from '../src/systems/offline/offline';
import type { GameState } from '../src/game/types';

const run = (s: GameState, sec: number, dt = 0.5) => { for (let t = 0; t < sec; t += dt) tick(s, dt); };
RANDOM_INCIDENTS.on = false;
afterEach(() => setRandom(mulberry32(1)));

function plant() {
  const s = createInitialState();
  s.nextEventIn = 1e9; s.money = 1e7; s.level = 6;
  run(s, 20);
  return { s, site: s.sites.riverside, reactor: s.sites.riverside.buildings[0] };
}

describe('accidents & emergencies', () => {
  it('the textbook response to a LOCA trips the reactor and limits it to INES 1', () => {
    const { s, site, reactor } = plant();
    setRandom(() => 0.01);
    const e = queueEmergency(s, site, 'loca', reactor.id);
    expect(A.respondEmergency(s, e.id, 'scram_si')).toBeNull();
    expect(reactor.reactor!.scrammed).toBe(true);
    expect(s.incidents[0]).toMatchObject({ kind: 'loca', ines: 1 });
    expect(s.emergencies.length).toBe(0);
    expect(reactor.status).toBe('active');
  });

  it('ignoring an alarm leaves it to the automatic systems at the deadline', () => {
    const { s, site, reactor } = plant();
    setRandom(() => 0.01);
    queueEmergency(s, site, 'sgtr', reactor.id);
    run(s, EMERGENCIES.sgtr.countdown + 1);
    expect(s.emergencies.length).toBe(0);
    expect(s.incidents[0].kind).toBe('sgtr');
    expect(s.log.some((l) => l.text.includes('No decision in time'))).toBe(true);
  });

  it('a wrong call can make things much worse', () => {
    const { s, site, reactor } = plant();
    setRandom(() => 0.99);
    const op = s.regulator.opinion;
    const e = queueEmergency(s, site, 'porv', reactor.id);
    A.respondEmergency(s, e.id, 'trust');
    expect(s.incidents[0].ines).toBeGreaterThanOrEqual(3);
    expect(s.regulator.opinion).toBeLessThan(op - 5);
    expect(reactor.condition).toBeLessThan(40);
  });

  it('a fire station puts transformer fires out; without one they can spread to cables', () => {
    const { s, site } = plant();
    const turbine = site.buildings[1];
    setRandom(() => 0.7);
    const e1 = queueEmergency(s, site, 'fire', turbine.id);
    A.respondEmergency(s, e1.id, 'brigade');
    expect(turbine.status).toBe('broken'); // off-site brigade, 55% chance — failed at 0.7
    expect(site.links.some((l) => l.kind === 'power' && l.broken)).toBe(true);
    A.repairBuilding(s, turbine.id);
    for (const l of site.links) if (l.broken) A.repairLink(s, l.id);
    site.buildings.push(makeBuilding(s, 'fire_station', 1, 11, 0, true));
    const e2 = queueEmergency(s, site, 'fire', turbine.id);
    A.respondEmergency(s, e2.id, 'brigade');
    expect(turbine.status).not.toBe('broken');
  });

  it('preparedness grows with an emergency centre, a fire station and drills', () => {
    const { s, site } = plant();
    const p0 = preparedness(s, site);
    site.buildings.push(makeBuilding(s, 'fire_station', 1, 11, 0, true));
    site.buildings.push(makeBuilding(s, 'emergency_centre', 4, 11, 0, true));
    const p1 = preparedness(s, site);
    expect(p1).toBeGreaterThan(p0 + 0.4);
    expect(A.runDrill(s)).toBeNull();
    expect(preparedness(s, site)).toBeGreaterThan(p1);
    expect(riskFactor(s, site)).toBeLessThan(1.3);
  });

  it('a flood damages an unprotected site; keeping running in deep water costs the grid connection', () => {
    const { s, site } = plant();
    setRandom(() => 0.05);
    const e = queueEmergency(s, site, 'flood', -1);
    A.respondEmergency(s, e.id, 'wait');
    expect(site.buildings.some((b) => !b.reactor && b.status === 'broken')).toBe(true);
    expect(s.events.some((x) => x.id === 'blackout')).toBe(true);
    expect(s.incidents[0].ines).toBe(2);
  });

  it('pending emergencies resolve automatically while away; nothing new starts', () => {
    const { s, site, reactor } = plant();
    RANDOM_INCIDENTS.on = true;
    queueEmergency(s, site, 'loca', reactor.id);
    simulateOffline(s, 6 * 3600);
    RANDOM_INCIDENTS.on = false;
    expect(s.emergencies.length).toBe(0);
    expect(s.incidents.length).toBe(1);
  });

  it('older saves load without emergencies', () => {
    const s = createInitialState();
    const env = JSON.parse(JSON.stringify(toEnvelope(s)));
    env.state.version = 7;
    delete env.state.emergencies;
    delete env.state.incidents;
    for (const x of Object.values(env.state.sites) as { drill?: unknown }[]) delete x.drill;
    const loaded = migrate(env);
    expect(loaded.emergencies).toEqual([]);
    expect(loaded.sites.riverside.drill).toBe(0);
    run(loaded, 5);
  });
});
