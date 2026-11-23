import type { Automation, BuildingType, GameState } from './types';
import { BUILDINGS, upgradeCost, isReactor } from './buildings/defs';
import { checkPlacement } from './buildings/grid';
import { RESEARCH_BY_ID, isUnlockedByResearch, RESEARCH } from './research/tree';
import { getMods } from './simulation/modifiers';
import { canRestart, restart, scram } from './simulation/reactor';
import { makeBuilding, makeSite, createInitialState } from './state';
import { pushLog } from './events/events';
import { buyFuelInternal, repairInternal } from './engine';
import { LOCATION_BY_ID, expandCost } from './progression/locations';
import { pendingShares } from './progression/prestige';
import { acceptOffer as acceptOfferImpl, cancelContract as cancelContractImpl } from './economy/market';
import { startRefuel, decommissionCost, buyVehicle, sellVehicle, buyItem, sellItem, type Item } from './supply/fuelcycle';
import { fuelCapacity } from './simulation/plant';

// Every player action validates fully and returns an error string, or null on success.
export type Result = string | null;

export function buildCost(s: GameState, type: BuildingType, siteId = s.activeSite): number {
  const def = BUILDINGS[type];
  const mods = getMods(s, siteId);
  // Each additional copy of the same building at a site costs a little more.
  const owned = s.sites[siteId]?.buildings.filter((b) => b.type === type).length ?? 0;
  return Math.round(def.cost * mods.buildCost * Math.pow(1.08, owned));
}

export function buildLockReason(s: GameState, type: BuildingType, siteId = s.activeSite): string | null {
  const def = BUILDINGS[type];
  if (def.unlock.level && s.level < def.unlock.level) return `Requires company level ${def.unlock.level}`;
  if (!isUnlockedByResearch(type, s.research.completed)) {
    const node = RESEARCH.find((r) => r.unlocks?.includes(type));
    return `Requires research: ${node?.name}`;
  }
  if (def.needsWaterBody && !LOCATION_BY_ID[siteId].waterBody) return 'No river or sea here — use wells or dry cooling';
  if (def.maxPerSite) {
    const n = s.sites[siteId].buildings.filter((b) => b.type === type).length;
    if (n >= def.maxPerSite) return `Limit of ${def.maxPerSite} per site`;
  }
  return null;
}

export function placeBuilding(s: GameState, type: BuildingType, x: number, z: number, rot: number): Result {
  const site = s.sites[s.activeSite];
  const lock = buildLockReason(s, type);
  if (lock) return lock;
  const cost = buildCost(s, type);
  if (s.money < cost) return 'Not enough money.';
  const problem = checkPlacement(site, type, x, z, rot);
  if (problem === 'bounds') return 'Outside the plot. Buy more land in Sites.';
  if (problem === 'road') return 'Keep the access road clear.';
  if (problem === 'overlap') return 'That space is occupied.';
  s.money -= cost;
  s.ledger.construction += cost;
  const b = makeBuilding(s, type, x, z, rot);
  site.buildings.push(b);
  pushLog(s, 'info', `Started construction of ${BUILDINGS[type].name}.`);
  return null;
}

export function upgradeBuilding(s: GameState, id: number): Result {
  const site = s.sites[s.activeSite];
  const b = site.buildings.find((x) => x.id === id);
  if (!b) return 'Building not found.';
  const def = BUILDINGS[b.type];
  if (b.status !== 'active') return b.status === 'destroyed' ? 'The reactor is destroyed.' : 'Building must be operational to upgrade.';
  if (b.level >= def.maxLevel) return 'Already at maximum level.';
  const cost = upgradeCost(def, b.level, getMods(s, s.activeSite).buildCost);
  if (s.money < cost) return 'Not enough money.';
  s.money -= cost;
  s.ledger.construction += cost;
  b.status = 'upgrading';
  b.progress = 0;
  b.buildTotal = Math.round(def.buildTime * (0.35 + 0.15 * b.level));
  if (b.reactor) b.reactor.scrammed = false;
  return null;
}

export function demolishBuilding(s: GameState, id: number): Result {
  const site = s.sites[s.activeSite];
  const idx = site.buildings.findIndex((x) => x.id === id);
  if (idx < 0) return 'Building not found.';
  const b = site.buildings[idx];
  const reactors = site.buildings.filter((x) => isReactor(x.type));
  if (isReactor(b.type) && reactors.length === 1 && s.unlockedSites.length === 1) return 'You cannot demolish your last reactor.';
  const def = BUILDINGS[b.type];
  const refund = b.status === 'constructing' ? Math.round(buildCost(s, b.type) * 0.9) : Math.round(def.cost * 0.35);
  s.money += refund;
  s.ledger.other += refund;
  site.buildings.splice(idx, 1);
  pushLog(s, 'info', `Demolished ${def.short} (refund $${refund.toLocaleString('en-US')}).`);
  return null;
}

export function demolishRefund(s: GameState, id: number): number {
  const b = s.sites[s.activeSite].buildings.find((x) => x.id === id);
  if (!b) return 0;
  return b.status === 'constructing' ? Math.round(buildCost(s, b.type) * 0.9) : Math.round(BUILDINGS[b.type].cost * 0.35);
}

export function repairBuilding(s: GameState, id: number): Result {
  return repairInternal(s, id, s.activeSite);
}

export function toggleBuilding(s: GameState, id: number): Result {
  const b = s.sites[s.activeSite].buildings.find((x) => x.id === id);
  if (!b) return 'Building not found.';
  b.enabled = !b.enabled;
  return null;
}

export function setSetpoint(s: GameState, id: number, value: number): Result {
  const b = s.sites[s.activeSite].buildings.find((x) => x.id === id);
  if (!b?.reactor) return 'Not a reactor.';
  b.reactor.setpoint = Math.max(0, Math.min(1, value));
  return null;
}

export function setAllSetpoints(s: GameState, value: number): Result {
  for (const b of s.sites[s.activeSite].buildings) if (b.reactor) b.reactor.setpoint = Math.max(0, Math.min(1, value));
  return null;
}

export function manualScram(s: GameState, id: number): Result {
  const b = s.sites[s.activeSite].buildings.find((x) => x.id === id);
  if (!b?.reactor) return 'Not a reactor.';
  if (b.reactor.scrammed) return 'Already shut down.';
  scram(b.reactor, b.reactor.atws ? `Manual SCRAM after failed automatic trip (${b.reactor.tripCause})` : 'Manual SCRAM', s.gameTime);
  pushLog(s, 'warn', `Manual SCRAM of ${BUILDINGS[b.type].short}.`);
  return null;
}

export function restartReactor(s: GameState, id: number): Result {
  const site = s.sites[s.activeSite];
  const b = site.buildings.find((x) => x.id === id);
  if (!b?.reactor) return 'Not a reactor.';
  if (!canRestart(b, getMods(s, site.id), s.gameTime, LOCATION_BY_ID[site.id].ambient))
    return 'Not safe to restart yet — wait for the core to cool and the restart delay to pass.';
  restart(b);
  s.stats.restarts++;
  pushLog(s, 'info', `${BUILDINGS[b.type].short} restarted.`);
  return null;
}

export function buyFuel(s: GameState, units: number): Result {
  const n = buyFuelInternal(s, units);
  return n > 0 ? null : s.money < s.market.fuelPrice ? 'Not enough money.' : 'Fuel storage is full.';
}

export function startResearch(s: GameState, id: string): Result {
  const node = RESEARCH_BY_ID[id];
  if (!node) return 'Unknown research.';
  if (s.research.completed.includes(id)) return 'Already researched.';
  if (s.research.active === id) return 'Already in progress.';
  if (node.level && s.level < node.level) return `Requires company level ${node.level}.`;
  const missing = node.requires.filter((r) => !s.research.completed.includes(r));
  if (missing.length) return `Requires: ${missing.map((m) => RESEARCH_BY_ID[m].name).join(', ')}`;
  if (s.money < node.money) return 'Not enough money to fund this project.';
  if (s.research.active) {
    // Switching projects returns invested points to the bank (no money refund).
    s.research.points += s.research.progress;
  }
  s.money -= node.money;
  s.ledger.research += node.money;
  s.research.active = id;
  s.research.progress = 0;
  return null;
}

export function setAutomation(s: GameState, key: keyof Automation, on: boolean): Result {
  const node = Object.values(RESEARCH_BY_ID).find((r) => r.automation === key);
  if (on && node && !s.research.completed.includes(node.id)) return `Requires research: ${node.name}`;
  s.automation[key] = on;
  return null;
}

export function trainingCost(s: GameState): number {
  return Math.round(15_000 * Math.pow(3.2, s.staffTraining));
}

export function trainStaff(s: GameState): Result {
  if (s.staffTraining >= 8) return 'Training program is at its maximum level.';
  const cost = trainingCost(s);
  if (s.money < cost) return 'Not enough money.';
  s.money -= cost;
  s.ledger.other -= cost;
  s.staffTraining++;
  pushLog(s, 'good', `Staff training program advanced to level ${s.staffTraining}.`);
  return null;
}

export function claimDaily(s: GameState, id: string): Result {
  const o = s.daily.objectives.find((x) => x.id === id);
  if (!o) return 'Objective not found.';
  if (o.claimed) return 'Already claimed.';
  if (o.progress < o.target) return 'Objective not complete yet.';
  o.claimed = true;
  s.money += o.reward;
  s.ledger.other += o.reward;
  s.xp += o.rewardXp;
  s.stats.dailiesDone++;
  return null;
}

export function unlockSite(s: GameState, id: string): Result {
  const loc = LOCATION_BY_ID[id];
  if (!loc) return 'Unknown location.';
  if (s.unlockedSites.includes(id)) return 'Already owned.';
  if (s.level < loc.unlockLevel) return `Requires company level ${loc.unlockLevel}.`;
  if (s.money < loc.cost) return 'Not enough money.';
  s.money -= loc.cost;
  s.ledger.construction += loc.cost;
  s.sites[id] = makeSite(id);
  s.unlockedSites.push(id);
  s.activeSite = id;
  pushLog(s, 'good', `Acquired land at ${loc.name}.`);
  return null;
}

export function expandSite(s: GameState, id: string): Result {
  const site = s.sites[id];
  const loc = LOCATION_BY_ID[id];
  if (!site) return 'Site not owned.';
  if (site.size >= loc.maxSize) return 'This site cannot be expanded further.';
  const cost = expandCost(loc, site.size);
  if (s.money < cost) return 'Not enough money.';
  s.money -= cost;
  s.ledger.construction += cost;
  // Grow the plot by one ring of cells; existing buildings shift to stay centred.
  site.size += 2;
  for (const b of site.buildings) {
    b.x += 1;
    b.z += 1;
  }
  pushLog(s, 'good', `${loc.name} expanded to ${site.size}×${site.size} cells.`);
  return null;
}

export function switchSite(s: GameState, id: string): Result {
  if (!s.unlockedSites.includes(id)) return 'Site not owned.';
  s.activeSite = id;
  return null;
}

/** Corporate restructuring: reset the run for permanent shares. Returns the new state. */
export function prestige(s: GameState): { state: GameState | null; error: Result } {
  const gain = pendingShares(s);
  if (gain <= 0) return { state: null, error: 'Not enough earnings this run to restructure yet.' };
  const next = createInitialState({
    shares: s.prestige.shares + gain,
    prestigeCount: s.prestige.count + 1,
    achievements: s.achievements,
    lifetimeEarned: s.lifetimeEarned,
    createdAt: s.createdAt,
  });
  pushLog(next, 'good', `Corporate restructuring complete: +${gain} shares (total ${next.prestige.shares}).`);
  return { state: next, error: null };
}

export { acceptOfferImpl as acceptOffer, cancelContractImpl as cancelContract };

// ── Reactor operations ────────────────────────────────────────────────────

export function refuelReactor(s: GameState, id: number, mode: 'batch' | 'full' = 'batch'): Result {
  const b = s.sites[s.activeSite].buildings.find((x) => x.id === id);
  if (!b?.reactor) return 'Not a reactor.';
  return startRefuel(s, b, mode);
}

function reactorById(s: GameState, id: number) {
  return s.sites[s.activeSite].buildings.find((x) => x.id === id)?.reactor;
}

/** Switch between automatic power control and manual rod control. */
export function setRodMode(s: GameState, id: number, auto: boolean): Result {
  const r = reactorById(s, id);
  if (!r) return 'Not a reactor.';
  r.autoRods = auto;
  r.rodTarget = r.rods;
  if (auto) r.setpoint = Math.max(0, Math.min(1, r.power));
  return null;
}

/** Manual rod position target (0 = fully in, 1 = fully out). */
export function setRodTarget(s: GameState, id: number, v: number): Result {
  const r = reactorById(s, id);
  if (!r) return 'Not a reactor.';
  if (r.autoRods) return 'Switch rod control to manual first.';
  if (r.tripCause) return 'Reset the trip first.';
  r.rodTarget = Math.max(0, Math.min(1, v));
  return null;
}

/** Borate (+) or dilute (−) the coolant, in ppm. */
export function adjustBoron(s: GameState, id: number, delta: number): Result {
  const r = reactorById(s, id);
  if (!r) return 'Not a reactor.';
  r.autoBoron = false;
  r.boron = Math.max(0, Math.min(2500, r.boron + delta));
  return null;
}

export function setAutoBoron(s: GameState, id: number, on: boolean): Result {
  const r = reactorById(s, id);
  if (!r) return 'Not a reactor.';
  r.autoBoron = on;
  return null;
}

/** U-235 enrichment for newly fabricated fuel (licence limit 5%). */
export function setEnrichment(s: GameState, v: number): Result {
  s.supply.enrichment = Math.round(Math.max(3, Math.min(5, v)) * 10) / 10;
  return null;
}

export function setPumpSpeed(s: GameState, id: number, v: number): Result {
  const b = s.sites[s.activeSite].buildings.find((x) => x.id === id);
  if (!b?.reactor) return 'Not a reactor.';
  b.reactor.pumpSpeed = Math.max(0.6, Math.min(1.25, v));
  return null;
}

/** Clear the ruins of a destroyed reactor. */
export function decommission(s: GameState, id: number): Result {
  const site = s.sites[s.activeSite];
  const b = site.buildings.find((x) => x.id === id);
  if (!b) return 'Building not found.';
  if (b.status !== 'destroyed') return 'Only destroyed reactors need decommissioning.';
  const cost = decommissionCost(b);
  if (s.money < cost) return 'Not enough money for the cleanup.';
  s.money -= cost;
  s.ledger.construction += cost;
  site.buildings = site.buildings.filter((x) => x.id !== id);
  pushLog(s, 'info', `Ruins of the ${BUILDINGS[b.type].short} decommissioned and the land cleaned up.`);
  return null;
}

// ── Supply chain ─────────────────────────────────────────────────────────

export function buyMineVehicle(s: GameState, buildingId: number, kind: 'excavator' | 'truck', tier: number): Result {
  return buyVehicle(s, s.activeSite, buildingId, kind, tier);
}

export function sellMineVehicle(s: GameState, buildingId: number, kind: 'excavator' | 'truck', tier: number): Result {
  return sellVehicle(s, s.activeSite, buildingId, kind, tier);
}

export function tradeItem(s: GameState, item: Item, qty: number): Result {
  if (qty > 0) return buyItem(s, item, qty, fuelCapacity(s)) > 0 ? null : 'Cannot buy: storage full or not enough money.';
  return sellItem(s, item, -qty) > 0 ? null : 'Nothing to sell.';
}

export function setQA(s: GameState, v: number): Result {
  s.supply.qa = Math.max(0, Math.min(1, v));
  return null;
}

/** Relocating a building is free. */
export function moveCost(_s: GameState, _id: number): number {
  return 0;
}

export function moveLockReason(s: GameState, id: number): string | null {
  const b = s.sites[s.activeSite].buildings.find((x) => x.id === id);
  if (!b) return 'Building not found.';
  if (b.status === 'destroyed') return 'A destroyed reactor must be decommissioned, not moved.';
  if (b.status === 'refueling') return 'Wait until the refuelling outage is finished.';
  if (b.status === 'upgrading') return 'Wait until the upgrade is finished.';
  if (b.reactor && b.reactor.power > 0.05) return 'Shut the reactor down first (power target 0%).';
  return null;
}

/** Move (and optionally rotate) a building to a new spot on the same site. */
export function moveBuilding(s: GameState, id: number, x: number, z: number, rot: number): Result {
  const site = s.sites[s.activeSite];
  const b = site.buildings.find((y) => y.id === id);
  if (!b) return 'Building not found.';
  const lock = moveLockReason(s, id);
  if (lock) return lock;
  if (b.x === x && b.z === z && b.rot === rot) return 'Pick a different spot.';
  const problem = checkPlacement(site, b.type, x, z, rot, b.id);
  if (problem === 'bounds') return 'Outside the plot. Buy more land in Sites.';
  if (problem === 'road') return 'Keep the access road clear.';
  if (problem === 'overlap') return 'That space is occupied.';
  b.x = x;
  b.z = z;
  b.rot = rot;
  pushLog(s, 'info', `Moved ${BUILDINGS[b.type].short}.`);
  return null;
}
