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
import { coreSize } from '../src/game/simulation/reactor';
import { LOCATIONS, expandCost, LOCATION_BY_ID } from '../src/game/progression/locations';
import { clearModCache, getMods } from '../src/game/simulation/modifiers';
import type { BuildingType, GameState } from '../src/game/types';
import { autoWire, linkRating, suggestClass, linkLength, LINK_CLASSES } from '../src/game/network/network';

// The bot wires new buildings to their nearest partners and resizes links that run full.
function wire(s: GameState) {
  const site = s.sites[s.activeSite];
  autoWire(s, site, { pay: true, costMod: getMods(s, site.id).buildCost });
  for (const l of site.links) {
    if (l.flow < linkRating(l) * 0.9 && l.trip <= 0) continue;
    const next = suggestClass(s, site, l.kind, l.a, l.b, linkRating(l) * 2);
    if (next.cls === l.cls && next.circuits === l.circuits) continue;
    if (s.money > A.relinkCost(s, l.id, next.cls, next.circuits) * 1.5) A.upgradeLink(s, l.id, next.cls, next.circuits);
  }
  void linkLength; void LINK_CLASSES;
}

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
  for (const k of ['autoFuel', 'autoRefuel', 'autoRestart', 'autoRepair', 'loadFollow', 'smartStorage'] as const) A.setAutomation(s, k, true);
  if (s.fuel < fuelCapacity(s) * 0.4) A.buyFuel(s, 1e9);
  for (const o of s.daily.objectives) A.claimDaily(s, o.id);
  // Sites
  for (const loc of LOCATIONS) if (!s.unlockedSites.includes(loc.id) && s.level >= loc.unlockLevel && s.money > loc.cost * 1.3) A.unlockSite(s, loc.id);
  for (const id of s.unlockedSites) {
    s.activeSite = id;
    const site = s.sites[id];
    const st = site.stats;
    wire(s);
    for (const b of site.buildings) if (b.status === 'broken' || b.condition < 40) A.repairBuilding(s, b.id);
    for (const b of site.buildings) if (b.reactor?.scrammed) A.restartReactor(s, b.id);
    // Manual outage management before Outage Planning is researched
    for (const b of site.buildings) {
      const r = b.reactor;
      if (!r || b.status !== 'active' || s.automation.autoRefuel) continue;
      if (r.coreFuel < 0.12 || r.failedRods >= 2) { r.setpoint = 0; if (r.power < 0.05) A.refuelReactor(s, b.id); }
      else if (r.setpoint === 0) r.setpoint = 1;
    }
    for (const b of site.buildings) if (b.reactor && !s.automation.loadFollow) b.reactor.setpoint = st.coolingRatio > 1.05 ? 1 : 0.85;
    if (site.buildings.some((b) => b.status === 'constructing' || b.status === 'upgrading')) continue;
    // Accept contracts if we have surplus.
    if (st.surplusMW > 5 && s.offers[0]) A.acceptOffer(s, s.offers[0].id);
    const heat = st.thermalMW || 1;
    if (!site.buildings.some((b) => b.type === 'lab')) { tryBuild(s, 'lab'); continue; }
    const desert = !LOCATION_BY_ID[id].waterBody;
    if (st.evaporation > (st.rawSupply - st.rawToTreatment) * 0.85 && st.evaporation > 1) {
      if (!tryBuild(s, desert ? 'water_wells' : 'water_intake')) {
        if (!upgradeCheapest(s, [desert ? 'water_wells' : 'water_intake'])) tryBuild(s, 'cooling_dry');
      }
      continue;
    }
    if (st.backupMW < st.backupNeedMW && !A.buildLockReason(s, 'generator_emergency')) { if (!tryBuild(s, 'generator_emergency')) upgradeCheapest(s, ['generator_emergency']); continue; }
    if (site.spent.pool > site.stats.poolCap * 0.6 && site.stats.caskCap - site.spent.casks < site.spent.pool) { if (!tryBuild(s, 'dry_cask')) upgradeCheapest(s, ['dry_cask']); continue; }
    if (st.treatedFactor < 1) { if (!tryBuild(s, 'water_treatment')) upgradeCheapest(s, ['water_treatment']); continue; }
    if (st.coolingRatio < 1.15 && st.thermalMW > 0) { if (!tryBuild(s, s.research.completed.includes('c_tower') ? 'cooling_tower' : 'cooling_mech')) upgradeCheapest(s, ['cooling_mech', 'cooling_tower']); continue; }
    if (st.steamCapMW < heat * 1.05) { if (!tryBuild(s, s.research.completed.includes('t_large') ? 'turbine_large' : 'turbine')) upgradeCheapest(s, ['turbine', 'turbine_large']); continue; }
    if (st.curtailedMW > 0.5 || (st.exportMW >= st.gridCapMW * 0.97 && st.demandMW > st.exportMW)) { if (!tryBuild(s, 'substation')) upgradeCheapest(s, ['substation']); continue; }
    const biggestCore = Math.max(0, ...Object.values(s.sites).flatMap((x) => x.buildings.filter((b) => b.reactor).map((b) => coreSize(b))));
    if (fuelCapacity(s) < biggestCore * 1.1) { if (!tryBuild(s, 'fuel_depot')) upgradeCheapest(s, ['fuel_depot']); continue; }
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
  setRandom(mulberry32(Number(process.env.BALANCE_SEED ?? 7)));
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
    if (s.stats.coreDamage > 0 && marks.coreDamage === undefined && process.env.BALANCE_DEBUG) {
      console.log('CORE DAMAGE LOG:\n' + s.log.slice(0, 14).map((l) => `  ${Math.round(l.t)} ${l.text}`).join('\n'));
      for (const b of s.sites.riverside.buildings.filter((x) => x.reactor)) console.log(`  ${b.type} st=${b.status} lvl=${b.level} cond=${Math.round(b.condition)} L=${b.reactor!.inventory.toFixed(2)} Tf=${Math.round(b.reactor!.fuelTemp)} pumps=${s.sites.riverside.stats.pumpsPowered} batt=${s.sites.riverside.stats.batteryLeft} cool=${s.sites.riverside.stats.coolingRatio.toFixed(2)}`);
    }
    mark('coreDamage', s.stats.coreDamage > 0);
    if (process.env.BALANCE_DEBUG && t % 1800 === 0 && t > 0) {
      for (const id of s.unlockedSites) {
        const st = s.sites[id].stats;
        const rs = s.sites[id].buildings.filter((b) => b.reactor);
        console.log(`  ${id}: cool=${st.coolingRatio.toFixed(2)} wf=${st.waterFactor.toFixed(2)} tf=${st.treatedFactor.toFixed(2)} evap=${Math.round(st.evaporation)} raw=${Math.round(st.rawSupply)} reactors=${rs.map((b) => `${b.type.slice(8)}:${b.status[0]}:${Math.round(b.reactor!.coreFuel * 100)}%/f${b.reactor!.failedRods}/p${Math.round(b.reactor!.power * 100)}`).join(' ')}`);
      }
      const L = s.ledgerPrev;
      console.log(`  fuel=${Math.round(s.fuel)} cap=${fuelCapacity(s)} ledger/min sales=${Math.round(L.sales)} fuel=${Math.round(L.fuel)} water=${Math.round(L.water)} upkeep=${Math.round(L.upkeep)} constr=${Math.round(L.construction)} other=${Math.round(L.other)}`);
    }
    if (process.env.BALANCE_DEBUG && t === 1800 && s.level < 6) {
      console.log('STUCK LOG:\n' + s.log.slice(0, 16).map((l) => `  ${Math.round(l.t)} ${l.text}`).join('\n'));
      const site = s.sites.riverside;
      const st = site.stats;
      console.log(`  stats: thermal=${st.thermalMW.toFixed(1)} steamCap=${st.steamCapMW} cool=${st.coolingCapMW.toFixed(1)} wf=${st.waterFactor.toFixed(2)} tf=${st.treatedFactor.toFixed(2)} fuel=${s.fuel} money=${Math.round(s.money)}`);
      for (const b of site.buildings) console.log(`  ${b.type} ${b.status} L${b.level} cond=${Math.round(b.condition)}${b.reactor ? ` fuel=${b.reactor.coreFuel.toFixed(2)} sp=${b.reactor.setpoint} n=${b.reactor.power.toExponential(1)} trip=${b.reactor.tripCause} rods=${b.reactor.rods.toFixed(2)}` : ''}`);
    }
    if (process.env.NET_DEBUG && t % 1800 === 0 && t > 0) {
      for (const id of s.unlockedSites) {
        const site = s.sites[id];
        const st = site.stats;
        console.log(`  [${id}] th=${Math.round(st.thermalMW)} steamCap=${Math.round(st.steamCapMW)} used=${Math.round(st.steamUsedMW)} strandHeat=${Math.round(st.strandedHeatMW)} el=${Math.round(st.electricMW)} strandMW=${Math.round(st.strandedMW)} loss=${st.cableLossMW.toFixed(1)} grid=${Math.round(st.gridCapMW)} export=${Math.round(st.exportMW)} curt=${Math.round(st.curtailedMW)} cool=${st.coolingRatio.toFixed(2)} links=${site.links.length}`);
        for (const l of site.links) if (l.flow > linkRating(l) * 0.95 || l.trip > 0) console.log(`     full ${l.kind} ${l.a}->${l.b} cls=${l.cls}x${l.circuits} flow=${Math.round(l.flow)} trip=${l.trip}`);
        const unl = site.buildings.filter((b) => !site.links.some((l) => l.a === b.id || l.b === b.id) && ['reactor', 'power', 'cooling', 'grid'].includes(BUILDINGS[b.type].category));
        if (st.gridCapMW === 0) for (const l of site.links.filter((x) => x.kind === 'power')) console.log(`     pw ${site.buildings.find((b) => b.id === l.a)?.type ?? l.a}:${site.buildings.find((b) => b.id === l.a)?.status ?? ''} -> ${site.buildings.find((b) => b.id === l.b)?.type ?? l.b}:${site.buildings.find((b) => b.id === l.b)?.status ?? ''} flow=${Math.round(l.flow)} trip=${l.trip.toFixed(0)} heat=${l.heat.toFixed(2)} r=${linkRating(l)}`);
        if (st.gridCapMW === 0) console.log('     events: ' + s.events.map((e) => e.id).join(',') + ' log: ' + s.log.slice(0, 5).map((l) => l.text).join(' | '));
        if (unl.length) console.log(`     unlinked: ${unl.map((b) => b.type + ':' + b.status[0]).join(' ')}`);
        console.log(`     reactors: ${site.buildings.filter((b) => b.reactor).map((b) => `${b.type.slice(8)}:${b.status[0]}:p${Math.round(b.reactor!.power * 100)}:${b.reactor!.tripCause ?? ''}`).join(' ')}`);
      }
    }
    if (t % 1800 === 0) {
      console.log(`t=${t / 60}min lvl=${s.level} money=${Math.round(s.money)} MW=${Math.round(totalMW())} demand=${Math.round(Object.values(s.sites).reduce((a, x) => a + x.stats.demandMW, 0))} research=${s.research.completed.length} buildings=${Object.values(s.sites).reduce((a, x) => a + x.buildings.length, 0)} scrams=${s.stats.scrams}`);
    }
  }
  console.log('Milestones (minutes):', JSON.stringify(marks));
  console.log('Final:', { level: s.level, money: Math.round(s.money), runEarned: Math.round(s.runEarned), research: s.research.completed.length, sites: s.unlockedSites });
  expect(s.level).toBeGreaterThan(5);
}, 600_000);
