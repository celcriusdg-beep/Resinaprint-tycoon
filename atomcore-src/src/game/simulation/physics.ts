import type { BuildingType } from '../types';

// ─────────────────────────────────────────────────────────────────────────
// Simplified, educational reactor physics.
//
//  • Point kinetics with one delayed-neutron group and the prompt-jump
//    approximation: below prompt criticality, power follows the precursors
//    with the classic stable period T ≈ (β − ρ) / (λ ρ). At or above
//    ρ ≈ β the reactor is prompt critical and power rises extremely fast
//    until fuel-temperature (Doppler) feedback stops it.
//  • Reactivity balance (pcm = 10⁻⁵ Δk/k):
//      ρ = fuel excess − control rods − soluble boron − xenon
//          + Doppler (fuel temperature) + moderator (coolant temperature)
//          + void/flow (BWR)
//  • I-135 → Xe-135 chain with real half-lives (6.6 h, 9.1 h) on the game
//    clock (1 real second = 6 game minutes), including xenon burnout: after
//    a shutdown xenon peaks and can prevent a restart for a while.
//  • Two-group decay heat that must be removed after shutdown.
//
// Numbers are representative textbook magnitudes, tuned for play. This is
// not engineering software and not a description of real procedures.
// ─────────────────────────────────────────────────────────────────────────

export interface PhysicsParams {
  fission: boolean;
  beta: number; // delayed-neutron fraction, pcm
  lambda: number; // one-group precursor decay constant, 1/s (real time)
  rodWorth: number; // total control-rod bank worth, pcm
  rodSpeed: number; // fraction of full stroke per second
  boron: boolean; // uses soluble boron (chemical shim)
  boronWorth: number; // pcm per ppm
  rhoBOL: number; // excess reactivity of a fresh core (hot, no xenon), pcm
  doppler: number; // fuel-temperature power defect at full power, pcm
  fuelDT: number; // fuel centreline temperature rise over coolant at full power, °C
  alphaM: number; // moderator temperature coefficient at zero boron, pcm/°C
  xenonWorth: number; // equilibrium xenon worth at full power, pcm
  voidCoeff: number; // BWR: reactivity per unit change in recirculation flow, pcm
  passive: number; // heat removal without pumps, fraction of rated thermal
  containment: boolean;
  drainable: boolean; // molten salt: fuel drains to passively cooled tanks
}

const P = (p: Partial<PhysicsParams>): PhysicsParams => ({
  fission: true, beta: 650, lambda: 0.08, rodWorth: 8000, rodSpeed: 0.015, boron: false, boronWorth: 0,
  rhoBOL: 9000, doppler: 1500, fuelDT: 600, alphaM: -30, xenonWorth: 2800, voidCoeff: 0, passive: 0.003,
  containment: true, drainable: false, ...p,
});

export const PHYSICS: Record<string, PhysicsParams> = {
  // Small pool-type experimental reactor: rods only, strong passive cooling.
  reactor_pilot: P({ rodWorth: 5200, rodSpeed: 0.03, rhoBOL: 3800, doppler: 500, fuelDT: 250, alphaM: -18, xenonWorth: 1400, passive: 0.08 }),
  // Integral PWR module: boron, natural-circulation decay heat removal.
  reactor_smr: P({ rodWorth: 6500, rodSpeed: 0.02, boron: true, boronWorth: 9, rhoBOL: 9500, doppler: 1300, fuelDT: 550, alphaM: -32, xenonWorth: 2600, passive: 0.07 }),
  reactor_pwr: P({ rodWorth: 8000, rodSpeed: 0.012, boron: true, boronWorth: 10, rhoBOL: 11500, doppler: 1500, fuelDT: 650, alphaM: -38, xenonWorth: 2800, passive: 0.003 }),
  // BWR: no soluble boron in normal operation; power is also trimmed with recirculation flow (voids).
  reactor_bwr: P({ rodWorth: 13000, rodSpeed: 0.012, rhoBOL: 8500, doppler: 1400, fuelDT: 650, alphaM: -25, xenonWorth: 2600, voidCoeff: 1400, passive: 0.004 }),
  // Molten salt: circulating fuel loses some delayed neutrons (lower β), off-gas removes most xenon,
  // strong negative temperature feedback, fuel drains to passively cooled tanks.
  reactor_msr: P({ beta: 330, rodWorth: 3500, rodSpeed: 0.02, rhoBOL: 3200, doppler: 900, fuelDT: 120, alphaM: -75, xenonWorth: 350, passive: 0.2, drainable: true }),
  reactor_fusion: P({ fission: false, passive: 1, containment: true }),
};

export function physicsFor(type: BuildingType): PhysicsParams {
  return PHYSICS[type] ?? PHYSICS.reactor_pwr;
}

/** Excess reactivity needed to hold full power at equilibrium xenon. */
export function rhoFullPower(p: PhysicsParams): number {
  return p.doppler + p.xenonWorth;
}

/**
 * Fuel excess reactivity versus remaining core fuel f (0..1). Calibrated so a
 * core can just hold full power with zero boron at f = 0.15; below that the
 * plant "coasts down" in power until refuelled. Higher enrichment raises it.
 */
export function rhoFuel(p: PhysicsParams, f: number, enrichment: number): number {
  const full = rhoFullPower(p);
  const bol = p.rhoBOL * Math.pow(enrichment / 4, 0.5);
  return full + (bol - full) * ((Math.max(0, f) - 0.15) / 0.85);
}

/** Fraction of the rod bank worth inserted at position h (S-shaped integral worth). */
export function rodInserted(h: number): number {
  const x = Math.max(0, Math.min(1, h));
  return 1 - (x - Math.sin(2 * Math.PI * x) / (2 * Math.PI));
}

/** d(inserted fraction)/dh, magnitude (differential rod worth shape). */
export function rodDifferential(h: number): number {
  return 1 - Math.cos(2 * Math.PI * Math.max(0, Math.min(1, h)));
}

/** Moderator coefficient becomes less negative as boron concentration rises. */
export function moderatorCoefficient(p: PhysicsParams, boronPpm: number): number {
  return p.alphaM + (p.boron ? 0.022 * boronPpm : 0);
}

// Xenon constants (per real second; game clock 0.1 h/s): λ = ln2 / (t½ × 10)
export const LAMBDA_I = Math.LN2 / 66;
export const LAMBDA_X = Math.LN2 / 91;
/** Xenon burnout rate at full flux, relative to decay. Sets the post-trip peak. */
export const BURNOUT = 2.8 * LAMBDA_X;
const XE_DIRECT = 0.05;

/** Equilibrium xenon (fraction of full-power equilibrium) at relative power n. */
export function xenonEquilibrium(n: number): number {
  return (n * (LAMBDA_X + BURNOUT)) / (LAMBDA_X + BURNOUT * n);
}

export function stepXenon(iodine: number, xenon: number, n: number, dt: number): [number, number] {
  const nn = Math.max(0, Math.min(1.5, n));
  const I = iodine + (nn - iodine) * (1 - Math.exp(-LAMBDA_I * dt));
  const production = (LAMBDA_X + BURNOUT) * (XE_DIRECT * nn + (1 - XE_DIRECT) * iodine);
  const removal = LAMBDA_X + BURNOUT * nn;
  // Exact solution of dX/dt = production − removal·X over dt (production frozen)
  const xeq = production / removal;
  const X = xeq + (xenon - xeq) * Math.exp(-removal * dt);
  return [I, Math.max(0, X)];
}

/** Total reactivity breakdown (pcm). */
export function reactivity(
  p: PhysicsParams,
  s: { rods: number; boron: number; xenon: number; fuelTemp: number; coreFuel: number; coreEnr: number; pumpSpeed: number },
  coolantTemp: number,
  nominalTemp: number,
) {
  const fuel = rhoFuel(p, s.coreFuel, s.coreEnr);
  const rods = -p.rodWorth * rodInserted(s.rods);
  const boron = p.boron ? -p.boronWorth * s.boron : 0;
  const xenon = -p.xenonWorth * s.xenon;
  // Doppler: fuel hotter than the coolant it sits in (power-dependent part)
  const doppler = -p.doppler * ((s.fuelTemp - coolantTemp) / Math.max(1, p.fuelDT));
  const moderator = Math.max(-5000, Math.min(2500, moderatorCoefficient(p, s.boron) * (coolantTemp - nominalTemp)));
  const voidR = p.voidCoeff * (s.pumpSpeed - 1);
  const total = fuel + rods + boron + xenon + doppler + moderator + voidR;
  return { fuel, rods, boron, xenon, doppler, moderator, void: voidR, total };
}

/**
 * One kinetics step. Returns the new relative power n and precursor level S.
 * Prompt-jump approximation below 0.95β; fast exponential growth above.
 */
export function stepKinetics(p: PhysicsParams, n: number, S: number, rho: number, dt: number): { n: number; S: number } {
  const beta = p.beta;
  const floor = 1e-3; // start-up neutron sources keep the core in the source range
  if (rho < 0.95 * beta) {
    const nNew = (beta * S) / (beta - rho);
    // dS/dt = λ (n − S) with n = βS/(β−ρ)  ⇒  S grows with rate λρ/(β−ρ)
    const rate = (p.lambda * rho) / (beta - rho);
    const S2 = Math.max(floor, S * Math.exp(Math.max(-2, Math.min(2, rate * dt))));
    return { n: Math.max(floor, Math.min(10, (beta * S2) / (beta - rho))), S: S2 || nNew };
  }
  // Prompt critical: power multiplies within fractions of a second (clamped for stability).
  const growth = Math.min(Math.log(4), ((rho - 0.95 * beta) / (0.05 * beta) + 1) * dt * 6);
  const n2 = Math.min(10, Math.max(n, S * 20) * Math.exp(growth));
  return { n: n2, S: Math.min(10, S + (n2 - S) * Math.min(1, p.lambda * dt * 5)) };
}

/** Rod position change an automatic controller makes to reach a power target. */
export function autoRodStep(p: PhysicsParams, h: number, n: number, target: number, rho: number, dt: number): number {
  // Aim for a gentle reactivity: positive when power is below target (~60 s period), negative above.
  const ratio = Math.log(Math.max(1e-6, target) / Math.max(1e-7, n));
  // Up: at most ~0.3β (period ≳ 25 s). Down: up to −0.6β. Tapering near the target avoids overshoot.
  // Startups from the source range are allowed a somewhat faster period (~20 s),
  // keeping a wide margin to the 10 s short-period trip.
  const up = n < 0.01 ? 0.4 : 0.36;
  const desired = ratio >= 0 ? up * p.beta * Math.tanh(3 * ratio) : 0.6 * p.beta * Math.tanh(3 * ratio);
  const diff = p.rodWorth * Math.max(0.15, rodDifferential(h));
  const dh = (desired - rho) / diff;
  const step = Math.max(-p.rodSpeed * dt, Math.min(p.rodSpeed * dt, dh));
  return Math.max(0, Math.min(1, h + step));
}

/** Rod position that makes the core exactly critical with everything else fixed (bisection). */
export function criticalRodPosition(p: PhysicsParams, rhoWithoutRods: number): number {
  if (rhoWithoutRods <= 0) return 1;
  if (rhoWithoutRods >= p.rodWorth) return 0;
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const rho = rhoWithoutRods - p.rodWorth * rodInserted(mid);
    if (rho > 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}
