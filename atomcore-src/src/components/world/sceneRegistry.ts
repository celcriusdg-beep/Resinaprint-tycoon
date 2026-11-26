import * as THREE from 'three';
import type { Building, Site } from '../../game/types';
import { BUILDINGS } from '../../game/buildings/defs';
import { CELL } from '../../game/constants';
import { buildingRect } from '../../game/buildings/grid';

// Shared helpers between scene components: world-space placement and a
// registry of active steam emitters fed by building instances.

/** World-space point above each building where its floating tag sits. */
export const labelAnchors = new Map<number, THREE.Vector3>();

export function cellToWorld(x: number, z: number, size: number): [number, number] {
  return [(x - size / 2) * CELL, (z - size / 2) * CELL];
}

export function buildingCenter(b: Building, size: number): [number, number] {
  const r = buildingRect(b);
  return [(r.x + r.w / 2 - size / 2) * CELL, (r.z + r.d / 2 - size / 2) * CELL];
}

/** How "busy" a building is right now, 0..1. Drives animation and steam. */
export function activity(b: Building, site: Site): number {
  if (b.status !== 'active' || !b.enabled) return b.reactor ? b.reactor.power : 0;
  const st = site.stats;
  if (b.reactor) return b.reactor.power;
  const def = BUILDINGS[b.type];
  if (b.type === 'uranium_mine') return st.oreRate > 0 ? 1 : 0;
  if (def.category === 'water') return b.type === 'water_tank' ? 0.2 : Math.min(1, (st.evaporation + st.treatedDemand) / Math.max(1, st.rawSupply) + 0.3);
  if (def.category === 'fuel') return 0.8;
  if (def.dry) return st.coolingCapMW > 0 ? Math.min(1, st.heatRejectMW / st.coolingCapMW) : 0;
  const cat = def.category;
  if (cat === 'cooling') return st.coolingCapMW > 0 ? Math.min(1, st.heatRejectMW / st.coolingCapMW) : 0;
  if (cat === 'power') return st.steamCapMW > 0 ? Math.min(1, st.steamUsedMW / st.steamCapMW) : 0;
  if (b.type === 'battery') return st.storageCapMWh > 0 ? 0.3 + 0.7 * Math.min(1, Math.abs(st.storageFlowMW) / 10) : 0;
  return 1;
}

export interface EmitterEntry {
  pos: THREE.Vector3;
  radius: number;
  rate: number;
  size: number;
  kind: 'steam' | 'smoke' | 'vapor';
  activity: () => number;
}

export const emitters = new Map<number, EmitterEntry[]>();
