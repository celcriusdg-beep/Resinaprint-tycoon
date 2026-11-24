import * as THREE from 'three';
import type { BuildingType } from '../../game/types';
import type { AnimPart, ModelBuilder, ModelData, SteamEmitter } from './builder';
import * as R from './models/reactors';
import * as P from './models/plant';
import * as S from './models/supply';
import * as I from './models/industry';
import * as T from './models/tiers';

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
  uranium_mine: S.uraniumMine,
  ore_mill: S.oreMill,
  enrichment: S.enrichmentPlant,
  fuel_fab: S.fuelFab,
  fuel_qa: S.fuelQa,
  water_intake: S.waterIntake,
  water_wells: S.waterWells,
  water_treatment: S.waterTreatment,
  water_tank: S.waterTank,
  cooling_dry: S.dryCooling,
  dry_cask: S.dryCask,
  reactor_epr: I.eprReactor,
  cooling_mega: I.megaTower,
  hvdc: I.hvdcStation,
  datacenter: I.dataCenter,
  hydrogen: I.hydrogenPlant,
  desal: I.desalPlant,
  isotopes: I.isotopeLab,
  visitor: I.visitorCenter,
  rail_terminal: I.railTerminal,
  reactor_smr_park: T.smrPark,
  reactor_sfr: T.sfrReactor,
  turbine_medium: T.turbineMedium,
  turbine_super: T.turbineSuper,
  turbine_sco2: T.turbineSco2,
  turbine_mhd: T.turbineMhd,
  cooling_hybrid: T.coolingHybrid,
  cooling_fanassist: T.coolingFanAssist,
  cooling_seawater: T.coolingSeawater,
  cooling_sky: T.coolingSky,
  mine_underground: T.mineUnderground,
  mine_isr: T.mineIsr,
  mill_large: T.millLarge,
  enrich_centrifuge: T.enrichCentrifuge,
  enrich_laser: T.enrichLaser,
  fab_auto: T.fabAuto,
  qa_auto: T.qaAuto,
  fuel_vault: T.fuelVault,
  spent_vault: T.spentVault,
  substation_400: T.substation400,
  grid_sc: T.gridSc,
  storage_thermal: T.storageThermal,
  storage_pumped: T.storagePumped,
  intake_large: T.intakeLarge,
  treatment_edi: T.treatmentEdi,
  reservoir: T.reservoir,
  hq: T.hqTower,
  research_campus: T.researchCampus,
  robotics_depot: T.roboticsDepot,
  backup_gt: T.backupGasTurbine,
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
