import type { Building, BuildingType, GameState, Site } from './types';
import { BUILDINGS } from './buildings/defs';
import { getMods } from './simulation/modifiers';
import { reactivityHeadroom, warnTemp, coreSize, advisoryLimit, powerLimit } from './simulation/reactor';
import { physicsFor } from './simulation/physics';
import { fuelCapacity } from './simulation/plant';
import { refuelNeed, poolCapacity, mineOutput } from './supply/fuelcycle';
import { LOCATION_BY_ID } from './progression/locations';
import { HOURS_PER_SECOND } from './constants';

// Plant diagnostics: turns the simulation state into plain-language status
// lines — what is fine, what is degraded and what is broken — each with the
// likely cause and a suggested fix. Used by the Status tab and the control room.

export type Severity = 'error' | 'warn' | 'info' | 'ok';

export type FixAction =
  | { kind: 'select'; id: number }
  | { kind: 'panel'; panel: 'build' | 'research' | 'manage' | 'supply' | 'market' }
  | { kind: 'reset'; id: number }
  | { kind: 'refuel'; id: number }
  | { kind: 'repair'; id: number }
  | { kind: 'buyFuel' }
  | { kind: 'build'; type: BuildingType }
  | { kind: 'setpoint'; id: number; value: number }
  | { kind: 'scram'; id: number };

export interface Issue {
  key: string;
  severity: Severity;
  system: SystemId;
  siteId: string;
  buildingId?: number;
  title: string;
  detail: string;
  fix?: { label: string; action: FixAction };
}

export type SystemId = 'reactors' | 'turbines' | 'cooling' | 'water' | 'grid' | 'fuel' | 'staff' | 'safety' | 'equipment' | 'mining' | 'finance';

export const SYSTEM_LABEL: Record<SystemId, string> = {
  reactors: 'Reactors', turbines: 'Turbines', cooling: 'Cooling', water: 'Water', grid: 'Grid connection', fuel: 'Fuel',
  staff: 'Staff', safety: 'Safety & backup power', equipment: 'Equipment', mining: 'Mining', finance: 'Finances',
};

function fmt(n: number, d = 0): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: d });
}

function mins(sec: number): string {
  if (!Number.isFinite(sec)) return '?';
  if (sec < 60) return `${Math.max(1, Math.round(sec))} s`;
  return `${Math.round(sec / 60)} min`;
}

export interface ReactorStatus {
  /** One-line answer to "what is this reactor doing?" */
  headline: string;
  severity: Severity;
  /** Electricity this reactor is responsible for, MW(e). */
  electricMW: number;
  issues: Issue[];
}

/** Explain one reactor: actual vs target power and why they differ. */
export function reactorStatus(s: GameState, site: Site, b: Building): ReactorStatus {
  const r = b.reactor!;
  const def = BUILDINGS[b.type];
  const name = def.short;
  const mods = getMods(s, site.id);
  const p = physicsFor(b.type);
  const st = site.stats;
  const issues: Issue[] = [];
  const add = (sev: Severity, title: string, detail: string, fix?: Issue['fix'], key = title) =>
    issues.push({ key: `${b.id}:${key}`, severity: sev, system: 'reactors', siteId: site.id, buildingId: b.id, title: `${name}: ${title}`, detail, fix });
  const share = st.thermalMW > 0 ? r.thermal / st.thermalMW : 0;
  const electricMW = Math.max(0, share * st.exportMW);
  const pct = (v: number) => `${v < 0.01 && v > 0 ? (v * 100).toFixed(2) : Math.round(v * 100)}%`;
  const loc = LOCATION_BY_ID[site.id];

  if (b.status === 'destroyed') {
    add('error', 'destroyed', 'Core damage incident. The ruin must be decommissioned before the land can be reused.', { label: 'Open', action: { kind: 'select', id: b.id } });
    return { headline: 'Destroyed', severity: 'error', electricMW: 0, issues };
  }
  if (b.status === 'constructing') return { headline: `Under construction (${Math.round(b.progress * 100)}%)`, severity: 'info', electricMW: 0, issues };
  if (b.status === 'upgrading') return { headline: `Upgrading (${Math.round(b.progress * 100)}%)`, severity: 'info', electricMW: 0, issues };
  if (b.status === 'refueling') {
    add('info', 'refuelling outage', `Loading ${r.loading} fresh assemblies. ${mins((1 - b.progress) * b.buildTotal)} left. Afterwards it restarts from cold, which takes a few minutes.`);
    return { headline: 'Refuelling outage', severity: 'info', electricMW: 0, issues };
  }
  if (b.status === 'broken') {
    add('error', 'broken down', 'Repair it to bring it back.', { label: 'Repair', action: { kind: 'repair', id: b.id } });
    return { headline: 'Broken down', severity: 'error', electricMW: 0, issues };
  }

  // Protection system
  if (r.atws) {
    add('error', 'FAILURE TO SCRAM', `The automatic trip (${r.tripCause}) did not insert the rods. SCRAM it manually now.`, { label: 'SCRAM', action: { kind: 'scram', id: b.id } });
  } else if (r.scrammed) {
    const ready = s.gameTime - r.scramTime >= 12 && r.inventory > 0.95 && r.power < 0.05 && r.temp < warnTemp(b, mods, loc.ambient) * 0.97;
    add('error', `tripped — ${r.tripCause ?? r.scramReason}`,
      ready ? 'The cause has cleared. Reset the trip to restart (automatic rod control will bring it back up).' : 'Waiting for the plant to stabilise before the trip can be reset.',
      ready ? { label: 'Reset & restart', action: { kind: 'reset', id: b.id } } : undefined, 'trip');
  }

  // Fuel
  const empty = r.coreFuel <= 0.02 && !def.reactor!.onlineRefuel;
  if (empty) {
    add('error', 'out of fuel', 'The core is burnt out: there is no reactivity left to sustain a chain reaction. Lower the target to 0%, wait for shutdown, then refuel.',
      r.power > 0.05 ? { label: 'Set target 0%', action: { kind: 'setpoint', id: b.id, value: 0 } } : { label: 'Refuel', action: { kind: 'refuel', id: b.id } }, 'fuel');
  } else if (r.coreFuel < 0.15 && !def.reactor!.onlineRefuel) {
    add('warn', 'fuel nearly used up', `Core fuel ${pct(r.coreFuel)}: the reactor is coasting down and can't reach full power. Plan a refuelling outage (${refuelNeed(b)} assemblies).`, { label: 'Open', action: { kind: 'select', id: b.id } }, 'fuel');
  }
  if (def.reactor!.onlineRefuel && s.fuel < 1) add('error', 'no fuel to feed', 'Molten salt reactors draw fuel from stock continuously. Buy or make fuel assemblies.', { label: 'Buy fuel', action: { kind: 'buyFuel' } });

  // Actual power vs target
  let headline: string;
  let severity: Severity = 'ok';
  const target = Math.min(r.setpoint, powerLimit(b, st.treatedFactor).limit);
  if (r.scrammed || r.atws) {
    headline = `Tripped · ${pct(r.power)} power`;
    severity = 'error';
  } else if (r.setpoint < 0.01) {
    headline = r.power > 0.02 ? `Shutting down · ${pct(r.power)}` : 'Shut down (power target 0%)';
    severity = 'info';
    if (r.power <= 0.02 && !empty && r.coreFuel > 0.15) add('info', 'power target is 0%', 'Raise the power target to produce electricity.', { label: 'Set 100%', action: { kind: 'setpoint', id: b.id, value: 1 } }, 'zero');
  } else if (r.power >= target * 0.95) {
    headline = `At ${pct(r.power)} power · ${fmt(electricMW, 1)} MW`;
  } else {
    const headroom = p.fission ? reactivityHeadroom(b) : 1;
    if (empty) {
      headline = `Out of fuel · ${pct(r.power)} of ${pct(target)} target`;
      severity = 'error';
    } else if (p.fission && headroom < 0) {
      headline = `Can't go critical · ${pct(r.power)} of ${pct(target)}`;
      severity = 'warn';
      add('warn', 'not enough reactivity', r.xenon > 0.3
        ? `Xenon from the last shutdown is absorbing neutrons (${Math.round(r.xenon * 100)}% of equilibrium). It decays on its own — try again in a few minutes (xenon dead time).`
        : 'Even with all rods out there is too little reactivity. The fuel is too burnt up — refuel.', undefined, 'xenon');
    } else if (!r.autoRods) {
      headline = `Manual rods · ${pct(r.power)} of ${pct(target)}`;
      severity = 'warn';
      add('warn', 'manual rod control', 'Power only changes when you move the rods. Switch back to automatic rod control to follow the power target.', { label: 'Open', action: { kind: 'select', id: b.id } }, 'manual');
    } else if (p.boron && !r.autoBoron && r.rods > 0.95) {
      headline = `Held back by boron · ${pct(r.power)} of ${pct(target)}`;
      severity = 'warn';
      add('warn', 'boron too high', 'The rods are fully out but there is still too much boron. Dilute, or switch automatic boron back on.', { label: 'Open', action: { kind: 'select', id: b.id } }, 'boron');
    } else if (r.period > 0 && Number.isFinite(r.period)) {
      const eta = r.period * Math.log(Math.max(1.0001, target / Math.max(1e-6, r.power))) + Math.max(0, (0.9 - r.rods) / p.rodSpeed) * 0.3;
      headline = r.power < 0.01 ? `Starting up · ~${mins(eta)} to ${pct(target)}` : `Raising power · ${pct(r.power)} → ${pct(target)}`;
      severity = 'info';
      if (r.power < 0.01) add('info', 'starting up', `The chain reaction is building up from the neutron source (period ${Math.round(r.period)} s). Electricity starts flowing above ~1% power, about ${mins(eta)} to reach the target.`, undefined, 'startup');
    } else {
      headline = `Withdrawing rods · ${pct(r.power)} of ${pct(target)}`;
      severity = 'info';
    }
  }

  // Health
  if (r.failedRods > 0) add(r.power > advisoryLimit(r.failedRods) + 0.02 ? 'error' : 'warn', `${r.failedRods} leaking fuel rod${r.failedRods > 1 ? 's' : ''}`,
    `Keep power below ${Math.round(advisoryLimit(r.failedRods) * 100)}% (fines are much higher above it) and replace them at the next refuelling.`, { label: 'Open', action: { kind: 'select', id: b.id } }, 'rods');
  if (r.inventory < 0.97 && !p.drainable && p.fission) add('error', `coolant level ${Math.round(r.inventory * 100)}%`, 'Coolant is boiling off. Restore pump power or cooling immediately — below ~60% the core uncovers and the fuel overheats.', undefined, 'level');
  if (r.temp > warnTemp(b, mods, loc.ambient) && !r.scrammed) add('warn', 'running hot', 'Coolant temperature is near the trip limit. Reduce power or add cooling.', { label: 'Open', action: { kind: 'select', id: b.id } }, 'hot');
  if (b.condition < 30) add('warn', `condition ${Math.round(b.condition)}%`, 'Worn equipment loses output and makes a failure-to-scram more likely.', { label: 'Repair', action: { kind: 'repair', id: b.id } }, 'cond');

  const worst = issues.reduce<Severity>((w, i) => (rank(i.severity) > rank(w) ? i.severity : w), severity);
  return { headline, severity: worst, electricMW, issues };
}

function rank(s: Severity): number {
  return s === 'error' ? 3 : s === 'warn' ? 2 : s === 'info' ? 1 : 0;
}

/** Every issue across all sites, worst first. */
export function diagnose(s: GameState): Issue[] {
  const out: Issue[] = [];
  for (const id of s.unlockedSites) out.push(...diagnoseSite(s, s.sites[id]));
  out.push(...diagnoseCompany(s));
  return out.sort((a, b) => rank(b.severity) - rank(a.severity));
}

export function diagnoseSite(s: GameState, site: Site): Issue[] {
  const st = site.stats;
  const out: Issue[] = [];
  const add = (system: SystemId, severity: Severity, title: string, detail: string, fix?: Issue['fix'], buildingId?: number) =>
    out.push({ key: `${site.id}:${system}:${title}`, severity, system, siteId: site.id, title, detail, fix, buildingId });

  for (const b of site.buildings) if (b.reactor) out.push(...reactorStatus(s, site, b).issues);

  // Heat → steam → electricity → grid chain
  const reactorsRunning = site.buildings.some((b) => b.reactor && b.status === 'active' && b.reactor.power > 0.02);
  if (reactorsRunning && st.steamCapMW <= 0.1) add('turbines', 'error', 'No working turbine hall', 'Reactors make heat, but without a turbine none of it becomes electricity.', { label: 'Build turbine', action: { kind: 'build', type: 'turbine' } });
  else if (st.thermalMW > st.steamCapMW * 1.02 && st.steamCapMW > 0) add('turbines', 'warn', 'Turbines are full', `${fmt(st.thermalMW - st.steamCapMW)} MW of heat is wasted because turbine capacity is too small.`, { label: 'Build', action: { kind: 'panel', panel: 'build' } });
  if (st.heatRejectMW > 0.5 && st.coolingRatio < 1) add('cooling', 'error', 'Cooling overloaded', 'More waste heat than the cooling can reject: reactors heat up and will trip. Lower power or add cooling.', { label: 'Build cooling', action: { kind: 'panel', panel: 'build' } });
  else if (st.heatRejectMW > 0.5 && st.coolingRatio < 1.1) add('cooling', 'warn', 'Cooling margin thin', 'A heatwave or one broken cooling unit could cause a trip.', { label: 'Build cooling', action: { kind: 'panel', panel: 'build' } });
  if (st.waterFactor < 0.999) add('water', 'error', 'Cooling towers short of water', `Only ${Math.round(st.waterFactor * 100)}% of the evaporation is replaced, so wet cooling is reduced.`, { label: 'Water supply', action: { kind: 'panel', panel: 'supply' } });
  if (st.treatedFactor < 0.999) add('water', 'warn', 'Not enough demineralised water', 'Reactors are derated until a Water Treatment Plant covers demand.', { label: 'Build treatment', action: { kind: 'build', type: 'water_treatment' } });
  if (!st.offsitePower) add('grid', st.pumpsPowered ? 'warn' : 'error', st.pumpsPowered ? 'Grid lost — on diesel power' : 'STATION BLACKOUT',
    st.pumpsPowered ? 'No electricity can be sold until the grid returns; diesel generators keep the cooling running.'
      : st.batteryLeft > 0 ? `Battery-backed emergency feedwater is cooling the reactors for another ${Math.ceil(st.batteryLeft)} s. If the grid isn't back by then, decay heat will boil off the coolant.`
      : 'Batteries exhausted: decay heat is boiling off the coolant. Large reactors may suffer core damage!');
  else if (st.curtailedMW > 0.5) add('grid', 'warn', 'Electricity curtailed', `${fmt(st.curtailedMW, 1)} MW can't be exported. Add or upgrade substations.`, { label: 'Build substation', action: { kind: 'build', type: 'substation' } });
  else if (st.exportMW >= st.gridCapMW * 0.97 && st.demandMW > st.exportMW) add('grid', 'warn', 'Grid connection full', 'You could sell more with more substation capacity.', { label: 'Build substation', action: { kind: 'build', type: 'substation' } });
  if (st.staffFactor < 0.999) add('staff', 'warn', 'Understaffed', `${fmt(st.staffNeeded)} staff needed, room for ${fmt(st.staffCap)}. Output and research suffer.`, { label: 'Build admin', action: { kind: 'build', type: 'admin' } });
  if (st.backupNeedMW > 0 && st.backupMW < st.backupNeedMW && s.level >= 4) add('safety', 'warn', 'Not enough backup power',
    `A grid blackout would leave only ${fmt(st.backupMW, 1)} of ${fmt(st.backupNeedMW, 1)} MW for pumps — large reactors could suffer core damage.`,
    s.research.completed.includes('s_egen') ? { label: 'Build generators', action: { kind: 'build', type: 'generator_emergency' } } : { label: 'Research', action: { kind: 'panel', panel: 'research' } });
  const poolCap = poolCapacity(site);
  if (poolCap > 0 && site.spent.pool >= poolCap - 1) add('fuel', 'error', 'Spent fuel pool full', 'No reactor here can be refuelled until fuel moves into dry casks.', { label: 'Build dry casks', action: { kind: 'build', type: 'dry_cask' } });
  else if (poolCap > 0 && site.spent.pool > poolCap * 0.75) add('fuel', 'warn', 'Spent fuel pool filling up', `${fmt(site.spent.pool)} of ${fmt(poolCap)} slots used. Build Dry Cask Storage.`, { label: 'Build dry casks', action: { kind: 'build', type: 'dry_cask' } });

  for (const b of site.buildings) {
    const def = BUILDINGS[b.type];
    if (b.reactor) continue;
    if (b.status === 'broken') add('equipment', 'error', `${def.short} broken`, 'It is offline until repaired.', { label: 'Repair', action: { kind: 'repair', id: b.id } }, b.id);
    else if (b.status === 'active' && b.condition < 25) add('equipment', 'warn', `${def.short} badly worn (${Math.round(b.condition)}%)`, 'Likely to break down soon.', { label: 'Repair', action: { kind: 'repair', id: b.id } }, b.id);
    else if (b.status === 'active' && !b.enabled) add('equipment', 'info', `${def.short} switched off`, 'It is not contributing.', { label: 'Open', action: { kind: 'select', id: b.id } }, b.id);
    if (b.type === 'uranium_mine' && b.status === 'active') {
      const out2 = mineOutput(b, site.id, getMods(s, site.id));
      if ((b.reserve ?? 1) <= 0) add('mining', 'warn', 'Mine exhausted', 'Upgrade the mine to dig deeper.', { label: 'Open', action: { kind: 'select', id: b.id } }, b.id);
      else if (out2.dig > 0 && out2.haul <= 0) add('mining', 'warn', 'Mine has no trucks', 'Excavators dig, but nothing hauls the ore out.', { label: 'Buy trucks', action: { kind: 'panel', panel: 'supply' } }, b.id);
      else if (out2.dig <= 0) add('mining', 'info', 'Mine has no excavators', 'Buy vehicles to start mining.', { label: 'Buy vehicles', action: { kind: 'panel', panel: 'supply' } }, b.id);
    }
  }
  return out;
}

export function diagnoseCompany(s: GameState): Issue[] {
  const out: Issue[] = [];
  const add = (system: SystemId, severity: Severity, title: string, detail: string, fix?: Issue['fix']) =>
    out.push({ key: `co:${system}:${title}`, severity, system, siteId: s.activeSite, title, detail, fix });
  let biggestReload = 0;
  let needingFuel = 0;
  for (const id of s.unlockedSites) for (const b of s.sites[id].buildings) {
    if (!b.reactor || b.status === 'destroyed' || BUILDINGS[b.type].reactor!.onlineRefuel) continue;
    biggestReload = Math.max(biggestReload, Math.ceil(coreSize(b) / 3));
    if (b.reactor.coreFuel < 0.15) needingFuel++;
  }
  if (s.fuel < 1 && (needingFuel > 0 || s.supply.rates.burn > 0)) add('fuel', 'error', 'No fuel assemblies in stock', 'Reactors that run out cannot be refuelled. Buy assemblies or produce your own.', { label: 'Buy fuel', action: { kind: 'buyFuel' } });
  else if (needingFuel > 0 && s.fuel < biggestReload) add('fuel', 'warn', 'Low fuel stock', `${fmt(s.fuel)} assemblies in stock; a reload needs up to ${fmt(biggestReload)}.`, { label: 'Buy fuel', action: { kind: 'buyFuel' } });
  if (fuelCapacity(s) < biggestReload) add('fuel', 'warn', 'Fuel storage too small', `A third of your biggest core is ${fmt(biggestReload)} assemblies but you can only store ${fmt(fuelCapacity(s))}. Build Fuel Storage Facilities.`, { label: 'Build storage', action: { kind: 'build', type: 'fuel_depot' } });
  if (s.money < 0) add('finance', 'error', 'In debt', 'You can’t buy anything until money is positive again. Cut costs or sell surplus materials.', { label: 'Finances', action: { kind: 'panel', panel: 'manage' } });
  for (const c of s.contracts) {
    const elapsed = c.duration - c.remaining;
    const expected = c.mw * elapsed * HOURS_PER_SECOND;
    if (elapsed > 20 && c.delivered < expected * 0.9) add('grid', 'warn', `Behind on contract: ${c.client}`, `Delivered ${Math.round((c.delivered / Math.max(1, expected)) * 100)}% of schedule — below 90% at the end costs a penalty.`, { label: 'Market', action: { kind: 'panel', panel: 'market' } });
  }
  return out;
}

/** Systems with no warnings or errors, for the green "all good" list. */
export function healthySystems(issues: Issue[], s: GameState): SystemId[] {
  const serious = issues.filter((i) => i.severity === 'error' || i.severity === 'warn');
  const bad = new Set(serious.map((i) => i.system));
  // Reactor fuel problems (empty core, coasting down) also mean the fuel system isn't OK.
  if (serious.some((i) => i.key.endsWith(':fuel'))) bad.add('fuel');
  const all: SystemId[] = ['reactors', 'turbines', 'cooling', 'water', 'grid', 'fuel', 'staff', 'safety', 'equipment'];
  if (Object.values(s.sites).some((x) => x.buildings.some((b) => b.type === 'uranium_mine'))) all.push('mining');
  all.push('finance');
  return all.filter((x) => !bad.has(x));
}
