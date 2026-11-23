import type { GameState } from '../types';
import { PRESTIGE_BONUS_PER_SHARE, PRESTIGE_MIN_EARNED } from '../constants';

// Corporate Restructuring: sell the company's assets to investors in exchange
// for Shares, which give permanent bonuses to every future run.

export function sharesForEarned(earned: number): number {
  if (earned < PRESTIGE_MIN_EARNED) return 0;
  return Math.floor(Math.pow(earned / PRESTIGE_MIN_EARNED, 0.5) * 4);
}

export function pendingShares(s: GameState): number {
  return Math.max(0, sharesForEarned(s.runEarned));
}

export function canPrestige(s: GameState): boolean {
  return pendingShares(s) > 0;
}

/** Permanent multiplier from shares (applied to price and research). */
export function prestigeMult(shares: number): number {
  return 1 + shares * PRESTIGE_BONUS_PER_SHARE;
}

export function prestigeStartMoney(shares: number): number {
  return 12_000 + shares * 5_000;
}
