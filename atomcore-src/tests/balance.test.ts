// Headless balance run: a simple greedy bot plays the game and reports how long
// key progression beats take. Not a strict test — it asserts only that the game
// progresses — but its printed timeline is what the balance is tuned against.
import { it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { tick } from '../src/game/engine';
import * as A from '../src/game/actions';
import { setRandom, mulberry32 } from '../src/game/rng';
import { findFreeSpot } from '../src/game/buildings/grid';
import { RESEARCH } from '../src/game/research/tree';
import { BUILDINGS, upgradeCost } from '../src/game/buildings/defs';
import { fuelCapacity } from '../src/game/simulation/plant';
import { LOCATIONS, expandCost, LOCATION_BY_ID } from '../src/game/progression/locations';
import { clearModCache, getMods } from '../src/game/simulation/modifiers';
import type { BuildingType, GameState } from '../src/game/types';

function tryBuild(s: GameState, type: BuildingType): boolean {
  if (A.buildLockReason(s, type)) return false;
  if (s.money < A.buildCost(s, type)) return false;
  const site = s.sites[s.activeSite];
  for (const rot of [0, 1]) {
    const spot = findFreeSpot(site, type, rot);
    if (spot) return A.placeBuilding(s, type, spot.x, spot.z, rot) === null;
  }
  return false;
}

function bestReactor(s: GameState): BuildingType | null {
  const order: BuildingType[] = ['reactor_fusion', 'reactor_msr', 'reactor_bwr', 'reactor_pwr', 'reactor_smr', 'reactor_pilot'];
  for (const t of order) if (!A.buildLockReason(s, t)) return t;
  return null;
}

function botStep(s: GameState) {
  // Research: cheapest available.
  if (!s.research.active) {
    const avail = RESEARCH.filter((r) => !s.research.completed.includes(r.id) && r.requires.every((q) => s.research.completed.includes(q)) && (!r.level || s.level >= r.level))
      .sort((a, b) => a.cost - b.cost);
    if (avail[0] && s.money > avail[0].money * 1.5) A.startResearch(s, avail[0].id);
  }
  for (const k of ['autoFuel', 'autoRestart', 'autoRepair', 'loadFollow', 'smartStorage'] as const) A.setAutomation(s, k, true);
  if (s.fuel < fuelCapacity(s) * 0.4) A.buyFuel(s, 1e9);
  for (const o of s.daily.objectives) A.claimDaily(s, o.id);
  // Sites
  for (const loc of LOCATIONS) if (!s.unlockedSites.includes(loc.id) && s.level >= loc.unlockLevel && s.money > loc.cost * 1.3) A.unlockSite(s, loc.id);
  for (const id of s.unlockedSites) {
    s.activeSite = id;
    const site = s.sites[id];
    const st = site.stats;
    for (const b of site.buildings) if (b.status === 'broken' || b.condition < 40) A.repairBuilding(s, b.id);
    for (const b of site.buildings) if (b.reactor?.scrammed) A.restartReactor(s, b.id);
    for (const b of site.buildings) if (b.reactor && !s.automation.loadFollow) b.reactor.setpoint = st.coolingRatio > 1.05 ? 1 : 0.85;
    if (site.buildings.some((b) => b.status === 'constructing' || b.status === 'upgrading')) continue;
    // Accept contracts if we have surplus.
    if (st.surplusMW > 5 && s.offers[0]) A.acceptOffer(s, s.offers[0].id);
    const heat = st.thermalMW || 1;
    if (!site.buildings.some((b) => b.type === 'lab')) { tryBuild(s, 'lab'); continue; }
    if (st.coolingRatio < 1.15 && st.thermalMW > 0) { if (!tryBuild(s, s.research.completed.includes('c_tower') ? 'cooling_tower' : 'cooling_mech')) upgradeCheapest(s, ['cooling_mech', 'cooling_tower']); continue; }
    if (st.steamCapMW < heat * 1.05) { if (!tryBuild(s, s.research.completed.includes('t_large') ? 'turbine_large' : 'turbine')) upgradeCheapest(s, ['turbine', 'turbine_large']); continue; }
    if (st.curtailedMW > 0.5) { if (!tryBuild(s, 'substation')) upgradeCheapest(s, ['substation']); continue; }
    if (st.staffNeeded > st.staffCap * 0.9) { tryBuild(s, 'admin') || upgradeCheapest(s, ['admin']); continue; }
    if (!site.buildings.some((b) => b.type === 'maintenance') && s.level >= 3) { tryBuild(s, 'maintenance'); continue; }
    const r = bestReactor(s);
    if (st.surplusMW < st.demandMW * 0.3 || s.contracts.length) {
      if (r && tryBuild(s, r)) continue;
      upgradeCheapest(s, ['reactor_pilot', 'reactor_smr', 'reactor_pwr', 'reactor_bwr', 'reactor_msr', 'reactor_fusion']);
    }
    if (s.money > 5 * A.buildCost(s, 'lab')) tryBuild(s, 'lab') || upgradeCheapest(s, ['lab']);
    const loc = LOCATION_BY_ID[id];
    if (!findFreeSpot(site, 'reactor_pwr') && site.size < loc.maxSize && s.money > expandCost(loc, site.size) * 2) A.expandSite(s, id);
  }
  s.activeSite = s.unlockedSites[0];
}

function upgradeCheapest(s: GameState, types: BuildingType[]): boolean {
  const site = s.sites[s.activeSite];
  const mods = getMods(s, site.id);
  const list = site.buildings.filter((b) => types.includes(b.type) && b.status === 'active' && b.level < BUILDINGS[b.type].maxLevel)
    .sort((a, b) => upgradeCost(BUILDINGS[a.type], a.level, mods.buildCost) - upgradeCost(BUILDINGS[b.type], b.level, mods.buildCost));
  for (const b of list) if (A.upgradeBuilding(s, b.id) === null) return true;
  return false;
}

it('bot progresses through the game', () => {
  setRandom(mulberry32(7));
  clearModCache();
  const s = createInitialState();
  const marks: Record<string, number> = {};
  const mark = (k: string, cond: boolean) => { if (cond && marks[k] === undefined) marks[k] = Math.round(s.gameTime / 60); };
  const totalMW = () => Object.values(s.sites).reduce((a, x) => a + x.stats.exportMW, 0);
  const hours = Number(process.env.BALANCE_HOURS ?? 6);
  for (let t = 0; t < hours * 3600; t += 1) {
    tick(s, 1);
    if (t % 5 === 0) botStep(s);
    const has = (ty: BuildingType) => Object.values(s.sites).some((x) => x.buildings.some((b) => b.type === ty && b.status !== 'constructing'));
    mark('smr', has('reactor_smr'));
    mark('pwr', has('reactor_pwr'));
    mark('bwr', has('reactor_bwr'));
    mark('msr', has('reactor_msr'));
    mark('fusion', has('reactor_fusion'));
    mark('mw50', totalMW() >= 50);
    mark('mw500', totalMW() >= 500);
    mark('gw5', totalMW() >= 5000);
    mark('site2', s.unlockedSites.length >= 2);
    mark('site3', s.unlockedSites.length >= 3);
    mark('lvl5', s.level >= 5);
    mark('lvl10', s.level >= 10);
    mark('lvl15', s.level >= 15);
    mark('lvl20', s.level >= 20);
    mark('prestige', s.runEarned >= 50_000_000);
    if (t % 1800 === 0) {
      console.log(`t=${t / 60}min lvl=${s.level} money=${Math.round(s.money)} MW=${Math.round(totalMW())} demand=${Math.round(Object.values(s.sites).reduce((a, x) => a + x.stats.demandMW, 0))} research=${s.research.completed.length} buildings=${Object.values(s.sites).reduce((a, x) => a + x.buildings.length, 0)} scrams=${s.stats.scrams}`);
    }
  }
  console.log('Milestones (minutes):', JSON.stringify(marks));
  console.log('Final:', { level: s.level, money: Math.round(s.money), runEarned: Math.round(s.runEarned), research: s.research.completed.length, sites: s.unlockedSites });
  expect(s.level).toBeGreaterThan(5);
}, 600_000);
