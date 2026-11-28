import { BOXES_PER_CASE, CARD_BY_ID, CARDS, PACKS_PER_BOX, SET_IDS, SETS, type Card, type SetId } from '../data/cards';
import { ADS_COST, BUYLIST_RATE, CLERK_WAGE, DAY_HOURS, ONLINE_FEE, SHOP_LEVELS, SINGLES_MARKUP, allocation, fmt, rawValue, sealedValue, singleValue, wholesale } from './economy';
import { COMPANIES, rollGrade, slabTitle } from './grading';
import { openPack, type Pull } from './packs';
import { between, gauss, pick, random, weighted } from './rng';
import type { Company, Deal, GameState, Listing, SealedKey, SealedKind, Single } from './types';

export const SAVE_VERSION = 2;

export function newGame(): GameState {
  const g: GameState = {
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
    slabs: [],
    grading: [],
    shelf: [],
    display: [],
    online: [],
    offers: [],
    deals: [],
    bought: {},
    market: { card: {}, sealed: {}, spike: null },
    feed: [],
    reveals: [],
    nextUid: 1,
    stats: { packsOpened: 0, revenue: 0, spent: 0, sales: 0, graded: 0, bestPull: null },
    today: { revenue: 0, costs: 0, sales: 0 },
    savedAt: Date.now(),
  };
  newDeals(g);
  return g;
}

/** Bring an older save up to date. */
export function migrate(raw: Record<string, unknown>): GameState {
  const g = { ...newGame(), ...raw } as GameState & { graded?: { uid: number; cardId: string; foil: boolean; grade?: number }[]; markup?: unknown };
  if ((raw.version as number) < 2) {
    // v1: global markups, RGC grades. Graded cards become PSA slabs with the same grade.
    g.slabs = (g.graded ?? []).map((x) => ({ uid: x.uid, cardId: x.cardId, foil: x.foil, slab: { company: 'PSA' as const, grade: x.grade ?? 8, cert: 80_000_000 + x.uid } }));
    g.display = ((raw.display as (Listing & { grade?: number })[]) ?? []).map((l) => ({ uid: l.uid, cardId: l.cardId, foil: l.foil, price: l.price, slab: l.grade ? { company: 'PSA' as const, grade: l.grade, cert: 80_000_000 + l.uid } : undefined }));
    g.online = ((raw.online as (Listing & { grade?: number })[]) ?? []).map((l) => ({ uid: l.uid, cardId: l.cardId, foil: l.foil, price: l.price, slab: l.grade ? { company: 'PSA' as const, grade: l.grade, cert: 80_000_000 + l.uid } : undefined }));
    // Cards still at the grader are returned raw.
    for (const j of (raw.grading as { cardId: string; foil: boolean }[]) ?? []) addCard(g, j.cardId, j.foil);
    g.grading = [];
    g.offers = [];
    g.shelf = [];
    g.reveals = [];
    g.stats = { ...newGame().stats, ...(raw.stats as object), graded: 0 };
    delete g.graded;
    delete g.markup;
    newDeals(g);
    g.version = SAVE_VERSION;
  }
  return g;
}

// ── Helpers ─────────────────────────────────────────────────────────────

let feedId = 1;
export function log(g: GameState, kind: GameState['feed'][number]['kind'], text: string, amount?: number): void {
  g.feed.unshift({ id: feedId++, t: g.hours, kind, text, amount });
  if (g.feed.length > 50) g.feed.length = 50;
}

function earn(g: GameState, amount: number, sale = true): void {
  g.cash += amount;
  g.stats.revenue += amount;
  g.today.revenue += amount;
  if (sale) {
    g.stats.sales++;
    g.today.sales++;
  }
}

function spend(g: GameState, amount: number): void {
  g.cash -= amount;
  g.stats.spent += amount;
  g.today.costs += amount;
}

const KIND_NAME: Record<SealedKind, string> = { pack: 'booster pack', box: 'booster box', case: 'booster case' };
export function sealedName(set: SetId, kind: SealedKind, qty = 1): string {
  return `${qty > 1 ? qty + ' ' : ''}${SETS[set].name} ${KIND_NAME[kind]}${qty > 1 ? (kind === 'box' ? 'es' : 's') : ''}`;
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

export function shelfSlots(g: GameState): number {
  return SHOP_LEVELS[g.shopLevel - 1].shelf;
}

/** Take a raw copy (uid 0) or a slab (its uid) out of your collection. */
function takeSingle(g: GameState, s: Single): Single | null {
  if (s.slab) {
    const i = g.slabs.findIndex((x) => x.uid === s.uid);
    if (i < 0) return null;
    return g.slabs.splice(i, 1)[0];
  }
  if (rawCount(g, s.cardId, s.foil) <= 0) return null;
  addCard(g, s.cardId, s.foil, -1);
  return { uid: g.nextUid++, cardId: s.cardId, foil: s.foil };
}

function returnSingle(g: GameState, s: Single): void {
  if (s.slab) g.slabs.push({ uid: s.uid, cardId: s.cardId, foil: s.foil, slab: s.slab });
  else addCard(g, s.cardId, s.foil, 1);
}

export function singleName(s: Single): string {
  const c = CARD_BY_ID[s.cardId];
  return `${c.name}${s.foil && c.kind === 'std' ? ' (foil)' : ''}${s.slab ? ` · ${slabTitle(s.slab)}` : ''}`;
}

// ── Buying ──────────────────────────────────────────────────────────────

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

export function buyDeal(g: GameState, id: number): string | null {
  const list = g.deals.some((d) => d.id === id) ? 'deals' : 'offers';
  const d = g[list].find((x) => x.id === id);
  if (!d) return 'That deal is gone.';
  if (g.cash < d.price) return 'Not enough cash.';
  spend(g, d.price);
  if (d.what.type === 'sealed') addSealed(g, `${d.what.set}:${d.what.kind}`, d.what.qty);
  else addCard(g, d.what.cardId, d.what.foil);
  g[list] = g[list].filter((x) => x.id !== id);
  log(g, 'info', `Bought ${dealName(d)} from ${d.who} for ${fmt(d.price)}.`);
  return null;
}

export function dealName(d: Deal): string {
  return d.what.type === 'sealed' ? sealedName(d.what.set, d.what.kind, d.what.qty) : singleName({ uid: 0, cardId: d.what.cardId, foil: d.what.foil });
}

export function dealValue(g: GameState, d: Deal): number {
  return d.what.type === 'sealed' ? sealedValue(g, d.what.set, d.what.kind) * d.what.qty : rawValue(g, d.what.cardId, d.what.foil);
}

/** Price to buy one copy from the online singles market. */
export function singlePrice(g: GameState, cardId: string, foil: boolean): number {
  return Math.max(0.25, Math.round(rawValue(g, cardId, foil) * SINGLES_MARKUP * 100) / 100);
}

export function buySingle(g: GameState, cardId: string, foil: boolean): string | null {
  const price = singlePrice(g, cardId, foil);
  if (g.cash < price) return 'Not enough cash.';
  spend(g, price);
  addCard(g, cardId, foil);
  log(g, 'info', `Ordered ${singleName({ uid: 0, cardId, foil })} online for ${fmt(price)}.`);
  return null;
}

export function declineOffer(g: GameState, id: number): void {
  g.offers = g.offers.filter((o) => o.id !== id);
}

const SOURCES = ['Estate sale', 'A collector clearing out', 'Closing game store', 'Online auction', 'Card show vendor', 'Garage sale', 'Facebook Marketplace'];

/** Today's deals board: sealed product and chase cards, some cheap, some not. */
export function newDeals(g: GameState): void {
  g.deals = [];
  for (let i = 0; i < 6; i++) {
    let d: Deal;
    if (random() < 0.5) {
      const set = pick(SET_IDS);
      const kind = weighted<SealedKind>([['pack', 5], ['box', 4], ['case', 0.6]]);
      const qty = kind === 'pack' ? Math.ceil(between(3, 12)) : kind === 'box' ? (random() < 0.25 ? 2 : 1) : 1;
      d = { id: feedId++, what: { type: 'sealed', set, kind, qty }, price: 0, who: pick(SOURCES), expires: Infinity };
    } else {
      const card = pickChase();
      d = { id: feedId++, what: { type: 'single', cardId: card.id, foil: card.kind !== 'std' }, price: 0, who: pick(SOURCES), expires: Infinity };
    }
    d.price = Math.max(1, Math.round(dealValue(g, d) * between(0.55, 1.12) * 100) / 100);
    g.deals.push(d);
  }
}

function pickChase(): Card {
  const pool = weighted<(c: Card) => boolean>([
    [(c) => c.kind === 'std' && c.rarity === 'Epic', 40],
    [(c) => c.kind === 'std' && c.rarity === 'Rare' && c.price >= 1, 20],
    [(c) => c.kind === 'alt', 28],
    [(c) => c.kind === 'over', 10],
    [(c) => c.kind === 'sig', 2],
  ]);
  return pick(CARDS.filter(pool));
}

// ── Opening ─────────────────────────────────────────────────────────────

/** Open sealed product from the back room. Packs return the pulls; boxes become 24 packs; cases 6 boxes. */
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
    if (v >= 25) log(g, 'hit', `Pulled ${singleName({ uid: 0, cardId: p.cardId, foil: p.foil })} — worth ${fmt(v)}!`, v);
  }
  return pulls;
}

// ── Your shelf and display case ─────────────────────────────────────────

/** Put sealed product from the back room on the shelf at your price (stacks with the same product). */
export function shelveSealed(g: GameState, set: SetId, kind: SealedKind, qty: number, price: number): string | null {
  if (qty <= 0) return null;
  if (sealedCount(g, set, kind) < qty) return 'You don’t have that many in the back room.';
  let l = g.shelf.find((x) => x.set === set && x.kind === kind);
  if (!l) {
    if (g.shelf.length >= shelfSlots(g)) return 'Your shelves are full. Upgrade the shop for more shelf space.';
    l = { uid: g.nextUid++, set, kind, qty: 0, price };
    g.shelf.push(l);
  }
  l.qty += qty;
  l.price = Math.max(0.5, Math.round(price * 100) / 100);
  addSealed(g, `${set}:${kind}`, -qty);
  return null;
}

export function unshelve(g: GameState, uid: number): void {
  const l = g.shelf.find((x) => x.uid === uid);
  if (!l) return;
  addSealed(g, `${l.set}:${l.kind}`, l.qty);
  g.shelf = g.shelf.filter((x) => x.uid !== uid);
}

export function setShelfPrice(g: GameState, uid: number, price: number): void {
  const l = g.shelf.find((x) => x.uid === uid);
  if (l) l.price = Math.max(0.5, Math.round(price * 100) / 100);
}

export function listInDisplay(g: GameState, s: Single, price: number): string | null {
  if (g.display.length >= displaySlots(g)) return 'The display case is full. Upgrade the shop for more space.';
  const t = takeSingle(g, s);
  if (!t) return 'You no longer have that card.';
  g.display.push({ ...t, price: Math.max(0.05, Math.round(price * 100) / 100) });
  return null;
}

export function listOnline(g: GameState, s: Single, price: number): string | null {
  const t = takeSingle(g, s);
  if (!t) return 'You no longer have that card.';
  g.online.push({ ...t, price: Math.max(0.05, Math.round(price * 100) / 100) });
  return null;
}

export function unlist(g: GameState, where: 'display' | 'online', uid: number): void {
  const i = g[where].findIndex((x) => x.uid === uid);
  if (i < 0) return;
  const [l] = g[where].splice(i, 1);
  returnSingle(g, l);
}

export function setListingPrice(g: GameState, where: 'display' | 'online', uid: number, price: number): void {
  const l = g[where].find((x) => x.uid === uid);
  if (l) l.price = Math.max(0.05, Math.round(price * 100) / 100);
}

/** Instant sale to another store's buylist. */
export function sellToBuylist(g: GameState, s: Single): number {
  const t = takeSingle(g, s);
  if (!t) return 0;
  const v = singleValue(g, t) * BUYLIST_RATE;
  earn(g, v);
  return v;
}

/** Sell every raw copy worth less than `maxValue`, keeping one of each for the binder. */
export function sellBulk(g: GameState, maxValue: number, keepOne: boolean): { count: number; total: number } {
  let count = 0, total = 0;
  for (const [id, [n, f]] of Object.entries(g.cards)) {
    for (const foil of [false, true]) {
      const sell = (foil ? f : n) - (keepOne && !foil ? 1 : 0);
      if (sell <= 0) continue;
      const v = rawValue(g, id, foil);
      if (v >= maxValue) continue;
      addCard(g, id, foil, -sell);
      count += sell;
      total += v * sell * BUYLIST_RATE;
    }
  }
  if (total > 0) earn(g, total, false);
  return { count, total };
}

export function sendToGrading(g: GameState, s: Single, company: Company, tierId: string): string | null {
  const tier = COMPANIES[company].tiers.find((t) => t.id === tierId)!;
  if (s.slab) return 'That card is already slabbed.';
  if (g.cash < tier.fee) return 'Not enough cash for the grading fee.';
  const t = takeSingle(g, s);
  if (!t) return 'You no longer have that card.';
  spend(g, tier.fee);
  g.grading.push({ uid: t.uid, cardId: t.cardId, foil: t.foil, company, tier: tier.name, readyAt: g.hours + tier.days * DAY_HOURS, sentAt: g.hours });
  return null;
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
  return 6 * SHOP_LEVELS[g.shopLevel - 1].traffic * (0.5 + g.rep / 100) * (g.adsUntil > g.hours ? 1.6 : 1);
}

function repDelta(g: GameState, d: number): void {
  g.rep = Math.max(0, Math.min(100, g.rep + d));
}

/** What a customer is willing to pay, relative to market. Good reputation buys a little goodwill. */
function willingness(g: GameState): number {
  return between(0.85, 1.35) * (0.94 + g.rep / 800);
}

function sealedShopper(g: GameState, who: string): void {
  if (!g.shelf.length) {
    if (random() < 0.4) log(g, 'leave', `${who} wanted packs, but your shelves are empty.`);
    repDelta(g, -0.05);
    return;
  }
  const l = pick(g.shelf);
  const value = sealedValue(g, l.set, l.kind);
  const pay = value * willingness(g);
  if (l.price > pay) {
    log(g, 'leave', `${who} skipped ${sealedName(l.set, l.kind)} at ${fmt(l.price)} — would have paid about ${fmt(pay)}.`);
    if (l.price > value * 1.5) repDelta(g, -0.3);
    return;
  }
  const want = l.kind === 'pack' ? weighted<number>([[1, 5], [2, 3], [3, 1.5], [6, 0.5], [12, 0.2]]) : 1;
  const n = Math.min(want, l.qty);
  l.qty -= n;
  if (l.qty <= 0) g.shelf = g.shelf.filter((x) => x.uid !== l.uid);
  earn(g, l.price * n);
  if (l.price <= value * 1.02) repDelta(g, 0.15);
  log(g, 'sale', `${who} bought ${sealedName(l.set, l.kind, n)}.`, l.price * n);
}

function singlesHunter(g: GameState, who: string): void {
  if (!g.display.length) return sealedShopper(g, who);
  const l = pick(g.display);
  const v = singleValue(g, l);
  const pay = v * willingness(g) * (l.slab ? 1.05 : 1);
  if (l.price > pay) {
    log(g, 'leave', `${who} liked ${singleName(l)} but not at ${fmt(l.price)} — would pay about ${fmt(pay)}.`);
    if (l.price > v * 1.5) repDelta(g, -0.25);
    return;
  }
  g.display = g.display.filter((x) => x.uid !== l.uid);
  earn(g, l.price);
  repDelta(g, 0.1);
  log(g, 'sale', `${who} bought ${singleName(l)}.`, l.price);
}

function seller(g: GameState, who: string): void {
  if (g.offers.length >= 3) return;
  let d: Deal;
  if (random() < 0.3) {
    const set = pick(SET_IDS);
    const kind: SealedKind = random() < 0.8 ? 'pack' : 'box';
    d = { id: feedId++, what: { type: 'sealed', set, kind, qty: kind === 'pack' ? Math.ceil(between(2, 8)) : 1 }, price: 0, who, expires: g.hours + 1.5 };
  } else {
    const card = pickChase();
    d = { id: feedId++, what: { type: 'single', cardId: card.id, foil: card.kind !== 'std' }, price: 0, who, expires: g.hours + 1.5 };
  }
  d.price = Math.max(0.5, Math.round(dealValue(g, d) * between(0.45, 0.85) * 100) / 100);
  g.offers.push(d);
  log(g, 'offer', `${who} wants to sell you ${dealName(d)} for ${fmt(d.price)}.`);
}

function customer(g: GameState, offline: boolean): void {
  const who = pick(NAMES);
  const kind = weighted<string>([
    ['sealed', g.shelf.length ? 55 : 20],
    ['single', g.display.length ? 35 : 0],
    ['seller', offline ? 0 : 14],
  ]);
  if (kind === 'sealed') sealedShopper(g, who);
  else if (kind === 'single') singlesHunter(g, who);
  else seller(g, who);
}

// ── Time ────────────────────────────────────────────────────────────────

let spawnAcc = 0;

/** Advance the shop by `dt` open hours. `offline` = the app was closed (only a clerk serves). */
export function advance(g: GameState, dt: number, offline = false): void {
  let left = dt;
  while (left > 1e-9) {
    const step = Math.min(left, 0.25);
    left -= step;
    const before = g.hours;
    g.hours += step;
    const rate = trafficRate(g) * (offline ? (g.clerk ? 0.5 : 0) : 1);
    spawnAcc += rate * step * between(0.6, 1.4);
    while (spawnAcc >= 1) {
      spawnAcc -= 1;
      customer(g, offline);
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
        log(g, 'sale', `Online: ${singleName(l)} sold for ${fmt(l.price)} (${fmt(net)} after fees).`, net);
      }
    }
    // Grading returns
    for (const j of g.grading.filter((x) => x.readyAt <= g.hours)) {
      g.grading = g.grading.filter((x) => x.uid !== j.uid);
      const slab = rollGrade(j.company, 40_000_000 + Math.floor(random() * 59_999_999));
      const s: Single = { uid: j.uid, cardId: j.cardId, foil: j.foil, slab };
      g.slabs.push(s);
      g.reveals.push(s.uid);
      g.stats.graded++;
      log(g, slab.grade >= 10 || slab.black ? 'hit' : 'info', `${j.company} returned ${CARD_BY_ID[j.cardId].name}: ${slabTitle(slab)}!`, singleValue(g, s));
    }
    if (Math.floor(before / DAY_HOURS) !== Math.floor(g.hours / DAY_HOURS)) endOfDay(g);
  }
}

function endOfDay(g: GameState): void {
  const lvl = SHOP_LEVELS[g.shopLevel - 1];
  const bills = lvl.rent + (g.clerk ? CLERK_WAGE : 0);
  spend(g, bills);
  log(g, g.today.revenue >= g.today.costs ? 'info' : 'bad', `Day ${g.day} closed: sales ${fmt(g.today.revenue)}, spent ${fmt(g.today.costs)} (rent ${fmt(bills)}).`);
  g.day++;
  g.today = { revenue: 0, costs: 0, sales: 0 };
  g.bought = {};
  driftMarket(g);
  newDeals(g);
}

/** Daily market movement: a random walk pulled back towards the real price, plus meta spikes. */
export function driftMarket(g: GameState): void {
  for (const c of CARDS) {
    const m = g.market.card[c.id] ?? 1;
    let next = m * Math.exp(gauss() * (c.price > 20 ? 0.035 : 0.05));
    next += (1 - next) * 0.08;
    next = Math.max(0.4, Math.min(3, next));
    if (Math.abs(next - 1) < 0.005) delete g.market.card[c.id];
    else g.market.card[c.id] = Math.round(next * 1000) / 1000;
  }
  SET_IDS.forEach((s, i) => {
    const age = SET_IDS.length - 1 - i;
    const m = g.market.sealed[s] ?? 1;
    g.market.sealed[s] = Math.round(Math.max(0.6, Math.min(2.5, m * Math.exp(gauss() * 0.02 + age * 0.0015))) * 1000) / 1000;
  });
  const sp = g.market.spike;
  if (sp && g.day > sp.until) g.market.spike = null;
  if (!g.market.spike && random() < 0.22) {
    const champ = pick(CARDS.filter((c) => c.type === 'Legend' && c.kind === 'std')).name.split(' - ')[0].split(',')[0];
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
