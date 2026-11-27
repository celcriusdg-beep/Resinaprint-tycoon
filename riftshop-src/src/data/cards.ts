import raw from './cards.json';

// Official Riftbound card data (Riot's card gallery) with TCGplayer market prices.
// Card pictures are loaded from Riot's CDN at runtime; nothing is copied here.

export type SetId = 'OGN' | 'SFD' | 'UNL' | 'RAD' | 'VEN';
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
}

export interface SetInfo {
  name: string;
  msrpPack: number;
  msrpBox: number;
  /** Market prices, USD. */
  pack: number;
  box: number;
  case: number;
  est?: string[];
}

const data = raw as unknown as { meta: { pricesDate: string; galleryDate: string; source: string }; sets: Record<SetId, SetInfo>; cards: Card[] };

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
