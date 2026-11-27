import { BOXES_PER_CASE, CARD_BY_ID, CARDS, PACKS_PER_BOX, SET_IDS, type Card, type SetId } from '../data/cards';
import {
  ADS_COST, BUYLIST_RATE, CLERK_WAGE, DAY_HOURS, GRADE_ODDS, GRADE_TIERS, ONLINE_FEE, SHOP_LEVELS,
  allocation, fmt, rawValue, sealedValue, singleValue, wholesale,
} from './economy';
import { openPack, type Pull } from './packs';
import { between, gauss, pick, random, weighted } from './rng';
import type { GameState, GradeTier, Listing, SealedKey, SealedKind, Single } from './types';

export const SAVE_VERSION = 1;

export function newGame(): GameState {
  return {
    version: SAVE_VERSION,
    cash: 1_500,
    hours: 0,
    day: 1,
    rep: 40,
    shopLevel: 1,
    clerk: false,
    adsUntil: 0,
    sealed: { 'VEN:pack': 12, 'UNL:pack': 6 },
    cards: {},
    seen: {},
    graded: [],
    grading: [],
    display: [],
    online: [],
    offers: [],
    markup: { pack: 1.1, box: 1.05 },
    bought: {},
    market: { card: {}, sealed: {}, spike: null },
    feed: [],
    nextUid: 1,
    stats: { packsOpened: 0, revenue: 0, spent: 0, bestPull: null, sales: 0 },
    today: { revenue: 0, costs: 0, sales: 0 },
    savedAt: Date.now(),
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────

let feedId = 1;
export function log(g: GameState, kind: GameState['feed'][number]['kind'], text: string, amount?: number): void {
  g.feed.unshift({ id: feedId++, t: g.hours, kind, text, amount });
  if (g.feed.length > 40) g.feed.length = 40;
}

function earn(g: GameState, amount: number): void {
  g.cash += amount;
  g.stats.revenue += amount;
  g.today.revenue += amount;
  g.stats.sales++;
  g.today.sales++;
}

function spend(g: GameState, amount: number): void {
  g.cash -= amount;
  g.stats.spent += amount;
  g.today.costs += amount;
}

export function sealedCount(g: GameState, set: SetId, kind: SealedKind): number {
  return g.sealed[`${set}:${kind}`] ?? 0;
}

function addSealed(g: GameState, key: SealedKey, n: number): void {
  const v = (g.sealed[key] ?? 0) + n;
  if (v <= 0) delete g.sealed[key];
  else g.sealed[key] = v;
}

export function addCard(g: GameState, cardId: string, foil: boolean, n = 1): void {
  const e = g.cards[cardId] ?? [0, 0];
  e[foil ? 1 : 0] += n;
  if (e[0] <= 0 && e[1] <= 0) delete g.cards[cardId];
  else g.cards[cardId] = e;
  if (n > 0) g.seen[cardId] = 1;
}

export function rawCount(g: GameState, cardId: string, foil: boolean): number {
  return g.cards[cardId]?.[foil ? 1 : 0] ?? 0;
}

export function displaySlots(g: GameState): number {
  return SHOP_LEVELS[g.shopLevel - 1].display;
}

export function packPrice(g: GameState, set: SetId): number {
  return Math.round(sealedValue(g, set, 'pack') * g.markup.pack * 100) / 100;
}

export function boxPrice(g: GameState, set: SetId): number {
  return Math.round(sealedValue(g, set, 'box') * g.markup.box * 100) / 100;
}

// ── Player actions ──────────────────────────────────────────────────────

export function buySealed(g: GameState, set: SetId, kind: SealedKind, qty: number): string | null {
  const key: SealedKey = `${set}:${kind}`;
  const left = allocation(set, kind) - (g.bought[key] ?? 0);
  if (qty > left) return left > 0 ? `The distributor only has ${left} left for you today.` : 'Sold out at the distributor today.';
  const cost = wholesale(g, set, kind) * qty;
  if (cost > g.cash) return 'Not enough cash.';
  spend(g, cost);
  g.bought[key] = (g.bought[key] ?? 0) + qty;
  addSealed(g, key, qty);
  return null;
}

/** Open sealed product. Packs return the pulls; boxes become 24 packs; cases become 6 boxes. */
export function openSealed(g: GameState, set: SetId, kind: SealedKind): Pull[] | null {
  const key: SealedKey = `${set}:${kind}`;
  if ((g.sealed[key] ?? 0) <= 0) return null;
  addSealed(g, key, -1);
  if (kind === 'case') {
    addSealed(g, `${set}:box`, BOXES_PER_CASE);
    return [];
  }
  if (kind === 'box') {
    addSealed(g, `${set}:pack`, PACKS_PER_BOX);
    return [];
  }
  const pulls = openPack(set);
  g.stats.packsOpened++;
  for (const p of pulls) {
    addCard(g, p.cardId, p.foil);
    const v = rawValue(g, p.cardId, p.foil);
    if (!g.stats.bestPull || v > g.stats.bestPull.value) g.stats.bestPull = { cardId: p.cardId, foil: p.foil, value: v };
    if (v >= 25) log(g, 'hit', `Pulled ${CARD_BY_ID[p.cardId].name}${p.foil && CARD_BY_ID[p.cardId].kind === 'std' ? ' (foil)' : ''} — worth ${fmt(v)}!`, v);
  }
  return pulls;
}

function takeSingle(g: GameState, s: Single): boolean {
  if (s.grade) {
    const i = g.graded.findIndex((x) => x.uid === s.uid);
    if (i < 0) return false;
    g.graded.splice(i, 1);
    return true;
  }
  if (rawCount(g, s.cardId, s.foil) <= 0) return false;
  addCard(g, s.cardId, s.foil, -1);
  return true;
}

function returnSingle(g: GameState, s: Single): void {
  if (s.grade) g.graded.push({ uid: s.uid, cardId: s.cardId, foil: s.foil, grade: s.grade });
  else addCard(g, s.cardId, s.foil, 1);
}

/** Put a raw copy (uid 0) or a graded copy (its uid) in the display case. */
export function listInDisplay(g: GameState, s: Single, price: number): string | null {
  if (g.display.length >= displaySlots(g)) return 'The display case is full. Upgrade the shop for more space.';
  if (!takeSingle(g, s)) return 'You no longer have that card.';
  g.display.push({ uid: s.grade ? s.uid : g.nextUid++, cardId: s.cardId, foil: s.foil, grade: s.grade, price });
  return null;
}

export function listOnline(g: GameState, s: Single, price: number): string | null {
  if (!takeSingle(g, s)) return 'You no longer have that card.';
  g.online.push({ uid: s.grade ? s.uid : g.nextUid++, cardId: s.cardId, foil: s.foil, grade: s.grade, price });
  return null;
}

export function unlist(g: GameState, where: 'display' | 'online', uid: number): void {
  const list = g[where];
  const i = list.findIndex((x) => x.uid === uid);
  if (i < 0) return;
  const [l] = list.splice(i, 1);
  returnSingle(g, l);
}

export function setListingPrice(g: GameState, where: 'display' | 'online', uid: number, price: number): void {
  const l = g[where].find((x) => x.uid === uid);
  if (l) l.price = Math.max(0.05, Math.round(price * 100) / 100);
}

/** Instant sale to another store's buylist. */
export function sellToBuylist(g: GameState, s: Single): number {
  if (!takeSingle(g, s)) return 0;
  const v = singleValue(g, s) * BUYLIST_RATE;
  earn(g, v);
  return v;
}

/** Sell every raw copy worth less than `maxValue` (bulk). Keeps one of each card for the binder if asked. */
export function sellBulk(g: GameState, maxValue: number, keepOne: boolean): { count: number; total: number } {
  let count = 0, total = 0;
  for (const [id, [n, f]] of Object.entries(g.cards)) {
    for (const foil of [false, true]) {
      const have = foil ? f : n;
      const keep = keepOne && !foil ? 1 : 0;
      const sell = have - keep;
      if (sell <= 0) continue;
      const v = rawValue(g, id, foil);
      if (v >= maxValue) continue;
      addCard(g, id, foil, -sell);
      count += sell;
      total += v * sell * BUYLIST_RATE;
    }
  }
  if (total > 0) {
    g.cash += total;
    g.stats.revenue += total;
    g.today.revenue += total;
  }
  return { count, total };
}

export function sendToGrading(g: GameState, s: Single, tier: GradeTier): string | null {
  const t = GRADE_TIERS[tier];
  if (g.cash < t.fee) return 'Not enough cash for the grading fee.';
  if (s.grade) return 'That card is already graded.';
  if (!takeSingle(g, s)) return 'You no longer have that card.';
  spend(g, t.fee);
  g.grading.push({ uid: g.nextUid++, cardId: s.cardId, foil: s.foil, tier, readyAt: g.hours + t.hours });
  return null;
}

export function acceptOffer(g: GameState, id: number): string | null {
  const i = g.offers.findIndex((o) => o.id === id);
  if (i < 0) return 'That customer has left.';
  const o = g.offers[i];
  if (g.cash < o.ask) return 'Not enough cash.';
  spend(g, o.ask);
  addCard(g, o.cardId, o.foil);
  g.offers.splice(i, 1);
  log(g, 'info', `Bought ${CARD_BY_ID[o.cardId].name} from ${o.who} for ${fmt(o.ask)}.`, -o.ask);
  return null;
}

export function declineOffer(g: GameState, id: number): void {
  g.offers = g.offers.filter((o) => o.id !== id);
}

export function upgradeShop(g: GameState): string | null {
  const next = SHOP_LEVELS[g.shopLevel];
  if (!next) return 'Already the biggest shop.';
  if (g.cash < next.cost) return 'Not enough cash.';
  spend(g, next.cost);
  g.shopLevel++;
  log(g, 'info', `Moved into a ${next.name}!`);
  return null;
}

export function buyAds(g: GameState): string | null {
  if (g.cash < ADS_COST) return 'Not enough cash.';
  spend(g, ADS_COST);
  g.adsUntil = Math.max(g.adsUntil, g.hours) + DAY_HOURS;
  log(g, 'info', 'Ads are running: more customers for the next shop day.');
  return null;
}

// ── Customers ───────────────────────────────────────────────────────────

const NAMES = ['Alex', 'Sam', 'Jordan', 'Riley', 'Casey', 'Morgan', 'Jamie', 'Taylor', 'Quinn', 'Avery', 'Rowan', 'Kai', 'Noah', 'Mia', 'Leo', 'Zoe', 'Eli', 'Ivy'];

/** Customers per open hour. */
export function trafficRate(g: GameState): number {
  const lvl = SHOP_LEVELS[g.shopLevel - 1];
  return 6 * lvl.traffic * (0.5 + g.rep / 100) * (g.adsUntil > g.hours ? 1.6 : 1);
}

function repDelta(g: GameState, d: number): void {
  g.rep = Math.max(0, Math.min(100, g.rep + d));
}

function packBuyer(g: GameState, who: string): void {
  const stocked = SET_IDS.filter((s) => sealedCount(g, s, 'pack') > 0);
  if (!stocked.length) {
    if (random() < 0.5) log(g, 'leave', `${who} wanted packs but you're out of stock.`);
    repDelta(g, -0.05);
    return;
  }
  const set = pick(stocked);
  const price = packPrice(g, set);
  const tolerance = between(0.9, 1.45);
  if (price > sealedValue(g, set, 'pack') * tolerance) {
    log(g, 'leave', `${who} thought ${fmt(price)} was too much for a pack.`);
    repDelta(g, -0.25);
    return;
  }
  const want = weighted<number>([[1, 5], [2, 3], [3, 1.5], [6, 0.6], [12, 0.25]]);
  const n = Math.min(want, sealedCount(g, set, 'pack'));
  addSealed(g, `${set}:pack`, -n);
  earn(g, price * n);
  if (g.markup.pack <= 1.02) repDelta(g, 0.15);
  log(g, 'sale', `${who} bought ${n} ${set} pack${n > 1 ? 's' : ''}.`, price * n);
}

function boxBuyer(g: GameState, who: string): void {
  const stocked = SET_IDS.filter((s) => sealedCount(g, s, 'box') > 0);
  if (!stocked.length) return packBuyer(g, who);
  const set = pick(stocked);
  const price = boxPrice(g, set);
  if (price > sealedValue(g, set, 'box') * between(0.92, 1.3)) {
    log(g, 'leave', `${who} passed on a ${set} box at ${fmt(price)}.`);
    repDelta(g, -0.2);
    return;
  }
  addSealed(g, `${set}:box`, -1);
  earn(g, price);
  repDelta(g, 0.2);
  log(g, 'sale', `${who} bought a ${set} booster box!`, price);
}

function singlesHunter(g: GameState, who: string): void {
  if (!g.display.length) return packBuyer(g, who);
  const l = pick(g.display);
  const v = singleValue(g, l);
  if (l.price > v * between(0.85, 1.4)) {
    if (l.price > v * 1.5) repDelta(g, -0.2);
    log(g, 'leave', `${who} looked at ${CARD_BY_ID[l.cardId].name} but walked away.`);
    return;
  }
  g.display = g.display.filter((x) => x.uid !== l.uid);
  earn(g, l.price);
  repDelta(g, 0.1);
  log(g, 'sale', `${who} bought ${CARD_BY_ID[l.cardId].name}${l.grade ? ` (graded ${l.grade})` : ''}.`, l.price);
}

function seller(g: GameState, who: string): void {
  if (g.offers.length >= 3) return;
  const pool = weighted<(c: Card) => boolean>([
    [(c) => c.kind === 'std' && c.rarity === 'Rare', 45],
    [(c) => c.kind === 'std' && c.rarity === 'Epic', 32],
    [(c) => c.kind === 'alt', 16],
    [(c) => c.kind === 'over', 6],
    [(c) => c.kind === 'sig', 1],
  ]);
  const card = pick(CARDS.filter(pool));
  const foil = card.kind !== 'std';
  const ask = Math.max(0.5, Math.round(rawValue(g, card.id, foil) * between(0.45, 0.8) * 100) / 100);
  g.offers.push({ id: feedId++, cardId: card.id, foil, ask, expires: g.hours + 1.5, who });
  log(g, 'offer', `${who} wants to sell you ${card.name} for ${fmt(ask)}.`);
}

function customer(g: GameState): void {
  const who = pick(NAMES);
  const kind = weighted<string>([['pack', 52], ['single', g.display.length ? 28 : 0], ['box', 7], ['seller', 13]]);
  if (kind === 'pack') packBuyer(g, who);
  else if (kind === 'single') singlesHunter(g, who);
  else if (kind === 'box') boxBuyer(g, who);
  else seller(g, who);
}

// ── Time ────────────────────────────────────────────────────────────────

let spawnAcc = 0;

/** Advance the shop by `dt` game hours. `offline` = the app was closed (only a clerk serves). */
export function advance(g: GameState, dt: number, offline = false): void {
  let left = dt;
  while (left > 1e-9) {
    const step = Math.min(left, 0.25);
    left -= step;
    const before = g.hours;
    g.hours += step;
    // Customers
    const rate = trafficRate(g) * (offline ? (g.clerk ? 0.5 : 0) : 1);
    spawnAcc += rate * step * between(0.6, 1.4);
    while (spawnAcc >= 1) {
      spawnAcc -= 1;
      if (offline && random() < 0.2) continue; // no sell offers while you're away
      customer(g);
    }
    g.offers = g.offers.filter((o) => o.expires > g.hours);
    // Online marketplace: listings near market price sell within a day or two.
    for (const l of [...g.online]) {
      const v = singleValue(g, l);
      const p = Math.max(0.03, Math.min(0.9, 1.25 - l.price / Math.max(0.01, v))) * 0.12 * step;
      if (random() < p) {
        g.online = g.online.filter((x) => x.uid !== l.uid);
        const net = l.price * (1 - ONLINE_FEE);
        earn(g, net);
        log(g, 'sale', `Online: ${CARD_BY_ID[l.cardId].name} sold for ${fmt(l.price)} (${fmt(net)} after fees).`, net);
      }
    }
    // Grading returns
    for (const j of g.grading.filter((x) => x.readyAt <= g.hours)) {
      g.grading = g.grading.filter((x) => x.uid !== j.uid);
      const grade = weighted(GRADE_ODDS);
      g.graded.push({ uid: j.uid, cardId: j.cardId, foil: j.foil, grade });
      log(g, grade >= 10 ? 'hit' : 'info', `Grading back: ${CARD_BY_ID[j.cardId].name} got a ${grade}!`, singleValue(g, { ...j, grade }));
    }
    if (Math.floor(before / DAY_HOURS) !== Math.floor(g.hours / DAY_HOURS)) endOfDay(g);
  }
}

export interface DayReport {
  day: number;
  revenue: number;
  costs: number;
  sales: number;
}

export let lastReport: DayReport | null = null;

function endOfDay(g: GameState): void {
  const lvl = SHOP_LEVELS[g.shopLevel - 1];
  const bills = lvl.rent + (g.clerk ? CLERK_WAGE : 0);
  spend(g, bills);
  lastReport = { day: g.day, revenue: g.today.revenue, costs: g.today.costs, sales: g.today.sales };
  log(g, g.today.revenue >= g.today.costs ? 'info' : 'bad', `Day ${g.day} closed: sales ${fmt(g.today.revenue)}, costs ${fmt(g.today.costs)} (rent ${fmt(bills)}).`);
  g.day++;
  g.today = { revenue: 0, costs: 0, sales: 0 };
  g.bought = {};
  driftMarket(g);
}

/** Daily market movement: a random walk pulled back towards the real price, plus meta spikes. */
export function driftMarket(g: GameState): void {
  for (const c of CARDS) {
    const m = g.market.card[c.id] ?? 1;
    const vol = c.price > 20 ? 0.035 : 0.05;
    let next = m * Math.exp(gauss() * vol);
    next += (1 - next) * 0.08;
    next = Math.max(0.4, Math.min(3, next));
    if (Math.abs(next - 1) < 0.005) delete g.market.card[c.id];
    else g.market.card[c.id] = Math.round(next * 1000) / 1000;
  }
  SET_IDS.forEach((s, i) => {
    const age = SET_IDS.length - 1 - i; // older sets slowly appreciate
    const m = g.market.sealed[s] ?? 1;
    g.market.sealed[s] = Math.round(Math.max(0.6, Math.min(2.5, m * Math.exp(gauss() * 0.02 + age * 0.0015))) * 1000) / 1000;
  });
  const sp = g.market.spike;
  if (sp && g.day > sp.until) g.market.spike = null;
  if (!g.market.spike && random() < 0.22) {
    const legends = CARDS.filter((c) => c.type === 'Legend' && c.kind === 'std');
    const champ = pick(legends).name.split(' - ')[0].split(',')[0];
    const factor = Math.round(between(1.3, 2.2) * 100) / 100;
    g.market.spike = { champion: champ, factor, until: g.day + 2 + Math.floor(random() * 4) };
    log(g, 'info', `Meta shake-up: ${champ} decks are winning everything! ${champ} cards are up ${Math.round((factor - 1) * 100)}%.`);
  }
}

/** Catch up after the app was closed (capped at 5 shop days). */
export function catchUp(g: GameState, realSeconds: number, secondsPerHour: number): number {
  const hours = Math.min(5 * DAY_HOURS, Math.max(0, realSeconds / secondsPerHour));
  if (hours > 0.05) advance(g, hours, true);
  return hours;
}

/** Listing helper for the UI. */
export function suggestedPrice(g: GameState, s: Single): number {
  return Math.max(0.1, Math.round(singleValue(g, s) * 100) / 100);
}

export type { Listing };
