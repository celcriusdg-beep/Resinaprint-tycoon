export interface LocationDef {
  id: string;
  name: string;
  region: string;
  description: string;
  unlockLevel: number;
  cost: number;
  startSize: number;
  maxSize: number;
  coolingMult: number;
  demandMult: number; // regional market size relative to the home market
  priceMult: number;
  buildCostMult: number;
  ambient: number; // ambient temperature °C
  theme: 'river' | 'coast' | 'desert' | 'arctic';
  perk: string;
  /** Municipal raw / treated water connection, m³/h. */
  waterBase: number;
  treatedBase: number;
  /** River, sea or fjord available for intake pumps. */
  waterBody: boolean;
  /** Multiplier on intake capacity (seawater is plentiful). */
  intakeMult: number;
  /** Uranium ore grade multiplier on mining output. */
  oreGrade: number;
  oreLabel: string;
}

export const LOCATIONS: LocationDef[] = [
  {
    id: 'riverside',
    name: 'Riverside Valley',
    region: 'Home region',
    description: 'A green valley with a cold river. Your company starts here.',
    unlockLevel: 1,
    cost: 0,
    startSize: 14,
    maxSize: 38,
    coolingMult: 1.1,
    demandMult: 1,
    priceMult: 1,
    buildCostMult: 1,
    ambient: 18,
    theme: 'river',
    waterBase: 60, treatedBase: 4, waterBody: true, intakeMult: 1, oreGrade: 1, oreLabel: 'Average grade',
    perk: '+10% cooling from river water',
  },
  {
    id: 'coastal',
    name: 'Saltmarsh Bay',
    region: 'Coastal region',
    description: 'Seawater cooling and a big coastal city to supply. Storms can hit the grid.',
    unlockLevel: 8,
    cost: 1_500_000,
    startSize: 16,
    maxSize: 42,
    coolingMult: 1.3,
    demandMult: 1.6,
    priceMult: 1.05,
    buildCostMult: 1.1,
    ambient: 16,
    theme: 'coast',
    waterBase: 40, treatedBase: 3, waterBody: true, intakeMult: 2, oreGrade: 0.7, oreLabel: 'Low grade',
    perk: '+30% cooling (seawater), large city demand',
  },
  {
    id: 'desert',
    name: 'Red Mesa Plateau',
    region: 'Desert region',
    description: 'Hot and dry, so cooling suffers, but land is cheap and the industrial demand is enormous.',
    unlockLevel: 13,
    cost: 30_000_000,
    startSize: 20,
    maxSize: 50,
    coolingMult: 0.8,
    demandMult: 2.6,
    priceMult: 1.2,
    buildCostMult: 0.85,
    ambient: 38,
    theme: 'desert',
    waterBase: 12, treatedBase: 2, waterBody: false, intakeMult: 0, oreGrade: 1.6, oreLabel: 'High grade',
    perk: '−15% build cost, +20% price, −20% cooling',
  },
  {
    id: 'arctic',
    name: 'Nordvik Fjord',
    region: 'Arctic region',
    description: 'Icy fjord water gives superb cooling. Feeds a continental HVDC interconnect.',
    unlockLevel: 19,
    cost: 600_000_000,
    startSize: 20,
    maxSize: 50,
    coolingMult: 1.5,
    demandMult: 4.5,
    priceMult: 1.15,
    buildCostMult: 1.2,
    ambient: 2,
    theme: 'arctic',
    waterBase: 50, treatedBase: 3, waterBody: true, intakeMult: 2, oreGrade: 2.5, oreLabel: 'Very high grade',
    perk: '+50% cooling, continental demand',
  },
];

export const LOCATION_BY_ID: Record<string, LocationDef> = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]));

/** Each land purchase adds this many cells per side (two rings around the plot). */
export const EXPAND_STEP = 4;

export function nextSize(loc: LocationDef, size: number): number {
  return Math.min(loc.maxSize, size + EXPAND_STEP);
}

export function expandCost(loc: LocationDef, size: number): number {
  const steps = Math.max(0, (size - loc.startSize) / EXPAND_STEP);
  return Math.round(20_000 * Math.pow(2.6, steps) * Math.max(1, loc.cost / 1_000_000) ** 0.5);
}
