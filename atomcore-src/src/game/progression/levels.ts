// Company level is driven by experience, which is earned per MWh sold.

export const MAX_LEVEL = 40;

/** XP needed to go from `level` to `level + 1`. */
export function xpForNext(level: number): number {
  return Math.round(40 * Math.pow(1.62, level - 1));
}

/** Regional demand at a given company level (home market, MW). */
export function demandForLevel(level: number): number {
  return 14 * Math.pow(1.33, level - 1);
}

/** Cash reward for reaching a level. */
export function levelReward(level: number): number {
  return Math.round(1_500 * Math.pow(1.55, level - 1));
}

export const LEVEL_TITLES: [number, string][] = [
  [1, 'Start-up Utility'],
  [3, 'Regional Supplier'],
  [6, 'Commercial Operator'],
  [10, 'National Utility'],
  [15, 'Energy Conglomerate'],
  [20, 'Multinational Corporation'],
  [26, 'Global Energy Titan'],
  [33, 'Fusion Age Pioneer'],
];

export function levelTitle(level: number): string {
  let t = LEVEL_TITLES[0][1];
  for (const [l, name] of LEVEL_TITLES) if (level >= l) t = name;
  return t;
}
