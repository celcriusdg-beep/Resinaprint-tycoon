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
  N({ id: 'r_gen3', name: 'Generation III+ Reactors', category: 'reactor', tier: 4, cost: 9_000, money: 3_500_000, requires: ['r_bwr'], level: 12,
    description: 'Unlocks the Gigawatt Reactor: a 4.5 GW-thermal PWR with double containment.', unlocks: ['reactor_epr'] }),
  N({ id: 'r_smr_park', name: 'Modular Power Parks', category: 'reactor', tier: 3, cost: 2_400, money: 400_000, requires: ['r_smr', 'r_pwr'], level: 9,
    description: 'Unlocks the SMR Power Park: six modules in one 3×3 plot.', unlocks: ['reactor_smr_park'] }),
  N({ id: 'r_isotopes', name: 'Medical Isotopes', category: 'reactor', tier: 3, cost: 2_000, money: 250_000, requires: ['r_pwr'], level: 8,
    description: 'Unlocks the Medical Isotope Facility: earn money from neutron flux.', unlocks: ['isotopes'] }),
  N({ id: 'r_mox', name: 'Mixed-Oxide Recycling', category: 'reactor', tier: 4, cost: 14_000, money: 4_000_000, requires: ['r_uprate'],
    description: 'Recycle spent fuel. −25% fuel use.', effects: { fuelUse: -0.25 } }),

  // ── Cooling ──────────────────────────────────────────────────────────
  N({ id: 'c_fans', name: 'High-Efficiency Fans', category: 'cooling', tier: 1, cost: 35, money: 1_500, requires: [],
    description: '+15% cooling capacity.', effects: { cooling: 0.15 } }),
  N({ id: 'c_dry', name: 'Dry Cooling', category: 'cooling', tier: 2, cost: 380, money: 25_000, requires: ['c_fans'],
    description: 'Unlocks the Air-Cooled Condenser and Hybrid Wet/Dry Cells, which save water.', unlocks: ['cooling_dry', 'cooling_hybrid'] }),
  N({ id: 'w_recycle', name: 'Blowdown Recycling', category: 'cooling', tier: 3, cost: 1_200, money: 110_000, requires: ['c_tower'],
    description: 'Reuse cooling-tower blowdown. −25% evaporation losses, −25% demineralised water use.', effects: { evaporation: -0.25, treatedUse: -0.25 } }),
  N({ id: 'c_tower', name: 'Natural Draft Towers', category: 'cooling', tier: 2, cost: 300, money: 20_000, requires: ['c_fans'], level: 4,
    description: 'Unlocks the Natural Draft Cooling Tower.', unlocks: ['cooling_tower'] }),
  N({ id: 'c_mega', name: 'Mega Cooling Towers', category: 'cooling', tier: 4, cost: 6_000, money: 1_500_000, requires: ['c_tower'], level: 11,
    description: 'Unlocks the 200 m Mega Hyperboloid Tower.', unlocks: ['cooling_mega'] }),
  N({ id: 'w_ro', name: 'Reverse Osmosis', category: 'cooling', tier: 2, cost: 600, money: 50_000, requires: ['c_fans'], level: 5,
    description: 'Unlocks the Reverse-Osmosis Water Plant: water anywhere, for electricity.', unlocks: ['desal'] }),
  N({ id: 'c_fill', name: 'Advanced Fill Media', category: 'cooling', tier: 3, cost: 1_400, money: 150_000, requires: ['c_tower'],
    description: 'Better heat exchange surfaces. +20% cooling capacity. Unlocks the Fan-Assisted Draft Tower.', effects: { cooling: 0.2 }, unlocks: ['cooling_fanassist'] }),
  N({ id: 'c_seawater', name: 'Once-Through Cooling', category: 'cooling', tier: 4, cost: 8_000, money: 2_000_000, requires: ['c_fill'], level: 14,
    description: 'Unlocks the Once-Through Cooling Station: huge capacity, no evaporation, needs a river or sea.', unlocks: ['cooling_seawater'] }),
  N({ id: 'c_sky', name: 'Radiative Sky Cooling', category: 'cooling', tier: 5, cost: 40_000, money: 12_000_000, requires: ['c_hybrid', 'm_composite'], level: 18,
    description: 'Unlocks the Radiative Sky-Cooling Array: water-free cooling anywhere.', unlocks: ['cooling_sky'] }),
  N({ id: 'c_hybrid', name: 'Hybrid Wet/Dry Cooling', category: 'cooling', tier: 4, cost: 12_000, money: 3_000_000, requires: ['c_fill'],
    description: '+30% cooling capacity.', effects: { cooling: 0.3 } }),

  // ── Turbine ──────────────────────────────────────────────────────────
  N({ id: 't_blades', name: 'Optimised Turbine Blades', category: 'turbine', tier: 1, cost: 55, money: 3_000, requires: [],
    description: '+2 points steam-cycle efficiency.', effects: { thermalEff: 0.02 } }),
  N({ id: 't_reheat', name: 'Moisture Separator Reheaters', category: 'turbine', tier: 2, cost: 420, money: 30_000, requires: ['t_blades'],
    description: 'Unlocks the Medium Turbine Hall. +2 points efficiency, +15% turbine steam capacity.', effects: { thermalEff: 0.02, steamCap: 0.15 }, unlocks: ['turbine_medium'] }),
  N({ id: 't_large', name: 'Large Turbine Sets', category: 'turbine', tier: 3, cost: 900, money: 90_000, requires: ['t_reheat'], level: 6,
    description: 'Unlocks the Turbine Hall Mk II.', unlocks: ['turbine_large'] }),
  N({ id: 't_super', name: 'Supercritical Steam Cycle', category: 'turbine', tier: 4, cost: 16_000, money: 5_000_000, requires: ['t_large', 'm_composite'],
    description: 'Unlocks the Supercritical Turbine Island. +4 points efficiency, +20% steam capacity.', effects: { thermalEff: 0.04, steamCap: 0.2 }, unlocks: ['turbine_super'] }),
  N({ id: 't_sco2', name: 'Supercritical CO₂ Cycle', category: 'turbine', tier: 5, cost: 30_000, money: 9_000_000, requires: ['t_super'], level: 16,
    description: 'Unlocks the compact sCO₂ Brayton Turbine (+7 points efficiency on its steam).', unlocks: ['turbine_sco2'] }),
  N({ id: 't_mhd', name: 'Magnetohydrodynamic Generation', category: 'turbine', tier: 6, cost: 80_000, money: 30_000_000, requires: ['t_sco2', 'x_plasma'], level: 20,
    description: 'Unlocks the MHD Topping Generator (+10 points efficiency on its steam).', unlocks: ['turbine_mhd'] }),

  // ── Automation ───────────────────────────────────────────────────────
  N({ id: 'a_fuel', name: 'Fuel Logistics', category: 'automation', tier: 1, cost: 60, money: 3_000, requires: [],
    description: 'Unlocks automatic fuel purchasing when stock drops below 30%.', automation: 'autoFuel' }),
  N({ id: 'a_monitor', name: 'Plant Monitoring Network', category: 'automation', tier: 2, cost: 350, money: 25_000, requires: ['a_fuel'],
    description: 'Unlocks automatic reactor restart after a SCRAM, once safe. +5% research.', automation: 'autoRestart', effects: { research: 0.05 } }),
  N({ id: 'a_maint', name: 'Predictive Maintenance', category: 'automation', tier: 2, cost: 500, money: 40_000, requires: ['a_fuel', 'm_alloys'],
    description: 'Unlocks automatic repairs on sites with a Maintenance Workshop, and the Robotic Maintenance Hub.', automation: 'autoRepair', unlocks: ['robotics_depot'] }),
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
    description: 'Unlocks the Emergency Generator Facility and the Gas-Turbine Backup Plant: backup power for pumps and emergency core cooling during a blackout.', unlocks: ['generator_emergency', 'backup_gt'] }),
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
    description: '+10% electricity price, +25% storage capacity. Unlocks Molten-Salt Thermal Storage.', effects: { price: 0.1, storage: 0.25 }, unlocks: ['storage_thermal'] }),
  N({ id: 'd_pumped', name: 'Pumped-Storage Hydro', category: 'distribution', tier: 4, cost: 7_000, money: 2_000_000, requires: ['d_smart'], level: 13,
    description: 'Unlocks Pumped-Storage Hydro: gigawatt-hours of storage.', unlocks: ['storage_pumped'] }),
  N({ id: 'd_sc', name: 'Superconducting Transmission', category: 'distribution', tier: 6, cost: 60_000, money: 25_000_000, requires: ['d_global', 'm_composite'], level: 19,
    description: 'Unlocks the Superconducting Grid Link: 8 GW of export per station.', unlocks: ['grid_sc'] }),
  N({ id: 'd_hvdc', name: 'HVDC Interconnects', category: 'distribution', tier: 4, cost: 7_000, money: 1_200_000, requires: ['d_smart'],
    description: 'Unlocks the HVDC Converter Station. +40% grid capacity, −2 points transmission loss, +15% demand.', effects: { grid: 0.4, transmissionLoss: -0.02, demand: 0.15 }, unlocks: ['hvdc'] }),
  N({ id: 'i_datacenter', name: 'Industrial Customers', category: 'distribution', tier: 3, cost: 2_500, money: 300_000, requires: ['d_hv'], level: 8,
    description: 'Unlocks the Hyperscale Data Centre, an on-site customer paying a premium.', unlocks: ['datacenter'] }),
  N({ id: 'i_hydrogen', name: 'Power-to-Hydrogen', category: 'distribution', tier: 4, cost: 5_000, money: 900_000, requires: ['i_datacenter'], level: 10,
    description: 'Unlocks the Hydrogen Electrolysis Plant: turn unsellable power into money.', unlocks: ['hydrogen'] }),
  N({ id: 'd_global', name: 'Global Energy Contracts', category: 'distribution', tier: 5, cost: 30_000, money: 20_000_000, requires: ['d_hvdc'], level: 18,
    description: '+1 contract slot and access to huge, premium global contracts.', effects: { contractSlots: 1 } }),

  // ── Fuel cycle & mining ──────────────────────────────────────────────
  N({ id: 'f_mining', name: 'Uranium Mining', category: 'fuel', tier: 1, cost: 120, money: 8_000, requires: [], level: 3,
    description: 'Unlocks the Open-Pit Uranium Mine and the Ore Mill.', unlocks: ['uranium_mine', 'ore_mill'] }),
  N({ id: 'f_outage', name: 'Outage Planning', category: 'fuel', tier: 1, cost: 160, money: 10_000, requires: [],
    description: 'Unlocks automatic refuelling outages. Refuelling is 40% faster.', automation: 'autoRefuel', effects: { refuelSpeed: 0.4 } }),
  N({ id: 'f_enrich', name: 'Enrichment & Fabrication', category: 'fuel', tier: 2, cost: 500, money: 40_000, requires: ['f_mining'], level: 5,
    description: 'Unlocks the Conversion & Enrichment Plant and the Fuel Fabrication Plant: make your own fuel assemblies.', unlocks: ['enrichment', 'fuel_fab'] }),
  N({ id: 'f_rail', name: 'Rail Logistics', category: 'fuel', tier: 2, cost: 600, money: 60_000, requires: ['f_mining'], level: 6,
    description: 'Unlocks the Rail Fuel Terminal: +50% daily market fuel and more storage.', unlocks: ['rail_terminal'] }),
  N({ id: 'f_heavy', name: 'Heavy Mining Equipment', category: 'fuel', tier: 2, cost: 700, money: 60_000, requires: ['f_mining'], level: 7,
    description: 'Unlocks mining shovels, rope shovels, rigid and ultra-class haul trucks, and the Underground Uranium Mine. +10% mining output.', effects: { mining: 0.1 }, unlocks: ['mine_underground'] }),
  N({ id: 'f_isr', name: 'In-Situ Recovery', category: 'fuel', tier: 4, cost: 7_000, money: 1_500_000, requires: ['f_heavy', 'f_auto'], level: 12,
    description: 'Unlocks the ISR Wellfield, which makes yellowcake directly without digging or milling.', unlocks: ['mine_isr'] }),
  N({ id: 'f_vault', name: 'Deep Geological Storage', category: 'fuel', tier: 4, cost: 6_000, money: 1_500_000, requires: ['f_outage', 'f_auto'], level: 12,
    description: 'Unlocks the Underground Spent-Fuel Vault.', unlocks: ['spent_vault'] }),
  N({ id: 'f_qa', name: 'Fuel Quality Assurance', category: 'fuel', tier: 3, cost: 900, money: 90_000, requires: ['f_enrich'],
    description: 'Unlocks the Fuel Inspection Lab. −30% fabrication defects.', unlocks: ['fuel_qa'], effects: { defectRate: -0.3 } }),
  N({ id: 'f_auto', name: 'Automated Fuel Lines', category: 'fuel', tier: 3, cost: 1_800, money: 200_000, requires: ['f_enrich'],
    description: '+30% throughput for mills, enrichment and fabrication. Unlocks the large mill, centrifuge hall, robotic fabrication, automated inspection and the fuel vault.', effects: { processing: 0.3 }, unlocks: ['mill_large', 'enrich_centrifuge', 'fab_auto', 'qa_auto', 'fuel_vault'] }),
  N({ id: 'f_laser', name: 'Laser Enrichment', category: 'fuel', tier: 4, cost: 8_000, money: 1_500_000, requires: ['f_auto'],
    description: 'Unlocks the Laser Enrichment Facility. +50% processing throughput, −20% fabrication defects.', effects: { processing: 0.5, defectRate: -0.2 }, unlocks: ['enrich_laser'] }),
  N({ id: 'f_bucket', name: 'Bucket-Wheel Excavators', category: 'fuel', tier: 4, cost: 9_000, money: 2_000_000, requires: ['f_heavy'], level: 14,
    description: 'Unlocks the colossal bucket-wheel excavator. +15% mining output.', effects: { mining: 0.15 } }),

  // ── Advanced concepts ────────────────────────────────────────────────
  N({ id: 'x_gen4', name: 'Generation IV Studies', category: 'advanced', tier: 4, cost: 10_000, money: 2_500_000, requires: ['r_bwr', 'm_cladding'], level: 13,
    description: 'Foundations for advanced reactors. +5% output, +10% research.', effects: { reactorOutput: 0.05, research: 0.1 } }),
  N({ id: 'x_msr', name: 'Molten Salt Reactors', category: 'advanced', tier: 5, cost: 24_000, money: 8_000_000, requires: ['x_gen4', 'm_composite'], level: 15,
    description: 'Unlocks the Molten Salt Reactor.', unlocks: ['reactor_msr'] }),
  N({ id: 'x_sfr', name: 'Sodium Fast Reactors', category: 'advanced', tier: 5, cost: 16_000, money: 5_000_000, requires: ['x_gen4'], level: 14,
    description: 'Unlocks the Sodium-Cooled Fast Reactor, which breeds most of its own fuel.', unlocks: ['reactor_sfr'] }),
  N({ id: 'x_plasma', name: 'Plasma Confinement Physics', category: 'advanced', tier: 6, cost: 90_000, money: 40_000_000, requires: ['x_msr', 'c_hybrid'], level: 19,
    description: 'Superconducting magnets and plasma heating. +20% research.', effects: { research: 0.2 } }),
  N({ id: 'x_fusion', name: 'Fusion Power Demonstration', category: 'advanced', tier: 7, cost: 260_000, money: 150_000_000, requires: ['x_plasma', 't_super'], level: 21,
    description: 'Unlocks the Fusion Demonstration Plant.', unlocks: ['reactor_fusion'] }),
  // ── T5 Cutting-edge / T6 Legendary ───────────────────────────────────
  N({ id: 'x_stellarator', name: 'Stellarator Fusion', category: 'advanced', tier: 8, cost: 450_000, money: 400_000_000, requires: ['x_fusion'], level: 23,
    description: 'Unlocks the Stellarator Fusion Plant.', unlocks: ['reactor_stellarator'] }),
  N({ id: 'x_citadel', name: 'Inertial Laser Fusion', category: 'advanced', tier: 9, cost: 1_800_000, money: 1_500_000_000, requires: ['x_stellarator', 't_collector'], level: 28,
    description: 'Unlocks the Laser Fusion Citadel.', unlocks: ['reactor_citadel'] }),
  N({ id: 't_brayton', name: 'Helium Brayton Cycle', category: 'turbine', tier: 7, cost: 300_000, money: 90_000_000, requires: ['t_mhd'], level: 23,
    description: 'Unlocks the Helium Brayton Megaturbine.', unlocks: ['turbine_brayton'] }),
  N({ id: 't_collector', name: 'Direct Energy Conversion', category: 'turbine', tier: 8, cost: 1_200_000, money: 400_000_000, requires: ['t_brayton', 'x_stellarator'], level: 28,
    description: 'Unlocks the Direct-Conversion Plasma Collector.', unlocks: ['turbine_collector'] }),
  N({ id: 'c_vortex', name: 'Atmospheric Vortex Engines', category: 'cooling', tier: 6, cost: 300_000, money: 30_000_000, requires: ['c_sky', 'c_seawater'], level: 23,
    description: 'Unlocks the Atmospheric Vortex Tower.', unlocks: ['cooling_vortex'] }),
  N({ id: 'c_spire', name: 'Stratospheric Heat Pipes', category: 'cooling', tier: 7, cost: 1_200_000, money: 150_000_000, requires: ['c_vortex'], level: 28,
    description: 'Unlocks the Stratospheric Heat Spire.', unlocks: ['cooling_spire'] }),
  N({ id: 'd_gravity', name: 'Gravity Energy Storage', category: 'distribution', tier: 7, cost: 200_000, money: 30_000_000, requires: ['d_pumped'], level: 22,
    description: 'Unlocks the Gravity Storage Tower.', unlocks: ['storage_gravity'] }),
  N({ id: 'd_smes', name: 'Superconducting Magnetic Storage', category: 'distribution', tier: 8, cost: 900_000, money: 200_000_000, requires: ['d_gravity', 'd_sc'], level: 27,
    description: 'Unlocks the Superconducting Magnetic Ring.', unlocks: ['storage_smes'] }),
  N({ id: 'd_mega', name: 'Superconducting Megastations', category: 'distribution', tier: 7, cost: 300_000, money: 100_000_000, requires: ['d_sc'], level: 23,
    description: 'Unlocks the Superconducting Megastation.', unlocks: ['grid_mega'] }),
  N({ id: 'd_beacon', name: 'Wireless Power Transmission', category: 'distribution', tier: 8, cost: 1_200_000, money: 500_000_000, requires: ['d_mega'], level: 28,
    description: 'Unlocks the Wireless Power Beacon.', unlocks: ['grid_beacon'] }),
  N({ id: 'w_graphene', name: 'Graphene Membranes', category: 'cooling', tier: 6, cost: 120_000, money: 5_000_000, requires: ['w_ro'], level: 22,
    description: 'Unlocks the Graphene Desalination Array.', unlocks: ['water_graphene'] }),
  N({ id: 'w_harvester', name: 'Atmospheric Water Harvesting', category: 'cooling', tier: 7, cost: 600_000, money: 25_000_000, requires: ['w_graphene'], level: 27,
    description: 'Unlocks the Atmospheric Water Harvester.', unlocks: ['water_harvester'] }),
  N({ id: 'w_sieve', name: 'Molecular Sieves', category: 'cooling', tier: 6, cost: 100_000, money: 3_000_000, requires: ['w_ro'], level: 22,
    description: 'Unlocks the Molecular Sieve Plant.', unlocks: ['treatment_sieve'] }),
  N({ id: 'w_cathedral', name: 'Ultra-Pure Water', category: 'cooling', tier: 7, cost: 500_000, money: 20_000_000, requires: ['w_sieve'], level: 27,
    description: 'Unlocks the Ultra-Pure Water Cathedral.', unlocks: ['treatment_cathedral'] }),
  N({ id: 'w_cistern', name: 'Cavern Water Storage', category: 'cooling', tier: 6, cost: 80_000, money: 2_000_000, requires: ['w_ro'], level: 22,
    description: 'Unlocks the Cavern Cistern.', unlocks: ['water_cistern'] }),
  N({ id: 'w_hanging', name: 'Elevated Mega-Reservoirs', category: 'cooling', tier: 7, cost: 400_000, money: 10_000_000, requires: ['w_cistern'], level: 27,
    description: 'Unlocks the Hanging Reservoir.', unlocks: ['water_hanging'] }),
  N({ id: 'f_silo', name: 'Maglev Fuel Handling', category: 'fuel', tier: 5, cost: 150_000, money: 10_000_000, requires: ['f_laser'], level: 22,
    description: 'Unlocks the Maglev Fuel Silo.', unlocks: ['fuel_silo'] }),
  N({ id: 'f_citadel', name: 'Fuel Citadels', category: 'fuel', tier: 6, cost: 600_000, money: 50_000_000, requires: ['f_silo'], level: 27,
    description: 'Unlocks the Fuel Citadel.', unlocks: ['fuel_citadel'] }),
  N({ id: 'f_borehole', name: 'Deep Borehole Disposal', category: 'fuel', tier: 5, cost: 200_000, money: 40_000_000, requires: ['f_vault'], level: 22,
    description: 'Unlocks the Deep Borehole Disposal.', unlocks: ['spent_borehole'] }),
  N({ id: 'f_transmute', name: 'Waste Transmutation', category: 'fuel', tier: 6, cost: 900_000, money: 250_000_000, requires: ['f_borehole'], level: 28,
    description: 'Unlocks the Transmutation Accelerator.', unlocks: ['spent_transmute'] }),
  N({ id: 'f_bore', name: 'Robotic Boring', category: 'fuel', tier: 5, cost: 250_000, money: 80_000_000, requires: ['f_isr'], level: 22,
    description: 'Unlocks the Robotic Deep Bore.', unlocks: ['mine_bore'] }),
  N({ id: 'f_seawater', name: 'Uranium from Seawater', category: 'fuel', tier: 6, cost: 900_000, money: 400_000_000, requires: ['f_bore'], level: 27,
    description: 'Unlocks the Seawater Uranium Extractor.', unlocks: ['mine_seawater'] }),
  N({ id: 'f_plasma_mill', name: 'Plasma Mass Separation', category: 'fuel', tier: 5, cost: 150_000, money: 10_000_000, requires: ['f_laser'], level: 22,
    description: 'Unlocks the Plasma Ore Separator.', unlocks: ['mill_plasma'] }),
  N({ id: 'f_molecular', name: 'Molecular Assemblers', category: 'fuel', tier: 6, cost: 600_000, money: 50_000_000, requires: ['f_plasma_mill'], level: 27,
    description: 'Unlocks the Molecular Assembler Mill.', unlocks: ['mill_molecular'] }),
  N({ id: 'f_ring', name: 'Electromagnetic Separation', category: 'fuel', tier: 5, cost: 250_000, money: 60_000_000, requires: ['f_laser'], level: 22,
    description: 'Unlocks the Isotope Separator Ring.', unlocks: ['enrich_ring'] }),
  N({ id: 'f_quantum', name: 'Quantum Isotope Sorting', category: 'fuel', tier: 6, cost: 900_000, money: 300_000_000, requires: ['f_ring'], level: 27,
    description: 'Unlocks the Quantum Isotope Sorter.', unlocks: ['enrich_quantum'] }),
  N({ id: 'f_printer', name: 'Additive Fuel Manufacturing', category: 'fuel', tier: 5, cost: 150_000, money: 20_000_000, requires: ['f_laser'], level: 22,
    description: 'Unlocks the Additive Fuel Printer.', unlocks: ['fab_printer'] }),
  N({ id: 'f_foundry', name: 'Autonomous Foundries', category: 'fuel', tier: 6, cost: 600_000, money: 100_000_000, requires: ['f_printer'], level: 27,
    description: 'Unlocks the Autonomous Fuel Foundry.', unlocks: ['fab_foundry'] }),
  N({ id: 'f_muon', name: 'Muon Tomography', category: 'fuel', tier: 5, cost: 100_000, money: 10_000_000, requires: ['f_qa', 'f_laser'], level: 22,
    description: 'Unlocks the Muon Tomography Scanner.', unlocks: ['qa_muon'] }),
  N({ id: 'f_ai', name: 'AI Fuel Inspection', category: 'fuel', tier: 6, cost: 500_000, money: 50_000_000, requires: ['f_muon'], level: 27,
    description: 'Unlocks the AI Inspection Spire.', unlocks: ['qa_spire'] }),
];

export const RESEARCH_BY_ID: Record<string, ResearchNode> = Object.fromEntries(RESEARCH.map((r) => [r.id, r]));

/** Building types that need no research. */
export function isUnlockedByResearch(type: BuildingType, completed: string[]): boolean {
  const node = RESEARCH.find((r) => r.unlocks?.includes(type));
  return !node || completed.includes(node.id);
}
