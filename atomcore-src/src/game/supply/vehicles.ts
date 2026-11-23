// Mining fleet. Excavators dig ore; trucks haul it out of the pit. Ore leaving
// a mine is limited by whichever is smaller, except the bucket-wheel excavator,
// which feeds its own conveyor belt and needs no trucks.

export interface VehicleDef {
  tier: number;
  name: string;
  short: string;
  kind: 'excavator' | 'truck';
  description: string;
  cost: number;
  rate: number; // ore t/s dug (excavator) or hauled (truck)
  upkeep: number; // $/s
  level: number; // company level required
  research?: string;
  selfHaul?: boolean;
  /** Visual scale of the 3D model. */
  scale: number;
  /** Real-world reference size, shown in the UI. */
  spec: string;
}

export const EXCAVATORS: VehicleDef[] = [
  { tier: 0, kind: 'excavator', name: 'Compact Excavator', short: 'Compact', description: 'A small tracked digger. Cheap, slow, a fine way to open a pit.', cost: 6_000, rate: 0.35, upkeep: 0.3, level: 1, scale: 0.55, spec: '8 t · 0.3 m³ bucket' },
  { tier: 1, kind: 'excavator', name: 'Hydraulic Excavator', short: 'Hydraulic', description: 'The standard construction and quarry excavator.', cost: 40_000, rate: 1.6, upkeep: 1.2, level: 4, scale: 0.85, spec: '45 t · 2.5 m³ bucket' },
  { tier: 2, kind: 'excavator', name: 'Large Mining Shovel', short: 'Mining Shovel', description: 'A hydraulic front shovel built for mines.', cost: 350_000, rate: 9, upkeep: 5, level: 8, research: 'f_heavy', scale: 1.3, spec: '250 t · 15 m³ bucket' },
  { tier: 3, kind: 'excavator', name: 'Electric Rope Shovel', short: 'Rope Shovel', description: 'A grid-powered giant that loads the biggest haul trucks in three passes.', cost: 3_000_000, rate: 50, upkeep: 22, level: 12, research: 'f_heavy', scale: 1.9, spec: '1,400 t · 60 m³ dipper' },
  { tier: 4, kind: 'excavator', name: 'Bucket-Wheel Excavator', short: 'Bucket-Wheel', description: 'One of the largest land machines ever built: a rotating wheel of buckets feeding a conveyor. No trucks needed.', cost: 40_000_000, rate: 400, upkeep: 120, level: 17, research: 'f_bucket', selfHaul: true, scale: 2.0, spec: '13,000 t · 96 m tall' },
];

export const TRUCKS: VehicleDef[] = [
  { tier: 0, kind: 'truck', name: 'Dump Truck', short: 'Dump', description: 'A road-legal tipper.', cost: 4_000, rate: 0.5, upkeep: 0.2, level: 1, scale: 0.55, spec: '15 t payload' },
  { tier: 1, kind: 'truck', name: 'Articulated Hauler', short: 'Articulated', description: 'Six-wheel drive, made for rough pit ramps.', cost: 30_000, rate: 2.2, upkeep: 0.9, level: 4, scale: 0.8, spec: '40 t payload' },
  { tier: 2, kind: 'truck', name: 'Rigid Haul Truck', short: 'Rigid Haul', description: 'A dedicated mining truck.', cost: 250_000, rate: 12, upkeep: 4, level: 8, research: 'f_heavy', scale: 1.25, spec: '180 t payload' },
  { tier: 3, kind: 'truck', name: 'Ultra-Class Haul Truck', short: 'Ultra-Class', description: 'Tyres taller than two people; the largest trucks on Earth.', cost: 2_200_000, rate: 70, upkeep: 18, level: 12, research: 'f_heavy', scale: 1.8, spec: '400 t payload' },
];

export function slotsFor(kind: 'excavator' | 'truck', mineLevel: number): number {
  return kind === 'excavator' ? 2 + mineLevel : 3 + 2 * mineLevel;
}

export function emptyVehicles() {
  return { excavators: EXCAVATORS.map(() => 0), trucks: TRUCKS.map(() => 0) };
}
