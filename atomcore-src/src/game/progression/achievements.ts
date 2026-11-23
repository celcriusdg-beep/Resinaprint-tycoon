import type { GameState, BuildingType } from '../types';
import { RESEARCH } from '../research/tree';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  reward: number; // $
  check: (s: GameState) => boolean;
}

function countType(s: GameState, types: BuildingType[], activeOnly = true): number {
  let n = 0;
  for (const site of Object.values(s.sites))
    for (const b of site.buildings)
      if (types.includes(b.type) && (!activeOnly || b.status !== 'constructing')) n++;
  return n;
}

const REACTORS: BuildingType[] = [
  'reactor_pilot', 'reactor_smr', 'reactor_pwr', 'reactor_bwr', 'reactor_msr', 'reactor_fusion',
];

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_build', name: 'Breaking Ground', description: 'Construct your first building.', reward: 1_000, check: (s) => s.stats.buildingsBuilt >= 1 },
  { id: 'first_research', name: 'Curiosity', description: 'Complete your first research project.', reward: 1_500, check: (s) => s.stats.researchDone >= 1 },
  { id: 'first_upgrade', name: 'Better Every Day', description: 'Upgrade a building.', reward: 1_000, check: (s) => s.stats.upgrades >= 1 },
  { id: 'mw_25', name: 'Lights On', description: 'Reach 25 MW of electric output.', reward: 4_000, check: (s) => s.stats.peakMW >= 25 },
  { id: 'mw_100', name: 'Town Supplier', description: 'Reach 100 MW of electric output.', reward: 20_000, check: (s) => s.stats.peakMW >= 100 },
  { id: 'mw_1000', name: 'Gigawatt Club', description: 'Reach 1 GW of electric output.', reward: 400_000, check: (s) => s.stats.peakMW >= 1_000 },
  { id: 'mw_10000', name: 'Powering Nations', description: 'Reach 10 GW of electric output.', reward: 12_000_000, check: (s) => s.stats.peakMW >= 10_000 },
  { id: 'mw_100000', name: 'Planetary Grid', description: 'Reach 100 GW of electric output.', reward: 400_000_000, check: (s) => s.stats.peakMW >= 100_000 },
  { id: 'cash_100k', name: 'Six Figures', description: 'Hold $100,000.', reward: 5_000, check: (s) => s.money >= 100_000 },
  { id: 'cash_10m', name: 'Deep Pockets', description: 'Hold $10 million.', reward: 250_000, check: (s) => s.money >= 10_000_000 },
  { id: 'cash_1b', name: 'Billionaire Utility', description: 'Hold $1 billion.', reward: 20_000_000, check: (s) => s.money >= 1_000_000_000 },
  { id: 'smr', name: 'Think Small', description: 'Build a Small Modular Reactor.', reward: 8_000, check: (s) => countType(s, ['reactor_smr']) >= 1 },
  { id: 'pwr', name: 'Commercial Scale', description: 'Build a Pressurized Water Reactor.', reward: 60_000, check: (s) => countType(s, ['reactor_pwr']) >= 1 },
  { id: 'bwr', name: 'Boiling Point', description: 'Build a Boiling Water Reactor.', reward: 250_000, check: (s) => countType(s, ['reactor_bwr']) >= 1 },
  { id: 'msr', name: 'Liquid Fuel', description: 'Build a Molten Salt Reactor.', reward: 3_000_000, check: (s) => countType(s, ['reactor_msr']) >= 1 },
  { id: 'fusion', name: 'A Star on Earth', description: 'Build a Fusion Demonstration Plant.', reward: 60_000_000, check: (s) => countType(s, ['reactor_fusion']) >= 1 },
  { id: 'reactors_5', name: 'Reactor Fleet', description: 'Operate 5 reactors.', reward: 50_000, check: (s) => countType(s, REACTORS) >= 5 },
  { id: 'reactors_15', name: 'Nuclear Armada', description: 'Operate 15 reactors.', reward: 5_000_000, check: (s) => countType(s, REACTORS) >= 15 },
  { id: 'research_10', name: 'Think Tank', description: 'Complete 10 research projects.', reward: 50_000, check: (s) => s.research.completed.length >= 10 },
  { id: 'research_all', name: 'Omniscient', description: 'Complete the entire technology tree.', reward: 100_000_000, check: (s) => s.research.completed.length >= RESEARCH.length },
  { id: 'scram', name: 'Safe Shutdown', description: 'Restart a reactor after a SCRAM.', reward: 2_000, check: (s) => s.stats.restarts >= 1 },
  { id: 'contract_1', name: 'Signed and Delivered', description: 'Complete an energy contract.', reward: 5_000, check: (s) => s.stats.contractsDone >= 1 },
  { id: 'contract_10', name: 'Trusted Supplier', description: 'Complete 10 energy contracts.', reward: 200_000, check: (s) => s.stats.contractsDone >= 10 },
  { id: 'level_10', name: 'National Utility', description: 'Reach company level 10.', reward: 100_000, check: (s) => s.level >= 10 },
  { id: 'level_20', name: 'Multinational', description: 'Reach company level 20.', reward: 20_000_000, check: (s) => s.level >= 20 },
  { id: 'site_2', name: 'Expansion', description: 'Open a second plant site.', reward: 150_000, check: (s) => s.unlockedSites.length >= 2 },
  { id: 'site_4', name: 'Empire', description: 'Operate plants at all four sites.', reward: 50_000_000, check: (s) => s.unlockedSites.length >= 4 },
  { id: 'storage', name: 'Saving for Later', description: 'Store 100 MWh in batteries at one site.', reward: 30_000, check: (s) => Object.values(s.sites).some((x) => x.storageMWh >= 100) },
  { id: 'daily_5', name: 'Routine Operations', description: 'Complete 5 daily objectives.', reward: 20_000, check: (s) => s.stats.dailiesDone >= 5 },
  { id: 'refuel', name: 'Outage Complete', description: 'Finish a refuelling outage.', reward: 3_000, check: (s) => s.stats.refuels >= 1 },
  { id: 'refuel_25', name: 'Outage Veteran', description: 'Finish 25 refuelling outages.', reward: 250_000, check: (s) => s.stats.refuels >= 25 },
  { id: 'miner', name: 'Breaking Rock', description: 'Mine uranium ore.', reward: 20_000, check: (s) => s.supply.rates.mined > 0 },
  { id: 'bucketwheel', name: 'Land Leviathan', description: 'Own a bucket-wheel excavator.', reward: 5_000_000,
    check: (s) => Object.values(s.sites).some((x) => x.buildings.some((b) => (b.vehicles?.excavators[4] ?? 0) > 0)) },
  { id: 'selfsufficient', name: 'Closed Loop', description: 'Fabricate fuel at least as fast as your reactors burn it.', reward: 2_000_000,
    check: (s) => s.supply.rates.burn > 0.05 && s.supply.rates.fabricated - s.supply.rates.rejected >= s.supply.rates.burn },
  { id: 'qa', name: 'Zero Defects', description: 'Run fabrication with a defect rate under 0.5%.', reward: 300_000, check: (s) => s.supply.rates.fabricated > 0 && s.supply.rates.defectRate < 0.005 },
  { id: 'lesson', name: 'Hard Lesson', description: 'Suffer a core damage incident. (Refuel failed rods next time!)', reward: 0, check: (s) => s.stats.coreDamage >= 1 },
  { id: 'prestige', name: 'Restructured', description: 'Perform a corporate restructuring.', reward: 0, check: (s) => s.prestige.count >= 1 },
];
