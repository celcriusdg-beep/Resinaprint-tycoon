import type { Building, GameState, Site } from '../types';
import { BUILDINGS, levelMult } from '../buildings/defs';
import { DAY_LENGTH } from '../constants';
import { LOCATION_BY_ID } from '../progression/locations';
import { random } from '../rng';
import { scram } from '../simulation/reactor';
import { physicsFor } from '../simulation/physics';
import { staffEffects, keyLevel } from '../staff/staff';
import { reportIncident } from '../regulator/regulator';
import { coreDamage } from '../supply/fuelcycle';
import { linksOf } from '../network/network';

// Accidents & emergencies. Incidents happen at sites with running reactors —
// more often with worn equipment and tired crews, less often with good
// preparation — plus floods and earthquakes depending on the location. Each
// raises an alarm with a countdown and a few responses; the right call limits
// the damage, ignoring it leaves the automatic systems to cope (less well).
// Outcomes are graded on the INES scale and reported to the regulator. The
// worst case loses a reactor — never the company.

export type EmergencyKind = 'loca' | 'porv' | 'sgtr' | 'fire' | 'dg' | 'flood' | 'quake';

export interface Emergency {
  id: number;
  kind: EmergencyKind;
  siteId: string;
  /** Affected building (reactor, transformer, generator) or -1. */
  target: number;
  started: number;
  deadline: number;
}

export interface IncidentRecord {
  t: number;
  siteId: string;
  kind: EmergencyKind;
  ines: number;
  text: string;
}

export interface EmergencyOption {
  id: string;
  label: string;
  detail: string;
}

interface Outcome {
  ines: number;
  text: string;
}

interface EmergencyDef {
  title: string;
  /** Countdown to decide, seconds. */
  countdown: number;
  describe: (s: GameState, e: Emergency) => string;
  options: EmergencyOption[];
  autoText: string;
  resolve: (s: GameState, site: Site, e: Emergency, option: string | null, prep: number) => Outcome;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function bld(site: Site, id: number): Building | undefined {
  return site.buildings.find((b) => b.id === id);
}

function trip(s: GameState, b: Building | undefined, why: string): void {
  const r = b?.reactor;
  if (!r || r.scrammed || b!.status !== 'active') return;
  scram(r, why, s.gameTime);
  r.power *= 0.12;
  r.fission *= 0.12;
  r.precursors *= 0.5;
  r.thermal = r.fission + r.decayHeat;
  s.stats.scrams++;
}

function wear(b: Building | undefined, amount: number): void {
  if (b) b.condition = Math.max(1, b.condition - amount);
}

function name(site: Site, id: number): string {
  const b = bld(site, id);
  return b ? BUILDINGS[b.type].short : 'the plant';
}

/** Big reactors can suffer core damage in the worst case; the chance shrinks with preparation. */
function maybeCore(s: GameState, site: Site, b: Building | undefined, p: number, cause: string): boolean {
  if (!b?.reactor || b.status === 'destroyed') return false;
  if (random() >= p) return false;
  coreDamage(s, site, b, cause);
  return true;
}

function breakPowerLinks(site: Site, id: number): number {
  let n = 0;
  for (const l of linksOf(site, id, 'power')) if (!l.broken) { l.broken = true; l.flow = 0; n++; }
  return n;
}

const roll = (p: number) => random() < Math.max(0, Math.min(1, p));

// ── Emergencies ───────────────────────────────────────────────────────────

export const EMERGENCIES: Record<EmergencyKind, EmergencyDef> = {
  loca: {
    title: 'Small-break LOCA',
    countdown: 30,
    describe: (s, e) => `A primary coolant pipe weld is leaking at the ${name(s.sites[e.siteId], e.target)}. Pressurizer level and pressure are falling.`,
    options: [
      { id: 'scram_si', label: 'SCRAM and start safety injection', detail: 'Shut the reactor down and pump borated water in before the level drops.' },
      { id: 'reduce', label: 'Reduce power and keep running', detail: 'Keep selling power while the leak is assessed.' },
    ],
    autoText: 'The reactor trips on low pressure and emergency core cooling starts by itself — if it has power.',
    resolve: (s, site, e, opt, prep) => {
      const b = bld(site, e.target);
      const powered = site.stats.pumpsPowered;
      if (opt === 'scram_si') {
        trip(s, b, 'Manual SCRAM: coolant leak');
        if (roll((0.85 + 0.15 * prep) * (powered ? 1 : 0.5))) { wear(b, 25); return { ines: 1, text: 'Safety injection kept the core covered. The weld will be repaired in the next outage.' }; }
        wear(b, 50);
        return { ines: 2, text: 'Injection started late; the core stayed covered but the leak damaged equipment.' };
      }
      if (opt === 'reduce') {
        if (roll(0.3 + 0.3 * prep)) { wear(b, 35); trip(s, b, 'Coolant leak'); return { ines: 1, text: 'The leak stabilised at low power, then the unit was shut down.' }; }
        trip(s, b, 'Coolant leak — low pressure');
        if (maybeCore(s, site, b, 0.15 * (1 - prep), 'loss of coolant accident')) return { ines: 5, text: 'The break grew; the core was uncovered before injection caught up.' };
        wear(b, 60);
        return { ines: 2, text: 'The break grew and tripped the reactor. Emergency cooling recovered the level.' };
      }
      trip(s, b, 'Low pressurizer pressure');
      if (roll((0.6 + 0.35 * prep) * (powered ? 1 : 0.4))) { wear(b, 40); return { ines: 2, text: 'Automatic trip and emergency core cooling handled the leak.' }; }
      if (maybeCore(s, site, b, 0.25 * (1 - prep), 'loss of coolant accident')) return { ines: 5, text: 'Emergency cooling was too slow and the core overheated.' };
      wear(b, 70);
      return { ines: 3, text: 'Emergency cooling barely kept up; serious damage inside the containment.' };
    },
  },
  porv: {
    title: 'Relief valve stuck open',
    countdown: 30,
    describe: (s, e) => `The pressurizer relief valve on the ${name(s.sites[e.siteId], e.target)} did not reseat. The control-room light says "closed" — but coolant is still escaping into the drain tank.`,
    options: [
      { id: 'block', label: 'Close the block valve', detail: 'Isolate the relief line, whatever the indicator says.' },
      { id: 'scram', label: 'SCRAM and keep injection running', detail: 'Shut down and keep the core flooded.' },
      { id: 'trust', label: 'Trust the indicator, throttle injection', detail: 'The valve shows closed — reduce injection to stop the pressurizer filling.' },
    ],
    autoText: 'Operators have to recognise the open valve; the better your preparation, the sooner they do.',
    resolve: (s, site, e, opt, prep) => {
      const b = bld(site, e.target);
      if (opt === 'block') {
        trip(s, b, 'Relief valve transient');
        if (roll(0.8 + 0.2 * prep)) { wear(b, 10); return { ines: 0, text: 'Block valve closed. Pressure recovered — a textbook response.' }; }
        wear(b, 30);
        return { ines: 1, text: 'The block valve was stiff; some coolant was lost before it closed.' };
      }
      const wrong = () => {
        trip(s, b, 'Loss of coolant through relief valve');
        if (maybeCore(s, site, b, 0.25 * (1 - prep), 'stuck-open relief valve')) return { ines: 5, text: 'With injection throttled the core boiled dry — a partial meltdown.' };
        wear(b, 70);
        return { ines: 3, text: 'The core was partly uncovered before the open valve was found. Major damage.' };
      };
      if (opt === 'scram') { trip(s, b, 'Manual SCRAM'); wear(b, 25); return { ines: 1, text: 'Shut down with injection running; the valve was found and closed later.' }; }
      if (opt === 'trust') return wrong();
      if (roll(0.5 + 0.4 * prep)) { trip(s, b, 'Relief valve transient'); wear(b, 25); return { ines: 1, text: 'The crew spotted the open valve on the drain-tank temperature and isolated it.' }; }
      return wrong();
    },
  },
  sgtr: {
    title: 'Steam generator tube rupture',
    countdown: 35,
    describe: (s, e) => `A tube burst in a steam generator of the ${name(s.sites[e.siteId], e.target)}. Radioactive primary water is leaking into the steam system.`,
    options: [
      { id: 'isolate', label: 'Isolate the steam generator and cool down', detail: 'Trip, isolate the faulted loop and depressurise below the relief setpoint.' },
      { id: 'run', label: 'Keep running until the next outage', detail: 'Avoid the lost output — the leak looks small.' },
    ],
    autoText: 'The reactor trips on low pressure; isolating the right loop depends on the crew.',
    resolve: (s, site, e, opt, prep) => {
      const b = bld(site, e.target);
      const release = () => {
        const fine = Math.round(BUILDINGS[b?.type ?? 'reactor_pwr'].cost * 0.05);
        s.money -= fine;
        s.ledger.other -= fine;
        s.regulator.opinion = Math.max(0, s.regulator.opinion - 6);
        return fine;
      };
      if (opt === 'isolate') {
        trip(s, b, 'Steam generator tube rupture');
        if (roll(0.85 + 0.15 * prep)) { wear(b, 20); return { ines: 1, text: 'Faulted loop isolated; no release outside the plant.' }; }
        wear(b, 35);
        return { ines: 2, text: `A relief valve lifted on the faulted loop: a small release. Fine $${release().toLocaleString('en-US')}.` };
      }
      if (opt === 'run') {
        trip(s, b, 'Steam generator tube rupture');
        wear(b, 40);
        return { ines: 3, text: `Contaminated steam reached the environment. Fine $${release().toLocaleString('en-US')} and public anger.` };
      }
      trip(s, b, 'Low primary pressure');
      if (roll(0.6 + 0.35 * prep)) { wear(b, 25); return { ines: 1, text: 'The crew identified and isolated the faulted loop.' }; }
      wear(b, 35);
      return { ines: 2, text: `The faulted loop was isolated late: a small release. Fine $${release().toLocaleString('en-US')}.` };
    },
  },
  fire: {
    title: 'Transformer fire',
    countdown: 25,
    describe: (s, e) => `The main transformer at the ${name(s.sites[e.siteId], e.target)} is on fire. Burning oil could spread to the cable trays.`,
    options: [
      { id: 'brigade', label: 'Send the fire brigade', detail: 'Foam attack on the transformer; your own fire station is fastest.' },
      { id: 'isolate', label: 'Isolate it and let it burn out', detail: 'De-energise, cool the surroundings and let the oil burn.' },
    ],
    autoText: 'The deluge system starts; the off-site fire brigade is called.',
    resolve: (_s, site, e, opt, prep) => {
      const b = bld(site, e.target);
      const station = site.buildings.some((x) => x.type === 'fire_station' && x.status === 'active');
      const lose = () => {
        if (b) { b.status = 'broken'; b.condition = Math.min(b.condition, 15); }
        const n = b ? breakPowerLinks(site, b.id) : 0;
        return n;
      };
      if (opt === 'isolate') { const n = lose(); return { ines: 0, text: `The transformer burned out${n ? ` and ${n} cable${n > 1 ? 's' : ''} with it` : ''}. Repairs needed.` }; }
      const p = (station ? 0.95 : 0.55) + 0.1 * prep - (opt === 'brigade' ? 0 : 0.15);
      if (roll(p)) { wear(b, 20); return { ines: 0, text: station ? 'Your fire station put it out within minutes.' : 'The fire brigade put it out.' }; }
      const n = lose();
      return { ines: 1, text: `The fire spread before it was out: equipment destroyed${n ? ` and ${n} cable${n > 1 ? 's' : ''} damaged` : ''}.` };
    },
  },
  dg: {
    title: 'Emergency diesel failed to start',
    countdown: 25,
    describe: (s, e) => `Grid power is lost and the ${name(s.sites[e.siteId], e.target)} did not start. Batteries are carrying the safety systems.`,
    options: [
      { id: 'manual', label: 'Manual start by the technicians', detail: 'Reset the governor and start it locally.' },
      { id: 'shed', label: 'Shed load and stretch the batteries', detail: 'Switch off non-essential loads to buy time.' },
    ],
    autoText: 'The generator stays down; the other generators and batteries have to cope.',
    resolve: (_s, site, e, opt, prep) => {
      const b = bld(site, e.target);
      if (opt === 'manual') {
        const tech = staffEffects(site, 1).cover.technician;
        if (roll(0.55 + 0.25 * tech + 0.2 * prep)) return { ines: 0, text: 'Started by hand — backup power restored.' };
        if (b) b.status = 'broken';
        return { ines: 1, text: 'The generator would not start. It needs repair.' };
      }
      if (b) b.status = 'broken';
      if (opt === 'shed') { site.blackoutTime = Math.max(0, site.blackoutTime - 40); return { ines: 1, text: 'Load shed: the batteries last longer while the grid is repaired.' }; }
      return { ines: 1, text: 'One generator short for the rest of the blackout.' };
    },
  },
  flood: {
    title: 'Flood warning',
    countdown: 40,
    describe: (_s, e) => {
      const theme = LOCATION_BY_ID[e.siteId].theme;
      return theme === 'river' ? 'The river is bursting its banks after days of rain. Water is rising towards the plant.' : 'A storm surge is driving the sea over the breakwater. Water is rising towards the plant.';
    },
    options: [
      { id: 'barriers', label: 'Close flood doors, sandbags, mobile pumps', detail: 'Protect the safety buildings; keep running.' },
      { id: 'shutdown', label: 'Shut every reactor down now', detail: 'Lose output, but nothing is running when the water arrives.' },
      { id: 'wait', label: 'Keep running and hope it passes', detail: 'It might stay below the site level.' },
    ],
    autoText: 'Nobody prepares; the water does what it does.',
    resolve: (s, site, _e, opt, prep) => {
      const reactors = site.buildings.filter((b) => b.reactor && b.status === 'active');
      const severity = opt === 'barriers' ? 0.3 * (1 - prep) : opt === 'shutdown' ? 0.6 : opt === 'wait' ? 1 : 0.85 * (1 - 0.4 * prep);
      if (opt === 'shutdown') for (const b of reactors) trip(s, b, 'Pre-emptive shutdown (flood)');
      let hit = 0;
      for (const b of site.buildings) {
        if (b.reactor || b.status === 'constructing' || b.status === 'destroyed') continue;
        if (random() < 0.35 * severity) {
          b.condition = Math.max(5, b.condition - 50);
          if (random() < 0.5) b.status = 'broken';
          hit++;
        }
      }
      let cut = 0;
      for (const l of site.links) if (l.kind === 'power' && !l.broken && random() < 0.2 * severity) { l.broken = true; l.flow = 0; cut++; }
      if (severity > 0.7 && s.level >= 5 && !s.events.some((x) => x.id === 'blackout' && x.siteId === site.id)) {
        s.events.push({ id: 'blackout', remaining: 80, duration: 80, siteId: site.id });
        for (const g of site.buildings) if (BUILDINGS[g.type].stats.backupMW && random() < 0.5) g.status = 'broken';
        return { ines: 2, text: `Flood water cut the grid connection and swamped backup generators. ${hit} buildings and ${cut} cables damaged. Build a Flood Wall.` };
      }
      return { ines: hit > 3 ? 1 : 0, text: `${hit} building${hit === 1 ? '' : 's'} and ${cut} cable${cut === 1 ? '' : 's'} damaged by the flood.${opt === 'barriers' ? ' The barriers kept the worst out.' : ''}` };
    },
  },
  quake: {
    title: 'Earthquake',
    countdown: 40,
    describe: () => 'A strong earthquake shook the site. Seismic instruments tripped every reactor. Was anything damaged?',
    options: [
      { id: 'inspect', label: 'Walk-down inspection before restart', detail: 'Check every system first: reactors stay down for a while, small repair bill.' },
      { id: 'restart', label: 'Restart as soon as possible', detail: 'Get back to selling power — hidden damage might show up later.' },
    ],
    autoText: 'Inspections happen anyway, slowly.',
    resolve: (s, site, _e, opt, prep) => {
      if (opt === 'restart') {
        const hidden = roll(0.4 * (1 - 0.5 * prep));
        s.regulator.opinion = Math.max(0, s.regulator.opinion - 3);
        if (hidden) {
          const r = pick(site.buildings.filter((b) => b.reactor && b.status === 'active'));
          wear(r, 50);
          if (r) queueEmergency(s, site, 'loca', r.id, s.gameTime + 120);
          return { ines: 2, text: 'A cracked pipe went unnoticed — it is leaking now.' };
        }
        return { ines: 1, text: 'Restarted quickly. The regulator is not pleased you skipped the walk-down.' };
      }
      const hold = opt === 'inspect' ? 120 : 240;
      site.reg.holdUntil = Math.max(site.reg.holdUntil, s.gameTime + hold);
      const cost = Math.round(5000 + 2000 * site.buildings.filter((b) => b.reactor).length);
      s.money -= cost;
      s.ledger.maintenance += cost;
      return { ines: 1, text: `Walk-down done: minor damage repaired for $${cost.toLocaleString('en-US')}. Reactors restart after ${Math.round(hold / 60)} min.` };
    },
  },
};

// ── Preparedness, drills ─────────────────────────────────────────────────

export function preparedness(s: GameState, site: Site): number {
  let p = 0.15 + (site.drill ?? 0);
  for (const b of site.buildings) {
    const prep = BUILDINGS[b.type].stats.prep;
    if (prep && b.status === 'active') p += prep * Math.sqrt(levelMult(BUILDINGS[b.type], b.level));
  }
  const k = site.staff?.key ?? {};
  p += 0.03 * (keyLevel(k.supervisor) + keyLevel(k.chief_engineer));
  p += 0.015 * s.staffTraining;
  if (site.staff) p += 0.15 * Math.max(-1, staffEffects(site, 1).cover.engineer - 1);
  return Math.max(0, Math.min(1, p));
}

export function drillCost(site: Site): number {
  return 2000 + 1500 * site.buildings.filter((b) => b.reactor).length;
}

export function runDrill(s: GameState, site: Site): string | null {
  if ((site.drill ?? 0) >= 0.3) return 'Crews are fully drilled — wait a while before the next drill.';
  const cost = drillCost(site);
  if (s.money < cost) return 'Not enough money.';
  s.money -= cost;
  s.ledger.salaries += cost;
  site.drill = Math.min(0.3, (site.drill ?? 0) + 0.1);
  if (site.staff) site.staff.fatigue = Math.min(1, site.staff.fatigue + 0.05);
  return null;
}

// ── Triggering ────────────────────────────────────────────────────────────

/** Mean time between plant incidents at a site with running reactors (≈ 1–2 game weeks). */
export const BASE_INCIDENT_INTERVAL = DAY_LENGTH * 10;
/** Test switch: no random incidents (deterministic physics tests). */
export const RANDOM_INCIDENTS = { on: true };

const QUAKE_DAYS: Record<string, number> = { coast: 40, arctic: 45, desert: 60, river: 150 };

function hasSteamGenerators(type: Building['type']): boolean {
  return ['reactor_pilot', 'reactor_smr', 'reactor_pwr', 'reactor_epr', 'reactor_smr_park'].includes(type);
}

export function queueEmergency(s: GameState, site: Site, kind: EmergencyKind, target: number, at = s.gameTime): Emergency {
  const e: Emergency = { id: s.nextBuildingId++, kind, siteId: site.id, target, started: at, deadline: at + EMERGENCIES[kind].countdown };
  s.emergencies.push(e);
  return e;
}

export function riskFactor(s: GameState, site: Site): number {
  const blds = site.buildings.filter((b) => b.status !== 'constructing' && b.status !== 'destroyed');
  const cond = blds.length ? blds.reduce((a, b) => a + b.condition, 0) / blds.length : 100;
  const prep = preparedness(s, site);
  return (1 + 1.5 * Math.max(0, 1 - cond / 100)) * (1 + (site.staff?.fatigue ?? 0)) * (1.3 - 0.5 * prep);
}

function pick<T>(list: T[]): T | undefined {
  return list.length ? list[Math.floor(random() * list.length)] : undefined;
}

/** Roll for new incidents at one site. */
function spawn(s: GameState, site: Site, dt: number): void {
  if (s.emergencies.some((e) => e.siteId === site.id && e.started <= s.gameTime)) return;
  const running = site.buildings.filter((b) => b.reactor && b.status === 'active' && !b.reactor.scrammed && b.reactor.power > 0.2);
  const theme = LOCATION_BY_ID[site.id].theme;
  const w = site.weather;
  const walled = site.buildings.some((b) => b.type === 'flood_wall' && b.status !== 'constructing');
  // Floods: big rain on a swollen river, or a storm surge at the coast.
  if (!walled && w && s.gameTime - (site.lastFlood ?? -1e9) > DAY_LENGTH * 2) {
    const risk = theme === 'river' ? (w.riverFlow > 1.3 && w.rain > 5 ? 0.004 : 0) : theme === 'coast' || theme === 'arctic' ? (w.wind > 28 ? 0.003 : 0) : 0;
    if (risk && random() < risk * dt) {
      site.lastFlood = s.gameTime;
      queueEmergency(s, site, 'flood', -1);
      return;
    }
  }
  // Earthquakes trip every reactor at once.
  if (running.length && random() < dt / (DAY_LENGTH * (QUAKE_DAYS[theme] ?? 100))) {
    for (const b of site.buildings) trip(s, b, 'Seismic trip');
    for (const b of site.buildings) if (!b.reactor && random() < 0.15) wear(b, 30);
    queueEmergency(s, site, 'quake', -1);
    return;
  }
  if (!running.length) return;
  const rate = dt / BASE_INCIDENT_INTERVAL * riskFactor(s, site);
  if (random() >= rate) return;
  const r = pick(running)!;
  const kinds: [EmergencyKind, number, number][] = [
    ['loca', physicsFor(r.type).fission && !physicsFor(r.type).drainable ? 3 : 0, r.id],
    ['porv', physicsFor(r.type).boron ? 2 : 0, r.id],
    ['sgtr', hasSteamGenerators(r.type) ? 2 : 0, r.id],
  ];
  const transformer = pick(site.buildings.filter((b) => (BUILDINGS[b.type].stats.steamMW || BUILDINGS[b.type].stats.gridMW) && b.status === 'active'));
  if (transformer) kinds.push(['fire', 4, transformer.id]);
  let x = random() * kinds.reduce((a, k) => a + k[1], 0);
  for (const [kind, wgt, target] of kinds) {
    x -= wgt;
    if (x <= 0 && wgt > 0) {
      queueEmergency(s, site, kind, target);
      return;
    }
  }
}

export interface EmergencyNews {
  kind: 'bad' | 'warn' | 'good' | 'info';
  title: string;
  text: string;
  alarm?: boolean;
}

export function inesLabel(n: number): string {
  return ['INES 0 — no safety significance', 'INES 1 — anomaly', 'INES 2 — incident', 'INES 3 — serious incident', 'INES 4 — accident with local consequences', 'INES 5 — accident with wider consequences', 'INES 6 — serious accident', 'INES 7 — major accident'][Math.max(0, Math.min(7, n))];
}

export function resolveEmergency(s: GameState, id: number, option: string | null): EmergencyNews | null {
  const e = s.emergencies.find((x) => x.id === id);
  if (!e) return null;
  s.emergencies = s.emergencies.filter((x) => x !== e);
  const site = s.sites[e.siteId];
  if (!site) return null;
  const def = EMERGENCIES[e.kind];
  const out = def.resolve(s, site, e, option, preparedness(s, site));
  if (out.ines > 0 && out.ines < 5) reportIncident(s, site.id, 'ines', out.ines);
  const loc = LOCATION_BY_ID[site.id].name;
  s.incidents.unshift({ t: s.gameTime, siteId: site.id, kind: e.kind, ines: out.ines, text: out.text });
  s.incidents = s.incidents.slice(0, 30);
  return { kind: out.ines >= 2 ? 'bad' : out.ines === 1 ? 'warn' : 'good', title: `${def.title} at ${loc} — INES ${out.ines}`, text: out.text };
}

let lastBlackout = new Map<string, boolean>();

export function stepAccidents(s: GameState, dt: number, offline: boolean): EmergencyNews[] {
  const news: EmergencyNews[] = [];
  // While the player is away nothing new happens, and anything pending is left to automatic systems.
  if (offline) {
    for (const e of [...s.emergencies]) { const n = resolveEmergency(s, e.id, null); if (n) news.push(n); }
    return news.filter((n) => n.kind === 'bad');
  }
  for (const id of s.unlockedSites) {
    const site = s.sites[id];
    site.drill = Math.max(0, (site.drill ?? 0) - (0.3 / (DAY_LENGTH * 10)) * dt);
    // Diesel start failure when the grid drops.
    const down = !site.stats.offsitePower;
    if (down && !lastBlackout.get(id)) {
      const gen = pick(site.buildings.filter((b) => BUILDINGS[b.type].stats.backupMW && b.status === 'active'));
      if (gen && random() < 0.25 * (1 - preparedness(s, site))) {
        queueEmergency(s, site, 'dg', gen.id);
      }
    }
    lastBlackout.set(id, down);
    if (RANDOM_INCIDENTS.on && s.level >= 3 && s.gameTime > 1200) spawn(s, site, dt);
  }
  for (const e of s.emergencies) {
    if (e.started > s.gameTime || e.started + dt < s.gameTime) continue;
    if (e.started <= s.gameTime && e.started > s.gameTime - dt - 1e-6) {
      news.push({ kind: 'bad', title: `EMERGENCY: ${EMERGENCIES[e.kind].title}`, text: EMERGENCIES[e.kind].describe(s, e), alarm: true });
    }
  }
  for (const e of [...s.emergencies]) {
    if (s.gameTime < e.deadline) continue;
    const n = resolveEmergency(s, e.id, null);
    if (n) news.push({ ...n, text: `No decision in time — automatic systems responded. ${n.text}` });
  }
  return news;
}

export function resetAccidentMemory(): void {
  lastBlackout = new Map();
}
