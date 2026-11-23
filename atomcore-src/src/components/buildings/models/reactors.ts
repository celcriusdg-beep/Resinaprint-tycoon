import * as THREE from 'three';
import { ModelBuilder } from '../builder';
import { materials } from '../materials';

// Reactor buildings. Units are metres; one grid cell is 4 m. Origin is the
// footprint centre at ground level.

function slab(b: ModelBuilder, w: number, d: number) {
  const m = materials();
  b.box(w - 0.3, 0.25, d - 0.3, m.concreteDark, [0, 0, 0]);
}

/** Aviation-marked ventilation stack with a red beacon. */
export function stack(b: ModelBuilder, x: number, z: number, h: number, r = 0.35) {
  const m = materials();
  const bands = 6;
  for (let i = 0; i < bands; i++) {
    b.cyl(r * (1 - i * 0.03), r * (1 - (i - 1) * 0.03), h / bands, i % 2 === 0 ? m.paintWhite : m.paintRed, [x, 0.25 + (i * h) / bands, z], 16);
  }
  b.cyl(r * 1.25, r * 1.25, 0.12, m.steelDark, [x, 0.25 + h * 0.66, z], 16);
  b.part(new THREE.SphereGeometry(0.1, 8, 6), m.beacon, [x, 0.25 + h + 0.08, z], { kind: 'beacon', phase: Math.random() * 6 });
  b.emit({ pos: [x, 0.25 + h, z], radius: r * 0.6, rate: 0.15, size: 0.8, kind: 'vapor' });
}

function windowsBand(b: ModelBuilder, w: number, y: number, z: number, n: number, mat: THREE.Material, rotY = 0) {
  const step = w / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + step * (i + 0.5);
    const px = rotY === 0 ? x : z;
    const pz = rotY === 0 ? z : x;
    b.box(step * 0.6, 0.45, 0.06, mat, [px, y, pz], rotY);
  }
}

/** Glowing Cherenkov ring (animated by reactor power). */
function cherenkovRing(b: ModelBuilder, r: number, y: number, x = 0, z = 0) {
  const m = materials();
  const mat = m.glowCyan.clone();
  b.part(new THREE.CylinderGeometry(r, r, 0.22, 32, 1, true), mat, [x, y, z], { kind: 'glow', material: mat });
}

export function pilotReactor(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 8, 8);
  // Reactor building: concrete drum with shallow dome
  const cx = -0.8, cz = -0.6;
  b.cyl(2.3, 2.3, 3.2, m.concrete, [cx, 0.25, cz], 32);
  b.cyl(2.42, 2.42, 0.18, m.steel, [cx, 3.3, cz], 32);
  b.dome(2.3, m.concrete, [cx, 3.45, cz], 0.45, 28);
  cherenkovRing(b, 2.32, 2.3, cx, cz);
  // Entrance airlock
  b.box(1.1, 1.6, 0.8, m.concreteDark, [cx, 0.25, cz + 2.4]);
  b.box(0.7, 1.2, 0.05, m.steelDark, [cx, 0.25, cz + 2.82]);
  // Annex / control building
  b.box(2.6, 2.2, 3.2, m.cladWhite, [2.3, 0.25, 1.6]);
  b.box(2.75, 0.18, 3.35, m.steelDark, [2.3, 2.45, 1.6]);
  windowsBand(b, 2.6, 1.4, 3.22, 3, m.windowGlow);
  // HVAC units on annex roof
  b.box(0.8, 0.5, 0.8, m.steel, [1.8, 2.63, 1.0]);
  b.box(0.8, 0.5, 0.8, m.steel, [2.8, 2.63, 2.2]);
  // Pipes from drum to annex
  b.pipe([cx + 2.2, 1.2, cz + 0.4], [1.1, 1.2, cz + 0.4], 0.14, m.pipeWhite);
  b.pipe([cx + 2.2, 0.8, cz + 0.9], [1.1, 0.8, cz + 0.9], 0.1, m.pipeBlue);
  stack(b, 2.7, -2.7, 6.5, 0.3);
  return b;
}

export function smrReactor(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 8, 8);
  // Module hall
  b.box(6.2, 3.6, 5.2, m.cladWhite, [0, 0.25, 0.9]);
  b.box(6.4, 0.25, 5.4, m.steelDark, [0, 3.85, 0.9]);
  b.box(6.22, 0.5, 5.22, m.cladBlue, [0, 2.6, 0.9]);
  windowsBand(b, 6.2, 1.6, 3.52, 5, m.windowGlow);
  // Containment module rising through the roof
  b.cyl(1.7, 1.7, 2.2, m.concrete, [-1.2, 3.9, 0.6], 28);
  b.dome(1.7, m.steel, [-1.2, 6.1, 0.6], 0.55);
  cherenkovRing(b, 1.72, 5.3, -1.2, 0.6);
  // Second module bay (future expansion pad)
  b.cyl(1.5, 1.5, 0.6, m.concreteDark, [1.6, 3.9, 0.6], 24);
  b.box(1.2, 0.8, 1.2, m.steel, [1.6, 4.5, 0.6]);
  // Crane rails on roof
  b.box(5.6, 0.12, 0.12, m.paintYellow, [0, 4.1, -1.2]);
  b.box(5.6, 0.12, 0.12, m.paintYellow, [0, 4.1, 2.9]);
  // Steam & feedwater lines
  b.pipe([3.1, 1.6, -1.0], [3.7, 1.6, -1.0], 0.2, m.pipeWhite);
  b.pipe([3.1, 1.0, -0.4], [3.7, 1.0, -0.4], 0.16, m.pipeBlue);
  b.box(1.6, 1.2, 1.4, m.steel, [-2.6, 0.25, -2.7]);
  stack(b, 2.8, -2.8, 7, 0.32);
  return b;
}

export function pwrReactor(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 12);
  const cx = -1.2, cz = -0.8;
  const r = 3.9;
  // Containment: cylinder + hemispherical dome
  b.cyl(r, r, 6.2, m.concrete, [cx, 0.25, cz], 40);
  b.cyl(r + 0.08, r + 0.08, 0.3, m.concreteDark, [cx, 6.3, cz], 40);
  b.dome(r, m.concrete, [cx, 6.45, cz], 0.85, 36);
  // Buttresses / tendon galleries
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    b.box(0.55, 6.2, 0.4, m.concreteDark, [cx + Math.cos(a) * (r + 0.1), 0.25, cz + Math.sin(a) * (r + 0.1)], -a);
  }
  // Equipment hatch
  b.pipe([cx + r * 0.62, 2.3, cz + r * 0.62], [cx + r * 0.78, 2.3, cz + r * 0.78], 0.9, m.steelDark, 20);
  // Dome aviation lights
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    b.part(new THREE.SphereGeometry(0.09, 6, 4), m.beacon, [cx + Math.cos(a) * r * 0.55, 6.45 + r * 0.85 * 0.83, cz + Math.sin(a) * r * 0.55], { kind: 'beacon', phase: i });
  }
  cherenkovRing(b, r + 0.02, 5.2, cx, cz);
  // Auxiliary building
  b.box(3.4, 4.2, 10.6, m.concreteWarm, [4.0, 0.25, 0]);
  b.box(3.55, 0.25, 10.75, m.steelDark, [4.0, 4.45, 0]);
  windowsBand(b, 10.6, 3.2, 5.72, 7, m.windowGlow, Math.PI / 2);
  b.box(1.2, 1.0, 1.6, m.steel, [3.6, 4.7, -3]);
  b.box(1.2, 1.0, 1.6, m.steel, [3.6, 4.7, 1.5]);
  // Fuel building
  b.box(4.4, 3.2, 2.8, m.cladGrey, [-1.5, 0.25, 4.3]);
  b.box(4.5, 0.2, 2.9, m.steelDark, [-1.5, 3.45, 4.3]);
  b.box(1.6, 2.2, 0.06, m.hazard, [-1.5, 0.25, 5.73]);
  // Main steam lines to the turbine side
  for (let i = 0; i < 2; i++) {
    b.pipe([cx + r, 3.2 + i * 0.6, cz - 1 + i * 0.8], [2.3, 3.2 + i * 0.6, cz - 1 + i * 0.8], 0.26, m.pipeWhite);
  }
  stack(b, 4.9, -5.1, 10, 0.42);
  return b;
}

export function bwrReactor(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 12);
  // Tall reactor building: concrete lower, steel superstructure upper
  b.box(7.2, 6, 7.2, m.concrete, [-1.2, 0.25, -1.2]);
  b.box(7.4, 0.3, 7.4, m.concreteDark, [-1.2, 6.25, -1.2]);
  b.box(7.0, 3.2, 7.0, m.cladGrey, [-1.2, 6.55, -1.2]);
  b.box(7.3, 0.3, 7.3, m.steelDark, [-1.2, 9.75, -1.2]);
  // Refuelling floor windows (glow)
  const glow = materials().glowCyan.clone();
  glow.emissiveIntensity = 1.5;
  for (const side of [-1, 1]) {
    b.part(new THREE.BoxGeometry(6.2, 0.35, 0.05), glow, [-1.2, 8.6, -1.2 + side * 3.52], { kind: 'glow', material: glow });
  }
  // Roof crane housing
  b.box(2, 0.8, 7.0, m.paintYellow, [-1.2, 10.05, -1.2]);
  // Turbine-side annex
  b.box(3.0, 4.6, 10.8, m.cladBlue, [4.3, 0.25, 0]);
  b.box(3.15, 0.25, 10.95, m.steelDark, [4.3, 4.85, 0]);
  windowsBand(b, 10.8, 3.6, 5.82, 8, m.windowGlow, Math.PI / 2);
  // Pressure suppression ring (torus) visible at base
  b.torus(4.6, 0.35, m.steel, [-1.2, 0.6, -1.2], [Math.PI / 2, 0, 0], 48, Math.PI);
  // Steam lines straight to the turbine
  b.pipe([2.4, 5.0, -2], [2.8, 5.0, -2], 0.3, m.pipeWhite);
  b.pipe([2.4, 5.0, -0.6], [2.8, 5.0, -0.6], 0.3, m.pipeWhite);
  b.box(2.2, 2.4, 2.2, m.concreteDark, [-4.0, 0.25, 4.1]);
  stack(b, -4.8, -5.0, 13, 0.45);
  return b;
}

export function msrReactor(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 12);
  // Hexagonal reactor hall with dark glass bands
  b.cyl(4.2, 4.6, 4.2, m.concreteWarm, [-0.8, 0.25, -0.8], 6);
  b.cyl(4.0, 4.0, 1.2, m.glass, [-0.8, 4.45, -0.8], 6);
  b.cyl(4.3, 4.3, 0.25, m.steelDark, [-0.8, 5.65, -0.8], 6);
  b.cyl(2.4, 3.2, 1.6, m.cladWhite, [-0.8, 5.9, -0.8], 6);
  // Glowing salt loops wrapping the hall
  const salt = materials().glowOrange.clone();
  const loops = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(4.75, 0.11, 8, 64), salt);
    t.rotation.x = Math.PI / 2;
    t.position.set(-0.8, 1.2 + i * 1.1, -0.8);
    loops.add(t);
  }
  b.partGroup(loops, { kind: 'glow', material: salt });
  // Heat exchanger tanks
  for (let i = 0; i < 3; i++) {
    b.cyl(0.8, 0.8, 3.4, m.steel, [4.3, 0.25, -3.6 + i * 2.6], 20);
    b.dome(0.8, m.steel, [4.3, 3.65, -3.6 + i * 2.6], 0.6, 16);
    b.pipe([3.4, 2.6, -3.6 + i * 2.6], [3.5, 2.6, -3.6 + i * 2.6], 0.18, m.steelDark);
  }
  // Drain tank bunker
  b.box(3.2, 1.4, 2.6, m.concreteDark, [-3.6, 0.25, 4.2]);
  b.box(3.2, 0.1, 0.5, m.hazard, [-3.6, 1.65, 4.2]);
  // Off-gas stack
  stack(b, 4.8, 4.6, 9, 0.38);
  return b;
}

export function fusionReactor(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 16, 16);
  // Bioshield ring wall
  b.cyl(6.6, 6.8, 1.6, m.concrete, [0, 0.25, 0], 48, [0, 0, 0], true);
  b.cyl(6.0, 6.0, 1.6, m.concreteDark, [0, 0.25, 0], 48, [0, 0, 0], true);
  // Cryostat base
  b.cyl(4.8, 5.2, 1.0, m.steelDark, [0, 0.25, 0], 40);
  // Tokamak vessel
  b.torus(3.4, 1.55, m.steel, [0, 3.1, 0], [Math.PI / 2, 0, 0], 48);
  // Toroidal field coils (D-shaped approximated by tall rings)
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    b.torus(1.95, 0.22, m.copper, [Math.cos(a) * 3.4, 3.1, Math.sin(a) * 3.4], [0, -a, 0], 20);
  }
  // Central solenoid
  b.cyl(0.9, 0.9, 5.2, m.copper, [0, 0.9, 0], 24);
  b.cyl(1.0, 1.0, 0.25, m.steelDark, [0, 6.1, 0], 24);
  // Plasma
  const plasma = materials().glowPlasma.clone();
  b.part(new THREE.TorusGeometry(3.4, 0.55, 16, 64), plasma, [0, 3.1, 0], { kind: 'pulse', material: plasma, speed: 2.4 }, [Math.PI / 2, 0, 0]);
  // Open steel frame hall
  const cols = 8;
  for (let i = 0; i < cols; i++) {
    const a = (i / cols) * Math.PI * 2 + Math.PI / 8;
    b.box(0.45, 9.5, 0.45, m.steel, [Math.cos(a) * 7.2, 0.25, Math.sin(a) * 7.2], -a);
  }
  b.torus(7.2, 0.25, m.steel, [0, 9.75, 0], [Math.PI / 2, 0, 0], 48);
  for (let i = 0; i < 4; i++) b.box(14.4, 0.3, 0.35, m.steel, [0, 9.6, 0], (i / 4) * Math.PI);
  // Neutral beam injectors
  for (const a of [0.3, 2.4, 4.4]) {
    b.pipe([Math.cos(a) * 5.0, 3.1, Math.sin(a) * 5.0], [Math.cos(a) * 7.6, 3.1, Math.sin(a) * 7.6], 0.5, m.paintWhite, 16);
  }
  // Cryoplant tanks
  for (let i = 0; i < 4; i++) b.cyl(0.6, 0.6, 3.2, m.paintWhite, [-7.0 + i * 1.4, 0.25, 7.0], 16);
  // Beacon
  b.part(new THREE.SphereGeometry(0.15, 8, 6), m.beacon, [0, 10.1, 0], { kind: 'beacon' });
  return b;
}
