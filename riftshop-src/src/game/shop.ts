import { SHOP_LEVELS } from './economy';
import { bump, isUnlocked, unlockLevel, type UnlockKey } from './progression';
import type { GameState, SealedKey, SealedKind } from './types';

// Phase 2: furniture on the shop floor, the back room, and who walks in.

// ── Furniture ───────────────────────────────────────────────────────────

export type FurnitureType = 'shelf' | 'case' | 'slabcase' | 'endcap' | 'table' | 'plant' | 'poster' | 'neon' | 'sofa';

export interface FurnitureDef {
  type: FurnitureType;
  name: string;
  icon: string;
  /** Floor tiles it takes. */
  size: number;
  /** Price at tier 1; upgrades cost 2× and 4× this. */
  cost: number;
  /** Max tier (1 = can't be upgraded). */
  tiers: number;
  /** Shelf spots for sealed product per tier. */
  shelf?: number[];
  /** Display case spots for singles and slabs per tier. */
  display?: number[];
  /** Atmosphere points per tier: more customers, slightly happier to pay. */
  vibe?: number[];
  text: string;
  unlock?: UnlockKey;
}

export const FURNITURE: FurnitureDef[] = [
  { type: 'shelf', name: 'Wall shelf', icon: '🗄️', size: 1, cost: 150, tiers: 3, shelf: [3, 5, 7], text: 'Holds sealed packs, boxes and cases.' },
  { type: 'case', name: 'Glass display case', icon: '🪟', size: 1, cost: 300, tiers: 3, display: [6, 10, 14], text: 'Holds singles and slabs.' },
  { type: 'endcap', name: 'Pack endcap', icon: '🛒', size: 1, cost: 600, tiers: 2, shelf: [2, 4], vibe: [1, 2], text: 'Impulse-buy rack by the till: kids and casual players come in more.', unlock: 'furn:endcap' },
  { type: 'table', name: 'Play table', icon: '🎲', size: 2, cost: 800, tiers: 3, vibe: [2, 3, 4], text: 'Competitive players hang out, buy singles and post card requests. +reputation every day.', unlock: 'furn:table' },
  { type: 'slabcase', name: 'Slab showcase', icon: '💎', size: 1, cost: 1_500, tiers: 3, display: [4, 6, 8], vibe: [1, 2, 3], text: 'Lit showcase: collectors come in more and pay 8% more for slabs.', unlock: 'furn:slabcase' },
  { type: 'plant', name: 'Potted plant', icon: '🪴', size: 1, cost: 80, tiers: 1, vibe: [1], text: 'A little nicer in here.' },
  { type: 'poster', name: 'Riftbound poster wall', icon: '🖼️', size: 1, cost: 250, tiers: 2, vibe: [3, 5], text: 'Art of the newest set on the wall.' },
  { type: 'neon', name: 'Neon sign', icon: '💡', size: 1, cost: 1_200, tiers: 2, vibe: [6, 9], text: 'People see it from the street.', unlock: 'furn:neon' },
  { type: 'sofa', name: 'Collector lounge', icon: '🛋️', size: 2, cost: 4_000, tiers: 2, vibe: [8, 12], text: 'Big spenders sit down and stay. Collectors and investors come in more.', unlock: 'furn:sofa' },
];

export const FURN: Record<FurnitureType, FurnitureDef> = Object.fromEntries(FURNITURE.map((f) => [f.type, f])) as Record<FurnitureType, FurnitureDef>;

export interface Furniture {
  uid: number;
  type: FurnitureType;
  tier: number;
}

export function upgradeCost(f: Furniture): number {
  return FURN[f.type].cost * Math.pow(2, f.tier);
}

/** What you get back when you sell a piece (half of everything you paid). */
export function resaleValue(f: Furniture): number {
  let paid = 0;
  for (let t = 0; t < f.tier; t++) paid += FURN[f.type].cost * Math.pow(2, t);
  return Math.round(paid / 2);
}

export function floorSize(g: GameState): number {
  return SHOP_LEVELS[g.shopLevel - 1].floor;
}

export function floorUsed(g: GameState): number {
  return g.furniture.reduce((n, f) => n + FURN[f.type].size, 0);
}

const sum = (g: GameState, key: 'shelf' | 'display' | 'vibe') =>
  g.furniture.reduce((n, f) => n + (FURN[f.type][key]?.[f.tier - 1] ?? 0), 0);

export function shelfSlots(g: GameState): number {
  return sum(g, 'shelf');
}

export function displaySlots(g: GameState): number {
  return sum(g, 'display');
}

/** Atmosphere points from decor, tables and showcases. */
export function vibe(g: GameState): number {
  return sum(g, 'vibe');
}

export function countFurniture(g: GameState, type: FurnitureType): number {
  return g.furniture.filter((f) => f.type === type).reduce((n, f) => n + f.tier, 0);
}

/** Starting furniture so a shop of this level has the space it used to have (old saves and new games). */
export function starterFurniture(shopLevel: number, shelf: number, display: number, nextUid: () => number): Furniture[] {
  const tier = shopLevel >= 4 ? 3 : shopLevel >= 2 ? 2 : 1;
  const out: Furniture[] = [];
  for (let i = 0; i < Math.ceil(shelf / FURN.shelf.shelf![tier - 1]); i++) out.push({ uid: nextUid(), type: 'shelf', tier });
  for (let i = 0; i < Math.ceil(display / FURN.case.display![tier - 1]); i++) out.push({ uid: nextUid(), type: 'case', tier });
  return out;
}

export function buyFurniture(g: GameState, type: FurnitureType): string | null {
  const d = FURN[type];
  if (d.unlock && !isUnlocked(g, d.unlock)) return `${d.name} unlocks at level ${unlockLevel(d.unlock)}.`;
  if (floorUsed(g) + d.size > floorSize(g)) return 'No floor space left. Sell something or move to a bigger shop.';
  if (g.cash < d.cost) return 'Not enough cash.';
  g.cash -= d.cost;
  g.stats.spent += d.cost;
  g.today.costs += d.cost;
  g.furniture.push({ uid: g.nextUid++, type, tier: 1 });
  bump(g, 'furnitureBought');
  return null;
}

export function upgradeFurniture(g: GameState, uid: number): string | null {
  const f = g.furniture.find((x) => x.uid === uid);
  if (!f) return 'Not found.';
  if (f.tier >= FURN[f.type].tiers) return 'Already fully upgraded.';
  const cost = upgradeCost(f);
  if (g.cash < cost) return 'Not enough cash.';
  g.cash -= cost;
  g.stats.spent += cost;
  g.today.costs += cost;
  f.tier++;
  bump(g, 'furnitureBought');
  return null;
}

export function sellFurniture(g: GameState, uid: number): string | null {
  const f = g.furniture.find((x) => x.uid === uid);
  if (!f) return 'Not found.';
  const after = g.furniture.filter((x) => x.uid !== uid);
  const left = { ...g, furniture: after };
  if (shelfSlots(left) < g.shelf.length) return 'Take some products off the shelves first — they would not fit.';
  if (displaySlots(left) < g.display.length) return 'Take some cards out of the display case first — they would not fit.';
  g.furniture = after;
  g.cash += resaleValue(f);
  return null;
}

// ── Back room ───────────────────────────────────────────────────────────

/** Space each sealed product takes in the back room (a pack is 1). */
export const SPACE: Record<SealedKind, number> = { pack: 1, box: 24, case: 144 };
export const RACK_SPACE = 240;
export const RACK_COST = 400;

export function storageCap(g: GameState): number {
  return SHOP_LEVELS[g.shopLevel - 1].storage + g.racks * RACK_SPACE;
}

export function maxRacks(g: GameState): number {
  return SHOP_LEVELS[g.shopLevel - 1].racks;
}

export function storageUsed(g: GameState): number {
  let n = 0;
  for (const [k, q] of Object.entries(g.sealed)) n += SPACE[k.split(':')[1] as SealedKind] * (q ?? 0);
  return n;
}

/** Error if `qty` of this product won't fit in the back room. */
export function roomFor(g: GameState, key: SealedKey | SealedKind, qty: number): string | null {
  const kind = (key.includes(':') ? key.split(':')[1] : key) as SealedKind;
  const need = SPACE[kind] * qty;
  const free = storageCap(g) - storageUsed(g);
  if (need <= free) return null;
  return `Your back room is full (${Math.max(0, free)} of ${storageCap(g)} space free, this needs ${need}). Shelve stock, add a storage rack or move to a bigger shop.`;
}

export function buyRack(g: GameState): string | null {
  if (g.racks >= maxRacks(g)) return 'No room for more racks here — a bigger shop has a bigger back room.';
  if (g.cash < RACK_COST) return 'Not enough cash.';
  g.cash -= RACK_COST;
  g.stats.spent += RACK_COST;
  g.today.costs += RACK_COST;
  g.racks++;
  return null;
}

// ── Customers ───────────────────────────────────────────────────────────

export type CustomerType = 'kid' | 'casual' | 'player' | 'collector' | 'investor' | 'seller';

export const CUSTOMERS: Record<CustomerType, { icon: string; name: string; text: string }> = {
  kid: { icon: '🧒', name: 'Kids', text: 'A few packs at a time, small budgets, hate high prices.' },
  casual: { icon: '🙂', name: 'Casual players', text: 'Packs, the odd box and cheap singles.' },
  player: { icon: '⚔️', name: 'Competitive players', text: 'Playable singles for their decks; pay more for the cards the meta wants. Leave card requests.' },
  collector: { icon: '🧐', name: 'Collectors', text: 'Alt arts, overnumbered, signed, foils and slabs. Big budgets. Leave card requests.' },
  investor: { icon: '💼', name: 'Investors', text: 'Sealed boxes and cases at a fair price, several at once. Come to bigger shops.' },
  seller: { icon: '🤝', name: 'Sellers', text: 'Want to sell you their cards or sealed product, usually cheap.' },
};

/** Share of each customer type walking in right now. */
export function customerMix(g: GameState, offline = false): Record<CustomerType, number> {
  const tables = countFurniture(g, 'table');
  const showcase = countFurniture(g, 'slabcase');
  const endcap = countFurniture(g, 'endcap');
  const lounge = countFurniture(g, 'sofa');
  const w: Record<CustomerType, number> = {
    kid: 18 + endcap * 4,
    casual: 34 + endcap * 3,
    player: 10 + tables * 6,
    collector: 7 + showcase * 3 + lounge * 3 + g.shopLevel,
    investor: g.shopLevel >= 3 ? 2 + g.shopLevel + lounge * 2 : 0,
    seller: offline ? 0 : 13,
  };
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(w) as CustomerType[]) w[k] /= total;
  return w;
}

/** Customers walk in more with more atmosphere (diminishing). */
export function vibeTraffic(g: GameState): number {
  const v = vibe(g);
  return 1 + v / (v + 25);
}
