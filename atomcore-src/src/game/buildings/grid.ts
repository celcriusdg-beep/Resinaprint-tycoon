import type { Building, BuildingType, Site } from '../types';
import { BUILDINGS, footprint } from './defs';

export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export function buildingRect(b: Pick<Building, 'type' | 'x' | 'z' | 'rot'>): Rect {
  const [w, d] = footprint(BUILDINGS[b.type], b.rot);
  return { x: b.x, z: b.z, w, d };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.z < b.z + b.d && a.z + a.d > b.z;
}

/** Cells reserved for the access road along the plot's south edge. */
export const ROAD_ROWS = 1;

export type PlacementProblem = 'bounds' | 'overlap' | 'road' | null;

export function checkPlacement(
  site: Site,
  type: BuildingType,
  x: number,
  z: number,
  rot: number,
  ignoreId?: number,
): PlacementProblem {
  const [w, d] = footprint(BUILDINGS[type], rot);
  if (x < 0 || z < 0 || x + w > site.size || z + d > site.size) return 'bounds';
  if (z + d > site.size - ROAD_ROWS) return 'road';
  const r: Rect = { x, z, w, d };
  for (const b of site.buildings) {
    if (b.id === ignoreId) continue;
    if (rectsOverlap(r, buildingRect(b))) return 'overlap';
  }
  return null;
}

/** Find the first free spot for a building, scanning from the plot centre outwards. */
export function findFreeSpot(site: Site, type: BuildingType, rot = 0): { x: number; z: number } | null {
  const c = Math.floor(site.size / 2);
  const max = site.size;
  for (let radius = 0; radius < max; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
        const x = c + dx;
        const z = c + dz;
        if (!checkPlacement(site, type, x, z, rot)) return { x, z };
      }
    }
  }
  return null;
}

/** World-space centre of a building footprint (in cell units, origin at plot centre). */
export function rectCenter(r: Rect, siteSize: number): { cx: number; cz: number } {
  return { cx: r.x + r.w / 2 - siteSize / 2, cz: r.z + r.d / 2 - siteSize / 2 };
}
