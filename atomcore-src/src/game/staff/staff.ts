import type { GameState, Site, Building } from '../types';
import { BUILDINGS, staffAt } from '../buildings/defs';
import { DAY_LENGTH } from '../constants';
import { random } from '../rng';
import { LOCATION_BY_ID } from '../progression/locations';

// Staff & shifts. Every building needs people in five roles; each site hires
// them into its office space (Administration Buildings). Reactor operators
// must pass a licence course before they can stand a shift. Short shifts are
// covered by overtime (paid 1.5×) which builds fatigue; tired crews make
// operator errors, and tired or overworked people lose morale and quit.
// A few named key people per site give bonuses through their role and traits.

export type Role = 'operator' | 'technician' | 'engineer' | 'security' | 'scientist';
export const ROLES: Role[] = ['operator', 'technician', 'engineer', 'security', 'scientist'];

export const ROLE_INFO: Record<Role, { name: string; plural: string; wage: number; fee: number; train: number; job: string }> = {
  operator: { name: 'Reactor operator', plural: 'Operators', wage: 0.12, fee: 300, train: DAY_LENGTH / 2, job: 'Run the reactors and turbines in the control room. Need a licence (half a game day of training).' },
  technician: { name: 'Technician', plural: 'Technicians', wage: 0.08, fee: 150, train: 45, job: 'Maintain equipment: too few and everything wears out faster.' },
  engineer: { name: 'Engineer', plural: 'Engineers', wage: 0.14, fee: 350, train: 60, job: 'Keep the plant efficient and catch faults before they trip a reactor.' },
  security: { name: 'Security officer', plural: 'Security', wage: 0.07, fee: 120, train: 45, job: 'Guard the site and the nuclear material. Counts towards the safety rating.' },
  scientist: { name: 'Scientist', plural: 'Scientists', wage: 0.12, fee: 300, train: 60, job: 'Staff the laboratories: research speed depends on them.' },
};

export type Shift = '3x8' | '2x12';

export type KeyRole = 'supervisor' | 'chief_engineer' | 'maintenance_lead' | 'security_chief' | 'lead_scientist';
export const KEY_ROLES: KeyRole[] = ['supervisor', 'chief_engineer', 'maintenance_lead', 'security_chief', 'lead_scientist'];
export const KEY_INFO: Record<KeyRole, { title: string; bonus: string }> = {
  supervisor: { title: 'Shift Supervisor', bonus: 'fewer operator errors, less fatigue' },
  chief_engineer: { title: 'Chief Engineer', bonus: 'higher plant efficiency, fewer faults' },
  maintenance_lead: { title: 'Maintenance Lead', bonus: 'slower equipment wear' },
  security_chief: { title: 'Security Chief', bonus: 'higher safety rating' },
  lead_scientist: { title: 'Lead Scientist', bonus: 'faster research' },
};

export type Trait = 'calm' | 'mentor' | 'thrifty' | 'workaholic' | 'popular' | 'veteran';
export const TRAITS: Record<Trait, { name: string; text: string }> = {
  calm: { name: 'Calm under pressure', text: 'Halves fatigue-related operator errors at the site.' },
  mentor: { name: 'Mentor', text: 'New hires finish training 30% faster.' },
  thrifty: { name: 'Thrifty', text: 'Site salaries −5%.' },
  workaholic: { name: 'Workaholic', text: 'Role bonus +25%, but site morale −5%.' },
  popular: { name: 'Popular', text: 'Site morale +10%.' },
  veteran: { name: 'Veteran', text: 'Starts at level 2 but asks for a higher salary.' },
};

export interface KeyPerson {
  id: number;
  name: string;
  role: KeyRole;
  trait: Trait;
  level: number; // 1..3
  xp: number; // seconds of service towards the next level
  salary: number; // $/s
}

export interface StaffState {
  hired: Record<Role, number>;
  /** People still in training or licence courses (part of `hired`). */
  training: { role: Role; n: number; ready: number }[];
  shift: Shift;
  autoHire: boolean;
  fatigue: number; // 0..1
  morale: number; // 0..1
  key: Partial<Record<KeyRole, KeyPerson>>;
}

export function emptyRoles(): Record<Role, number> {
  return { operator: 0, technician: 0, engineer: 0, security: 0, scientist: 0 };
}

export function newStaff(): StaffState {
  return { hired: emptyRoles(), training: [], shift: '3x8', autoHire: true, fatigue: 0, morale: 0.75, key: {} };
}

// ── Needs ─────────────────────────────────────────────────────────────────

/** How a building's staff need splits over the roles. */
function split(b: Building): Partial<Record<Role, number>> {
  const def = BUILDINGS[b.type];
  if (def.reactor) return { operator: 0.5, engineer: 0.25, technician: 0.15, security: 0.1 };
  if (def.stats.research) return { scientist: 0.8, technician: 0.2 };
  if (def.stats.maintenance) return { technician: 0.85, engineer: 0.15 };
  switch (def.category) {
    case 'power': case 'cooling': case 'water': case 'grid': return { operator: 0.2, technician: 0.5, engineer: 0.3 };
    case 'fuel': return { technician: 0.6, engineer: 0.2, security: 0.2 };
    case 'industry': return { technician: 0.6, engineer: 0.2, security: 0.2 };
    default: return { technician: 0.6, security: 0.4 };
  }
}

/** People each role needs at a site. 12-hour shifts need ~20% fewer operators. */
export function staffNeeds(site: Site, planning = false): Record<Role, number> {
  const out = emptyRoles();
  for (const b of site.buildings) {
    // When planning (auto-hire), crews are hired and trained while the building is still under construction.
    if ((b.status === 'constructing' && !planning) || b.status === 'destroyed') continue;
    const n = staffAt(BUILDINGS[b.type], b.level);
    for (const [r, f] of Object.entries(split(b)) as [Role, number][]) out[r] += n * f;
  }
  if (site.staff?.shift === '2x12') out.operator *= 0.8;
  for (const r of ROLES) out[r] = Math.ceil(out[r] - 1e-9);
  return out;
}

export function totalHired(st: StaffState): number {
  return ROLES.reduce((a, r) => a + st.hired[r], 0);
}

export function inTraining(st: StaffState, role: Role): number {
  return st.training.filter((t) => t.role === role).reduce((a, t) => a + t.n, 0);
}

// ── Key people ────────────────────────────────────────────────────────────

const FIRST = ['Alex', 'Sam', 'Robin', 'Kai', 'Noa', 'Jamie', 'Ari', 'Mika', 'Rene', 'Sasha', 'Yuki', 'Amani', 'Rowan', 'Elia', 'Dani', 'Toni', 'Jules', 'Morgan', 'Nikita', 'Remy', 'Imani', 'Quinn', 'Avery', 'Lior'];
const LAST = ['Okafor', 'Lindqvist', 'Moreau', 'Tanaka', 'Novak', 'Haddad', 'Kowalski', 'Ferreira', 'Nakamura', 'Ibrahim', 'Jensen', 'Costa', 'Petrov', 'Mensah', 'Fischer', 'Varga', 'Rossi', 'Chen', 'Nilsen', 'Duarte', 'Aziz', 'Brennan', 'Sato', 'Kaur'];

export function keyLevel(p: KeyPerson | undefined): number {
  if (!p) return 0;
  return p.level * (p.trait === 'workaholic' ? 1.25 : 1);
}

export function makeCandidate(s: GameState, role?: KeyRole): KeyPerson {
  const r = role ?? KEY_ROLES[Math.floor(random() * KEY_ROLES.length)];
  const traits = Object.keys(TRAITS) as Trait[];
  const trait = traits[Math.floor(random() * traits.length)];
  const level = trait === 'veteran' ? 2 : 1;
  const scale = 1 + Math.min(4, s.level / 6);
  return {
    id: s.nextBuildingId++,
    name: `${FIRST[Math.floor(random() * FIRST.length)]} ${LAST[Math.floor(random() * LAST.length)]}`,
    role: r, trait, level, xp: 0,
    salary: Math.round((0.6 + 0.35 * level + random() * 0.2) * scale * 100) / 100,
  };
}

export function keyHireFee(p: KeyPerson): number {
  return Math.round(p.salary * 1800);
}

/** Refresh the company's pool of key-person candidates once per game day. */
export function refreshCandidates(s: GameState): void {
  const day = Math.floor(s.gameTime / DAY_LENGTH);
  if (s.candidates.length && s.candidateDay === day) return;
  s.candidateDay = day;
  s.candidates = KEY_ROLES.slice().sort(() => random() - 0.5).slice(0, 3).map((r) => makeCandidate(s, r));
}

// ── Effects ───────────────────────────────────────────────────────────────

export interface StaffEffects {
  needs: Record<Role, number>;
  /** Working people per role after training and overtime. */
  working: Record<Role, number>;
  /** 0..1 coverage per role. */
  cover: Record<Role, number>;
  overtime: number;
  /** Share of the people on hand working overtime in the hardest-pressed role (operators count double), 0..1. */
  pressure: number;
  /** Output factor (operators, fatigue). */
  output: number;
  /** Multiplier on equipment wear. */
  wear: number;
  research: number;
  /** Additive steam-cycle efficiency points. */
  efficiency: number;
  /** Safety rating points. */
  safety: number;
  /** Chance per second per running reactor of an operator error trip. */
  errorRate: number;
  salaries: number;
}

export function staffEffects(site: Site, salaryMod: number): StaffEffects {
  const st = site.staff;
  const needs = staffNeeds(site);
  const working = emptyRoles();
  const cover = emptyRoles();
  let overtime = 0;
  let pressure = 0;
  for (const r of ROLES) {
    const ready = Math.max(0, st.hired[r] - inTraining(st, r));
    // Up to a quarter of the shortfall is covered by overtime of the people on hand.
    const ot = Math.min(Math.max(0, needs[r] - ready), ready * 0.25);
    overtime += ot * ROLE_INFO[r].wage;
    if (ready > 0) pressure = Math.max(pressure, (ot / ready) * 4 * (r === 'operator' ? 1 : 0.6));
    working[r] = ready + ot;
    cover[r] = needs[r] > 0 ? Math.min(1, working[r] / needs[r]) : 1;
  }
  const k = st.key;
  const sup = keyLevel(k.supervisor);
  const ce = keyLevel(k.chief_engineer);
  const ml = keyLevel(k.maintenance_lead);
  const sc = keyLevel(k.security_chief);
  const ls = keyLevel(k.lead_scientist);
  const calm = Object.values(k).some((p) => p?.trait === 'calm');
  const thrifty = Object.values(k).some((p) => p?.trait === 'thrifty');
  const opF = cover.operator >= 1 ? 1 : Math.pow(cover.operator, 0.8);
  let salaries = 0;
  for (const r of ROLES) salaries += st.hired[r] * ROLE_INFO[r].wage;
  salaries = (salaries + overtime * 1.5) * salaryMod * (thrifty ? 0.95 : 1);
  for (const p of Object.values(k)) if (p) salaries += p.salary;
  return {
    needs, working, cover, overtime, pressure: Math.min(1, pressure),
    output: opF * (1 - 0.12 * st.fatigue),
    wear: (1 + 0.8 * (1 - cover.technician)) * (1 - 0.08 * ml),
    research: cover.scientist >= 1 ? 1 + 0.08 * ls : Math.pow(cover.scientist, 0.8) * (1 + 0.08 * ls),
    efficiency: -0.02 * (1 - cover.engineer) + 0.004 * ce,
    safety: 10 * cover.security - 10 + 4 * sc,
    errorRate: 0.0012 * Math.pow(st.fatigue, 2) * (1 - 0.18 * sup) * (calm ? 0.5 : 1) * (1 + (1 - cover.engineer) * 0.5 - 0.1 * ce),
    salaries,
  };
}

// ── Stepping: training, fatigue, morale, quits, key-people XP, auto-hire ──

export interface StaffNews {
  kind: 'good' | 'warn' | 'bad' | 'info';
  text: string;
}

export function stepStaff(s: GameState, site: Site, fx: StaffEffects, dt: number, offline: boolean): StaffNews[] {
  const news: StaffNews[] = [];
  const st = site.staff;
  // Trainees graduate.
  const done = st.training.filter((t) => t.ready <= s.gameTime);
  if (done.length) {
    st.training = st.training.filter((t) => t.ready > s.gameTime);
    const ops = done.filter((t) => t.role === 'operator').reduce((a, t) => a + t.n, 0);
    if (ops && !offline) news.push({ kind: 'good', text: `${ops} new reactor operator${ops > 1 ? 's' : ''} passed the licence exam.` });
  }
  // Fatigue: overtime and long shifts build it, rest removes it.
  const base = st.shift === '2x12' ? 0.35 : 0.1;
  const sup = keyLevel(st.key.supervisor);
  const target = Math.min(1, (base + 0.8 * fx.pressure) * (1 - 0.12 * sup));
  st.fatigue += (target - st.fatigue) * Math.min(1, dt / (DAY_LENGTH * 0.5));
  // Morale follows fatigue, training and popular leaders.
  const keys = Object.values(st.key);
  const moraleTarget = Math.max(0.05, Math.min(1, 0.78 - 0.55 * st.fatigue + 0.03 * s.staffTraining
    + (keys.some((p) => p?.trait === 'popular') ? 0.1 : 0) - (keys.some((p) => p?.trait === 'workaholic') ? 0.05 : 0)));
  st.morale += (moraleTarget - st.morale) * Math.min(1, dt / DAY_LENGTH);
  // Unhappy people quit (a few per game day at very low morale).
  if (!offline && st.morale < 0.45) {
    const total = ROLES.reduce((a, r) => a + st.hired[r], 0);
    const quitRate = (0.45 - st.morale) * 0.08 * total / DAY_LENGTH;
    if (random() < quitRate * dt) {
      const role = ROLES.filter((r) => st.hired[r] > 0).sort(() => random() - 0.5)[0];
      if (role) {
        st.hired[role]--;
        news.push({ kind: 'warn', text: `A ${ROLE_INFO[role].name.toLowerCase()} quit: morale at ${LOCATION_NAME(site)} is low (${Math.round(st.morale * 100)}%).` });
      }
    }
  }
  // Key people gain experience: a level every 3 game days at the site.
  for (const p of keys) {
    if (!p || p.level >= 3) continue;
    p.xp += dt;
    if (p.xp >= DAY_LENGTH * 3) {
      p.xp = 0;
      p.level++;
      p.salary = Math.round(p.salary * 1.25 * 100) / 100;
      if (!offline) news.push({ kind: 'good', text: `${p.name} (${KEY_INFO[p.role].title}) reached level ${p.level}.` });
    }
  }
  return news;
}

const LOCATION_NAME = (site: Site) => LOCATION_BY_ID[site.id]?.name ?? site.id;

/** Hire people (they start in training). Returns an error or null. */
export function hire(s: GameState, site: Site, role: Role, n: number, office: number, feeMod = 1): string | null {
  if (n <= 0) return null;
  const st = site.staff;
  if (totalHired(st) + n > office) return 'No office space — build or upgrade Administration Buildings.';
  const fee = ROLE_INFO[role].fee * n * feeMod;
  if (s.money < fee) return 'Not enough money for recruitment.';
  s.money -= fee;
  s.ledger.salaries += fee;
  st.hired[role] += n;
  const mentor = Object.values(st.key).some((p) => p?.trait === 'mentor');
  st.training.push({ role, n, ready: s.gameTime + ROLE_INFO[role].train * (mentor ? 0.7 : 1) });
  return null;
}

export function fire(s: GameState, site: Site, role: Role, n: number): string | null {
  const st = site.staff;
  n = Math.min(n, st.hired[role]);
  if (n <= 0) return 'Nobody to let go.';
  const pay = ROLE_INFO[role].fee * 0.5 * n;
  s.money -= pay;
  s.ledger.salaries += pay;
  st.hired[role] -= n;
  // Remove from training first.
  let left = n;
  for (const t of st.training) {
    if (t.role !== role || left <= 0) continue;
    const k = Math.min(t.n, left);
    t.n -= k;
    left -= k;
  }
  st.training = st.training.filter((t) => t.n > 0);
  st.morale = Math.max(0, st.morale - 0.02 * n);
  return null;
}

/** Hire whatever the site is missing (auto-hire), within office space and a money buffer. */
export function autoHire(s: GameState, site: Site, office: number, feeMod = 1): void {
  const st = site.staff;
  const needs = staffNeeds(site, true);
  for (const r of ROLES) {
    const missing = needs[r] - st.hired[r];
    if (missing <= 0) continue;
    const room = office - totalHired(st);
    const n = Math.min(missing, room, Math.floor(s.money / (ROLE_INFO[r].fee * feeMod * 3)));
    if (n > 0) hire(s, site, r, n, office, feeMod);
  }
}

/** Fully staffed and trained (new games, old saves). */
export function staffUp(site: Site): void {
  if (!site.staff) site.staff = newStaff();
  const needs = staffNeeds(site);
  for (const r of ROLES) site.staff.hired[r] = Math.max(site.staff.hired[r], needs[r]);
}
