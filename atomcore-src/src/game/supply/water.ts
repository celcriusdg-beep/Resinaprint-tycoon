import type { Building, GameState, Site, Modifiers } from '../types';
import { BUILDINGS, levelMult } from '../buildings/defs';
import { EVAP_PER_MW, TREATED_PER_MW, RAW_PER_TREATED, MUNICIPAL_RAW_PRICE, MUNICIPAL_TREATED_PRICE, HOURS_PER_SECOND } from '../constants';
import { LOCATION_BY_ID } from '../progression/locations';
import { eventEffect } from '../events/events';

// Site water balance (m³ per game hour):
//  • Wet cooling (fan cells, natural-draft towers) evaporates water roughly in
//    proportion to the heat it rejects; it must be replaced ("make-up water").
//  • Reactors and the steam cycle need a small flow of ultra-pure demineralised
//    water, produced by treatment plants from raw water.
//  • Raw water comes from the municipal connection, river/sea intakes or wells.
// A shortfall of make-up water shrinks wet cooling capacity; a shortfall of
// demineralised water forces reactors to derate.

export interface WaterResult {
  rawSupply: number;
  evaporation: number;
  treatedSupply: number;
  treatedDemand: number;
  rawToTreatment: number;
  waterFactor: number;
  treatedFactor: number;
  tankM3: number;
  tankCapM3: number;
  cost: number; // $/s for municipal water
}

function cond(b: Building): number {
  return b.condition >= 60 ? 1 : 0.55 + 0.45 * (b.condition / 60);
}

export function stepWater(
  s: GameState, site: Site, mods: Modifiers, wetShare: number, heatReject: number, thermal: number, dt: number,
): WaterResult {
  const loc = LOCATION_BY_ID[site.id];
  let intake = 0, treatCap = 0, tankCap = 0;
  for (const b of site.buildings) {
    if (b.status !== 'active' || !b.enabled) {
      if (b.status !== 'constructing' && b.type === 'water_tank') tankCap += (BUILDINGS[b.type].stats.waterStorage ?? 0) * levelMult(BUILDINGS[b.type], b.level);
      continue;
    }
    const def = BUILDINGS[b.type];
    const lm = levelMult(def, b.level);
    if (def.stats.rawWater) intake += def.stats.rawWater * lm * cond(b) * (b.type === 'water_intake' ? loc.intakeMult : 1);
    if (def.stats.treatedWater) treatCap += def.stats.treatedWater * lm * cond(b);
    if (def.stats.waterStorage) tankCap += def.stats.waterStorage * lm;
  }
  const supplyMult = eventEffect(s, site.id, 'water');
  const ownRaw = intake * supplyMult;
  const municipalRaw = loc.waterBase * supplyMult;
  const rawSupply = ownRaw + municipalRaw;

  // Demineralised water: municipal connection first, then treatment plants.
  const treatedDemand = thermal * TREATED_PER_MW * mods.treatedUse;
  const municipalTreated = Math.min(treatedDemand, loc.treatedBase);
  const fromPlants = Math.min(Math.max(0, treatedDemand - municipalTreated), treatCap, rawSupply / RAW_PER_TREATED);
  const rawToTreatment = fromPlants * RAW_PER_TREATED;
  const treatedSupply = municipalTreated + fromPlants;
  const treatedFactor = treatedDemand > 0.001 ? Math.min(1, treatedSupply / treatedDemand) : 1;

  // Evaporation, fed from what is left, then from the tank.
  const evaporation = heatReject * wetShare * EVAP_PER_MW * mods.evaporation * eventEffect(s, site.id, 'evaporation');
  const rawLeft = Math.max(0, rawSupply - rawToTreatment);
  const dtH = HOURS_PER_SECOND * dt;
  let tank = Math.min(site.storageWater ?? 0, tankCap);
  let delivered = Math.min(evaporation, rawLeft);
  if (delivered < evaporation && tank > 0) {
    const draw = Math.min(tank, (evaporation - delivered) * dtH);
    tank -= draw;
    delivered += draw / dtH;
  } else if (rawLeft > evaporation) {
    tank = Math.min(tankCap, tank + (rawLeft - evaporation) * dtH);
  }
  site.storageWater = tank;
  const waterFactor = evaporation > 0.001 ? Math.min(1, delivered / evaporation) : 1;

  // Municipal water is bought; own intakes and wells only cost their upkeep.
  const rawUsed = Math.min(rawSupply, rawToTreatment + delivered);
  const municipalUsed = Math.max(0, rawUsed - ownRaw);
  const cost = (municipalUsed * MUNICIPAL_RAW_PRICE + municipalTreated * MUNICIPAL_TREATED_PRICE) * HOURS_PER_SECOND;

  return { rawSupply, evaporation, treatedSupply, treatedDemand, rawToTreatment, waterFactor, treatedFactor, tankM3: tank, tankCapM3: tankCap, cost };
}
