import type { GameState } from './types';
import { BUILDINGS } from './buildings/defs';
import { tickPlants, fuelCapacity, repairCost } from './simulation/plant';
import { tickEvents, notify, pushLog } from './events/events';
import { tickMarket } from './economy/market';
import { RESEARCH_BY_ID } from './research/tree';
import { ACHIEVEMENTS } from './progression/achievements';
import { MILESTONES } from './progression/milestones';
import { xpForNext, levelReward, MAX_LEVEL } from './progression/levels';
import { dateKey, emptyCounters, generateDaily } from './progression/daily';
import { getMods } from './simulation/modifiers';
import { emptyLedger } from './state';
import { HOURS_PER_SECOND, AUTOFUEL_THRESHOLD, HISTORY_INTERVAL, HISTORY_LENGTH, LEDGER_WINDOW, REPAIR_THRESHOLD_AUTO } from './constants';
import { LOCATION_BY_ID } from './progression/locations';
import { buyItem, finishRefuel, startRefuel, refuelNeed, reserveFor } from './supply/fuelcycle';
import { initEquilibrium } from './simulation/reactor';

export interface TickOptions {
  offline?: boolean;
  /** Override for the wall clock (tests). */
  now?: Date;
}

/** Advance the whole company by dt seconds. Mutates the state in place. */
export function tick(s: GameState, dt: number, opts: TickOptions = {}): void {
  const offline = !!opts.offline;
  s.gameTime += dt;
  s.stats.playTime += dt;

  stepConstruction(s, dt, offline);
  tickEvents(s, dt, !offline);
  tickMarket(s, dt, offline);
  tickPlants(s, dt, offline);
  runAutomation(s, offline);
  stepResearch(s, offline);
  stepLevel(s, offline);
  if (!offline) {
    checkAchievements(s);
    checkMilestone(s);
    stepDaily(s, opts.now ?? new Date());
  }
  stepLedger(s, dt);
}

function stepConstruction(s: GameState, dt: number, offline: boolean): void {
  for (const id of s.unlockedSites) {
    const site = s.sites[id];
    const mods = getMods(s, id);
    for (const b of site.buildings) {
      if (b.status !== 'constructing' && b.status !== 'upgrading' && b.status !== 'refueling') continue;
      const speed = b.status === 'refueling' ? 1 : mods.buildSpeed;
      b.progress += (dt * speed) / Math.max(1, b.buildTotal);
      if (b.progress < 1) continue;
      b.progress = 1;
      const def = BUILDINGS[b.type];
      if (b.status === 'refueling') {
        finishRefuel(b);
        b.status = 'active';
        s.stats.refuels++;
        const r = b.reactor!;
        if (r.resumeSetpoint !== null) {
          r.setpoint = r.resumeSetpoint;
          r.resumeSetpoint = null;
        }
        pushLog(s, 'good', `${def.short} at ${LOCATION_BY_ID[id].name} refuelled (core ${Math.round(r.coreFuel * 100)}%).`);
        if (!offline) notify(s, { kind: 'build', title: 'Refuelling complete', text: `${def.short} is ready. ${r.setpoint > 0 ? 'Returning to power.' : 'Raise the power setpoint to restart.'}` });
        continue;
      }
      if (b.status === 'upgrading') {
        if (b.type === 'uranium_mine') b.reserve = (b.reserve ?? 0) + reserveFor(b.level + 1) - reserveFor(b.level);
        b.level++;
        b.condition = Math.min(100, b.condition + 25);
        s.stats.upgrades++;
        s.daily.counters.upgrade++;
        if (!offline) notify(s, { kind: 'build', title: 'Upgrade complete', text: `${def.short} is now level ${b.level}.` });
        pushLog(s, 'good', `${def.short} upgraded to level ${b.level} at ${LOCATION_BY_ID[id].name}.`);
      } else {
        // A new reactor is commissioned cold and subcritical; the operators then start it up.
        if (b.reactor) initEquilibrium(b, LOCATION_BY_ID[id].ambient, 0);
        s.stats.buildingsBuilt++;
        s.daily.counters.build++;
        if (!offline) notify(s, { kind: 'build', title: 'Construction complete', text: `${def.name} is operational.` });
        pushLog(s, 'good', `${def.name} completed at ${LOCATION_BY_ID[id].name}.`);
      }
      b.status = 'active';
    }
  }
}

function runAutomation(s: GameState, offline: boolean): void {
  const a = s.automation;
  // While away, the fuel supplier keeps depots topped up so the plant keeps running.
  if (a.autoFuel || offline) {
    const cap = fuelCapacity(s);
    if (s.fuel < cap * AUTOFUEL_THRESHOLD) buyFuelInternal(s, cap - s.fuel, true);
  }
  // Outage planning: shut down, refuel and return to power automatically.
  if (a.autoRefuel || offline) {
    for (const id of s.unlockedSites) {
      for (const b of s.sites[id].buildings) {
        const r = b.reactor;
        if (!r || b.status !== 'active' || BUILDINGS[b.type].reactor!.onlineRefuel) continue;
        if (r.coreFuel >= 0.12 && r.failedRods < 2) continue;
        if (r.resumeSetpoint === null) r.resumeSetpoint = Math.max(r.setpoint, 0.5);
        r.setpoint = 0;
        // Wait until there is enough fuel in stock for a proper reload.
        const enough = Math.min(refuelNeed(b), fuelCapacity(s) * 0.9);
        if (r.power <= 0.05 && s.fuel >= Math.max(1, enough)) startRefuel(s, b);
      }
    }
  }
  if (a.autoRepair) {
    for (const id of s.unlockedSites) {
      const site = s.sites[id];
      if (!site.buildings.some((b) => b.type === 'maintenance' && b.status === 'active')) continue;
      for (const b of site.buildings) {
        if (b.status === 'constructing' || b.status === 'upgrading') continue;
        if (b.status !== 'broken' && b.condition >= REPAIR_THRESHOLD_AUTO) continue;
        const cost = repairCost(b);
        if (s.money < cost * 2) continue; // keep a safety buffer
        repairInternal(s, b.id, id, true);
      }
    }
  }
}

export function buyFuelInternal(s: GameState, units: number, auto = false): number {
  const n = buyItem(s, 'assemblies', units, fuelCapacity(s));
  if (auto && n > 5) pushLog(s, 'info', `Auto-purchased ${n} fuel assemblies for $${Math.round(n * s.market.fuelPrice).toLocaleString('en-US')}.`);
  return n;
}

export function repairInternal(s: GameState, buildingId: number, siteId: string, auto = false): string | null {
  const site = s.sites[siteId];
  const b = site?.buildings.find((x) => x.id === buildingId);
  if (!b) return 'Building not found.';
  if (b.condition >= 99.5 && b.status !== 'broken') return 'Already in perfect condition.';
  const cost = repairCost(b);
  if (s.money < cost) return 'Not enough money.';
  s.money -= cost;
  s.ledger.maintenance += cost;
  b.condition = 100;
  if (b.status === 'broken') b.status = 'active';
  s.stats.repairs++;
  s.daily.counters.repair++;
  if (auto) pushLog(s, 'info', `Maintenance crews repaired ${BUILDINGS[b.type].short} ($${cost.toLocaleString('en-US')}).`);
  return null;
}

function stepResearch(s: GameState, offline: boolean): void {
  const r = s.research;
  if (!r.active) return;
  const node = RESEARCH_BY_ID[r.active];
  if (!node) {
    r.active = null;
    return;
  }
  const take = Math.min(r.points, node.cost - r.progress);
  r.points -= take;
  r.progress += take;
  if (r.progress >= node.cost - 1e-6) {
    r.completed.push(node.id);
    r.active = null;
    r.progress = 0;
    s.stats.researchDone++;
    s.daily.counters.research++;
    pushLog(s, 'good', `Research complete: ${node.name}.`);
    if (!offline) notify(s, { kind: 'research', title: 'Research complete', text: node.name });
  }
}

function stepLevel(s: GameState, offline: boolean): void {
  while (s.level < MAX_LEVEL && s.xp >= xpForNext(s.level)) {
    s.xp -= xpForNext(s.level);
    s.level++;
    const reward = levelReward(s.level);
    s.money += reward;
    s.ledger.other += reward;
    pushLog(s, 'good', `Company level ${s.level}! Bonus $${reward.toLocaleString('en-US')}.`);
    if (!offline) notify(s, { kind: 'level', title: `Level ${s.level}`, text: `Investor bonus: $${reward.toLocaleString('en-US')}. Regional demand has grown.` });
  }
}

function checkAchievements(s: GameState): void {
  for (const a of ACHIEVEMENTS) {
    if (s.achievements.includes(a.id)) continue;
    if (!a.check(s)) continue;
    s.achievements.push(a.id);
    s.money += a.reward;
    s.ledger.other += a.reward;
    pushLog(s, 'good', `Achievement unlocked: ${a.name}.`);
    notify(s, { kind: 'achievement', title: a.name, text: a.reward ? `${a.description} +$${a.reward.toLocaleString('en-US')}` : a.description });
  }
}

function checkMilestone(s: GameState): void {
  const m = MILESTONES[s.milestone];
  if (!m || !m.check(s)) return;
  s.money += m.reward;
  s.ledger.other += m.reward;
  s.milestone++;
  pushLog(s, 'good', `Milestone reached: ${m.title}.`);
  notify(s, { kind: 'good', title: 'Milestone reached', text: `${m.title} — +$${m.reward.toLocaleString('en-US')}` });
}

export function stepDaily(s: GameState, now: Date): void {
  const key = dateKey(now);
  if (s.daily.dateKey !== key) {
    s.daily = { dateKey: key, objectives: generateDaily(s, key), counters: emptyCounters() };
  }
  for (const o of s.daily.objectives) o.progress = Math.min(o.target, s.daily.counters[o.kind]);
}

function stepLedger(s: GameState, dt: number): void {
  s.ledgerTimer += dt;
  if (s.ledgerTimer >= LEDGER_WINDOW) {
    s.ledgerPrev = s.ledger;
    s.ledger = emptyLedger();
    s.ledgerTimer = 0;
  }
  s.historyTimer += dt;
  if (s.historyTimer >= HISTORY_INTERVAL) {
    s.historyTimer = 0;
    let electric = 0;
    let demand = 0;
    let income = 0;
    for (const id of s.unlockedSites) {
      const st = s.sites[id].stats;
      electric += st.exportMW;
      demand += st.demandMW;
      income += st.revenue - st.upkeep - st.salaries;
    }
    s.history.push({ t: s.gameTime, money: s.money, electric, demand, income });
    if (s.history.length > HISTORY_LENGTH) s.history.shift();
  }
}

/** Net income per second (instantaneous, excluding one-off purchases). */
export function netIncome(s: GameState): number {
  let v = 0;
  for (const id of s.unlockedSites) {
    const st = s.sites[id].stats;
    v += st.revenue - st.upkeep - st.salaries;
  }
  return v + contractRate(s);
}

export function contractRate(s: GameState): number {
  // Approximate current contract income: delivered MW x price.
  let total = 0;
  let exportTotal = 0;
  for (const id of s.unlockedSites) exportTotal += s.sites[id].stats.exportMW;
  let pool = exportTotal;
  for (const c of s.contracts) {
    const take = Math.min(c.mw, pool);
    pool -= take;
    total += take * HOURS_PER_SECOND * c.price;
  }
  return total;
}
