import { CARDS, SET_IDS, SETS, type SetId } from '../data/cards';
import { SHOP_LEVELS, fmt, sealedValue, singleValue } from './economy';
import { addXp, bump, isUnlocked, unlockLevel, type UnlockKey } from './progression';
import { between, pick, random, weighted } from './rng';
import { countFurniture, roomFor, type CustomerType } from './shop';
import type { GameState, SealedKind, SealedListing } from './types';
import { buyDeal, dealValue, earn, log, sealedCount, sealedName, spend } from './sim';

// Phase 3: tournaments, release days, staff and random events.

export interface Notice {
  icon: string;
  title: string;
  text: string;
}

export function notify(g: GameState, icon: string, title: string, text: string): void {
  g.notices.push({ icon, title, text });
  if (g.notices.length > 6) g.notices.shift();
}

// ── Hype (sealed prices above market for a while) ───────────────────────

export function addHype(g: GameState, set: SetId, factor: number): void {
  g.hype[set] = Math.round((g.hype[set] ?? 1) * factor * 1000) / 1000;
}

function decayHype(g: GameState): void {
  for (const s of Object.keys(g.hype) as SetId[]) {
    const h = 1 + ((g.hype[s] ?? 1) - 1) * 0.8;
    if (Math.abs(h - 1) < 0.01) delete g.hype[s];
    else g.hype[s] = Math.round(h * 1000) / 1000;
  }
}

// ── Random events ───────────────────────────────────────────────────────

export interface EventDef {
  id: string;
  icon: string;
  title: string;
  text: string;
  /** Hours it lasts (0 = happens once). */
  hours: number;
  traffic?: number;
  mix?: Partial<Record<CustomerType, number>>;
  budget?: number;
  weight: number;
  apply?: (g: GameState) => string | void;
}

export const EVENTS: EventDef[] = [
  { id: 'rain', icon: '🌧️', title: 'Rainy day', text: 'Fewer people out shopping today.', hours: 12, traffic: 0.65, weight: 10 },
  { id: 'sunny', icon: '☀️', title: 'Sunny Saturday', text: 'The street is busy — more people walk in today.', hours: 12, traffic: 1.35, weight: 9 },
  { id: 'holiday', icon: '🎒', title: 'School holiday', text: 'Lots of kids with pocket money today.', hours: 12, mix: { kid: 2.5, casual: 1.3 }, weight: 7 },
  { id: 'payday', icon: '💸', title: 'Payday', text: 'Everyone just got paid: bigger budgets today.', hours: 12, budget: 1.5, weight: 7 },
  { id: 'cardshow', icon: '🎪', title: 'Card show in town', text: 'Collectors and sellers are out in force today.', hours: 12, mix: { collector: 2.2, seller: 2 }, budget: 1.2, weight: 6 },
  { id: 'streamer', icon: '🎥', title: 'Streamer in the shop', text: 'A local streamer is opening packs live in your shop — more customers, more reputation.', hours: 12, traffic: 1.5, mix: { casual: 1.5, kid: 1.3 }, weight: 5,
    apply: (g) => { g.rep = Math.min(100, g.rep + 2); } },
  { id: 'viral', icon: '📈', title: 'Viral pull video', text: '', hours: 12, traffic: 1.2, weight: 5,
    apply: (g) => { const s = pick(SET_IDS); addHype(g, s, 1.3); return `Someone pulled a huge card on video. ${SETS[s].name} packs and boxes are up 30%!`; } },
  { id: 'spoilers', icon: '🔮', title: 'Spoiler season', text: '', hours: 0, weight: 5,
    apply: (g) => { const s = pick(SET_IDS); addHype(g, s, 1.15); return `New spoilers have players excited about ${SETS[s].name}: sealed up 15%.`; } },
  { id: 'outage', icon: '🔌', title: 'Power cut', text: 'The lights are out for the first few hours — no customers until it’s fixed.', hours: 3, traffic: 0, weight: 3 },
  { id: 'thief', icon: '🕵️', title: 'Shoplifter', text: '', hours: 0, weight: 3,
    apply: (g) => {
      const packs = g.shelf.filter((l) => l.kind === 'pack');
      if (!packs.length) return 'Someone tried to shoplift, but there was nothing to take. Phew.';
      const l = pick(packs);
      const n = Math.min(l.qty, 1 + Math.floor(random() * 3));
      l.qty -= n;
      if (l.qty <= 0) g.shelf = g.shelf.filter((x) => x.uid !== l.uid);
      return `Someone walked out with ${sealedName(l.set, l.kind, n)} while you weren’t looking.`;
    } },
  { id: 'roof', icon: '💧', title: 'Leaky roof', text: '', hours: 0, weight: 3,
    apply: (g) => { const cost = Math.round(SHOP_LEVELS[g.shopLevel - 1].rent * 1.5); spend(g, cost); return `The roof leaked over the counter. Repairs cost ${fmt(cost)}.`; } },
];

const EVENT_BY_ID = new Map(EVENTS.map((e) => [e.id, e]));

export function activeEvent(g: GameState): EventDef | null {
  if (!g.event || g.event.until <= g.hours) return null;
  return EVENT_BY_ID.get(g.event.id) ?? null;
}

function rollEvent(g: GameState): void {
  g.event = null;
  if (g.day < 3 || random() > 0.4) return;
  const e = weighted(EVENTS.map((x) => [x, x.weight] as [EventDef, number]));
  const text = e.apply?.(g) || e.text;
  if (e.hours > 0) g.event = { id: e.id, until: g.hours + e.hours, text };
  notify(g, e.icon, e.title, text);
  log(g, e.id === 'thief' || e.id === 'roof' || e.id === 'outage' ? 'bad' : 'info', `${e.icon} ${e.title}: ${text}`);
}

// ── Tournaments ─────────────────────────────────────────────────────────

export type TourneyKind = 'casual' | 'weekly' | 'regional';

export const TOURNEYS: Record<TourneyKind, { name: string; icon: string; unlock: UnlockKey; base: number; fee: number; rep: number; xp: number; minTables: number }> = {
  casual: { name: 'Casual play night', icon: '🎲', unlock: 'tourney:casual', base: 10, fee: 5, rep: 1, xp: 150, minTables: 1 },
  weekly: { name: 'Weekly tournament', icon: '🏆', unlock: 'tourney:weekly', base: 22, fee: 12, rep: 2.5, xp: 500, minTables: 2 },
  regional: { name: 'Regional qualifier', icon: '👑', unlock: 'tourney:regional', base: 64, fee: 35, rep: 6, xp: 2_000, minTables: 4 },
};

export interface Tournament {
  kind: TourneyKind;
  day: number;
  fee: number;
  prize: { set: SetId; packs: number } | null;
}

/** Seats at your play tables (6 per table star). */
export function seats(g: GameState): number {
  return countFurniture(g, 'table') * 6;
}

export function prizeValue(g: GameState, t: Pick<Tournament, 'prize'>): number {
  return t.prize ? sealedValue(g, t.prize.set, 'pack') * t.prize.packs : 0;
}

/** How many players are expected, before the seat limit. */
export function expectedPlayers(g: GameState, t: Omit<Tournament, 'day'>): number {
  const d = TOURNEYS[t.kind];
  const feeF = Math.max(0.15, Math.min(1.5, 1.5 - 0.6 * (t.fee / d.fee)));
  const prizeF = 1 + Math.min(1, prizeValue(g, t) / (d.base * d.fee)) * 0.7;
  return d.base * (0.5 + g.rep / 100) * Math.sqrt(SHOP_LEVELS[g.shopLevel - 1].traffic) * feeF * prizeF;
}

export function canHost(g: GameState, kind: TourneyKind): string | null {
  const d = TOURNEYS[kind];
  if (!isUnlocked(g, d.unlock)) return `${d.name}s unlock at level ${unlockLevel(d.unlock)}.`;
  if (countFurniture(g, 'table') < d.minTables) return `Needs ${d.minTables} play table star${d.minTables > 1 ? 's' : ''} (buy or upgrade tables in Build mode).`;
  if (g.tournament) return 'You already have an event planned.';
  return null;
}

/** Plan a tournament for tomorrow. Prize packs leave the back room now. */
export function hostTournament(g: GameState, kind: TourneyKind, fee: number, prize: Tournament['prize']): string | null {
  const err = canHost(g, kind);
  if (err) return err;
  if (prize && prize.packs > 0) {
    if (sealedCount(g, prize.set, 'pack') < prize.packs) return 'Not enough of those packs in the back room.';
    g.sealed[`${prize.set}:pack`] = sealedCount(g, prize.set, 'pack') - prize.packs;
    if (!g.sealed[`${prize.set}:pack`]) delete g.sealed[`${prize.set}:pack`];
  }
  g.tournament = { kind, day: g.day + 1, fee: Math.max(0, Math.round(fee * 100) / 100), prize: prize && prize.packs > 0 ? prize : null };
  log(g, 'info', `${TOURNEYS[kind].icon} ${TOURNEYS[kind].name} planned for tomorrow (entry ${fmt(fee)}).`);
  return null;
}

export function cancelTournament(g: GameState): void {
  const t = g.tournament;
  if (!t || t.day <= g.day) return;
  if (t.prize) g.sealed[`${t.prize.set}:pack`] = sealedCount(g, t.prize.set, 'pack') + t.prize.packs;
  g.tournament = null;
}

export function tourneyToday(g: GameState): Tournament | null {
  return g.tournament && g.tournament.day === g.day ? g.tournament : null;
}

const DECKS = () => CARDS.filter((c) => c.type === 'Legend' && c.kind === 'std').map((c) => c.name.split(' - ')[0].split(',')[0]);

function resolveTournament(g: GameState): void {
  const t = g.tournament!;
  const d = TOURNEYS[t.kind];
  const players = Math.max(2, Math.min(seats(g), Math.round(expectedPlayers(g, t) * between(0.75, 1.25))));
  const turnedAway = Math.max(0, Math.round(expectedPlayers(g, t)) - seats(g));
  const fees = players * t.fee;
  if (fees > 0) earn(g, fees, false);
  g.rep = Math.min(100, g.rep + d.rep * (players >= 8 ? 1 : 0.5));
  addXp(g, d.xp + players * 10);
  bump(g, 'tournaments');
  bump(g, 'tournamentPlayers', players);
  const champ = pick(DECKS());
  const factor = Math.round((t.kind === 'regional' ? between(1.5, 2.2) : t.kind === 'weekly' ? between(1.2, 1.5) : between(1.05, 1.2)) * 100) / 100;
  if (t.kind !== 'casual' || !g.market.spike) g.market.spike = { champion: champ, factor, until: g.day + 2 + Math.floor(random() * 3) };
  const winner = pick(['Alex', 'Sam', 'Jordan', 'Riley', 'Casey', 'Morgan', 'Jamie', 'Taylor', 'Quinn', 'Avery', 'Rowan', 'Kai']);
  const text = `${players} players came${turnedAway ? ` (${turnedAway} turned away — not enough seats)` : ''}. Entry fees: ${fmt(fees)}. ${winner} won with ${champ}${t.kind !== 'casual' || g.market.spike?.champion === champ ? ` — ${champ} cards are up ${Math.round((factor - 1) * 100)}%!` : '.'}`;
  notify(g, d.icon, `${d.name} results`, text);
  log(g, 'hit', `${d.icon} ${text}`, fees);
  g.tournament = null;
}

// ── Release days ────────────────────────────────────────────────────────

export interface Release {
  set: SetId;
  day: number;
}

export interface Preorder {
  set: SetId;
  kind: SealedKind;
  qty: number;
}

/** Pre-order price: MSRP-based, below the usual distributor price. */
export function preorderPrice(set: SetId, kind: SealedKind): number {
  const box = SETS[set].msrpBox * 0.58;
  return Math.round((kind === 'box' ? box : kind === 'case' ? box * 6 * 0.97 : (box / 24) * 1.1) * 100) / 100;
}

export function preorderLimit(g: GameState, kind: SealedKind): number {
  return kind === 'case' ? (isUnlocked(g, 'cases') ? 1 + Math.floor(g.shopLevel / 2) : 0) : kind === 'box' ? 3 + g.shopLevel * 2 : 0;
}

export function preordered(g: GameState, kind: SealedKind): number {
  return g.preorders.filter((p) => p.kind === kind).reduce((n, p) => n + p.qty, 0);
}

export function preorder(g: GameState, kind: SealedKind, qty: number): string | null {
  const r = g.release;
  if (!r || r.day <= g.day) return 'No pre-orders open right now.';
  if (preordered(g, kind) + qty > preorderLimit(g, kind)) return 'That’s your pre-order limit for this release.';
  const cost = preorderPrice(r.set, kind) * qty;
  if (g.cash < cost) return 'Not enough cash.';
  spend(g, cost);
  const p = g.preorders.find((x) => x.kind === kind);
  if (p) p.qty += qty;
  else g.preorders.push({ set: r.set, kind, qty });
  bump(g, 'preorders', qty);
  return null;
}

function scheduleRelease(g: GameState): void {
  const open = SET_IDS.filter((s) => isUnlocked(g, `set:${s}`));
  const set = weighted(open.map((s, i) => [s, 1 + i * 0.5] as [SetId, number]));
  g.release = { set, day: g.day + 3 };
  notify(g, '📦', `${SETS[set].name} restock launch in 3 days`, `A big new print run of ${SETS[set].name} lands on day ${g.release.day}. Pre-order boxes now at ${fmt(preorderPrice(set, 'box'))} each (Market tab). On launch day crowds come for it and prices jump.`);
  log(g, 'info', `📦 ${SETS[set].name} launch on day ${g.release.day} — pre-orders are open.`);
}

function launch(g: GameState): void {
  const r = g.release!;
  for (const p of g.preorders) g.sealed[`${p.set}:${p.kind}`] = sealedCount(g, p.set, p.kind) + p.qty;
  const got = g.preorders.map((p) => sealedName(p.set, p.kind, p.qty)).join(', ');
  g.preorders = [];
  addHype(g, r.set, 1.35);
  notify(g, '🚀', `${SETS[r.set].name} launch day!`, `${got ? `Your pre-order arrived: ${got}. ` : ''}Lines out the door today — ${SETS[r.set].name} sells fast and prices are up 35%.`);
  log(g, 'hit', `🚀 ${SETS[r.set].name} launch day!`);
}

/** Launch day: more customers, and they go for the launch set first. */
export function launchToday(g: GameState): SetId | null {
  return g.release && g.release.day === g.day ? g.release.set : null;
}

// ── Staff ───────────────────────────────────────────────────────────────

export type StaffId = 'cashier' | 'stocker' | 'buyer' | 'pricer';

export const STAFF: Record<StaffId, { name: string; icon: string; wage: number; unlock: UnlockKey; text: string }> = {
  cashier: { name: 'Cashier', icon: '💁', wage: 80, unlock: 'staff:cashier', text: 'Serves the queue faster: 20% more customers per hour.' },
  stocker: { name: 'Stocker', icon: '📦', wage: 90, unlock: 'staff:stocker', text: 'Refills the products on your shelves from the back room when they run low, at your price.' },
  buyer: { name: 'Buyer', icon: '🧾', wage: 120, unlock: 'staff:buyer', text: 'Buys walk-in sellers’ offers when they ask no more than your limit (keeps $500 in the till).' },
  pricer: { name: 'Price manager', icon: '🏷️', wage: 150, unlock: 'staff:pricer', text: 'Every morning, reprices your shelves and display cases to market + your markup.' },
};

export function wages(g: GameState): number {
  return (Object.keys(STAFF) as StaffId[]).filter((k) => g.staff[k]).reduce((n, k) => n + STAFF[k].wage, 0);
}

export function hire(g: GameState, id: StaffId, on: boolean): string | null {
  if (on && !isUnlocked(g, STAFF[id].unlock)) return `${STAFF[id].name} unlocks at level ${unlockLevel(STAFF[id].unlock)}.`;
  g.staff[id] = on || undefined;
  if (!on) delete g.staff[id];
  return null;
}

const STOCK_TARGET: Record<SealedKind, [number, number]> = { pack: [6, 24], box: [1, 4], case: [0, 1] };

/** Stocker: top up a shelf stack from the back room. Returns true if it has stock after. */
export function restock(g: GameState, l: SealedListing): boolean {
  if (!g.staff.stocker) return l.qty > 0;
  const [low, target] = STOCK_TARGET[l.kind];
  if (l.qty > low) return true;
  const n = Math.min(target - l.qty, sealedCount(g, l.set, l.kind));
  if (n > 0) {
    l.qty += n;
    g.sealed[`${l.set}:${l.kind}`] = sealedCount(g, l.set, l.kind) - n;
    if (!g.sealed[`${l.set}:${l.kind}`]) delete g.sealed[`${l.set}:${l.kind}`];
  }
  return l.qty > 0;
}

/** Buyer: take a walk-in offer if it's cheap enough. */
export function buyerCheck(g: GameState, offerId: number): void {
  if (!g.staff.buyer) return;
  const d = g.offers.find((o) => o.id === offerId);
  if (!d) return;
  if (d.price > dealValue(g, d) * g.staffCfg.buyerMax || g.cash - d.price < 500) return;
  if (d.what.type === 'sealed' && roomFor(g, d.what.kind, d.what.qty)) return;
  if (!buyDeal(g, d.id)) log(g, 'info', `🧾 Your buyer took the offer from ${d.who}.`);
}

function reprice(g: GameState): void {
  const m = g.staffCfg.markup;
  for (const l of g.shelf) l.price = Math.max(0.5, Math.round(sealedValue(g, l.set, l.kind) * m * 100) / 100);
  for (const l of g.display) l.price = Math.max(0.05, Math.round(singleValue(g, l) * m * 100) / 100);
  if (g.shelf.length || g.display.length) log(g, 'info', `🏷️ Your price manager repriced everything to market ${m >= 1 ? '+' : ''}${Math.round((m - 1) * 100)}%.`);
}

// ── Effects on the day ──────────────────────────────────────────────────

export function eventTraffic(g: GameState): number {
  let f = activeEvent(g)?.traffic ?? 1;
  if (g.staff.cashier) f *= 1.2;
  if (launchToday(g)) f *= 1.4;
  if (tourneyToday(g)) f *= 1.25;
  return f;
}

export function eventMix(g: GameState, type: CustomerType): number {
  let f = activeEvent(g)?.mix?.[type] ?? 1;
  if (tourneyToday(g) && type === 'player') f *= 3;
  if (launchToday(g) && (type === 'kid' || type === 'casual' || type === 'investor')) f *= 1.4;
  return f;
}

export function eventBudget(g: GameState): number {
  return activeEvent(g)?.budget ?? 1;
}

/** Called at the end of each shop day, before the day counter moves on. */
export function closeEvents(g: GameState): void {
  if (g.tournament && g.tournament.day === g.day) resolveTournament(g);
}

/** Called at the start of each new shop day. */
export function openEvents(g: GameState): void {
  decayHype(g);
  if (g.staff.pricer) reprice(g);
  if (g.release && g.release.day === g.day) launch(g);
  else if (g.release && g.release.day < g.day) g.release = null;
  if (!g.release && g.day >= 5 && (g.day - 5) % 12 === 0) scheduleRelease(g);
  rollEvent(g);
  if (g.tournament && g.tournament.day === g.day) {
    const t = TOURNEYS[g.tournament.kind];
    log(g, 'info', `${t.icon} ${t.name} today! Players will be in all day.`);
  }
}

/** Shop days until the next release is announced (for the Events screen). */
export function nextReleaseIn(g: GameState): number {
  if (g.day < 5) return 5 - g.day;
  return 12 - ((g.day - 5) % 12);
}
