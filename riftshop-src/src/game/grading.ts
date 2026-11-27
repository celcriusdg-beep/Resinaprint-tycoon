import { weighted } from './rng';
import type { Company, Slab } from './types';

// PSA and Beckett (BGS) grading. Fees and service levels are approximate 2026 prices;
// turnaround is in shop days (one shop day = 4 real minutes).

export interface Tier {
  id: string;
  name: string;
  fee: number;
  days: number;
}

export const COMPANIES: Record<Company, { name: string; full: string; tiers: Tier[]; blurb: string }> = {
  PSA: {
    name: 'PSA',
    full: 'Professional Sports Authenticator',
    blurb: 'Whole grades 1–10. The PSA 10 carries the biggest premium on the market.',
    tiers: [
      { id: 'value', name: 'Value', fee: 39.99, days: 6 },
      { id: 'regular', name: 'Regular', fee: 79.99, days: 3 },
      { id: 'express', name: 'Express', fee: 149, days: 1 },
    ],
  },
  BGS: {
    name: 'BGS',
    full: 'Beckett Grading Services',
    blurb: 'Half grades with four subgrades. Gem Mint 9.5 is the usual top; a Pristine 10 is rare and a Black Label 10 (all four subgrades 10) is the holy grail.',
    tiers: [
      { id: 'base', name: 'Base', fee: 17.95, days: 7 },
      { id: 'standard', name: 'Standard', fee: 34.95, days: 4 },
      { id: 'express', name: 'Express', fee: 79.95, days: 1 },
    ],
  },
};

/** PSA grade odds for pack-fresh cards. */
const PSA_ODDS: [number, number][] = [[10, 0.15], [9, 0.38], [8, 0.24], [7, 0.11], [6, 0.06], [5, 0.03], [4, 0.02], [3, 0.01]];
/** One BGS subgrade. */
const SUB_ODDS: [number, number][] = [[10, 0.12], [9.5, 0.30], [9, 0.32], [8.5, 0.15], [8, 0.07], [7.5, 0.03], [7, 0.01]];

export function rollGrade(company: Company, cert: number): Slab {
  if (company === 'PSA') return { company, grade: weighted(PSA_ODDS), cert };
  const sub = { centering: weighted(SUB_ODDS), corners: weighted(SUB_ODDS), edges: weighted(SUB_ODDS), surface: weighted(SUB_ODDS) };
  const vals = Object.values(sub);
  const low = Math.min(...vals);
  const avg = vals.reduce((a, b) => a + b, 0) / 4;
  // Beckett: the overall grade follows the average, but can't be more than a point above the lowest subgrade.
  let grade = Math.min(Math.floor(avg * 2) / 2, low + 1);
  if (avg >= 9.75 && low >= 9.5) grade = 10;
  return { company, grade, sub, black: vals.every((v) => v === 10), cert };
}

export const PSA_LABEL: Record<number, string> = {
  10: 'GEM MT', 9: 'MINT', 8: 'NM-MT', 7: 'NM', 6: 'EX-MT', 5: 'EX', 4: 'VG-EX', 3: 'VG', 2: 'GOOD', 1: 'PR',
};

export function bgsLabel(s: Slab): string {
  if (s.black) return 'BLACK LABEL';
  if (s.grade >= 10) return 'PRISTINE';
  if (s.grade >= 9.5) return 'GEM MINT';
  if (s.grade >= 9) return 'MINT';
  if (s.grade >= 8) return 'NM-MT';
  if (s.grade >= 7) return 'NEAR MINT';
  return 'EX-MT';
}

export function slabTitle(s: Slab): string {
  return s.company === 'PSA' ? `PSA ${s.grade} ${PSA_LABEL[s.grade]}` : `BGS ${s.grade % 1 ? s.grade.toFixed(1) : s.grade} ${bgsLabel(s)}`;
}

/** Value of a slabbed copy relative to raw. Chase cards (raw ≥ $20) carry bigger premiums at the top. */
export function slabMult(s: Slab | undefined, raw: number): number {
  if (!s) return 1;
  const chase = raw >= 20;
  if (s.company === 'PSA') {
    return ({ 10: chase ? 4 : 3, 9: 1.6, 8: 1.1, 7: 0.85, 6: 0.7 } as Record<number, number>)[s.grade] ?? 0.55;
  }
  if (s.black) return chase ? 12 : 8;
  if (s.grade >= 10) return chase ? 5 : 3.6;
  if (s.grade >= 9.5) return chase ? 2.8 : 2.2;
  if (s.grade >= 9) return 1.35;
  if (s.grade >= 8.5) return 1.1;
  if (s.grade >= 8) return 0.95;
  return 0.6;
}
