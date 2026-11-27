import type { SetId } from '../data/cards';

export type SealedKind = 'pack' | 'box' | 'case';
export type SealedKey = `${SetId}:${SealedKind}`;
export type Company = 'PSA' | 'BGS';

/** A graded card's slab. PSA grades whole numbers; Beckett (BGS) half grades with four subgrades. */
export interface Slab {
  company: Company;
  grade: number;
  sub?: { centering: number; corners: number; edges: number; surface: number };
  /** BGS Black Label: a 10 with four 10 subgrades. */
  black?: boolean;
  cert: number;
}

/** One physical single that is tracked on its own (graded, listed or in grading). */
export interface Single {
  uid: number;
  cardId: string;
  foil: boolean;
  slab?: Slab;
}

export interface Listing extends Single {
  price: number;
}

/** Sealed product on your shelf: the stack and its price each. */
export interface SealedListing {
  uid: number;
  set: SetId;
  kind: SealedKind;
  qty: number;
  price: number;
}

export interface GradingJob {
  uid: number;
  cardId: string;
  foil: boolean;
  company: Company;
  tier: string;
  readyAt: number; // game hours
  sentAt: number;
}

/** Something you can buy at a good price today (deals board or a walk-in seller). */
export interface Deal {
  id: number;
  what: { type: 'sealed'; set: SetId; kind: SealedKind; qty: number } | { type: 'single'; cardId: string; foil: boolean };
  price: number;
  who: string;
  /** Walk-in offers leave after a while; deals-board items last the day. */
  expires: number;
}

export interface FeedItem {
  id: number;
  t: number;
  kind: 'sale' | 'leave' | 'offer' | 'info' | 'bad' | 'hit';
  text: string;
  amount?: number;
}

export interface Spike {
  champion: string;
  factor: number;
  until: number; // day
}

export interface GameState {
  version: number;
  cash: number;
  /** Open shop hours since day 1 (12 per day). */
  hours: number;
  day: number;
  rep: number;
  shopLevel: number;
  clerk: boolean;
  adsUntil: number;
  /** Sealed product in the back room (not on the shelf). */
  sealed: Partial<Record<SealedKey, number>>;
  /** Raw singles: cardId -> [normal, foil]. */
  cards: Record<string, [number, number]>;
  seen: Record<string, 1>;
  slabs: Single[];
  grading: GradingJob[];
  /** Shelf: sealed stacks and the display case of singles, with your prices. */
  shelf: SealedListing[];
  display: Listing[];
  online: Listing[];
  offers: Deal[];
  deals: Deal[];
  bought: Partial<Record<SealedKey, number>>;
  market: { card: Record<string, number>; sealed: Partial<Record<SetId, number>>; spike: Spike | null };
  feed: FeedItem[];
  /** Grades that came back and have not been revealed yet. */
  reveals: number[];
  nextUid: number;
  stats: { packsOpened: number; revenue: number; spent: number; sales: number; graded: number; bestPull: { cardId: string; foil: boolean; value: number } | null };
  today: { revenue: number; costs: number; sales: number };
  savedAt: number;
}
