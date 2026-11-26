import type { GameState, Building, LogEntry, Notice } from '../types';
import { BUILDINGS, isReactor } from '../buildings/defs';
import { random, pick } from '../rng';
import { LOG_LENGTH } from '../constants';
import { LOCATION_BY_ID } from '../progression/locations';
import { getMods } from '../simulation/modifiers';
import { safetyRating } from '../simulation/plant';

// Random management events. All incidents are abstract game mechanics
// (capacity changes, offline equipment, market shifts) — never real procedures.

export interface EventEffect {
  offsite?: number; // 0 = loss of offsite power
  water?: number; // raw water supply
  evaporation?: number;
  cooling?: number;
  demand?: number;
  price?: number;
  grid?: number;
  fuelPrice?: number;
  research?: number;
}

export interface EventDef {
  id: string;
  name: string;
  kind: 'good' | 'bad' | 'info';
  description: string;
  weight: number;
  duration: number; // 0 = instant
  siteScoped: boolean;
  effect?: EventEffect;
  minLevel?: number;
  themes?: string[]; // only at these site themes
  /** Instant effect; returns text for the log or null when not applicable. */
  apply?: (s: GameState, siteId: string) => string | null;
}

function randomBuilding(s: GameState, siteId: string, filter: (b: Building) => boolean): Building | null {
  const list = s.sites[siteId]?.buildings.filter((b) => b.status === 'active' && filter(b)) ?? [];
  if (!list.length) return null;
  // Worn equipment is more likely to fail.
  const weights = list.map((b) => 1 + (100 - b.condition) / 20);
  let r = random() * weights.reduce((a, w) => a + w, 0);
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

// Heatwaves, droughts, cold snaps and storms now come from the weather system
// (game/weather); their old definitions stay (weight 0) for saves that have one active.
export const EVENTS: EventDef[] = [
  { id: 'heatwave', name: 'Heatwave', kind: 'bad', weight: 0, duration: 150, siteScoped: true,
    description: 'Hot air and warm intake water reduce cooling capacity, while air-conditioning demand soars.',
    effect: { cooling: 0.85, demand: 1.25, price: 1.15, evaporation: 1.25, water: 0.8 } },
  { id: 'blackout', name: 'Loss of Offsite Power', kind: 'bad', weight: 5, duration: 70, siteScoped: true, minLevel: 5,
    description: 'The grid connection is lost. Reactors trip, and pumps and emergency cooling must run on emergency diesel generators — without enough backup power, decay heat boils off the coolant.',
    effect: { grid: 0, offsite: 0 } },
  { id: 'drought', name: 'Drought', kind: 'bad', weight: 0, duration: 200, siteScoped: true, themes: ['river', 'desert'],
    description: 'Low river levels and a falling water table: raw water supply is cut sharply and evaporation rises.',
    effect: { water: 0.5, evaporation: 1.15 } },
  { id: 'intake', name: 'Intake Screens Clogged', kind: 'bad', weight: 4, duration: 90, siteScoped: true, themes: ['river', 'coast', 'arctic'],
    description: 'Debris (or jellyfish!) blocks the intake screens. Raw water supply is reduced.', effect: { water: 0.6 } },
  { id: 'outcry', name: 'Public Outcry', kind: 'bad', weight: 0, duration: 600, siteScoped: false,
    description: 'After a core damage incident customers and regulators lose trust: electricity prices are depressed.', effect: { price: 0.8 } },
  { id: 'coldsnap', name: 'Cold Snap', kind: 'good', weight: 0, duration: 130, siteScoped: true,
    description: 'Freezing weather boosts heating demand and improves cooling.',
    effect: { cooling: 1.12, demand: 1.35, price: 1.1 } },
  { id: 'storm', name: 'Severe Storm', kind: 'bad', weight: 0, duration: 90, siteScoped: true,
    description: 'Storm damage on transmission lines limits how much power the site can export.',
    effect: { grid: 0.65 } },
  { id: 'boom', name: 'Energy Market Boom', kind: 'good', weight: 8, duration: 100, siteScoped: false,
    description: 'Wholesale electricity prices spike.', effect: { price: 1.5 } },
  { id: 'slump', name: 'Market Slump', kind: 'bad', weight: 7, duration: 120, siteScoped: false,
    description: 'Cheap imports push wholesale prices down.', effect: { price: 0.72 } },
  { id: 'surge', name: 'Demand Surge', kind: 'good', weight: 8, duration: 80, siteScoped: true,
    description: 'A major industrial customer ramps up — regional demand jumps.', effect: { demand: 1.6 } },
  { id: 'fuelspike', name: 'Fuel Supply Squeeze', kind: 'bad', weight: 5, duration: 180, siteScoped: false,
    description: 'Fuel enrichment backlog doubles the price of fresh fuel.', effect: { fuelPrice: 2 } },
  { id: 'fuelglut', name: 'Fuel Oversupply', kind: 'good', weight: 4, duration: 150, siteScoped: false,
    description: 'Fuel is on sale — a good time to fill your depots.', effect: { fuelPrice: 0.55 } },
  { id: 'failure', name: 'Equipment Failure', kind: 'bad', weight: 9, duration: 0, siteScoped: true,
    description: 'A component has failed and the unit is offline until repaired.',
    apply: (s, siteId) => {
      const b = randomBuilding(s, siteId, (x) => !isReactor(x.type));
      if (!b) return null;
      b.status = 'broken';
      b.condition = Math.min(b.condition, 20);
      return `${BUILDINGS[b.type].short} failed at ${LOCATION_BY_ID[siteId].name} and needs repair.`;
    } },
  { id: 'pump', name: 'Coolant Pump Fault', kind: 'bad', weight: 6, duration: 0, siteScoped: true,
    description: 'A primary pump is vibrating badly. The reactor loses condition.',
    apply: (s, siteId) => {
      const b = randomBuilding(s, siteId, (x) => isReactor(x.type));
      if (!b) return null;
      b.condition = Math.max(5, b.condition - 30);
      return `Pump fault: ${BUILDINGS[b.type].short} condition dropped to ${Math.round(b.condition)}%.`;
    } },
  { id: 'breakthrough', name: 'Research Breakthrough', kind: 'good', weight: 6, duration: 0, siteScoped: false,
    description: 'Your scientists make an unexpected discovery.',
    apply: (s) => {
      const rp = Math.max(25, Object.values(s.sites).reduce((a, x) => a + x.stats.researchRate, 0) * 90);
      s.research.points += rp;
      return `Breakthrough! +${Math.round(rp)} research points.`;
    } },
  { id: 'grant', name: 'Clean Energy Grant', kind: 'good', weight: 5, duration: 0, siteScoped: false,
    description: 'The government rewards low-carbon generation.',
    apply: (s) => {
      const mw = Object.values(s.sites).reduce((a, x) => a + x.stats.exportMW, 0);
      const amount = Math.round(Math.max(3_000, mw * 0.1 * 55 * 120));
      s.money += amount;
      s.ledger.other += amount;
      return `Clean energy grant received: $${amount.toLocaleString('en-US')}.`;
    } },
  { id: 'inspection', name: 'Regulatory Inspection', kind: 'info', weight: 0, duration: 0, siteScoped: true,
    description: 'Inspectors review the site. A high safety rating earns a bonus, a poor one a fine.',
    apply: (s, siteId) => {
      const rating = safetyRating(s, siteId, getMods(s, siteId));
      const mw = Math.max(5, s.sites[siteId].stats.exportMW);
      const amount = Math.round(mw * 0.1 * 55 * 90);
      if (rating >= 60) {
        s.money += amount;
        s.ledger.other += amount;
        return `Inspection passed with distinction (safety ${Math.round(rating)}). Bonus $${amount.toLocaleString('en-US')}.`;
      }
      const fine = Math.round(amount * (60 - rating) / 30);
      s.money -= fine;
      s.ledger.other -= fine;
      return `Inspection found issues (safety ${Math.round(rating)}). Fine: $${fine.toLocaleString('en-US')}.`;
    } },
  { id: 'heatwave_desert', name: 'Sandstorm', kind: 'bad', weight: 10, duration: 100, siteScoped: true, themes: ['desert'],
    description: 'Dust clogs air intakes and lines.', effect: { cooling: 0.85, grid: 0.8 } },
  { id: 'blizzard', name: 'Blizzard', kind: 'info', weight: 10, duration: 120, siteScoped: true, themes: ['arctic'],
    description: 'Icy lines, but outstanding cooling and very high heating demand.', effect: { grid: 0.75, cooling: 1.2, demand: 1.4 } },
];

export const EVENT_BY_ID: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

export function pushLog(s: GameState, kind: LogEntry['kind'], text: string): void {
  s.log.unshift({ t: s.gameTime, kind, text });
  if (s.log.length > LOG_LENGTH) s.log.length = LOG_LENGTH;
}

export function notify(s: GameState, n: Notice): void {
  s.pendingNotices.push(n);
  if (s.pendingNotices.length > 20) s.pendingNotices.splice(0, s.pendingNotices.length - 20);
}

/** Combined event effect multiplier for a site. */
export function eventEffect(s: GameState, siteId: string, key: keyof EventEffect): number {
  let m = 1;
  for (const e of s.events) {
    if (e.siteId && e.siteId !== siteId) continue;
    const def = EVENT_BY_ID[e.id];
    const v = def?.effect?.[key];
    if (v !== undefined) m *= v;
  }
  return m;
}

export function companyEventEffect(s: GameState, key: keyof EventEffect): number {
  let m = 1;
  for (const e of s.events) {
    if (e.siteId) continue;
    const v = EVENT_BY_ID[e.id]?.effect?.[key];
    if (v !== undefined) m *= v;
  }
  return m;
}

export function tickEvents(s: GameState, dt: number, allowNew: boolean): void {
  for (const e of s.events) e.remaining -= dt;
  const ended = s.events.filter((e) => e.remaining <= 0);
  if (ended.length) {
    s.events = s.events.filter((e) => e.remaining > 0);
    for (const e of ended) pushLog(s, 'info', `${EVENT_BY_ID[e.id]?.name ?? e.id} has ended.`);
  }
  if (!allowNew) return;
  s.nextEventIn -= dt;
  if (s.nextEventIn > 0) return;
  s.nextEventIn = 75 + random() * 110;
  if (s.gameTime < 120) return; // grace period for new players
  triggerRandomEvent(s);
}

export function triggerRandomEvent(s: GameState, forceId?: string): void {
  const siteId = pick(s.unlockedSites);
  const theme = LOCATION_BY_ID[siteId].theme;
  const candidates = EVENTS.filter(
    (e) =>
      (!e.minLevel || s.level >= e.minLevel) &&
      (!e.themes || e.themes.includes(theme)) &&
      !s.events.some((a) => a.id === e.id && (a.siteId === null || a.siteId === siteId)),
  );
  let def: EventDef | undefined;
  if (forceId) def = EVENT_BY_ID[forceId];
  else {
    let r = random() * candidates.reduce((a, e) => a + e.weight, 0);
    // (weight-0 events such as Public Outcry are only triggered by the simulation)
    for (const e of candidates) {
      r -= e.weight;
      if (r <= 0) {
        def = e;
        break;
      }
    }
  }
  if (!def) return;
  const where = def.siteScoped ? ` at ${LOCATION_BY_ID[siteId].name}` : '';
  if (def.duration > 0) {
    s.events.push({ id: def.id, remaining: def.duration, duration: def.duration, siteId: def.siteScoped ? siteId : null });
    pushLog(s, def.kind === 'bad' ? 'warn' : def.kind === 'good' ? 'good' : 'info', `${def.name}${where}: ${def.description}`);
    notify(s, { kind: def.kind === 'bad' ? 'warn' : def.kind === 'good' ? 'good' : 'info', title: def.name + where, text: def.description });
  } else if (def.apply) {
    const text = def.apply(s, siteId);
    if (!text) return;
    pushLog(s, def.kind === 'bad' ? 'bad' : def.kind === 'good' ? 'good' : 'info', text);
    notify(s, { kind: def.kind === 'bad' ? 'bad' : def.kind === 'good' ? 'good' : 'info', title: def.name, text });
  }
  s.stats.eventsSeen++;
}
