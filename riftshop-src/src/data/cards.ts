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

/** Riot's card art lives in a Sanity project; Sanity's public CDN can resize and compress it. */
export function sanityUrl(c: Card, width: number): string | undefined {
  const m = c.img.match(/^https:\/\/cmsassets\.rgpub\.io\/sanity\/images\/([^?]+)/);
  return m ? `https://cdn.sanity.io/images/${m[1]}?w=${width}&fm=webp&q=82` : undefined;
}

export function tcgUrl(c: Card, thumb: boolean): string | undefined {
  return c.tcg ? `${TCG_CDN}${c.tcg}_${thumb ? '200w' : 'in_1000x1000'}.jpg` : undefined;
}

/**
 * Picture sources for a card. `base` is a quick placeholder (TCGplayer's small photo, whose framing
 * varies); `chain` is Riot's official art, best first, each tried only if the one before fails.
 */
export function cardSources(c: Card, thumb: boolean): { base?: string; chain: string[] } {
  const chain = [sanityUrl(c, thumb ? 300 : 744), thumb ? undefined : c.img].filter((x): x is string => !!x);
  if (thumb && !chain.length) chain.push(c.img);
  return { base: tcgUrl(c, true), chain };
}

const preloaded = new Set<string>();
/** Start downloading card pictures before they are shown (pack openings). */
export function preloadCards(ids: string[]): void {
  for (const id of ids) {
    const c = CARD_BY_ID[id];
    if (!c) continue;
    const { base, chain } = cardSources(c, false);
    for (const src of [base, chain[0]]) {
      if (!src || preloaded.has(src)) continue;
      preloaded.add(src);
      const im = new Image();
      im.decoding = 'async';
      im.src = src;
    }
  }
}
