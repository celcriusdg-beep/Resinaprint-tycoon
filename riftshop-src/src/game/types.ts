import type { SetId } from '../data/cards';

export type SealedKind = 'pack' | 'box' | 'case';
export type SealedKey = `${SetId}:${SealedKind}`;

/** One physical single that is not just a count in the binder (listed, graded or in grading). */
export interface Single {
  uid: number;
  cardId: string;
  foil: boolean;
  /** 1–10 once graded. */
  grade?: number;
}

export interface Listing extends Single {
  price: number;
}

export interface GradingJob extends Single {
  tier: GradeTier;
  readyAt: number; // game hours
}

export type GradeTier = 'value' | 'standard' | 'express';

export interface Offer {
  id: number;
  cardId: string;
  foil: boolean;
  ask: number;
  expires: number; // game hours
  who: string;
}

export interface FeedItem {
  id: number;
  t: number; // game hours
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
  /** Game time in hours since day 1, 09:00 is opening. */
  hours: number;
  day: number;
  rep: number; // 0..100
  shopLevel: number; // 1..6
  clerk: boolean;
  adsUntil: number; // game hours
  sealed: Partial<Record<SealedKey, number>>;
  /** Owned raw singles: cardId -> [normal count, foil count]. */
  cards: Record<string, [number, number]>;
  /** Cards ever owned (binder completion). */
  seen: Record<string, 1>;
  graded: Single[];
  grading: GradingJob[];
  display: Listing[];
  online: Listing[];
  offers: Offer[];
  markup: { pack: number; box: number };
  /** Daily distributor allocation used: SealedKey -> units bought today. */
  bought: Partial<Record<SealedKey, number>>;
  market: { card: Record<string, number>; sealed: Partial<Record<SetId, number>>; spike: Spike | null };
  feed: FeedItem[];
  nextUid: number;
  stats: { packsOpened: number; revenue: number; spent: number; bestPull: { cardId: string; foil: boolean; value: number } | null; sales: number };
  today: { revenue: number; costs: number; sales: number };
  savedAt: number;
}
