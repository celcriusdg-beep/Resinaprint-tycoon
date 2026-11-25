import { describe, it, expect } from 'vitest';
import { createInitialState, makeBuilding } from '../src/game/state';
import { tick } from '../src/game/engine';
import * as A from '../src/game/actions';
import { migrate, toEnvelope } from '../src/systems/save/serialize';
import { staffNeeds, staffEffects, ROLES, totalHired, inTraining, refreshCandidates } from '../src/game/staff/staff';
import { BUILDINGS, staffAt } from '../src/game/buildings/defs';
import { diagnoseSite } from '../src/game/diagnostics';
import { DAY_LENGTH } from '../src/game/constants';
import { autoWire } from '../src/game/network/network';
import type { GameState } from '../src/game/types';

const run = (s: GameState, sec: number, dt = 0.5) => { for (let t = 0; t < sec; t += dt) tick(s, dt); };

describe('staff & shifts', () => {
  it('role needs add up to the buildings’ staff numbers', () => {
    const s = createInitialState();
    const site = s.sites.riverside;
    const old = site.buildings.reduce((a, b) => a + staffAt(BUILDINGS[b.type], b.level), 0);
    const needs = staffNeeds(site);
    const total = ROLES.reduce((a, r) => a + needs[r], 0);
    expect(total).toBeGreaterThanOrEqual(old);
    expect(total).toBeLessThanOrEqual(old + ROLES.length);
  });

  it('a new game starts fully staffed', () => {
    const s = createInitialState();
    const fx = staffEffects(s.sites.riverside, 1);
    for (const r of ROLES) expect(fx.cover[r]).toBe(1);
    expect(fx.output).toBeGreaterThan(0.97);
  });

  it('new operators must pass their licence before they count; auto-hire recruits them', () => {
    const s = createInitialState();
    s.nextEventIn = 1e9; s.money = 1e6; s.level = 10;
    const site = s.sites.riverside;
    const smr = makeBuilding(s, 'reactor_smr', 2, 11, 0, true);
    site.buildings.push(smr);
    autoWire(s, site);
    run(s, 2);
    expect(inTraining(site.staff, 'operator')).toBeGreaterThan(0);
    expect(staffEffects(site, 1).cover.operator).toBeLessThan(1);
    run(s, DAY_LENGTH + 5, 1);
    expect(inTraining(site.staff, 'operator')).toBe(0);
    expect(staffEffects(site, 1).cover.operator).toBe(1);
  });

  it('without auto-hire the shortage shows up and overtime tires the crews', () => {
    const s = createInitialState();
    s.nextEventIn = 1e9; s.money = 1e6;
    const site = s.sites.riverside;
    A.setAutoHire(s, false);
    site.staff.hired.operator = Math.max(1, Math.floor(site.staff.hired.operator * 0.6));
    run(s, 5);
    expect(diagnoseSite(s, site).some((i) => i.title.startsWith('Short of operators'))).toBe(true);
    const fx = staffEffects(site, 1);
    expect(fx.overtime).toBeGreaterThan(0);
    run(s, DAY_LENGTH, 1);
    expect(site.staff.fatigue).toBeGreaterThan(0.3);
    expect(staffEffects(site, 1).errorRate).toBeGreaterThan(0);
  });

  it('12-hour shifts need fewer operators but build fatigue', () => {
    const s = createInitialState();
    s.nextEventIn = 1e9;
    const site = s.sites.riverside;
    const eight = staffNeeds(site).operator;
    A.setShift(s, '2x12');
    expect(staffNeeds(site).operator).toBeLessThanOrEqual(eight);
    run(s, DAY_LENGTH, 1);
    expect(site.staff.fatigue).toBeGreaterThan(0.2);
  });

  it('office space limits hiring', () => {
    const s = createInitialState();
    s.money = 1e9;
    const site = s.sites.riverside;
    run(s, 1);
    const room = site.stats.staffCap - totalHired(site.staff);
    expect(A.hireStaff(s, 'technician', room + 1)).toMatch(/office space/);
    expect(A.hireStaff(s, 'technician', Math.max(1, room))).toBeNull();
  });

  it('key people: a lead scientist speeds up research', () => {
    const s = createInitialState();
    s.nextEventIn = 1e9; s.money = 1e9;
    const site = s.sites.riverside;
    site.buildings.push(makeBuilding(s, 'lab', 2, 11, 0, true));
    A.setAutoHire(s, true);
    run(s, 80);
    const before = staffEffects(site, 1).research;
    refreshCandidates(s);
    const cand = { ...s.candidates[0], role: 'lead_scientist' as const };
    s.candidates[0] = cand;
    const lvl0 = cand.level;
    expect(A.hireKeyPerson(s, cand.id)).toBeNull();
    expect(site.staff.key.lead_scientist?.name).toBe(cand.name);
    expect(staffEffects(site, 1).research).toBeGreaterThan(before);
    run(s, DAY_LENGTH * 3 + 5, 2);
    expect(site.staff.key.lead_scientist!.level).toBeGreaterThan(lvl0);
  });

  it('older saves load fully staffed', () => {
    const s = createInitialState();
    const env = JSON.parse(JSON.stringify(toEnvelope(s)));
    env.state.version = 5;
    for (const x of Object.values(env.state.sites) as { staff?: unknown }[]) delete x.staff;
    delete env.state.candidates;
    const loaded = migrate(env);
    const fx = staffEffects(loaded.sites.riverside, 1);
    for (const r of ROLES) expect(fx.cover[r]).toBe(1);
    run(loaded, 5);
  });
});
