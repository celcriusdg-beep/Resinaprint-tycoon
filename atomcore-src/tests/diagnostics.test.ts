import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState } from '../src/game/state';
import { tick } from '../src/game/engine';
import * as A from '../src/game/actions';
import { setRandom, mulberry32 } from '../src/game/rng';
import { clearModCache } from '../src/game/simulation/modifiers';
import { diagnose, reactorStatus, healthySystems } from '../src/game/diagnostics';
import type { GameState } from '../src/game/types';

const run = (s: GameState, sec: number, dt = 0.5) => { for (let t = 0; t < sec; t += dt) tick(s, dt); };
beforeEach(() => { setRandom(mulberry32(5)); clearModCache(); });

describe('diagnostics explain why a reactor makes no power', () => {
  it('a healthy starter plant reports no problems', () => {
    const s = createInitialState();
    s.nextEventIn = 1e9;
    run(s, 20);
    const issues = diagnose(s);
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
    expect(healthySystems(issues, s)).toContain('reactors');
    const st = reactorStatus(s, s.sites.riverside, s.sites.riverside.buildings[0]);
    expect(st.headline).toMatch(/At \d+% power/);
    expect(st.electricMW).toBeGreaterThan(2);
  });

  it('an empty core is reported as out of fuel with a fix', () => {
    const s = createInitialState();
    s.nextEventIn = 1e9;
    s.sites.riverside.buildings[0].reactor!.coreFuel = 0.01;
    run(s, 30);
    const issues = diagnose(s);
    const fuel = issues.find((i) => i.title.includes('out of fuel'));
    expect(fuel?.severity).toBe('error');
    expect(fuel?.fix).toBeTruthy();
    expect(healthySystems(issues, s)).not.toContain('fuel');
  });

  it('a trip is reported, and offers reset once safe', () => {
    const s = createInitialState();
    s.nextEventIn = 1e9;
    const b = s.sites.riverside.buildings[0];
    A.manualScram(s, b.id);
    run(s, 2);
    expect(diagnose(s).some((i) => i.title.includes('tripped'))).toBe(true);
    run(s, 30);
    const trip = diagnose(s).find((i) => i.title.includes('tripped'));
    expect(trip?.fix?.action.kind).toBe('reset');
  });

  it('a restart after refuelling is explained as a start-up with an ETA and finishes in ~2 minutes', () => {
    const s = createInitialState();
    s.nextEventIn = 1e9;
    const b = s.sites.riverside.buildings[0];
    const r = b.reactor!;
    r.setpoint = 0;
    run(s, 80);
    expect(A.refuelReactor(s, b.id)).toBeNull();
    run(s, 40);
    r.setpoint = 0.5;
    run(s, 10);
    expect(reactorStatus(s, s.sites.riverside, b).headline).toMatch(/Starting up|Raising power|Withdrawing/);
    run(s, 140);
    expect(r.power).toBeGreaterThan(0.4);
  });

  it('missing turbines are an error even though the reactor runs', () => {
    const s = createInitialState();
    s.nextEventIn = 1e9;
    s.sites.riverside.buildings = s.sites.riverside.buildings.filter((b) => b.type !== 'turbine');
    run(s, 5);
    expect(diagnose(s).some((i) => i.system === 'turbines' && i.severity === 'error')).toBe(true);
  });
});
