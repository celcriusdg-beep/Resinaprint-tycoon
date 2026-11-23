import type { Building, ReactorState, Modifiers } from '../types';
import { ASSEMBLY_MWH, HOURS_PER_SECOND, AMBIENT_TEMP, TEMP_TAU, TRIP_RISE, WARN_RISE, RESTART_DELAY } from '../constants';
import { BUILDINGS, levelMult } from '../buildings/defs';
import {
  physicsFor, reactivity, stepKinetics, stepXenon, autoRodStep, criticalRodPosition, xenonEquilibrium, rodInserted,
  type PhysicsParams,
} from './physics';
import { random } from '../rng';

// Reactor model built on simplified point kinetics (see physics.ts):
//  • Control rods (automatic or manual) and soluble boron set reactivity;
//    fuel and moderator temperature feedback, xenon and fuel burnup act on it.
//  • Fission heat plus two-group decay heat goes into the coolant, whose
//    temperature depends on how much heat the plant can reject.
//  • A reactor protection system trips (SCRAMs) the reactor on high flux,
//    short period, high temperature, low coolant level or loss of offsite
//    power. Very rarely an automatic trip fails (ATWS) and needs a manual SCRAM.
//  • If decay heat cannot be removed (no cooling, no pump power) the coolant
//    boils off, the core uncovers, the fuel overheats and the core is damaged.

const NO_LOAD_FRAC = 0.85; // hot standby temperature as a fraction of the nominal rise
const SAT_RISE = 1.35; // saturation (boiling) relative to the nominal rise

export function newReactorState(setpoint = 0.6): ReactorState {
  return {
    setpoint, power: 0, temp: AMBIENT_TEMP, decayHeat: 0, scrammed: false, scramReason: null, scramTime: -999,
    thermal: 0, fission: 0, noFuel: false, setback: false,
    coreFuel: 1, coreDefects: 0, failedRods: 0, pumpSpeed: 1, houseLoad: 0, resumeSetpoint: null, loading: 0, loadingDefects: 0,
    rods: 0, boron: 0, autoRods: true, rodTarget: 0, autoBoron: true, precursors: 1e-7, iodine: 0, xenon: 0, fuelTemp: AMBIENT_TEMP,
    inventory: 1, damage: 0, decay1: 0, decay2: 0, period: Infinity,
    rho: { fuel: 0, rods: 0, boron: 0, xenon: 0, doppler: 0, moderator: 0, void: 0, total: 0 },
    tripCause: null, atws: false, coreEnr: 4,
  };
}

export function exp1(dt: number, tau: number): number {
  return 1 - Math.exp(-dt / tau);
}

/** Assemblies in a full core at the reactor's current level. */
export function coreSize(b: Building): number {
  const def = BUILDINGS[b.type];
  return Math.round(def.reactor!.coreSize * levelMult(def, b.level));
}

/** Rated thermal output at this level, MW(th) (no condition penalty). */
export function ratedThermal(b: Building, mods: Modifiers): number {
  const def = BUILDINGS[b.type];
  return def.reactor!.thermalMW * levelMult(def, b.level) * mods.reactorOutput;
}

/** Full-power fission output including condition penalty, MW(th). */
export function reactorMaxThermal(b: Building, mods: Modifiers): number {
  const def = BUILDINGS[b.type];
  if (!def.reactor) return 0;
  return ratedThermal(b, mods) * conditionFactor(b.condition);
}

/** Equipment below 60% condition loses output gradually. */
export function conditionFactor(condition: number): number {
  return condition >= 60 ? 1 : 0.55 + 0.45 * (condition / 60);
}

/** Recommended maximum power with failed fuel rods (technical specification). */
export function advisoryLimit(failedRods: number): number {
  return failedRods > 0 ? Math.max(0.3, 1 - 0.12 * failedRods) : 1;
}

/** Hard limit the automatic controls respect (water chemistry). */
export function powerLimit(_b: Building, treatedFactor: number): { limit: number; reason: string | null } {
  if (treatedFactor < 0.999) return { limit: 0.5 + 0.5 * treatedFactor, reason: 'Water chemistry out of spec — derated' };
  return { limit: 1, reason: null };
}

function nominal(b: Building): number {
  return BUILDINGS[b.type].reactor!.nominalTemp;
}

export function tripTemp(b: Building, mods: Modifiers, ambient: number): number {
  return ambient + (nominal(b) - ambient) * (TRIP_RISE + mods.tripMargin);
}

export function warnTemp(b: Building, mods: Modifiers, ambient: number): number {
  return ambient + (nominal(b) - ambient) * (WARN_RISE + mods.tripMargin);
}

export function saturationTemp(b: Building, ambient: number): number {
  return ambient + (nominal(b) - ambient) * SAT_RISE;
}

export function noLoadTemp(b: Building, ambient: number): number {
  return ambient + (nominal(b) - ambient) * NO_LOAD_FRAC;
}

/** Moderator reactivity is referenced to hot zero power at design ambient. */
export function moderatorRef(b: Building): number {
  return AMBIENT_TEMP + (nominal(b) - AMBIENT_TEMP) * NO_LOAD_FRAC;
}

/**
 * Put a reactor into a consistent, critical steady state at relative power n:
 * equilibrium xenon and temperatures, rods in the upper band, boron (or rods)
 * set so total reactivity is zero. For n = 0 (a newly built reactor) it is
 * left subcritical: rods in and a boron shutdown margin.
 */
export function initEquilibrium(b: Building, ambient: number, n: number): void {
  const r = b.reactor!;
  const p = physicsFor(b.type);
  r.inventory = 1;
  r.damage = 0;
  r.tripCause = null;
  r.atws = false;
  if (!p.fission) {
    r.power = n;
    return;
  }
  const tc = noLoadTemp(b, ambient) + (nominal(b) - noLoadTemp(b, ambient)) * n;
  r.temp = tc;
  r.fuelTemp = tc + p.fuelDT * n;
  r.iodine = n;
  r.xenon = xenonEquilibrium(n);
  r.power = Math.max(1e-7, n);
  r.precursors = Math.max(1e-7, n);
  r.decay1 = 0.045 * n * BUILDINGS[b.type].reactor!.thermalMW;
  r.decay2 = 0.02 * n * BUILDINGS[b.type].reactor!.thermalMW;
  const rhoNoRods = (boron: number) => reactivity(p, { ...r, rods: 1, boron }, tc, moderatorRef(b)).total + p.rodWorth * rodInserted(1);
  if (n <= 0) {
    r.rods = 0;
    r.boron = p.boron ? Math.max(0, (rhoNoRods(0) - p.rodWorth * rodInserted(0.9)) / p.boronWorth + 120) : 0;
    r.rho = reactivity(p, r, tc, moderatorRef(b));
    return;
  }
  if (p.boron) {
    let ppm = 0;
    for (let i = 0; i < 8; i++) {
      const rho = reactivity(p, { ...r, rods: 0.9, boron: ppm }, tc, moderatorRef(b)).total;
      ppm = Math.max(0, ppm + rho / p.boronWorth);
    }
    r.boron = ppm;
    r.rods = ppm > 0 ? 0.9 : criticalRodPosition(p, rhoNoRods(0));
  } else {
    r.boron = 0;
    r.rods = criticalRodPosition(p, rhoNoRods(0));
  }
  r.rho = reactivity(p, r, tc, moderatorRef(b));
}

export interface ReactorStepInput {
  dt: number;
  mods: Modifiers;
  gameTime: number;
  ambient: number;
  treatedFactor: number;
  pumpsPowered: boolean;
  offsitePower: boolean;
  offline: boolean;
}

/** Physics substep: rods, boron, xenon, feedback and kinetics. */
function stepPhysics(b: Building, p: PhysicsParams, inp: ReactorStepInput, dt: number): void {
  const r = b.reactor!;
  const running = b.status === 'active' && b.enabled;
  const { limit } = powerLimit(b, inp.treatedFactor);
  const target = running ? Math.min(r.setpoint, limit) : 0;

  // Control rods
  if (r.scrammed && !r.atws) {
    r.rods = Math.max(0, r.rods - dt / 1.8); // gravity/spring insertion in ~2 s
  } else if (!running) {
    r.rods = Math.max(0, r.rods - p.rodSpeed * 3 * dt);
  } else if (!r.tripCause && r.autoRods) {
    // Normal shutdown: drive the bank fully in; otherwise regulate power.
    r.rods = target < 0.01 ? Math.max(0, r.rods - p.rodSpeed * dt) : autoRodStep(p, r.rods, r.power, target, r.rho.total, dt);
    r.rodTarget = r.rods;
  } else if (!r.autoRods && !r.tripCause) {
    const d = r.rodTarget - r.rods;
    r.rods += Math.max(-p.rodSpeed * dt, Math.min(p.rodSpeed * dt, d));
  }

  // After a trip or shutdown, chemistry control borates to keep a shutdown margin.
  if (p.boron && r.autoBoron && (r.scrammed || target < 0.01) && r.rho.total > -1500) r.boron = Math.min(2500, r.boron + 8 * dt);
  // Chemical shim: automatic boron keeps the rods in their upper band.
  if (p.boron && r.autoBoron && !r.scrammed && running && !r.tripCause && target >= 0.01) {
    const rate = 6 * dt; // ppm per second
    if (r.rods > 0.93 && r.power < target * 0.98) r.boron = Math.max(0, r.boron - rate);
    else if (r.rods < 0.72 && r.power >= target * 0.9) r.boron = Math.min(2500, r.boron + rate);
  }

  // Xenon & iodine
  [r.iodine, r.xenon] = stepXenon(r.iodine, r.xenon, r.power, dt);

  // Fuel temperature follows coolant + power. Uncovered fuel is barely cooled by
  // steam and heats up from decay heat until the cladding fails and the fuel melts.
  if (r.inventory < 0.6 && p.fission && !p.drainable) {
    const heatFrac = (r.decay1 + r.decay2 + r.fission) / Math.max(1, ratedThermal(b, inp.mods));
    const exposed = (0.6 - r.inventory) / 0.6;
    r.fuelTemp += heatFrac * exposed * 4000 * dt - (r.fuelTemp - r.temp) * 0.002 * dt;
  } else {
    r.fuelTemp += (r.temp + p.fuelDT * r.power - r.fuelTemp) * exp1(dt, r.power > 1.5 ? 0.3 : 2.5);
  }

  // Reactivity and kinetics
  r.rho = reactivity(p, r, r.temp, moderatorRef(b));
  if (r.coreFuel <= 0.0005) r.rho.total = Math.min(r.rho.total, -2000);
  const k = stepKinetics(p, r.power, r.precursors, r.rho.total, dt);
  r.power = k.n;
  r.precursors = k.S;
  // Period meter: the stable period (β − ρ)/(λρ); prompt critical reads ~0.1 s.
  const rho = r.rho.total;
  r.period = Math.abs(rho) < 1 ? Infinity : rho >= 0.95 * p.beta ? 0.1 : (p.beta - rho) / (p.lambda * rho);
}

/** First half of the step: power and heat. */
export function stepReactorPower(b: Building, inp: ReactorStepInput): void {
  const r = b.reactor!;
  const def = BUILDINGS[b.type];
  const spec = def.reactor!;
  const p = physicsFor(b.type);
  const running = b.status === 'active' && b.enabled;
  r.noFuel = running && r.coreFuel <= 0.001;

  if (!p.fission) {
    // Fusion: plasma power follows the setpoint; no chain reaction, no xenon, no decay-heat hazard.
    let target = r.setpoint;
    if (!running || r.scrammed) target = 0;
    const ramp = spec.rampRate * inp.mods.rampRate * inp.dt;
    r.power += r.scrammed ? -r.power * exp1(inp.dt, 0.5) : Math.max(-ramp * 1.5, Math.min(ramp, target - r.power));
    if (r.power < 1e-4) r.power = 0;
    r.rods = r.power;
    r.period = Infinity;
  } else {
    // Substep the kinetics for stability during coarse (offline) steps.
    const n = Math.max(1, Math.ceil(inp.dt / 0.25));
    for (let i = 0; i < n; i++) stepPhysics(b, p, inp, inp.dt / n);
  }

  const rated = reactorMaxThermal(b, inp.mods);
  r.fission = r.power < 1e-4 ? 0 : r.power * rated;
  // Two-group decay heat (≈6.5% at equilibrium): short- and long-lived fission products.
  r.decay1 += (0.045 * r.fission - r.decay1) * exp1(inp.dt, 10);
  r.decay2 += (0.02 * r.fission - r.decay2) * exp1(inp.dt, 150);
  r.decayHeat = p.fission ? r.decay1 + r.decay2 : 0;
  r.thermal = r.fission + r.decayHeat;

  // Burnup: higher enrichment packs more energy into each assembly.
  if (!spec.onlineRefuel && r.fission > 0 && r.coreFuel > 0) {
    const energy = ASSEMBLY_MWH * (r.coreEnr / 4);
    const burned = (r.fission * HOURS_PER_SECOND * inp.dt * spec.fuelUse * inp.mods.fuelUse) / energy;
    r.coreFuel = Math.max(0, r.coreFuel - burned / Math.max(1, coreSize(b)));
  }
  // Coolant pumps draw power roughly with the cube of their speed (less in shutdown cooling).
  const pumpScale = running && r.power > 0.02 ? 1 : 0.3;
  r.houseLoad = b.status === 'destroyed' ? 0 : ratedThermal(b, inp.mods) * 0.012 * Math.pow(r.pumpSpeed, 3) * pumpScale;
  r.setback = false;
}

export interface TempResult {
  tripped: string | null;
  atws: boolean;
  damaged: boolean;
}

/** Second half: coolant temperature, inventory, protection system and core damage. */
export function stepReactorTemp(b: Building, inp: ReactorStepInput, coolingRatio: number): TempResult {
  const r = b.reactor!;
  const p = physicsFor(b.type);
  const rated = Math.max(1, ratedThermal(b, inp.mods));
  const res: TempResult = { tripped: null, atws: false, damaged: false };
  const tNoLoad = noLoadTemp(b, inp.ambient);
  const tNom = nominal(b);
  const tSat = saturationTemp(b, inp.ambient);

  // Heat removal: the plant's cooling when pumps run, natural circulation otherwise.
  // Natural circulation needs water over the core: it fails as the level drops.
  const levelFactor = p.drainable ? 1 : Math.max(0, Math.min(1, (r.inventory - 0.3) / 0.5));
  const passive = (p.passive + inp.mods.passiveCooling) * rated * levelFactor;
  const removable = inp.pumpsPowered
    ? r.thermal * Math.min(1, coolingRatio * (0.85 + 0.15 * r.pumpSpeed)) + passive * 0.5
    : passive;
  const excess = Math.max(0, r.thermal - removable);
  const ratio = r.thermal > 0.001 ? removable / r.thermal : 10;
  const load = r.thermal / (rated * 1.065);
  const shortfall = ratio >= 1 ? 1 : 1 / Math.max(ratio, 0.12);
  // Pumps keep the primary circuit at hot standby; without them only decay heat warms it.
  const base = inp.pumpsPowered ? tNoLoad - inp.ambient : 0;
  const rise = (base + (tNom - tNoLoad) * load * Math.pow(1 / r.pumpSpeed, 0.35)) * Math.pow(shortfall, 1.25)
    + (inp.pumpsPowered ? 0 : (tNom - inp.ambient) * Math.min(3, load * 8));
  let target = inp.ambient + rise;
  if (excess > 0.001 && (!inp.pumpsPowered || ratio < 0.5)) {
    // Energy balance: heat that cannot be removed warms the coolant until it boils.
    target = Math.max(target, tSat + 15);
    r.temp = Math.min(target, r.temp + (excess / rated) * 400 * inp.dt);
  } else {
    r.temp += (target - r.temp) * exp1(inp.dt, TEMP_TAU);
  }
  if (r.inventory > 0) r.temp = Math.min(r.temp, tSat + 15); // boiling pins the temperature near saturation

  // Boil-off and emergency core cooling (light-water designs)
  if (!p.drainable && p.fission) {
    if (r.temp >= tSat - 2 && excess > 0) r.inventory -= (excess / rated) * 0.35 * inp.dt;
    if (inp.pumpsPowered && r.inventory < 1) r.inventory = Math.min(1, r.inventory + 0.05 * inp.dt);
    r.inventory = Math.max(0, r.inventory);
    // Fuel damage: zirconium cladding oxidises above ~1200 °C; UO₂ melts near 2800 °C.
    const dmg = (Math.max(0, r.fuelTemp - 1200) / 1600) * 0.06 + (r.fuelTemp > 2800 ? 0.6 : 0);
    if (dmg > 0) r.damage = Math.min(1, r.damage + dmg * inp.dt);
    if (r.damage >= 1 && b.status !== 'destroyed') res.damaged = true;
  }

  // Reactor protection system
  if (!r.scrammed && !r.tripCause && b.status === 'active') {
    const trip = tripTemp(b, inp.mods, inp.ambient);
    let cause: string | null = null;
    if (p.fission && r.power > 1.18) cause = 'High neutron flux';
    else if (p.fission && r.period > 0 && r.period < 10 && r.power > 1e-3) cause = 'Short reactor period';
    else if (r.temp > trip) cause = 'High coolant temperature';
    else if (r.inventory < 0.85) cause = 'Low coolant level';
    else if (!inp.offsitePower && r.power > 0.02) cause = 'Loss of offsite power (turbine trip)';
    if (cause) {
      // A worn protection system occasionally fails to insert the rods (ATWS).
      const failP = inp.offline ? 0 : b.condition < 25 ? 0.05 : b.condition < 40 ? 0.01 : 0.0005;
      if (p.fission && random() < failP) {
        r.atws = true;
        r.tripCause = cause;
        res.atws = true;
      } else {
        scram(r, cause, inp.gameTime);
      }
      res.tripped = cause;
    }
  }
  return res;
}

export function scram(r: ReactorState, reason: string, gameTime: number): void {
  r.scrammed = true;
  r.atws = false;
  r.scramReason = reason;
  r.tripCause = reason;
  r.scramTime = gameTime;
}

/** Trip may be reset once the cause has cleared and the plant has stabilised. */
export function canRestart(b: Building, mods: Modifiers, gameTime: number, ambient: number): boolean {
  const r = b.reactor;
  if (!r || !r.scrammed) return false;
  if (b.status !== 'active') return false;
  if (gameTime - r.scramTime < RESTART_DELAY) return false;
  return r.temp < warnTemp(b, mods, ambient) * 0.97 && r.inventory > 0.95 && r.power < 0.05;
}

/** Reset the trip. Automatic rod control then takes the reactor back up if there is enough reactivity. */
export function restart(b: Building): void {
  const r = b.reactor!;
  r.scrammed = false;
  r.scramReason = null;
  r.tripCause = null;
  r.atws = false;
  r.autoRods = true;
  r.setpoint = Math.max(0.3, Math.min(r.setpoint, 0.5));
}

/** Reactor can be refuelled now (shut down and not already in an outage). */
export function canRefuel(b: Building): string | null {
  const r = b.reactor;
  if (!r) return 'Not a reactor.';
  const spec = BUILDINGS[b.type].reactor!;
  if (spec.onlineRefuel) return 'This design refuels itself continuously.';
  if (b.status === 'refueling') return 'Already refuelling.';
  if (b.status === 'destroyed') return 'Reactor destroyed.';
  if (b.status !== 'active') return 'Reactor must be operational.';
  if (r.coreFuel > 0.98 && r.failedRods === 0) return 'Core is already full.';
  if (r.power > 0.05) return 'Shut the reactor down first (setpoint 0% or SCRAM).';
  return null;
}

/**
 * Reactivity available with all rods withdrawn and (for boron plants) all boron
 * removed, at the current xenon and temperatures. Negative ⇒ the reactor cannot
 * be made critical right now (e.g. xenon peak after a trip, or exhausted fuel).
 */
export function reactivityHeadroom(b: Building): number {
  const r = b.reactor!;
  return r.rho.total - r.rho.rods - r.rho.boron;
}
