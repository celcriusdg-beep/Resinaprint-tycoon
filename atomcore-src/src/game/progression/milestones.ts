import type { GameState, BuildingType } from '../types';

// A guided sequence of goals. Only the current one is shown; completing it pays
// the reward and moves on. Doubles as the tutorial for new players.

export interface MilestoneDef {
  title: string;
  hint: string;
  reward: number;
  check: (s: GameState) => boolean;
}

function has(s: GameState, type: BuildingType, n = 1): boolean {
  let c = 0;
  for (const site of Object.values(s.sites))
    for (const b of site.buildings) if (b.type === type && b.status !== 'constructing') c++;
  return c >= n;
}

function count(s: GameState, type: BuildingType): number {
  let c = 0;
  for (const site of Object.values(s.sites)) for (const b of site.buildings) if (b.type === type) c++;
  return c;
}

function totalElectric(s: GameState): number {
  return Object.values(s.sites).reduce((a, x) => a + x.stats.exportMW, 0);
}

export const MILESTONES: MilestoneDef[] = [
  { title: 'Bring the reactor to full power', hint: 'Tap the Pilot Reactor and raise its power setpoint to 100%.', reward: 1_500,
    check: (s) => Object.values(s.sites).some((x) => x.buildings.some((b) => b.reactor && b.reactor.setpoint >= 0.99)) },
  { title: 'Build a Research Laboratory', hint: 'Open Build → Support and place a Research Lab.', reward: 2_000, check: (s) => has(s, 'lab') },
  { title: 'Start your first research', hint: 'Open Research and pick a project.', reward: 1_500, check: (s) => s.research.active !== null || s.research.completed.length > 0 },
  { title: 'Upgrade a building', hint: 'Select any building and press Upgrade.', reward: 2_500, check: (s) => s.stats.upgrades >= 1 },
  { title: 'Refuel your reactor', hint: 'When core fuel runs low, set the power to 0%, wait for it to shut down, then press Refuel.', reward: 4_000, check: (s) => s.stats.refuels >= 1 },
  { title: 'Research Modular Reactor Design', hint: 'Unlocks the Small Modular Reactor.', reward: 4_000, check: (s) => s.research.completed.includes('r_smr') },
  { title: 'Build a Small Modular Reactor', hint: 'Remember it needs turbine and cooling capacity too.', reward: 8_000, check: (s) => has(s, 'reactor_smr') },
  { title: 'Secure your own water supply', hint: 'Bigger plants evaporate more water than the town connection gives. Build a Water Intake or Wells (Build → Water).', reward: 6_000,
    check: (s) => has(s, 'water_intake') || has(s, 'water_wells') },
  { title: 'Produce 40 MW', hint: 'Balance reactor heat with turbines, cooling and grid capacity.', reward: 12_000, check: (s) => totalElectric(s) >= 40 },
  { title: 'Sign an energy contract', hint: 'Open Market and accept a contract offer.', reward: 6_000, check: (s) => s.contracts.length > 0 || s.stats.contractsDone > 0 },
  { title: 'Build a Maintenance Workshop', hint: 'Crews slow wear and repair equipment over time.', reward: 8_000, check: (s) => has(s, 'maintenance') },
  { title: 'Operate three reactors', hint: 'Grow your reactor fleet.', reward: 25_000,
    check: (s) => ['reactor_pilot', 'reactor_smr', 'reactor_pwr', 'reactor_bwr', 'reactor_msr', 'reactor_fusion', 'reactor_epr'].reduce((a, t) => a + count(s, t as BuildingType), 0) >= 3 },
  { title: 'Reach company level 6', hint: 'Sell energy to gain experience.', reward: 40_000, check: (s) => s.level >= 6 },
  { title: 'Build a Pressurized Water Reactor', hint: 'Research Pressurized Water Reactors first.', reward: 120_000, check: (s) => has(s, 'reactor_pwr') },
  { title: 'Build a Natural Draft Cooling Tower', hint: 'Big reactors need big cooling.', reward: 60_000, check: (s) => has(s, 'cooling_tower') },
  { title: 'Mine your own uranium', hint: 'Research Uranium Mining, build a mine and an ore mill, then buy an excavator AND a truck (Supply → Mining fleet).', reward: 80_000,
    check: (s) => s.supply.rates.mined > 0 },
  { title: 'Fabricate your own fuel', hint: 'Research Enrichment & Fabrication and complete the chain: ore → yellowcake → enriched uranium → assemblies.', reward: 150_000,
    check: (s) => s.supply.rates.fabricated > 0 },
  { title: 'Produce 500 MW', hint: 'Large turbines and substations help.', reward: 250_000, check: (s) => totalElectric(s) >= 500 },
  { title: 'Open a second site', hint: 'Open Sites to buy land in a new region.', reward: 400_000, check: (s) => s.unlockedSites.length >= 2 },
  { title: 'Build a Boiling Water Reactor', hint: 'Research Boiling Water Reactors.', reward: 800_000, check: (s) => has(s, 'reactor_bwr') },
  { title: 'Produce 5 GW', hint: 'Expand every site.', reward: 6_000_000, check: (s) => totalElectric(s) >= 5_000 },
  { title: 'Build a Molten Salt Reactor', hint: 'Research the Advanced Reactor Concepts branch.', reward: 20_000_000, check: (s) => has(s, 'reactor_msr') },
  { title: 'Produce 50 GW', hint: 'Advanced reactors at every site.', reward: 200_000_000, check: (s) => totalElectric(s) >= 50_000 },
  { title: 'Build a Fusion Demonstration Plant', hint: 'The pinnacle of the technology tree.', reward: 1_000_000_000, check: (s) => has(s, 'reactor_fusion') },
];
