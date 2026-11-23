import type { DailyKind, DailyObjective, GameState } from '../types';
import { hashString, mulberry32 } from '../rng';
import { HOURS_PER_SECOND } from '../constants';
import { xpForNext } from './levels';

export function dateKey(d = new Date()): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export const DAILY_LABEL: Record<DailyKind, (n: number) => string> = {
  energy: (n) => `Sell ${fmtShort(n)} MWh of electricity`,
  earn: (n) => `Earn $${fmtShort(n)} in sales`,
  build: (n) => `Construct ${n} building${n > 1 ? 's' : ''}`,
  upgrade: (n) => `Complete ${n} upgrade${n > 1 ? 's' : ''}`,
  research: (n) => `Finish ${n} research project${n > 1 ? 's' : ''}`,
  contract: (n) => `Complete ${n} energy contract${n > 1 ? 's' : ''}`,
  repair: (n) => `Repair ${n} piece${n > 1 ? 's' : ''} of equipment`,
};

function fmtShort(n: number): string {
  if (n >= 1e9) return `${+(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${+(n / 1e3).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

function nice(n: number): number {
  if (n <= 10) return Math.max(1, Math.round(n));
  const mag = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / mag) * mag;
}

export function emptyCounters(): Record<DailyKind, number> {
  return { energy: 0, earn: 0, build: 0, upgrade: 0, research: 0, contract: 0, repair: 0 };
}

/** Generates three objectives for the day, scaled to the company's current size. */
export function generateDaily(s: GameState, key: string): DailyObjective[] {
  const r = mulberry32(hashString(key + ':' + s.createdAt));
  const exportMW = Math.max(6, Object.values(s.sites).reduce((a, x) => a + x.stats.exportMW, 0));
  const price = 55;
  const energy10min = exportMW * HOURS_PER_SECOND * 600;
  const pool: { kind: DailyKind; target: number }[] = [
    { kind: 'energy', target: nice(energy10min * 1.5) },
    { kind: 'earn', target: nice(energy10min * price * 1.5) },
    { kind: 'build', target: 2 + Math.floor(r() * 3) },
    { kind: 'upgrade', target: 2 + Math.floor(r() * 3) },
    { kind: 'research', target: 1 + (s.level > 8 ? 1 : 0) },
    { kind: 'repair', target: 2 },
  ];
  if (s.level >= 3) pool.push({ kind: 'contract', target: 1 });
  const chosen: DailyObjective[] = [];
  const used = new Set<DailyKind>();
  // Always include one production objective.
  const first = r() < 0.5 ? pool[0] : pool[1];
  used.add(first.kind);
  chosen.push(make(first.kind, first.target, 0));
  while (chosen.length < 3) {
    const p = pool[Math.floor(r() * pool.length)];
    if (used.has(p.kind)) continue;
    used.add(p.kind);
    chosen.push(make(p.kind, p.target, chosen.length));
  }
  function make(kind: DailyKind, target: number, i: number): DailyObjective {
    const reward = nice(Math.max(2_500, exportMW * HOURS_PER_SECOND * price * 400));
    return { id: `${key}-${i}`, kind, target, progress: 0, reward, rewardXp: Math.round(xpForNext(s.level) * 0.25), claimed: false };
  }
  return chosen;
}
