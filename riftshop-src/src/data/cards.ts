import raw from './cards.json';

// Official Riftbound card data (Riot's card gallery) with TCGplayer market prices.
// Card pictures are loaded from Riot's CDN at runtime; nothing is copied here.

export type SetId = 'OGN' | 'SFD' | 'UNL' | 'VEN' | 'RAD';
export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Showcase';
/** std = normal printing, alt = alternate art, over = overnumbered, sig = signed overnumbered. */
export type Kind = 'std' | 'alt' | 'over' | 'sig';

export interface Card {
  id: string;
  code: string;
  n: number;
  name: string;
  set: SetId;
  rarity: Rarity;
  type: string;
  domains: string[];
  kind: Kind;
  img: string;
  w: number;
  h: number;
  /** TCGplayer market price, USD. */
  price: number;
  /** Price estimated from similar cards (no market price found). */
  est: boolean;
  /** TCGplayer product id (photo + prices), when known. */
  tcg?: number;
  /** TCGplayer market price of the foil finish, when known. */
  foil?: number;
}

export interface SetInfo {
  name: string;
  msrpPack: number;
  msrpBox: number;
  /** Market prices, USD. */
  pack: number;
  box: number;
  case: number;
  /** TCGplayer product ids (official product photos). */
  tcg: { pack: number; box: number; case: number };
}

const data = raw as unknown as { meta: { pricesDate: string; sealedDate: string; galleryDate: string; source: string }; sets: Record<SetId, SetInfo>; cards: Card[] };

export const META = data.meta;
export const SETS = data.sets;
export const SET_IDS = Object.keys(SETS) as SetId[];
export const CARDS: Card[] = data.cards;
export const CARD_BY_ID: Record<string, Card> = Object.fromEntries(CARDS.map((c) => [c.id, c]));

export const PACKS_PER_BOX = 24;
export const BOXES_PER_CASE = 6;
export const CARDS_PER_PACK = 14;

export const RARITY_ORDER: Record<Rarity, number> = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Showcase: 4 };

/** Display label for a printing. */
export function kindLabel(k: Kind): string {
  return k === 'sig' ? 'Signed Overnumbered' : k === 'over' ? 'Overnumbered' : k === 'alt' ? 'Alternate Art' : '';
}

/** Cards of one set in collector order (for the binder). */
export function setCards(set: SetId): Card[] {
  return CARDS.filter((c) => c.set === set).sort((a, b) => a.n - b.n || a.code.localeCompare(b.code));
}

/** Official product photo (TCGplayer), loaded at runtime. */
export function productImage(set: SetId, kind: 'pack' | 'box' | 'case', small = false): string {
  return `https://tcgplayer-cdn.tcgplayer.com/product/${SETS[set].tcg[kind]}_${small ? '200w' : 'in_1000x1000'}.jpg`;
}

const TCG_CDN = 'https://tcgplayer-cdn.tcgplayer.com/product/';

/** Image sources for a card, fastest first: TCGplayer's photo (small, reliable), then Riot's official full-size art. */
export function cardSources(c: Card, thumb: boolean): { base?: string; top?: string } {
  const tcg = c.tcg ? `${TCG_CDN}${c.tcg}_${thumb ? '200w' : 'in_1000x1000'}.jpg` : undefined;
  if (thumb) return tcg ? { base: tcg } : { top: c.img };
  return { base: tcg, top: c.img };
}

const preloaded = new Set<string>();
/** Start downloading card pictures before they are shown (pack openings). */
export function preloadCards(ids: string[]): void {
  for (const id of ids) {
    const c = CARD_BY_ID[id];
    if (!c) continue;
    const { base, top } = cardSources(c, false);
    for (const src of [base, top]) {
      if (!src || preloaded.has(src)) continue;
      preloaded.add(src);
      const im = new Image();
      im.decoding = 'async';
      im.src = src;
    }
  }
}
