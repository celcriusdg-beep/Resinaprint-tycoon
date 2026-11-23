import type { Building, ReactorState, Modifiers } from '../types';
import { BUILDINGS, levelMult } from '../buildings/defs';
import {
  AMBIENT_TEMP, DECAY_HEAT_FRACTION, DECAY_HEAT_TAU, TEMP_TAU, TRIP_RISE, WARN_RISE, RESTART_DELAY,
} from '../constants';

// Simplified educational reactor model (not engineering-accurate):
//  • Fission power follows the operator setpoint at a limited ramp rate,
//    standing in for control-rod reactivity changes.
//  • Decay heat from fission products tracks ~6.5% of fission power and
//    decays exponentially after shutdown, so heat must still be removed.
//  • Coolant temperature rises with heat load and with any shortfall in
//    plant cooling capacity. Above the trip limit, the protection system
//    SCRAMs the reactor (fission power drops to zero quickly).

export function newReactorState(setpoint = 0.6): ReactorState {
  return {
    setpoint, power: 0, temp: AMBIENT_TEMP, decayHeat: 0, scrammed: false, scramReason: null, scramTime: -999,
    thermal: 0, fission: 0, noFuel: false, setback: false,
  };
}

export function exp1(dt: number, tau: number): number {
  return 1 - Math.exp(-dt / tau);
}

/** Full-power fission output of a reactor at its level, MW(th). */
export function reactorMaxThermal(b: Building, mods: Modifiers): number {
  const def = BUILDINGS[b.type];
  if (!def.reactor) return 0;
  return def.reactor.thermalMW * levelMult(def, b.level) * mods.reactorOutput * conditionFactor(b.condition);
}

/** Equipment below 60% condition loses output gradually. */
export function conditionFactor(condition: number): number {
  return condition >= 60 ? 1 : 0.55 + 0.45 * (condition / 60);
}

export function tripTemp(b: Building, mods: Modifiers, ambient: number): number {
  const nominal = BUILDINGS[b.type].reactor!.nominalTemp;
  return ambient + (nominal - ambient) * (TRIP_RISE + mods.tripMargin);
}

export function warnTemp(b: Building, mods: Modifiers, ambient: number): number {
  const nominal = BUILDINGS[b.type].reactor!.nominalTemp;
  return ambient + (nominal - ambient) * (WARN_RISE + mods.tripMargin);
}

export interface ReactorStepInput {
  dt: number;
  mods: Modifiers;
  fuelAvailable: boolean;
  gameTime: number;
  ambient: number;
}

/** First half of the step: power and heat. Temperature is updated afterwards
 *  once the plant-wide cooling balance is known. */
export function stepReactorPower(b: Building, inp: ReactorStepInput): void {
  const r = b.reactor!;
  const def = BUILDINGS[b.type];
  const spec = def.reactor!;
  const running = b.status === 'active' && b.enabled;
  r.noFuel = running && !inp.fuelAvailable;
  let target = r.setpoint;
  if (!running || r.scrammed || r.noFuel) target = 0;
  if (r.scrammed) {
    // Control rods fully inserted: power collapses within a couple of seconds.
    r.power += (0 - r.power) * exp1(inp.dt, 0.7);
  } else {
    const ramp = spec.rampRate * inp.mods.rampRate * inp.dt;
    r.power += Math.max(-ramp * 1.5, Math.min(ramp, target - r.power));
  }
  if (r.power < 1e-4) r.power = 0;
  const maxTh = reactorMaxThermal(b, inp.mods);
  r.fission = r.power * maxTh;
  r.decayHeat += (DECAY_HEAT_FRACTION * r.fission - r.decayHeat) * exp1(inp.dt, DECAY_HEAT_TAU);
  r.thermal = r.fission + r.decayHeat;
}

/** Second half: temperature response, automatic setback and trip. Returns true if it SCRAMmed this step. */
export function stepReactorTemp(b: Building, inp: ReactorStepInput, coolingRatio: number): boolean {
  const r = b.reactor!;
  const spec = BUILDINGS[b.type].reactor!;
  const nominalTh = spec.thermalMW * levelMult(BUILDINGS[b.type], b.level) * inp.mods.reactorOutput;
  // Load relative to full-power heat including equilibrium decay heat.
  const load = nominalTh > 0 ? r.thermal / (nominalTh * (1 + DECAY_HEAT_FRACTION)) : 0;
  const shortfall = coolingRatio >= 1 ? 1 : 1 / Math.max(coolingRatio, 0.15);
  const rise = (spec.nominalTemp - inp.ambient) * (load > 0.002 ? 0.3 + 0.7 * load : load * 150) * Math.pow(shortfall, 1.25);
  const target = inp.ambient + rise;
  r.temp += (target - r.temp) * exp1(inp.dt, TEMP_TAU);

  const warn = warnTemp(b, inp.mods, inp.ambient);
  const trip = tripTemp(b, inp.mods, inp.ambient);
  r.setback = false;
  if (!r.scrammed && inp.mods.autoSetback && r.temp > warn && r.power > 0.05) {
    // Automatic setback: trim the setpoint until temperature recovers.
    r.setpoint = Math.max(0.05, r.setpoint - 0.06 * inp.dt);
    r.setback = true;
  }
  if (!r.scrammed && r.temp > trip) {
    scram(r, 'High coolant temperature', inp.gameTime);
    return true;
  }
  return false;
}

export function scram(r: ReactorState, reason: string, gameTime: number): void {
  r.scrammed = true;
  r.scramReason = reason;
  r.scramTime = gameTime;
}

export function canRestart(b: Building, mods: Modifiers, gameTime: number, ambient: number): boolean {
  const r = b.reactor;
  if (!r || !r.scrammed) return false;
  if (gameTime - r.scramTime < RESTART_DELAY) return false;
  return r.temp < warnTemp(b, mods, ambient) * 0.92 && b.status === 'active';
}

export function restart(b: Building): void {
  const r = b.reactor!;
  r.scrammed = false;
  r.scramReason = null;
  r.setpoint = Math.min(r.setpoint, 0.5);
}
