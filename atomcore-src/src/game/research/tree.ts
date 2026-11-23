import type { BuildingType, ModKey, Automation } from '../types';

export type ResearchCategory =
  | 'reactor'
  | 'cooling'
  | 'turbine'
  | 'automation'
  | 'materials'
  | 'safety'
  | 'distribution'
  | 'advanced'
  | 'fuel';

export interface ResearchNode {
  id: string;
  name: string;
  category: ResearchCategory;
  tier: number; // column in the tree view
  cost: number; // research points
  money: number; // $ paid when research starts
  requires: string[];
  level?: number; // minimum company level
  description: string;
  effects?: Partial<Record<ModKey, number>>;
  unlocks?: BuildingType[];
  automation?: keyof Automation;
  autoSetback?: boolean;
}

export const RESEARCH_CATEGORIES: { id: ResearchCategory; name: string; color: string }[] = [
  { id: 'reactor', name: 'Reactor Efficiency', color: '#4fd1ff' },
  { id: 'cooling', name: 'Advanced Cooling', color: '#7ee0c3' },
  { id: 'turbine', name: 'Turbine Technology', color: '#ffc857' },
  { id: 'automation', name: 'Automation', color: '#b18cff' },
  { id: 'materials', name: 'Materials Science', color: '#ff9f6b' },
  { id: 'safety', name: 'Safety Systems', color: '#ff6b81' },
  { id: 'distribution', name: 'Power Distribution', color: '#8fd16a' },
  { id: 'advanced', name: 'Advanced Reactor Concepts', color: '#ff7ce5' },
  { id: 'fuel', name: 'Fuel Cycle & Mining', color: '#e8d25a' },
];

const N = (n: ResearchNode) => n;

export const RESEARCH: ResearchNode[] = [
  // ── Reactor efficiency ────────────────────────────────────────────────
  N({ id: 'r_fuel1', name: 'Enriched Fuel Assemblies', category: 'reactor', tier: 1, cost: 40, money: 2_000, requires: [],
    description: 'Better fuel loading patterns. +10% reactor thermal output.', effects: { reactorOutput: 0.1 } }),
  N({ id: 'r_smr', name: 'Modular Reactor Design', category: 'reactor', tier: 1, cost: 70, money: 4_000, requires: [],
    description: 'Unlocks the Small Modular Reactor.', unlocks: ['reactor_smr'] }),
  N({ id: 'r_fuel2', name: 'High-Burnup Fuel', category: 'reactor', tier: 2, cost: 380, money: 25_000, requires: ['r_fuel1'],
    description: 'Fuel stays in the core longer. −15% fuel use, +5% output.', effects: { fuelUse: -0.15, reactorOutput: 0.05 } }),
  N({ id: 'r_pwr', name: 'Pressurized Water Reactors', category: 'reactor', tier: 2, cost: 650, money: 60_000, requires: ['r_smr', 'm_alloys'], level: 5,
    description: 'Unlocks the large commercial PWR.', unlocks: ['reactor_pwr'] }),
  N({ id: 'r_uprate', name: 'Power Uprate Program', category: 'reactor', tier: 3, cost: 2_600, money: 350_000, requires: ['r_fuel2', 'r_pwr'],
    description: 'Licensing and hardware upgrades. +15% reactor output.', effects: { reactorOutput: 0.15 } }),
  N({ id: 'r_bwr', name: 'Boiling Water Reactors', category: 'reactor', tier: 3, cost: 3_200, money: 600_000, requires: ['r_pwr'], level: 9,
    description: 'Unlocks the Boiling Water Reactor.', unlocks: ['reactor_bwr'] }),
  N({ id: 'r_mox', name: 'Mixed-Oxide Recycling', category: 'reactor', tier: 4, cost: 14_000, money: 4_000_000, requires: ['r_uprate'],
    description: 'Recycle spent fuel. −25% fuel use.', effects: { fuelUse: -0.25 } }),

  // ── Cooling ──────────────────────────────────────────────────────────
  N({ id: 'c_fans', name: 'High-Efficiency Fans', category: 'cooling', tier: 1, cost: 35, money: 1_500, requires: [],
    description: '+15% cooling capacity.', effects: { cooling: 0.15 } }),
  N({ id: 'c_dry', name: 'Dry Cooling', category: 'cooling', tier: 2, cost: 380, money: 25_000, requires: ['c_fans'],
    description: 'Unlocks the Air-Cooled Condenser, which needs no water.', unlocks: ['cooling_dry'] }),
  N({ id: 'w_recycle', name: 'Blowdown Recycling', category: 'cooling', tier: 3, cost: 1_200, money: 110_000, requires: ['c_tower'],
    description: 'Reuse cooling-tower blowdown. −25% evaporation losses, −25% demineralised water use.', effects: { evaporation: -0.25, treatedUse: -0.25 } }),
  N({ id: 'c_tower', name: 'Natural Draft Towers', category: 'cooling', tier: 2, cost: 300, money: 20_000, requires: ['c_fans'], level: 4,
    description: 'Unlocks the Natural Draft Cooling Tower.', unlocks: ['cooling_tower'] }),
  N({ id: 'c_fill', name: 'Advanced Fill Media', category: 'cooling', tier: 3, cost: 1_400, money: 150_000, requires: ['c_tower'],
    description: 'Better heat exchange surfaces. +20% cooling capacity.', effects: { cooling: 0.2 } }),
  N({ id: 'c_hybrid', name: 'Hybrid Wet/Dry Cooling', category: 'cooling', tier: 4, cost: 12_000, money: 3_000_000, requires: ['c_fill'],
    description: '+30% cooling capacity.', effects: { cooling: 0.3 } }),

  // ── Turbine ──────────────────────────────────────────────────────────
  N({ id: 't_blades', name: 'Optimised Turbine Blades', category: 'turbine', tier: 1, cost: 55, money: 3_000, requires: [],
    description: '+2 points steam-cycle efficiency.', effects: { thermalEff: 0.02 } }),
  N({ id: 't_reheat', name: 'Moisture Separator Reheaters', category: 'turbine', tier: 2, cost: 420, money: 30_000, requires: ['t_blades'],
    description: '+2 points efficiency, +15% turbine steam capacity.', effects: { thermalEff: 0.02, steamCap: 0.15 } }),
  N({ id: 't_large', name: 'Large Turbine Sets', category: 'turbine', tier: 3, cost: 900, money: 90_000, requires: ['t_reheat'], level: 6,
    description: 'Unlocks the Turbine Hall Mk II.', unlocks: ['turbine_large'] }),
  N({ id: 't_super', name: 'Supercritical Steam Cycle', category: 'turbine', tier: 4, cost: 16_000, money: 5_000_000, requires: ['t_large', 'm_composite'],
    description: '+4 points efficiency, +20% steam capacity.', effects: { thermalEff: 0.04, steamCap: 0.2 } }),

  // ── Automation ───────────────────────────────────────────────────────
  N({ id: 'a_fuel', name: 'Fuel Logistics', category: 'automation', tier: 1, cost: 60, money: 3_000, requires: [],
    description: 'Unlocks automatic fuel purchasing when stock drops below 30%.', automation: 'autoFuel' }),
  N({ id: 'a_monitor', name: 'Plant Monitoring Network', category: 'automation', tier: 2, cost: 350, money: 25_000, requires: ['a_fuel'],
    description: 'Unlocks automatic reactor restart after a SCRAM, once safe. +5% research.', automation: 'autoRestart', effects: { research: 0.05 } }),
  N({ id: 'a_maint', name: 'Predictive Maintenance', category: 'automation', tier: 2, cost: 500, money: 40_000, requires: ['a_fuel', 'm_alloys'],
    description: 'Unlocks automatic repairs on sites with a Maintenance Workshop.', automation: 'autoRepair' }),
  N({ id: 'a_load', name: 'Digital Load Following', category: 'automation', tier: 3, cost: 1_200, money: 120_000, requires: ['a_monitor'],
    description: 'Unlocks automatic reactor power matching to demand, saving fuel and wear.', automation: 'loadFollow' }),
  N({ id: 'a_storage', name: 'Storage Dispatch AI', category: 'automation', tier: 3, cost: 1_800, money: 180_000, requires: ['a_load', 'd_battery'],
    description: 'Unlocks smart battery dispatch: charge off-peak, sell at peak prices.', automation: 'smartStorage' }),
  N({ id: 'a_remote', name: 'Remote Operations Centre', category: 'automation', tier: 3, cost: 2_400, money: 250_000, requires: ['a_monitor'],
    description: '+4 h offline earnings cap, +15% offline efficiency.', effects: { offlineHours: 4, offlineEff: 0.15 } }),
  N({ id: 'a_ai', name: 'Plant Optimisation AI', category: 'automation', tier: 4, cost: 20_000, money: 8_000_000, requires: ['a_storage', 'a_remote'],
    description: '+5% output, −10% upkeep, +4 h offline cap, +15% offline efficiency.',
    effects: { reactorOutput: 0.05, upkeep: -0.1, offlineHours: 4, offlineEff: 0.15 } }),

  // ── Materials ────────────────────────────────────────────────────────
  N({ id: 'm_alloys', name: 'Nickel Superalloys', category: 'materials', tier: 1, cost: 120, money: 8_000, requires: [],
    description: '−15% equipment wear.', effects: { wear: -0.15 } }),
  N({ id: 'm_concrete', name: 'High-Performance Concrete', category: 'materials', tier: 2, cost: 450, money: 35_000, requires: ['m_alloys'],
    description: '−10% construction cost, +25% construction speed.', effects: { buildCost: -0.1, buildSpeed: 0.25 } }),
  N({ id: 'm_cladding', name: 'Accident-Tolerant Cladding', category: 'materials', tier: 3, cost: 1_900, money: 220_000, requires: ['m_concrete', 's_passive'],
    description: '+10 safety, +5% temperature margin, defective rods are 50% less likely to fail.', effects: { safety: 10, tripMargin: 0.05, defectHazard: -0.5 } }),
  N({ id: 'm_composite', name: 'Ceramic Composites', category: 'materials', tier: 4, cost: 9_000, money: 1_500_000, requires: ['m_cladding'],
    description: '−25% wear, −10% construction cost.', effects: { wear: -0.25, buildCost: -0.1 } }),

  // ── Safety ───────────────────────────────────────────────────────────
  N({ id: 's_setback', name: 'Automatic Power Setback', category: 'safety', tier: 1, cost: 50, money: 2_500, requires: [],
    description: 'Reactors automatically reduce power when temperature nears the trip limit, avoiding many SCRAMs.', autoSetback: true }),
  N({ id: 's_egen', name: 'Emergency Power Systems', category: 'safety', tier: 2, cost: 220, money: 12_000, requires: ['s_setback'],
    description: 'Unlocks the Emergency Generator Facility: backup power for pumps and emergency core cooling during a blackout.', unlocks: ['generator_emergency'] }),
  N({ id: 's_passive', name: 'Passive Safety Systems', category: 'safety', tier: 2, cost: 700, money: 60_000, requires: ['s_setback'],
    description: '+15 safety, +5% temperature margin, and passive decay-heat removal (natural circulation, +4% of rated heat) that works without pumps or power.', effects: { safety: 15, tripMargin: 0.05, passiveCooling: 0.04 } }),
  N({ id: 's_culture', name: 'Safety Culture Program', category: 'safety', tier: 3, cost: 2_200, money: 300_000, requires: ['s_passive'],
    description: '+15 safety rating, −10% wear.', effects: { safety: 15, wear: -0.1 } }),

  // ── Distribution ─────────────────────────────────────────────────────
  N({ id: 'd_hv', name: 'High-Voltage Lines', category: 'distribution', tier: 1, cost: 45, money: 2_000, requires: [],
    description: '+20% grid capacity, −2 points transmission loss.', effects: { grid: 0.2, transmissionLoss: -0.02 } }),
  N({ id: 'd_battery', name: 'Grid-Scale Batteries', category: 'distribution', tier: 2, cost: 200, money: 10_000, requires: ['d_hv'],
    description: 'Unlocks the Battery Storage Facility.', unlocks: ['battery'] }),
  N({ id: 'd_trading', name: 'Energy Trading Desk', category: 'distribution', tier: 2, cost: 600, money: 50_000, requires: ['d_hv'],
    description: '+1 contract slot, +5% electricity price.', effects: { contractSlots: 1, price: 0.05 } }),
  N({ id: 'd_smart', name: 'Smart Grid', category: 'distribution', tier: 3, cost: 1_600, money: 180_000, requires: ['d_trading', 'd_battery'],
    description: '+10% electricity price, +25% storage capacity.', effects: { price: 0.1, storage: 0.25 } }),
  N({ id: 'd_hvdc', name: 'HVDC Interconnects', category: 'distribution', tier: 4, cost: 7_000, money: 1_200_000, requires: ['d_smart'],
    description: '+40% grid capacity, −2 points transmission loss, +15% demand.', effects: { grid: 0.4, transmissionLoss: -0.02, demand: 0.15 } }),
  N({ id: 'd_global', name: 'Global Energy Contracts', category: 'distribution', tier: 5, cost: 30_000, money: 20_000_000, requires: ['d_hvdc'], level: 18,
    description: '+1 contract slot and access to huge, premium global contracts.', effects: { contractSlots: 1 } }),

  // ── Fuel cycle & mining ──────────────────────────────────────────────
  N({ id: 'f_mining', name: 'Uranium Mining', category: 'fuel', tier: 1, cost: 120, money: 8_000, requires: [], level: 3,
    description: 'Unlocks the Open-Pit Uranium Mine and the Ore Mill.', unlocks: ['uranium_mine', 'ore_mill'] }),
  N({ id: 'f_outage', name: 'Outage Planning', category: 'fuel', tier: 1, cost: 160, money: 10_000, requires: [],
    description: 'Unlocks automatic refuelling outages. Refuelling is 40% faster.', automation: 'autoRefuel', effects: { refuelSpeed: 0.4 } }),
  N({ id: 'f_enrich', name: 'Enrichment & Fabrication', category: 'fuel', tier: 2, cost: 500, money: 40_000, requires: ['f_mining'], level: 5,
    description: 'Unlocks the Conversion & Enrichment Plant and the Fuel Fabrication Plant: make your own fuel assemblies.', unlocks: ['enrichment', 'fuel_fab'] }),
  N({ id: 'f_heavy', name: 'Heavy Mining Equipment', category: 'fuel', tier: 2, cost: 700, money: 60_000, requires: ['f_mining'], level: 7,
    description: 'Unlocks mining shovels, rope shovels, rigid and ultra-class haul trucks. +10% mining output.', effects: { mining: 0.1 } }),
  N({ id: 'f_qa', name: 'Fuel Quality Assurance', category: 'fuel', tier: 3, cost: 900, money: 90_000, requires: ['f_enrich'],
    description: 'Unlocks the Fuel Inspection Lab. −30% fabrication defects.', unlocks: ['fuel_qa'], effects: { defectRate: -0.3 } }),
  N({ id: 'f_auto', name: 'Automated Fuel Lines', category: 'fuel', tier: 3, cost: 1_800, money: 200_000, requires: ['f_enrich'],
    description: '+30% throughput for mills, enrichment and fabrication.', effects: { processing: 0.3 } }),
  N({ id: 'f_laser', name: 'Laser Enrichment', category: 'fuel', tier: 4, cost: 8_000, money: 1_500_000, requires: ['f_auto'],
    description: '+50% processing throughput, −20% fabrication defects.', effects: { processing: 0.5, defectRate: -0.2 } }),
  N({ id: 'f_bucket', name: 'Bucket-Wheel Excavators', category: 'fuel', tier: 4, cost: 9_000, money: 2_000_000, requires: ['f_heavy'], level: 14,
    description: 'Unlocks the colossal bucket-wheel excavator. +15% mining output.', effects: { mining: 0.15 } }),

  // ── Advanced concepts ────────────────────────────────────────────────
  N({ id: 'x_gen4', name: 'Generation IV Studies', category: 'advanced', tier: 4, cost: 10_000, money: 2_500_000, requires: ['r_bwr', 'm_cladding'], level: 13,
    description: 'Foundations for advanced reactors. +5% output, +10% research.', effects: { reactorOutput: 0.05, research: 0.1 } }),
  N({ id: 'x_msr', name: 'Molten Salt Reactors', category: 'advanced', tier: 5, cost: 24_000, money: 8_000_000, requires: ['x_gen4', 'm_composite'], level: 15,
    description: 'Unlocks the Molten Salt Reactor.', unlocks: ['reactor_msr'] }),
  N({ id: 'x_plasma', name: 'Plasma Confinement Physics', category: 'advanced', tier: 6, cost: 90_000, money: 40_000_000, requires: ['x_msr', 'c_hybrid'], level: 19,
    description: 'Superconducting magnets and plasma heating. +20% research.', effects: { research: 0.2 } }),
  N({ id: 'x_fusion', name: 'Fusion Power Demonstration', category: 'advanced', tier: 7, cost: 260_000, money: 150_000_000, requires: ['x_plasma', 't_super'], level: 21,
    description: 'Unlocks the Fusion Demonstration Plant.', unlocks: ['reactor_fusion'] }),
];

export const RESEARCH_BY_ID: Record<string, ResearchNode> = Object.fromEntries(RESEARCH.map((r) => [r.id, r]));

/** Building types that need no research. */
export function isUnlockedByResearch(type: BuildingType, completed: string[]): boolean {
  const node = RESEARCH.find((r) => r.unlocks?.includes(type));
  return !node || completed.includes(node.id);
}
