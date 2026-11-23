import * as THREE from 'three';
import type { BuildingType } from '../../game/types';
import type { AnimPart, ModelBuilder, ModelData, SteamEmitter } from './builder';
import * as R from './models/reactors';
import * as P from './models/plant';

const BUILDERS: Record<BuildingType, () => ModelBuilder> = {
  reactor_pilot: R.pilotReactor,
  reactor_smr: R.smrReactor,
  reactor_pwr: R.pwrReactor,
  reactor_bwr: R.bwrReactor,
  reactor_msr: R.msrReactor,
  reactor_fusion: R.fusionReactor,
  cooling_mech: P.mechCooling,
  cooling_tower: P.coolingTower,
  turbine: P.turbineHall,
  turbine_large: P.turbineHallLarge,
  substation: P.substation,
  battery: P.battery,
  lab: P.lab,
  admin: P.admin,
  maintenance: P.maintenance,
  fuel_depot: P.fuelDepot,
  generator_emergency: P.emergencyGenerator,
};

const templates = new Map<BuildingType, ModelData>();

export function getTemplate(type: BuildingType): ModelData {
  let t = templates.get(type);
  if (!t) {
    t = BUILDERS[type]().build();
    t.anims.forEach((a, i) => (a.object.userData.animIndex = i));
    templates.set(type, t);
  }
  return t;
}

export interface ModelInstance {
  group: THREE.Group;
  anims: AnimPart[];
  emitters: SteamEmitter[];
  height: number;
  dispose: () => void;
}

/** Clone a template. Geometry and static materials are shared; animated glow
 *  materials are cloned so each building can glow independently. */
export function instantiate(type: BuildingType): ModelInstance {
  const t = getTemplate(type);
  const group = t.group.clone(true);
  const anims: AnimPart[] = [];
  const owned: THREE.Material[] = [];
  group.traverse((o) => {
    const idx = o.userData.animIndex;
    if (idx === undefined) return;
    const src = t.anims[idx];
    const a: AnimPart = { ...src, object: o };
    if (src.material) {
      const mat = src.material.clone();
      owned.push(mat);
      o.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (mesh.isMesh && mesh.material === src.material) mesh.material = mat;
      });
      a.material = mat;
    }
    anims.push(a);
  });
  return { group, anims, emitters: t.emitters, height: t.height, dispose: () => owned.forEach((m) => m.dispose()) };
}

/** Pre-build all templates (called during the loading screen). */
export function warmTemplates(types: BuildingType[] = Object.keys(BUILDERS) as BuildingType[]): void {
  for (const t of types) getTemplate(t);
}
