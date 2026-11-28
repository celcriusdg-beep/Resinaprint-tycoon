import { CARD_BY_ID, SETS, type Card, type SetId } from '../data/cards';
import type { GameState, SealedKind, Single } from './types';
import { slabMult } from './grading';

// Prices, shop levels, wholesale and grading.

export const DAY_HOURS = 12; // shop open 09:00–21:00
export const SECONDS_PER_HOUR = 20; // a shop day lasts 4 real minutes
export const OPEN_HOUR = 9;

/** display = single cards in the glass case; shelf = sealed stacks on the shelves. */
export const SHOP_LEVELS = [
  { name: 'Market Stall', cost: 0, display: 6, shelf: 3, traffic: 1, rent: 25 },
  { name: 'Corner Shop', cost: 2_500, display: 12, shelf: 5, traffic: 1.5, rent: 60 },
  { name: 'Game Store', cost: 9_000, display: 24, shelf: 8, traffic: 2.2, rent: 150 },
  { name: 'Card Emporium', cost: 30_000, display: 40, shelf: 12, traffic: 3.1, rent: 380 },
  { name: 'Flagship Store', cost: 90_000, display: 64, shelf: 16, traffic: 4.2, rent: 900 },
  { name: 'Rift Megastore', cost: 260_000, display: 100, shelf: 24, traffic: 5.6, rent: 2_100 },
];

export const CLERK_WAGE = 110; // per day
export const ADS_COST = 250; // one day of extra customers
export const ONLINE_FEE = 0.125; // marketplace + payment fees
export const BUYLIST_RATE = 0.55; // what a store-to-store buylist pays for raw singles

/** Price of the foil finish: TCGplayer's foil price when known, otherwise an estimate. */
export function foilPrice(card: Card): number {
  if (card.kind !== 'std') return card.price;
  if (card.foil) return card.foil;
  return card.price * (card.rarity === 'Common' || card.rarity === 'Uncommon' ? 2.5 : 1.6);
}

export function marketMult(g: GameState, card: Card): number {
  let m = g.market.card[card.id] ?? 1;
  const sp = g.market.spike;
  if (sp && g.day <= sp.until && card.name.includes(sp.champion)) m *= sp.factor;
  return m;
}

/** Market value of one raw copy, USD. */
export function rawValue(g: GameState, cardId: string, foil: boolean): number {
  const c = CARD_BY_ID[cardId];
  return (foil ? foilPrice(c) : c.price) * marketMult(g, c);
}

export function singleValue(g: GameState, s: Pick<Single, 'cardId' | 'foil' | 'slab'>): number {
  const raw = rawValue(g, s.cardId, s.foil);
  return raw * slabMult(s.slab, raw);
}

/** Market price of sealed product. */
export function sealedValue(g: GameState, set: SetId, kind: SealedKind): number {
  return SETS[set][kind] * (g.market.sealed[set] ?? 1);
}

/** Distributor price. Stores buy at roughly 60% of MSRP; sets that trade above MSRP cost more. */
export function wholesale(g: GameState, set: SetId, kind: SealedKind): number {
  const s = SETS[set];
  const boxCost = Math.max(s.msrpBox * 0.62, sealedValue(g, set, 'box') * 0.7);
  const v = kind === 'box' ? boxCost : kind === 'case' ? boxCost * 6 * 0.97 : (boxCost / 24) * 1.15;
  return Math.round(v * 100) / 100;
}

/** Units the distributor will sell you per day (older sets are allocated). */
export function allocation(set: SetId, kind: SealedKind): number {
  const older = set === 'OGN' || set === 'SFD';
  if (kind === 'case') return older ? 0 : 2;
  if (kind === 'box') return older ? 2 : 8;
  return older ? 24 : 96;
}

export function fmt(n: number): string {
  const a = Math.abs(n);
  const s = a >= 1e6 ? `$${(a / 1e6).toFixed(2)}M` : a >= 10_000 ? `$${(a / 1e3).toFixed(1)}k` : a >= 100 ? `$${a.toFixed(0)}` : `$${a.toFixed(2)}`;
  return n < 0 ? `−${s}` : s;
}

export function clockLabel(hours: number): string {
  const h = OPEN_HOUR + (((hours % DAY_HOURS) + DAY_HOURS) % DAY_HOURS);
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm - (mm % 5)).padStart(2, '0')}`;
}
