import { CARDS, CARD_BY_ID, SET_IDS, SETS, type SetId } from '../data/cards';
import { fmt, rawValue, sealedValue, singleValue } from './economy';
import { random } from './rng';
import type { Company, GameState, SealedKind } from './types';

// Shop level, XP, unlocks, daily goals, milestones and net worth.

export const MAX_LEVEL = 50;

/** XP needed to go from `level` to `level + 1`. */
export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.6));
}

/** Cash reward for reaching a level. */
export function levelReward(level: number): number {
  return Math.round(60 * Math.pow(level, 1.7) / 10) * 10;
}

// ── Unlocks ─────────────────────────────────────────────────────────────

export type UnlockKey =
  | `set:${SetId}` | 'cases' | 'online' | 'singles' | 'ads' | 'clerk'
  | `grade:${Company}` | `tier:${Company}:${string}` | `shop:${number}`
  | 'furn:table' | 'furn:slabcase' | 'furn:endcap' | 'furn:neon' | 'furn:sofa'
  | 'staff:cashier' | 'staff:lister' | 'staff:stocker' | 'staff:buyer' | 'staff:pricer'
  | 'tourney:casual' | 'tourney:weekly' | 'tourney:regional';

export interface Unlock {
  key: UnlockKey;
  level: number;
  title: string;
  text: string;
}

/** Everything that opens up as the shop levels up, in order. */
export const UNLOCKS: Unlock[] = [
  { key: 'set:VEN', level: 1, title: 'Vendetta distributor account', text: 'Buy Vendetta packs and boxes wholesale.' },
  { key: 'set:RAD', level: 1, title: 'Radiance distributor account', text: 'Buy Radiance packs and boxes wholesale.' },
  { key: 'furn:table', level: 2, title: 'Play tables', text: 'Put play tables in the shop: competitive players come in, buy singles and ask for cards.' },
  { key: 'tourney:casual', level: 2, title: 'Casual play nights', text: 'Host a play night at your tables: entry fees, reputation and XP.' },
  { key: 'online', level: 2, title: 'Online marketplace', text: 'List cards online: they sell in a day or two near market price (12.5% fees).' },
  { key: 'grade:PSA', level: 3, title: 'PSA grading', text: 'Send cards to PSA (Value tier). A PSA 10 is worth 3–4× raw.' },
  { key: 'shop:2', level: 3, title: 'Corner Shop', text: 'You can move into a Corner Shop: more shelves, more customers.' },
  { key: 'furn:slabcase', level: 3, title: 'Slab showcase', text: 'A lit showcase for slabs: collectors pay 8% more for slabs.' },
  { key: 'furn:endcap', level: 4, title: 'Pack endcap', text: 'An impulse-buy rack: more kids and casual players.' },
  { key: 'set:UNL', level: 4, title: 'Unleashed distributor account', text: 'Buy Unleashed packs and boxes wholesale.' },
  { key: 'singles', level: 4, title: 'Singles market', text: 'Buy any single card online at market + 10%.' },
  { key: 'staff:cashier', level: 5, title: 'Hire a cashier', text: 'Serves the queue faster: 20% more customers.' },
  { key: 'tourney:weekly', level: 5, title: 'Weekly tournaments', text: 'Bigger events: the winner’s champion spikes in price.' },
  { key: 'tier:PSA:regular', level: 5, title: 'PSA Regular service', text: '3-day PSA turnaround.' },
  { key: 'ads', level: 5, title: 'Advertising', text: 'Run ads for 60% more customers for a shop day.' },
  { key: 'grade:BGS', level: 6, title: 'Beckett grading', text: 'Beckett (BGS) Base tier, with subgrades and the chance of a Black Label.' },
  { key: 'shop:3', level: 6, title: 'Game Store', text: 'You can move into a Game Store.' },
  { key: 'furn:neon', level: 6, title: 'Neon sign', text: 'Lots of atmosphere: more people walk in.' },
  { key: 'staff:lister', level: 6, title: 'Hire a singles seller', text: 'Puts your cards up for sale for you, up to the value you choose, at your markup.' },
  { key: 'staff:stocker', level: 7, title: 'Hire a stocker', text: 'Keeps your shelves topped up from the back room.' },
  { key: 'set:SFD', level: 7, title: 'Spiritforged distributor account', text: 'Buy Spiritforged packs and boxes (limited allocation).' },
  { key: 'tier:BGS:standard', level: 8, title: 'Beckett Standard service', text: '4-day Beckett turnaround.' },
  { key: 'cases', level: 8, title: 'Booster cases', text: 'Buy sealed cases of 6 booster boxes from the distributor.' },
  { key: 'staff:buyer', level: 9, title: 'Hire a buyer', text: 'Snaps up cheap offers from walk-in sellers for you.' },
  { key: 'furn:sofa', level: 9, title: 'Collector lounge', text: 'Collectors and investors with big budgets come in more.' },
  { key: 'set:OGN', level: 10, title: 'Origins distributor account', text: 'Buy Origins packs and boxes (limited allocation).' },
  { key: 'clerk', level: 10, title: 'Hire a clerk', text: 'A clerk keeps selling from your shelves while the app is closed.' },
  { key: 'shop:4', level: 10, title: 'Card Emporium', text: 'You can move into a Card Emporium.' },
  { key: 'staff:pricer', level: 11, title: 'Hire a price manager', text: 'Reprices everything to market + your markup every morning.' },
  { key: 'tourney:regional', level: 12, title: 'Regional qualifiers', text: 'Huge events with up to 64 players. Needs lots of seats.' },
  { key: 'tier:PSA:express', level: 12, title: 'PSA Express', text: 'One-day PSA grading.' },
  { key: 'tier:BGS:express', level: 12, title: 'Beckett Express', text: 'One-day Beckett grading.' },
  { key: 'shop:5', level: 15, title: 'Flagship Store', text: 'You can move into a Flagship Store.' },
  { key: 'shop:6', level: 22, title: 'Rift Megastore', text: 'You can move into the Rift Megastore.' },
];

const UNLOCK_BY_KEY = new Map(UNLOCKS.map((u) => [u.key, u]));

/** Level an unlock needs (things without an entry are always available). */
export function unlockLevel(key: UnlockKey): number {
  return UNLOCK_BY_KEY.get(key)?.level ?? 1;
}

export function isUnlocked(g: GameState, key: UnlockKey): boolean {
  return g.level >= unlockLevel(key);
}

export function lockedText(key: UnlockKey): string {
  return `Unlocks at level ${unlockLevel(key)}`;
}

/** Sealed product the distributor will sell you at your level. */
export function canBuySealed(g: GameState, set: SetId, kind: SealedKind): string | null {
  if (!isUnlocked(g, `set:${set}`)) return `You need a ${SETS[set].name} distributor account (level ${unlockLevel(`set:${set}`)}).`;
  if (kind === 'case' && !isUnlocked(g, 'cases')) return `Booster cases unlock at level ${unlockLevel('cases')}.`;
  return null;
}

// ── XP and levels ───────────────────────────────────────────────────────

export function addXp(g: GameState, xp: number): void {
  if (xp <= 0 || g.level >= MAX_LEVEL) return;
  g.xp += xp;
  while (g.level < MAX_LEVEL && g.xp >= xpForLevel(g.level)) {
    g.xp -= xpForLevel(g.level);
    g.level++;
    const reward = levelReward(g.level);
    g.cash += reward;
    g.levelUps.push(g.level);
  }
  if (g.level >= MAX_LEVEL) g.xp = 0;
}

// ── Counters (lifetime and today) ───────────────────────────────────────

export type Counter =
  | 'packsSold' | 'boxesSold' | 'singlesSold' | 'packsOpened' | 'boxesOpened' | 'graded' | 'dealsBought'
  | 'onlineSold' | 'altPulled' | 'overPulled' | 'sigPulled' | 'psa10' | 'bgs95' | 'blackLabel' | 'listed' | 'revenue'
  | 'requestsFilled' | 'furnitureBought' | 'investorSales' | 'collectorSales'
  | 'tournaments' | 'tournamentPlayers' | 'preorders';

export function bump(g: GameState, key: Counter, n = 1): void {
  g.counts[key] = (g.counts[key] ?? 0) + n;
  g.todayCounts[key] = (g.todayCounts[key] ?? 0) + n;
}

// ── Daily goals ─────────────────────────────────────────────────────────

export interface DailyGoal {
  id: number;
  counter: Counter;
  target: number;
  text: string;
  cash: number;
  xp: number;
  claimed?: boolean;
}

/** Three goals for the day, scaled to the shop's level. */
export function newDailyGoals(g: GameState): DailyGoal[] {
  const L = g.level;
  const s = 1 + L * 0.25;
  const templates: (() => Omit<DailyGoal, 'id'>)[] = [
    () => { const n = Math.round(6 * s); return { counter: 'packsSold', target: n, text: `Sell ${n} packs`, cash: 20 * n, xp: 15 * n }; },
    () => { const n = Math.max(1, Math.round(s * 0.8)); return { counter: 'singlesSold', target: n, text: `Sell ${n} single${n > 1 ? 's' : ''} from your display case`, cash: 60 * n, xp: 40 * n }; },
    () => { const n = Math.round(3 * s); return { counter: 'packsOpened', target: n, text: `Open ${n} packs`, cash: 15 * n, xp: 20 * n }; },
    () => { const n = Math.round(150 * s * s / 10) * 10; return { counter: 'revenue', target: n, text: `Make ${fmt(n)} in sales`, cash: Math.round(n * 0.25), xp: Math.round(n * 0.6) }; },
    () => ({ counter: 'dealsBought', target: 2, text: 'Buy 2 deals (deals board or the counter)', cash: 80 * s, xp: 120 }),
    () => { const n = Math.max(3, Math.round(4 * s)); return { counter: 'listed', target: n, text: `Put ${n} new things up for sale`, cash: 10 * n, xp: 25 * n }; },
  ];
  if (L >= 3) templates.push(() => ({ counter: 'graded', target: 1, text: 'Get a card graded', cash: 100 * s, xp: 250 }));
  if (L >= 2) templates.push(() => { const n = Math.max(1, Math.round(s * 0.6)); return { counter: 'onlineSold', target: n, text: `Sell ${n} card${n > 1 ? 's' : ''} online`, cash: 50 * n, xp: 60 * n }; });
  templates.push(() => ({ counter: 'requestsFilled', target: 1, text: 'Fill a card request', cash: 60 * s, xp: 150 }));
  if (L >= 6) templates.push(() => { const n = Math.max(2, Math.round(s * 0.5)); return { counter: 'requestsFilled', target: n, text: `Fill ${n} card requests`, cash: 70 * n * s, xp: 160 * n }; });
  if (L >= 4) templates.push(() => ({ counter: 'boxesSold', target: 1, text: 'Sell a sealed booster box', cash: 120 * s, xp: 300 }));
  const chosen: DailyGoal[] = [];
  const pool = [...templates];
  while (chosen.length < 3 && pool.length) {
    const i = Math.floor(random() * pool.length);
    const t = pool.splice(i, 1)[0]();
    chosen.push({ ...t, cash: Math.round(t.cash), xp: Math.round(t.xp), id: Math.floor(random() * 1e9) });
  }
  return chosen;
}

export function goalProgress(g: GameState, goal: DailyGoal): number {
  return Math.min(goal.target, Math.floor(g.todayCounts[goal.counter] ?? 0));
}

export function claimGoal(g: GameState, id: number): string | null {
  const goal = g.goals.find((x) => x.id === id);
  if (!goal || goal.claimed) return 'Already claimed.';
  if (goalProgress(g, goal) < goal.target) return 'Not done yet.';
  goal.claimed = true;
  g.cash += goal.cash;
  addXp(g, goal.xp);
  return null;
}

// ── Milestones ──────────────────────────────────────────────────────────

export interface Milestone {
  id: string;
  title: string;
  text: string;
  cash: number;
  xp: number;
  done: (g: GameState) => boolean;
  /** Progress shown as "x / y" while not done. */
  progress?: (g: GameState) => [number, number];
}

function setRegularDone(g: GameState, set: SetId): [number, number] {
  const cards = CARDS.filter((c) => c.set === set && c.kind === 'std');
  return [cards.filter((c) => g.seen[c.id]).length, cards.length];
}

const c = (g: GameState, k: Counter) => g.counts[k] ?? 0;
const count = (id: string, title: string, text: string, k: Counter, n: number, cash: number, xp: number): Milestone =>
  ({ id, title, text, cash, xp, done: (g) => c(g, k) >= n, progress: (g) => [Math.min(n, Math.floor(c(g, k))), n] });

export const MILESTONES: Milestone[] = [
  count('first-sale', 'Open for business', 'Make your first sale.', 'revenue', 1, 50, 50),
  count('packs-opened-1', 'Rip it!', 'Open your first pack.', 'packsOpened', 1, 25, 50),
  count('packs-opened-100', 'Pack ripper', 'Open 100 packs.', 'packsOpened', 100, 400, 800),
  count('packs-opened-1000', 'Box breaker', 'Open 1,000 packs.', 'packsOpened', 1000, 4_000, 6_000),
  count('box-opened', 'Full display', 'Open a whole booster box.', 'boxesOpened', 1, 150, 300),
  count('packs-sold-100', 'Pack slinger', 'Sell 100 packs.', 'packsSold', 100, 500, 900),
  count('packs-sold-1000', 'Pack empire', 'Sell 1,000 packs.', 'packsSold', 1000, 5_000, 8_000),
  count('box-sold', 'Big spender', 'Sell a sealed booster box.', 'boxesSold', 1, 150, 300),
  count('singles-50', 'Singles specialist', 'Sell 50 singles from your display case.', 'singlesSold', 50, 1_000, 1_500),
  count('alt', 'Alternate art!', 'Pull an alternate art card.', 'altPulled', 1, 100, 300),
  count('over', 'Overnumbered!', 'Pull an overnumbered card.', 'overPulled', 1, 500, 1_000),
  count('sig', 'Signed!', 'Pull a signed overnumbered card.', 'sigPulled', 1, 2_500, 4_000),
  count('graded-1', 'Into the slab', 'Get your first card graded.', 'graded', 1, 100, 250),
  count('graded-50', 'Grading regular', 'Get 50 cards graded.', 'graded', 50, 2_000, 3_000),
  count('psa10', 'Gem Mint', 'Get a PSA 10.', 'psa10', 1, 500, 1_000),
  count('bgs95', 'Gem Mint 9.5', 'Get a Beckett 9.5 or better.', 'bgs95', 1, 400, 800),
  count('black', 'Black Label!!', 'Get a Beckett Black Label.', 'blackLabel', 1, 10_000, 15_000),
  count('deals-25', 'Bargain hunter', 'Buy 25 deals.', 'dealsBought', 25, 600, 1_000),
  count('req-1', 'At your service', 'Fill a customer\'s card request.', 'requestsFilled', 1, 100, 200),
  count('req-25', 'The card finder', 'Fill 25 card requests.', 'requestsFilled', 25, 1_500, 2_500),
  count('req-100', 'If we don\'t have it, nobody does', 'Fill 100 card requests.', 'requestsFilled', 100, 6_000, 9_000),
  count('tourney-1', 'Game on!', 'Host your first tournament or play night.', 'tournaments', 1, 200, 400),
  count('tourney-10', 'Local scene', 'Host 10 tournaments.', 'tournaments', 10, 2_000, 3_000),
  count('players-500', 'The place to play', '500 tournament players in total.', 'tournamentPlayers', 500, 6_000, 8_000),
  count('preorder', 'Ready for launch', 'Pre-order sealed product for a launch.', 'preorders', 1, 150, 300),
  count('furn-5', 'Interior designer', 'Buy or upgrade 5 pieces of furniture.', 'furnitureBought', 5, 300, 500),
  count('furn-25', 'Showroom', 'Buy or upgrade 25 pieces of furniture.', 'furnitureBought', 25, 3_000, 5_000),
  count('collector-10', 'Collector\'s favourite', 'Sell 10 cards to collectors.', 'collectorSales', 10, 800, 1_200),
  count('investor-5', 'Sealed supplier', 'Sell to investors 5 times.', 'investorSales', 5, 1_000, 1_500),
  { id: 'revenue-10k', title: 'Five figures', text: 'Make $10,000 in sales.', cash: 500, xp: 1_000, done: (g) => g.stats.revenue >= 10_000, progress: (g) => [Math.floor(g.stats.revenue), 10_000] },
  { id: 'revenue-100k', title: 'Six figures', text: 'Make $100,000 in sales.', cash: 5_000, xp: 6_000, done: (g) => g.stats.revenue >= 100_000, progress: (g) => [Math.floor(g.stats.revenue), 100_000] },
  { id: 'revenue-1m', title: 'Millionaire shop', text: 'Make $1,000,000 in sales.', cash: 50_000, xp: 40_000, done: (g) => g.stats.revenue >= 1_000_000, progress: (g) => [Math.floor(g.stats.revenue), 1_000_000] },
  { id: 'worth-10k', title: 'Worth $10k', text: 'Reach a net worth of $10,000.', cash: 300, xp: 800, done: (g) => g.bestWorth >= 10_000, progress: (g) => [Math.floor(g.bestWorth), 10_000] },
  { id: 'worth-100k', title: 'Worth $100k', text: 'Reach a net worth of $100,000.', cash: 3_000, xp: 5_000, done: (g) => g.bestWorth >= 100_000, progress: (g) => [Math.floor(g.bestWorth), 100_000] },
  { id: 'worth-1m', title: 'Worth a million', text: 'Reach a net worth of $1,000,000.', cash: 30_000, xp: 30_000, done: (g) => g.bestWorth >= 1_000_000, progress: (g) => [Math.floor(g.bestWorth), 1_000_000] },
  { id: 'shop-3', title: 'A real game store', text: 'Move into a Game Store.', cash: 1_000, xp: 1_500, done: (g) => g.shopLevel >= 3 },
  { id: 'shop-6', title: 'Megastore', text: 'Move into the Rift Megastore.', cash: 50_000, xp: 30_000, done: (g) => g.shopLevel >= 6 },
  ...SET_IDS.map((s): Milestone => ({
    id: `set-${s}`, title: `${SETS[s].name} complete`, text: `Own every regular card of ${SETS[s].name}.`, cash: 3_000, xp: 5_000,
    done: (g) => { const [a, b] = setRegularDone(g, s); return a >= b; }, progress: (g) => setRegularDone(g, s),
  })),
];

export function milestoneState(g: GameState, m: Milestone): 'locked' | 'ready' | 'claimed' {
  if (g.milestones[m.id]) return 'claimed';
  return m.done(g) ? 'ready' : 'locked';
}

export function claimMilestone(g: GameState, id: string): string | null {
  const m = MILESTONES.find((x) => x.id === id);
  if (!m || g.milestones[id]) return 'Already claimed.';
  if (!m.done(g)) return 'Not done yet.';
  g.milestones[id] = 1;
  g.cash += m.cash;
  addXp(g, m.xp);
  return null;
}

/** Things waiting for you to claim (badge on the Goals tab). */
export function claimable(g: GameState): number {
  return g.goals.filter((x) => !x.claimed && goalProgress(g, x) >= x.target).length + MILESTONES.filter((m) => milestoneState(g, m) === 'ready').length;
}

// ── Net worth ───────────────────────────────────────────────────────────

/** Cash plus the market value of everything you own: sealed, cards, slabs, listings and cards at the grader. */
export function netWorth(g: GameState): { total: number; cash: number; sealed: number; cards: number; slabs: number } {
  let sealed = 0;
  for (const [key, n] of Object.entries(g.sealed)) {
    const [set, kind] = key.split(':') as [SetId, SealedKind];
    sealed += sealedValue(g, set, kind) * (n ?? 0);
  }
  for (const l of g.shelf) sealed += sealedValue(g, l.set, l.kind) * l.qty;
  let cards = 0;
  for (const [id, [n, f]] of Object.entries(g.cards)) {
    if (!CARD_BY_ID[id]) continue;
    cards += n * rawValue(g, id, false) + f * rawValue(g, id, true);
  }
  for (const l of [...g.display, ...g.online]) {
    if (l.slab) continue;
    cards += rawValue(g, l.cardId, l.foil);
  }
  for (const j of g.grading) cards += rawValue(g, j.cardId, j.foil);
  let slabs = 0;
  for (const s of [...g.slabs, ...g.display.filter((l) => l.slab), ...g.online.filter((l) => l.slab)]) slabs += singleValue(g, s);
  const total = g.cash + sealed + cards + slabs;
  return { total, cash: g.cash, sealed, cards, slabs };
}

/** End of day bookkeeping: history point and fresh daily goals. */
export function closeDay(g: GameState, revenue: number): void {
  const worth = netWorth(g).total;
  g.history.push({ day: g.day, worth: Math.round(worth), revenue: Math.round(revenue) });
  if (g.history.length > 120) g.history.splice(0, g.history.length - 120);
  g.bestWorth = Math.max(g.bestWorth, worth);
}

export function startDay(g: GameState): void {
  g.todayCounts = {};
  g.goals = newDailyGoals(g);
}
