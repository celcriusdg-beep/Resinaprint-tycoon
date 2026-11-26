import * as THREE from 'three';
import { ModelBuilder, fanRotor, type Vec3 } from '../builder';
import { materials } from '../materials';
import { stack } from './reactors';

// Tier-expansion buildings. Units are metres (one grid cell = 4 m); origin is
// the footprint centre at ground level.

type M = ReturnType<typeof materials>;

function slab(b: ModelBuilder, w: number, d: number, mat?: THREE.Material) {
  b.box(w - 0.3, 0.25, d - 0.3, mat ?? materials().concreteDark, [0, 0, 0]);
}

function roofed(b: ModelBuilder, m: M, w: number, h: number, d: number, wall: THREE.Material, pos: [number, number], roof: THREE.Material = m.steelDark) {
  b.box(w, h, d, wall, [pos[0], 0.25, pos[1]]);
  b.box(w + 0.15, 0.22, d + 0.15, roof, [pos[0], 0.25 + h, pos[1]]);
}

function lights(b: ModelBuilder, m: M, w: number, y: number, z: number, x0 = 0, n = 6) {
  const step = w / n;
  for (let i = 0; i < n; i++) b.box(step * 0.6, 0.4, 0.06, m.windowGlow, [x0 - w / 2 + step * (i + 0.5), y, z]);
}

function glow(base: THREE.MeshStandardMaterial) {
  return base.clone();
}

function fan(b: ModelBuilder, m: M, x: number, y: number, z: number, r: number, speed = 5) {
  b.cyl(r + 0.12, r + 0.12, 0.5, m.cladGrey, [x, y - 0.5, z], 20, [0, 0, 0], true);
  const f = fanRotor(r, 6, m.steelDark, m.steel);
  f.position.set(x, y, z);
  b.partGroup(f, { kind: 'spin', axis: 'y', speed });
}

function hyperboloid(b: ModelBuilder, mat: THREE.Material, baseR: number, throatR: number, topR: number, y0: number, h: number, throat = 0.72, seg = 48) {
  const pts: [number, number][] = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const k = (t - throat) / (t < throat ? throat : 1 - throat);
    pts.push([throatR + (t < throat ? baseR - throatR : topR - throatR) * k * k, y0 + t * h]);
  }
  const mm = (mat as THREE.MeshStandardMaterial).clone();
  mm.side = THREE.DoubleSide;
  b.add(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), mm);
  b.height = Math.max(b.height, y0 + h);
  return pts;
}

// ── Futuristic kit (late tiers): tapered halls, light seams, beams, robots ──

/** A tapered four-sided hall, w × d at the base, `top` = top/base ratio.
 *  `from`/`to` cut a horizontal slice of the same shape (for glass bands). */
function taper(b: ModelBuilder, mat: THREE.Material, w: number, d: number, h: number, top: number, pos: Vec3, from = 0, to = h, grow = 0) {
  const r = (y: number) => 1 - (1 - top) * (y / h);
  const g = new THREE.CylinderGeometry(r(to), r(from), to - from, 4, 1);
  g.rotateY(Math.PI / 4);
  b.add(g, mat, [pos[0], pos[1] + (from + to) / 2, pos[2]], [0, 0, 0], [(w + grow) / Math.SQRT2, 1, (d + grow) / Math.SQRT2]);
  b.height = Math.max(b.height, pos[1] + to);
}

/** A glowing strip that pulses with the building's activity. */
function seam(b: ModelBuilder, mat: THREE.MeshStandardMaterial, w: number, pos: Vec3, rotY = 0, speed = 1.3) {
  b.part(new THREE.BoxGeometry(w, 0.1, 0.08), mat, pos, { kind: 'pulse', speed, material: mat }, [0, rotY, 0]);
}

/** A straight bar between two points (glowing and pulsing when `pulse` is set). */
function beam(b: ModelBuilder, mat: THREE.Material, p0: Vec3, p1: Vec3, t: number, pulse?: number) {
  const a = new THREE.Vector3(...p0);
  const c = new THREE.Vector3(...p1);
  const dir = c.clone().sub(a);
  const len = dir.length();
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  const mid = a.add(c).multiplyScalar(0.5);
  const geo = new THREE.BoxGeometry(t, len, t);
  if (pulse !== undefined) b.part(geo, mat, [mid.x, mid.y, mid.z], { kind: 'pulse', speed: pulse, material: mat as THREE.MeshStandardMaterial }, [e.x, e.y, e.z]);
  else b.add(geo, mat, [mid.x, mid.y, mid.z], [e.x, e.y, e.z]);
}

/** Polished mirror finish. */
function mirror(m: M) {
  const mm = m.steel.clone();
  mm.color.set('#dbe6ee');
  mm.roughness = 0.06;
  mm.metalness = 1;
  return mm;
}

/** An industrial robot arm on a pedestal that swings while the building works. */
function robotArm(b: ModelBuilder, m: M, x: number, y: number, z: number, s = 1, phase = 0) {
  b.cyl(0.45 * s, 0.6 * s, 0.5 * s, m.steelDark, [x, y, z], 18);
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, p: Vec3, rz = 0) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(p[0] * s, p[1] * s, p[2] * s);
    mesh.rotation.z = rz;
    g.add(mesh);
  };
  add(new THREE.CylinderGeometry(0.38 * s, 0.38 * s, 0.4 * s, 16), m.paintWhite, [0, 0.2, 0]);
  add(new THREE.BoxGeometry(0.34 * s, 1.7 * s, 0.34 * s), m.paintWhite, [0.28, 1.15, 0], -0.32);
  add(new THREE.SphereGeometry(0.28 * s, 12, 8), m.steelDark, [0.56, 1.95, 0]);
  add(new THREE.BoxGeometry(1.5 * s, 0.26 * s, 0.26 * s), m.paintWhite, [1.25, 1.75, 0], -0.28);
  add(new THREE.SphereGeometry(0.16 * s, 10, 6), m.glowCyan, [1.98, 1.54, 0]);
  add(new THREE.BoxGeometry(0.08 * s, 0.4 * s, 0.22 * s), m.steelDark, [2.05, 1.3, 0]);
  g.position.set(x, y + 0.5 * s, z);
  b.partGroup(g, { kind: 'rock', axis: 'y', speed: 0.9, phase });
}

// ── Reactors ────────────────────────────────────────────────────────────

export function smrPark(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 12);
  // Shared reactor building: six module bays under one long roof
  roofed(b, m, 10.4, 4.6, 5.2, m.cladWhite, [0, -2.6], m.cladBlue);
  const ck = glow(m.glowCyan);
  for (let i = 0; i < 6; i++) {
    const x = -4.3 + i * 1.72;
    b.cyl(0.62, 0.62, 1.3, m.concrete, [x, 4.85, -2.6], 20);
    b.dome(0.62, m.steel, [x, 6.15, -2.6], 0.6, 16);
    b.part(new THREE.CylinderGeometry(0.64, 0.64, 0.12, 20, 1, true), ck, [x, 5.6, -2.6], { kind: 'glow', material: ck });
  }
  // Control building and switchyard-side turbine hall stub
  roofed(b, m, 4.6, 3.4, 3.6, m.facade, [-3.4, 2.9]);
  lights(b, m, 4.2, 2.0, 4.72, -3.4, 5);
  roofed(b, m, 4.4, 2.6, 3.6, m.cladGrey, [2.6, 2.9]);
  for (let i = 0; i < 3; i++) b.pipe([-3 + i * 3, 2.8, -0.1], [-3 + i * 3, 2.8, 1.2], 0.18, m.pipeWhite);
  stack(b, 5.2, 4.9, 8, 0.32);
  b.coreTop = 6.6;
  return b;
}

export function sfrReactor(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 12);
  // Low, wide reactor hall over the sodium pool, with a shallow dome
  b.cyl(4.2, 4.4, 4.6, m.concreteWarm, [-1.2, 0.25, -1.2], 40);
  b.dome(4.2, m.steel, [-1.2, 4.85, -1.2], 0.42, 36);
  const na = glow(m.glowOrange);
  b.part(new THREE.CylinderGeometry(4.22, 4.22, 0.25, 40, 1, true), na, [-1.2, 4.2, -1.2], { kind: 'glow', material: na });
  // Intermediate heat exchanger loop and sodium-water steam generator towers
  for (let i = 0; i < 3; i++) {
    const z = -4 + i * 2.6;
    b.cyl(0.55, 0.55, 6.2, m.paintWhite, [4.4, 0.25, z], 16);
    b.cyl(0.6, 0.6, 0.2, m.paintRed, [4.4, 5.3, z], 16);
    b.pipe([2.9, 3.6, z], [3.85, 3.6, z], 0.2, m.steelDark);
  }
  // Fuel handling building and decay heat air coolers on the roof
  roofed(b, m, 4.0, 3.8, 3.0, m.cladGrey, [-3.0, 4.2]);
  for (const x of [-4.2, -1.8]) fan(b, m, x, 4.6, 4.2, 0.6, 3);
  stack(b, 4.6, 4.6, 9.5, 0.36);
  b.coreTop = 6.6;
  return b;
}

// ── Turbines ────────────────────────────────────────────────────────────

function turbineSet(b: ModelBuilder, m: M, x0: number, x1: number, y: number, z: number, r: number) {
  // Casings along a shaft, generator at the end (one animated shaft)
  const len = x1 - x0;
  for (let i = 0; i < 3; i++) b.cyl(r * (0.8 + i * 0.12), r * (0.8 + i * 0.12), len / 4.2, m.paintGreen, [x0 + len * (0.12 + i * 0.25), y, z], 20, [0, 0, Math.PI / 2]);
  b.cyl(r * 0.9, r * 0.9, len * 0.22, m.paintYellow, [x0 + len * 0.86, y, z], 20, [0, 0, Math.PI / 2]);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.12, r * 0.12, len, 8), m.steel);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.set((x0 + x1) / 2, y, z);
  const g = new THREE.Group();
  g.add(shaft);
  b.partGroup(g, { kind: 'spin', axis: 'x', speed: 8 });
}

export function turbineMedium(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 12);
  roofed(b, m, 10.6, 5.2, 7.6, m.cladBlue, [0, -1.4]);
  b.box(10.65, 0.6, 7.65, m.cladWhite, [0, 4.2, -1.4]);
  b.box(10.0, 0.6, 0.06, m.glass, [0, 3.2, 2.42]);
  turbineSet(b, m, -4.6, 4.4, 1.4, 3.6, 0.7);
  b.box(9.4, 0.4, 1.6, m.concrete, [-0.1, 0.25, 3.6]);
  // Transformer
  b.box(1.6, 1.4, 1.2, m.steelDark, [4.6, 0.25, 4.6]);
  b.emit({ pos: [3.5, 5.5, -1.5], radius: 0.6, rate: 0.15, size: 1, kind: 'vapor' });
  return b;
}

export function turbineSuper(): ModelBuilder {
  // Gigawatt turbine island: an aerodynamic white hall and an open deck with
  // the HP/IP/LP casings and generator laid out in white with lit couplings.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  slab(b, 20, 12, m.concrete);
  taper(b, m.paintWhite, 18.4, 7.0, 8.5, 0.7, [0, 0.25, -2.2]);
  taper(b, m.glass, 18.4, 7.0, 8.5, 0.7, [0, 0.25, -2.2], 2.6, 4.6, 0.12);
  b.box(12.4, 0.35, 4.4, m.steelDark, [0, 8.75, -2.2]);
  seam(b, cy, 16.0, [0, 2.45, 1.18], 0);
  seam(b, cy, 14.4, [0, 4.8, 0.8], 0);
  // Turbine deck
  b.box(18.6, 0.9, 3.8, m.concrete, [0, 0.25, 3.6]);
  const y = 2.75, z = 3.6;
  const casings: [number, number, number, THREE.Material][] = [
    [-7.0, 0.85, 2.0, m.paintWhite], [-4.2, 1.1, 2.6, m.paintWhite], [-0.9, 1.5, 3.0, m.paintWhite],
    [2.6, 1.5, 3.0, m.paintWhite], [6.4, 1.3, 3.4, m.steelDark],
  ];
  for (const [x, r, len, mat] of casings) {
    b.cyl(r, r, len, mat, [x, y, z], 32, [0, 0, Math.PI / 2]);
    b.cyl(r * 0.75, r, 0.4, mat, [x - len / 2 - 0.2, y, z], 32, [0, 0, Math.PI / 2]);
    b.box(len * 0.7, y - 1.15 - r * 0.6, 0.4, m.steelDark, [x, 1.15, z]);
  }
  for (const x of [-5.75, -2.65, 0.85, 4.45, 8.2]) b.part(new THREE.TorusGeometry(0.62, 0.09, 8, 28), cy, [x, y, z], { kind: 'pulse', speed: 2.2, material: cy }, [0, Math.PI / 2, 0]);
  for (const x of [5.4, 6.4, 7.4]) b.torus(1.32, 0.06, cy, [x, y, z], [0, Math.PI / 2, 0], 36);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 17.4, 10), m.steel);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.set(0, y, z);
  const sg = new THREE.Group();
  sg.add(shaft);
  b.partGroup(sg, { kind: 'spin', axis: 'x', speed: 8 });
  // Crossover pipes from the hall into the casings
  for (const x of [-7.0, -4.2, -0.9, 2.6]) b.pipe([x, 4.6, 1.0], [x, 4.6, 3.0], 0.32, m.pipeWhite, 14);
  b.part(new THREE.SphereGeometry(0.18, 8, 6), m.beacon, [8.6, 9.1, -2.2], { kind: 'beacon' });
  b.height = 9.2;
  return b;
}

export function turbineSco2(): ModelBuilder {
  // Supercritical CO2: the turbine is the size of a car, so it sits on a lit
  // plinth under a floating canopy, fed by hexagonal recuperator stacks.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  const core = glow(m.glowCyan);
  slab(b, 12, 12, m.concrete);
  // Plinth and floating canopy
  b.box(8.0, 0.6, 4.6, m.concreteDark, [-1.2, 0.25, 2.6]);
  for (const [x, zz] of [[-4.9, 0.6], [2.5, 0.6], [-4.9, 4.6], [2.5, 4.6]]) b.box(0.22, 4.0, 0.22, m.paintWhite, [x, 0.85, zz]);
  b.box(8.4, 0.3, 4.9, m.paintWhite, [-1.2, 4.85, 2.6]);
  seam(b, cy, 8.2, [-1.2, 4.8, 5.07]);
  seam(b, cy, 4.7, [3.02, 4.8, 2.6], Math.PI / 2);
  // Compressor, turbine and generator on one glowing shaft
  const y = 2.1, z = 2.6;
  b.cyl(0.7, 0.7, 1.4, m.paintWhite, [-3.6, y, z], 28, [0, 0, Math.PI / 2]);
  b.cyl(0.85, 0.55, 0.6, m.paintWhite, [-2.6, y, z], 28, [0, 0, Math.PI / 2]);
  b.cyl(0.9, 0.9, 1.2, m.paintWhite, [-1.6, y, z], 28, [0, 0, Math.PI / 2]);
  b.cyl(1.05, 1.05, 2.0, m.steelDark, [0.8, y, z], 28, [0, 0, Math.PI / 2]);
  for (const x of [-4.4, -2.9, -0.85, 1.9]) b.part(new THREE.TorusGeometry(0.6, 0.07, 8, 28), cy, [x, y, z], { kind: 'pulse', speed: 2.5, material: cy }, [0, Math.PI / 2, 0]);
  b.part(new THREE.CylinderGeometry(0.22, 0.22, 6.2, 14), core, [-1.4, y, z], { kind: 'pulse', speed: 3, material: core }, [0, 0, Math.PI / 2]);
  for (const x of [-3.6, -1.6, 0.8]) b.box(0.9, y - 0.85 - 0.5, 0.5, m.steelDark, [x, 0.85, z]);
  // Hexagonal printed-circuit recuperator stacks
  for (let i = 0; i < 3; i++) {
    const x = -4.0 + i * 2.4;
    b.cyl(1.0, 1.0, 5.6, m.paintWhite, [x, 0.25, -3.4], 6);
    b.cyl(1.04, 1.04, 0.3, m.steelDark, [x, 5.85, -3.4], 6);
    b.part(new THREE.CylinderGeometry(1.03, 1.03, 0.22, 6, 1, true), cy, [x, 4.2, -3.4], { kind: 'pulse', speed: 1.6, material: cy });
    b.pipe([x, 2.6, -2.5], [x, 2.6, 0.6], 0.2, m.pipeWhite, 12);
  }
  // Dry CO2 gas cooler with three fans
  b.box(3.0, 2.2, 6.2, m.paintWhite, [4.4, 0.25, -1.7]);
  seam(b, cy, 6.0, [5.93, 1.4, -1.7], Math.PI / 2);
  for (const zz of [-3.7, -1.7, 0.3]) fan(b, m, 4.4, 2.95, zz, 0.8, 7);
  // CO2 inventory capsules
  for (const zz of [3.5, 4.8]) {
    b.cyl(0.5, 0.5, 2.6, m.paintWhite, [4.4, 0.85, zz], 20, [0, 0, Math.PI / 2]);
    for (const dx of [-1.3, 1.3]) b.add(new THREE.SphereGeometry(0.5, 16, 10), m.paintWhite, [4.4 + dx, 0.85, zz]);
  }
  b.height = Math.max(b.height, 6.2);
  return b;
}

export function turbineMhd(): ModelBuilder {
  // Magnetohydrodynamic topping cycle: a plasma channel blazing through a row
  // of superconducting magnet coils, then a diffuser into the steam section.
  const b = new ModelBuilder();
  const m = materials();
  const plasma = glow(m.glowPlasma);
  const cy = glow(m.glowCyan);
  const fire = glow(m.glowOrange);
  slab(b, 16, 12);
  const y = 3.3, z = 2.4;
  b.box(12.6, 1.3, 3.8, m.concreteDark, [-1.2, 0.25, z]);
  b.part(new THREE.CylinderGeometry(0.75, 0.95, 9.4, 24), plasma, [-1.6, y, z], { kind: 'pulse', speed: 6, material: plasma }, [0, 0, Math.PI / 2]);
  for (let i = 0; i < 6; i++) {
    const x = -5.6 + i * 1.6;
    b.torus(1.6, 0.34, m.copper, [x, y, z], [0, Math.PI / 2, 0], 32);
    b.torus(1.95, 0.12, m.paintWhite, [x + 0.8, y, z], [0, Math.PI / 2, 0], 36);
  }
  for (const x of [-4.8, -1.6, 1.6]) b.part(new THREE.TorusGeometry(2.0, 0.05, 6, 40), cy, [x, y, z], { kind: 'pulse', speed: 2, material: cy }, [0, Math.PI / 2, 0]);
  // Combustor with an orange throat
  b.cyl(1.35, 1.35, 1.8, m.steelDark, [-7.0, y, z], 28, [0, 0, Math.PI / 2]);
  b.part(new THREE.TorusGeometry(1.0, 0.16, 8, 28), fire, [-6.08, y, z], { kind: 'pulse', speed: 4, material: fire }, [0, Math.PI / 2, 0]);
  // Diffuser into the bottoming section
  b.cyl(1.7, 0.95, 2.2, m.steelDark, [4.0, y, z], 28, [0, 0, -Math.PI / 2]);
  b.pipe([5.1, y, z], [6.2, y, 0.2], 0.9, m.steelDark, 18);
  // Steam bottoming hall
  taper(b, m.paintWhite, 12.4, 5.0, 6.8, 0.74, [-0.6, 0.25, -3.1]);
  taper(b, m.glass, 12.4, 5.0, 6.8, 0.74, [-0.6, 0.25, -3.1], 2.4, 4.0, 0.1);
  seam(b, cy, 11.0, [-0.6, 1.95, -0.72]);
  // Cryo dewars for the magnets
  for (const zz of [-4.6, -2.8]) {
    b.cyl(0.6, 0.6, 4.0, m.paintWhite, [6.6, 0.25, zz], 20);
    b.dome(0.6, m.paintWhite, [6.6, 4.25, zz], 0.5, 16);
    b.part(new THREE.CylinderGeometry(0.62, 0.62, 0.2, 20, 1, true), cy, [6.6, 3.2, zz], { kind: 'pulse', speed: 1.8, material: cy });
  }
  // Exhaust stack
  b.cyl(0.55, 0.95, 13, m.paintWhite, [6.2, 0.25, 0.2], 24);
  b.part(new THREE.CylinderGeometry(0.62, 0.62, 0.3, 24, 1, true), cy, [6.2, 11.6, 0.2], { kind: 'glow', material: cy });
  b.part(new THREE.SphereGeometry(0.16, 8, 6), m.beacon, [6.2, 13.4, 0.2], { kind: 'beacon' });
  b.emit({ pos: [6.2, 13.3, 0.2], radius: 0.5, rate: 0.25, size: 1.4, kind: 'vapor' });
  return b;
}

// ── Cooling ─────────────────────────────────────────────────────────────

export function coolingHybrid(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 8);
  b.box(11, 0.6, 6.6, m.concrete, [0, 0.2, 0]);
  // Three cells: wet louvres below, finned dry coils above, fan stacks on top
  for (let i = 0; i < 3; i++) {
    const x = -3.6 + i * 3.6;
    b.box(3.3, 2.2, 6.0, m.cladGrey, [x, 0.8, 0]);
    b.box(3.2, 1.1, 0.05, m.slats, [x, 1.1, 3.02]);
    b.box(3.4, 0.9, 6.1, m.steel, [x, 3.0, 0]);
    fan(b, m, x, 4.55, 0, 1.15, 6);
  }
  b.emit({ pos: [0, 4.8, 0], radius: 3.5, rate: 0.4, size: 2, kind: 'vapor' });
  return b;
}

export function coolingFanAssist(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 16, 16);
  b.cyl(7.3, 7.4, 0.6, m.concreteDark, [0, 0.2, 0], 56);
  const pts = hyperboloid(b, m.concrete, 6.8, 5.0, 5.4, 3.0, 11, 0.7, 56);
  // Ring of fan housings around the air inlet
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const x = Math.cos(a) * 7.0, z = Math.sin(a) * 7.0;
    b.add(new THREE.BoxGeometry(1.4, 2.4, 1.2), m.cladGrey, [x, 1.6, z], [0, -a, 0]);
    const f = fanRotor(0.5, 5, m.steelDark, m.steel);
    f.position.set(Math.cos(a) * 7.65, 1.7, Math.sin(a) * 7.65);
    f.rotation.set(0, -a, Math.PI / 2);
    const g = new THREE.Group();
    g.add(f);
    b.partGroup(g, { kind: 'rock', axis: 'y', speed: 0.2, phase: i });
  }
  b.torus(pts[pts.length - 1][0], 0.14, m.paintRed, [0, 14, 0], [Math.PI / 2, 0, 0], 48);
  b.emit({ pos: [0, 14, 0], radius: 4.2, rate: 3.2, size: 6.5, kind: 'steam' });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    b.part(new THREE.SphereGeometry(0.13, 6, 4), m.beacon, [Math.cos(a) * 5.4, 14.2, Math.sin(a) * 5.4], { kind: 'beacon', phase: i });
  }
  return b;
}

export function coolingSeawater(): ModelBuilder {
  // A late-game hydro-thermal exchange station: a glowing intake basin, four
  // 18 m pump towers with spinning impeller rings, a tapered dark-glass hall
  // and a 38 m heat-exchange spire. Sized to read as the top cooling tier.
  const b = new ModelBuilder();
  const m = materials();
  const cyan = glow(m.glowCyan);
  const cyan2 = glow(m.glowCyan);
  const seam = glow(m.glowCyan);
  const dark = m.steelDark;
  slab(b, 16, 12, m.concreteDark);
  // Intake basin along the front: concrete rim, glowing water, screen gantry
  b.box(15.4, 0.6, 3.0, m.concrete, [0, 0.2, 4.3]);
  b.part(new THREE.BoxGeometry(14.8, 0.06, 2.4), cyan, [0, 0.83, 4.3], { kind: 'pulse', speed: 0.7, material: cyan });
  for (let i = 0; i < 7; i++) {
    const x = -6.3 + i * 2.1;
    b.box(0.3, 3.0, 0.5, m.paintWhite, [x, 0.8, 5.4]);
  }
  b.box(13.4, 0.4, 0.6, m.paintWhite, [0, 3.8, 5.4]);
  b.part(new THREE.BoxGeometry(13.2, 0.1, 0.06), seam, [0, 4.0, 5.72], { kind: 'pulse', speed: 1.3, material: seam });
  // Tapered main hall: dark glass body under a white shell with glowing seams
  const hallGeo = new THREE.CylinderGeometry(0.7, 1, 8, 4, 1);
  hallGeo.rotateY(Math.PI / 4);
  b.add(hallGeo, m.glass, [0, 4.25, -1.6], [0, 0, 0], [10.2, 1, 6.0]);
  b.add(hallGeo.clone(), m.paintWhite, [0, 5.95, -1.6], [0, 0, 0], [10.6, 0.58, 6.3]);
  b.add(hallGeo.clone(), m.paintWhite, [0, 1.35, -1.6], [0, 0, 0], [10.8, 0.28, 6.4]);
  b.part(new THREE.BoxGeometry(9.6, 0.12, 0.08), seam, [0, 3.1, 1.25], { kind: 'pulse', speed: 1.3, material: seam });
  b.part(new THREE.BoxGeometry(8.0, 0.12, 0.08), seam, [0, 5.4, 0.7], { kind: 'pulse', speed: 1.3, material: seam });
  // Four pump towers between basin and hall, impeller rings spinning on top
  for (let i = 0; i < 4; i++) {
    const x = -5.7 + i * 3.8;
    const z = 1.9;
    b.cyl(1.05, 1.35, 15, m.paintWhite, [x, 0.8, z], 32);
    b.box(0.14, 13, 0.1, seam, [x, 2.0, z + 1.25]);
    b.cyl(1.4, 1.4, 0.6, dark, [x, 15.8, z], 32);
    b.torus(1.2, 0.09, dark, [x, 6.0, z]);
    b.torus(1.13, 0.09, dark, [x, 11.0, z]);
    b.part(new THREE.CylinderGeometry(1.12, 1.18, 0.35, 32, 1, true), cyan2, [x, 8.5, z], { kind: 'glow', material: cyan2, phase: i });
    const rotor = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.16, 8, 40), m.steel);
    ring.rotation.x = Math.PI / 2;
    rotor.add(ring);
    for (let k = 0; k < 6; k++) {
      const vane = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.4), dark);
      vane.rotation.y = (k / 6) * Math.PI;
      vane.rotation.x = 0.35;
      rotor.add(vane);
    }
    rotor.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 10), cyan2));
    rotor.position.set(x, 16.7, z);
    b.partGroup(rotor, { kind: 'spin', axis: 'y', speed: 1.6 + i * 0.15 });
    // Penstock from the basin into the tower
    b.pipe([x, 1.1, 3.2], [x, 1.1, 2.6], 0.65, m.pipeBlue, 16);
  }
  // Heat-exchange spire: a heavy six-sided tower with glowing edge seams
  const sx = 0, sz = -1.6;
  b.cyl(1.4, 3.0, 30, m.paintWhite, [sx, 8.0, sz], 6);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const p0 = new THREE.Vector3(Math.cos(a) * 3.02, 8.0, Math.sin(a) * 3.02);
    const p1 = new THREE.Vector3(Math.cos(a) * 1.42, 38.0, Math.sin(a) * 1.42);
    const mid = p0.clone().add(p1).multiplyScalar(0.5);
    const len = p0.distanceTo(p1);
    const geo = new THREE.BoxGeometry(0.16, len, 0.16);
    const dir = p1.clone().sub(p0).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const e = new THREE.Euler().setFromQuaternion(q);
    b.part(geo, seam, [sx + mid.x, mid.y, sz + mid.z], { kind: 'pulse', speed: 1.3, material: seam }, [e.x, e.y, e.z]);
  }
  b.cyl(1.7, 1.7, 1.0, dark, [sx, 38.0, sz], 6);
  b.cyl(0.25, 0.45, 5, m.steel, [sx, 39.0, sz], 10);
  const rings = new THREE.Group();
  for (let k = 0; k < 5; k++) {
    const r = 3.4 - k * 0.38;
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.12, 8, 48), cyan);
    t.rotation.x = Math.PI / 2;
    t.position.y = 12 + k * 5.2;
    rings.add(t);
  }
  rings.position.set(sx, 0, sz);
  b.partGroup(rings, { kind: 'float', speed: 0.6 });
  b.part(new THREE.SphereGeometry(0.28, 8, 6), m.beacon, [sx, 44.2, sz], { kind: 'beacon' });
  b.height = 44.4;
  // Outfall: two return conduits to a lit discharge cascade at the back
  for (const x of [-5.5, 5.5]) b.pipe([x, 1.4, -3.9], [x, 1.4, -5.0], 0.75, m.pipeBlue, 18);
  for (let k = 0; k < 3; k++) b.box(14.6 - k * 0.6, 0.3, 0.55, m.concrete, [0, 0.25 + k * 0.3, -5.6 + k * 0.5]);
  b.part(new THREE.BoxGeometry(14.0, 0.05, 1.2), cyan, [0, 0.52, -5.35], { kind: 'pulse', speed: 0.9, material: cyan, phase: 1.5 });
  b.emit({ pos: [0, 0.8, -5.4], radius: 5, rate: 1.4, size: 3, kind: 'vapor' });
  return b;
}

export function coolingSky(): ModelBuilder {
  // Radiative sky cooling: mirror-finish metamaterial panels around a central
  // manifold hub, their edges glowing in the infrared window.
  const b = new ModelBuilder();
  const m = materials();
  const ir = glow(m.glowCyan);
  const cy = glow(m.glowCyan);
  const mir = mirror(m);
  slab(b, 16, 16, m.concreteDark);
  const edges = new THREE.Group();
  for (const x of [-5.2, 0, 5.2]) {
    for (const zz of [-5.2, 0, 5.2]) {
      if (x === 0 && zz === 0) continue;
      b.box(0.3, 1.0, 0.3, m.steel, [x, 0.25, zz]);
      b.add(new THREE.BoxGeometry(4.4, 0.08, 4.0), mir, [x, 1.45, zz], [-0.22, 0, 0]);
      const e = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.03, 4.2), ir);
      e.position.set(x, 1.4, zz);
      e.rotation.x = -0.22;
      edges.add(e);
      b.pipe([x, 0.5, zz], [x * 0.35, 0.5, zz * 0.35], 0.12, m.pipeWhite, 8);
    }
  }
  b.partGroup(edges, { kind: 'pulse', speed: 0.8, material: ir });
  // Central hub and emitter mast
  b.cyl(1.8, 2.3, 1.8, m.paintWhite, [0, 0.25, 0], 6);
  b.dome(1.5, mir, [0, 2.05, 0], 0.6, 24);
  b.part(new THREE.CylinderGeometry(1.83, 1.83, 0.2, 6, 1, true), cy, [0, 1.6, 0], { kind: 'pulse', speed: 1.4, material: cy });
  b.cyl(0.12, 0.25, 7.5, m.steel, [0, 2.9, 0], 10);
  b.part(new THREE.TorusGeometry(0.6, 0.06, 8, 28), cy, [0, 8.0, 0], { kind: 'pulse', speed: 1.4, material: cy }, [Math.PI / 2, 0, 0]);
  b.part(new THREE.SphereGeometry(0.16, 8, 6), m.beacon, [0, 10.5, 0], { kind: 'beacon' });
  return b;
}

// ── Fuel: mining & processing ───────────────────────────────────────────

export function mineUnderground(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 12, m.gravel);
  // Steel headframe with sheave wheels that turn while hoisting
  b.lattice(11, 2.2, m.paintRed, [-2.6, 0.25, -2.6], 8);
  b.box(2.8, 0.4, 2.8, m.paintRed, [-2.6, 11.2, -2.6]);
  for (const dz of [-0.6, 0.6]) {
    const w = new THREE.Group();
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 6, 24), m.steelDark);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 8), m.steel);
    hub.rotation.x = Math.PI / 2;
    w.add(wheel, hub);
    w.position.set(-2.6, 12.2, -2.6 + dz);
    b.partGroup(w, { kind: 'spin', axis: 'z', speed: 2 });
  }
  b.pipe([-2.6, 10.5, -2.6], [2.4, 1.5, -2.6], 0.12, m.steel, 6);
  // Winder house, ore bins and a conveyor to the stockpile
  roofed(b, m, 3.6, 3.4, 3.0, m.cladGrey, [3.4, -2.6]);
  b.cyl(1.0, 0.4, 2.4, m.steel, [-2.6, 3.0, 2.4], 16);
  b.box(0.2, 3.0, 0.2, m.steelDark, [-2.6, 0.25, 2.4]);
  b.add(new THREE.BoxGeometry(5.4, 0.25, 0.7), m.rubber, [0.2, 2.2, 3.4], [0, 0, -0.32]);
  b.cyl(2.2, 0.1, 1.6, m.gravel, [3.4, 0.25, 3.4], 20);
  b.part(new THREE.SphereGeometry(0.12, 6, 4), m.beacon, [-2.6, 11.8, -2.6], { kind: 'beacon' });
  b.emit({ pos: [3.4, 3.8, -2.6], radius: 0.4, rate: 0.12, size: 0.8, kind: 'vapor' });
  return b;
}

export function mineIsr(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 16, 16, m.gravel);
  // Wellfield: a grid of wellheads with header pipes
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) {
      const x = -6.5 + c * 1.8, z = -6.4 + r * 1.9;
      b.box(0.5, 0.7, 0.5, r % 2 ? m.paintGreen : m.paintWhite, [x, 0.25, z]);
      b.cyl(0.06, 0.06, 0.5, m.steel, [x, 0.95, z], 6);
    }
    b.pipe([-7, 0.45, -6.4 + r * 1.9 + 0.4], [3.4, 0.45, -6.4 + r * 1.9 + 0.4], 0.09, m.pipeBlue, 8);
  }
  // Processing plant: ion-exchange columns, precipitation tanks, dryer
  roofed(b, m, 5.2, 4.2, 6.0, m.cladWhite, [4.8, -3.4], m.cladBlue);
  for (let i = 0; i < 4; i++) b.cyl(0.5, 0.5, 4.4, m.paintYellow, [3.0 + (i % 2) * 1.4, 0.25, 1.4 + Math.floor(i / 2) * 1.5], 14);
  for (const x of [5.8, 7.0]) b.cyl(0.7, 0.7, 2.4, m.steel, [x, 0.25, 2.2], 16);
  // Lined evaporation pond
  b.box(6.4, 0.25, 4.2, m.rubber, [-3.8, 0.25, 4.6]);
  b.box(6.0, 0.06, 3.8, m.water, [-3.8, 0.52, 4.6]);
  stack(b, 7.0, 6.6, 6, 0.24);
  return b;
}

export function millLarge(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 16, 16, m.gravel);
  // Crushed-ore heaps on liners with drip lines
  for (const z of [-4.6, 0.2]) {
    b.box(9.0, 0.15, 4.0, m.rubber, [-2.6, 0.25, z]);
    b.add(new THREE.CylinderGeometry(0.8, 2.0, 1.6, 4, 1), m.gravel, [-5.0, 1.2, z], [0, Math.PI / 4, 0], [1, 1, 0.9]);
    b.add(new THREE.CylinderGeometry(0.8, 2.0, 1.6, 4, 1), m.gravel, [-0.6, 1.2, z], [0, Math.PI / 4, 0], [1, 1, 0.9]);
    b.pipe([-7, 2.1, z], [1.8, 2.1, z], 0.05, m.pipeWhite, 6);
  }
  // Solvent extraction hall, calciner kiln and product drums
  roofed(b, m, 4.4, 4.6, 7.6, m.cladGrey, [5.2, -2.4]);
  lights(b, m, 3.8, 3.0, 1.52, 5.2, 4);
  b.cyl(0.8, 0.8, 5.2, m.steelDark, [3.0, 1.4, 4.8], 18, [0, 0, Math.PI / 2 - 0.08]);
  const kiln = glow(m.glowOrange);
  b.part(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 12), kiln, [0.4, 1.3, 4.8], { kind: 'pulse', speed: 2, material: kiln }, [0, 0, Math.PI / 2]);
  for (let i = 0; i < 6; i++) b.cyl(0.25, 0.25, 0.6, m.paintYellow, [5.0 + (i % 3) * 0.6, 0.25, 6.0 + Math.floor(i / 3) * 0.6], 10);
  stack(b, 7.0, -6.6, 9, 0.3);
  return b;
}

export function enrichCentrifuge(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 20, 12, m.concrete);
  // Long cascade halls
  for (const z of [-2.8, 1.8]) {
    roofed(b, m, 17.6, 4.0, 3.8, m.cladWhite, [0, z], m.cladGrey);
    b.box(17.65, 0.4, 3.85, m.cladBlue, [0, 3.2, z]);
  }
  // Glimpse of centrifuge rows through an open end
  const rot = glow(m.glowCyan);
  for (let i = 0; i < 8; i++) b.part(new THREE.CylinderGeometry(0.1, 0.1, 2.6, 8), rot, [-8.95, 1.6, -4.2 + i * 0.4], { kind: 'pulse', speed: 4 + i * 0.2, material: rot });
  // UF6 feed & withdrawal station with cylinders
  roofed(b, m, 3.0, 3.0, 2.0, m.cladGrey, [7.4, 4.8]);
  for (let i = 0; i < 4; i++) b.cyl(0.45, 0.45, 1.8, m.steel, [-6 + i * 1.3, 0.75, 4.9], 14, [0, 0, Math.PI / 2]);
  b.box(18, 0.25, 0.25, m.pipeWhite, [0, 4.6, -0.5]);
  return b;
}

export function enrichLaser(): ModelBuilder {
  // Laser isotope separation: a sleek separator hall fed by an open optics
  // bench where the tuned beam zig-zags between mirrors.
  const b = new ModelBuilder();
  const m = materials();
  const beamMat = glow(m.glowPlasma);
  const cy = glow(m.glowCyan);
  const mir = mirror(m);
  slab(b, 16, 12, m.concrete);
  taper(b, m.paintWhite, 10.0, 8.4, 6.6, 0.7, [-2.6, 0.25, -1.2]);
  taper(b, m.glass, 10.0, 8.4, 6.6, 0.7, [-2.6, 0.25, -1.2], 3.0, 5.0, 0.12);
  b.box(6.6, 0.3, 5.4, m.steelDark, [-2.6, 6.85, -1.2]);
  seam(b, cy, 9.0, [-2.6, 1.6, 2.86]);
  // Optics bench
  b.box(3.4, 0.9, 9.4, m.paintWhite, [5.9, 0.25, 0.4]);
  b.box(1.4, 0.9, 0.9, m.paintWhite, [5.9, 1.15, 4.6]);
  b.part(new THREE.SphereGeometry(0.18, 12, 8), beamMat, [5.9, 1.6, 4.1], { kind: 'pulse', speed: 7, material: beamMat });
  const pts: Vec3[] = [[5.9, 1.6, 4.1], [7.2, 1.6, 3.0], [4.6, 1.6, 1.4], [7.2, 1.6, -0.2], [4.6, 1.6, -1.8], [7.2, 1.6, -3.4], [2.3, 1.6, -3.4]];
  for (let i = 0; i < pts.length - 1; i++) beam(b, beamMat, pts[i], pts[i + 1], 0.07, 7 + i * 0.4);
  for (const p of pts.slice(1, -1)) {
    b.cyl(0.1, 0.12, 0.5, m.steel, [p[0], 1.15, p[2]], 10);
    b.box(0.5, 0.5, 0.08, mir, [p[0], 1.35, p[2]]);
  }
  // Guard rails around the bench
  for (const x of [4.15, 7.65]) b.box(0.06, 0.06, 9.2, m.steel, [x, 2.2, 0.4]);
  // Separator vessel with a violet band
  b.cyl(1.1, 1.1, 5.0, m.paintWhite, [-6.2, 0.25, 4.3], 28);
  b.dome(1.1, m.paintWhite, [-6.2, 5.25, 4.3], 0.45, 24);
  b.part(new THREE.CylinderGeometry(1.12, 1.12, 0.25, 28, 1, true), beamMat, [-6.2, 3.6, 4.3], { kind: 'glow', material: beamMat });
  b.pipe([-6.2, 2.0, 3.2], [-6.2, 2.0, 2.4], 0.25, m.pipeWhite, 12);
  return b;
}

export function fabAuto(): ModelBuilder {
  // Robotic fuel fabrication: an open, lit production bay where two robot
  // arms tend the sintering furnace and the conveyor of fuel assemblies.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  const furnace = glow(m.glowOrange);
  slab(b, 16, 12, m.concrete);
  taper(b, m.paintWhite, 14.6, 6.0, 6.4, 0.78, [0, 0.25, -2.6]);
  taper(b, m.glass, 14.6, 6.0, 6.4, 0.78, [0, 0.25, -2.6], 3.6, 5.2, 0.12);
  b.box(11.0, 0.3, 4.4, m.steelDark, [0, 6.65, -2.6]);
  // Production bay under a canopy
  b.box(14.4, 0.4, 4.6, m.concreteDark, [0, 0.25, 2.8]);
  for (const x of [-6.9, 6.9]) for (const zz of [0.7, 4.9]) b.box(0.24, 3.9, 0.24, m.paintWhite, [x, 0.65, zz]);
  b.box(14.6, 0.3, 4.9, m.paintWhite, [0, 4.55, 2.8]);
  seam(b, cy, 14.4, [0, 4.5, 5.27]);
  // Conveyor with fuel assemblies
  b.box(12.4, 0.55, 0.9, m.steelDark, [0, 0.65, 3.9]);
  b.part(new THREE.BoxGeometry(12.2, 0.04, 0.12), cy, [0, 1.22, 4.4], { kind: 'pulse', speed: 2, material: cy });
  for (let i = 0; i < 5; i++) b.box(1.5, 0.3, 0.3, m.steel, [-4.6 + i * 2.4, 1.2, 3.9]);
  // Sintering furnace
  b.box(3.0, 2.4, 1.6, m.cladGrey, [-4.6, 0.65, 1.7]);
  b.part(new THREE.BoxGeometry(2.2, 0.9, 0.06), furnace, [-4.6, 1.8, 2.53], { kind: 'pulse', speed: 2, material: furnace });
  robotArm(b, m, -0.6, 0.65, 2.2, 1.1, 0);
  robotArm(b, m, 3.6, 0.65, 2.2, 1.1, 1.7);
  // Exhaust vent
  b.cyl(0.32, 0.5, 9.5, m.paintWhite, [6.8, 0.25, -4.8], 20);
  b.part(new THREE.CylinderGeometry(0.38, 0.38, 0.25, 20, 1, true), cy, [6.8, 8.6, -4.8], { kind: 'glow', material: cy });
  return b;
}

export function qaAuto(): ModelBuilder {
  // Automated inspection: assemblies slide through a spinning ring scanner.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  const scan = glow(m.ledGreen);
  slab(b, 12, 8, m.concrete);
  taper(b, m.paintWhite, 7.2, 5.6, 3.8, 0.8, [-2.2, 0.25, -0.6]);
  taper(b, m.glass, 7.2, 5.6, 3.8, 0.8, [-2.2, 0.25, -0.6], 1.3, 2.8, 0.1);
  seam(b, cy, 6.4, [-2.2, 1.05, 2.12]);
  // Assembly on rollers through the ring
  for (const zz of [-2.4, 2.4]) b.box(0.6, 1.4, 0.4, m.steelDark, [3.4, 0.25, zz]);
  b.box(0.36, 0.36, 6.6, m.steel, [3.4, 1.65, 0]);
  // Ring scanner: white ring, spinning lit inner ring and sweep beam
  for (const dx of [-0.9, 0.9]) b.box(0.4, 0.9, 0.9, m.paintWhite, [3.4 + dx, 0.25, 0]);
  b.torus(1.6, 0.3, m.paintWhite, [3.4, 2.4, 0], [0, Math.PI / 2, 0], 40);
  const ring = new THREE.Group();
  const inner = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.06, 8, 40), cy);
  const sweep = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.5, 0.04), scan);
  ring.add(inner, sweep);
  ring.rotation.y = Math.PI / 2;
  const holder = new THREE.Group();
  holder.add(ring);
  holder.position.set(3.4, 2.4, 0);
  b.partGroup(holder, { kind: 'spin', axis: 'x', speed: 2.4 });
  b.part(new THREE.BoxGeometry(0.1, 0.1, 0.1), cy, [3.4, 4.1, 0], { kind: 'pulse', speed: 2, material: cy });
  b.height = Math.max(b.height, 4.3);
  return b;
}

// ── Fuel: storage ───────────────────────────────────────────────────────

export function fuelVault(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 12, m.concrete);
  // Tall windowless high-bay with ribbed cladding and a security ring
  roofed(b, m, 9.2, 9.0, 8.4, m.cladGrey, [0, -0.6]);
  for (let i = 0; i < 10; i++) b.box(0.14, 9.0, 0.2, m.steelDark, [-4.2 + i * 0.93, 0.25, 3.65]);
  b.box(9.25, 0.5, 8.45, m.cladBlue, [0, 7.0, -0.6]);
  b.box(2.4, 2.8, 0.08, m.hazard, [2.6, 0.25, 3.62]);
  const led = glow(m.ledGreen);
  b.part(new THREE.BoxGeometry(1.2, 0.1, 0.04), led, [-2.4, 2.6, 3.68], { kind: 'blink', material: led });
  for (const s of [-1, 1]) {
    b.box(11.4, 2.0, 0.05, m.steelDark, [0, 0.25, s * 5.7]);
    b.box(0.05, 2.0, 11.4, m.steelDark, [s * 5.7, 0.25, 0]);
  }
  b.box(0.3, 4.2, 0.3, m.steel, [5.2, 0.25, 5.2]);
  b.part(new THREE.SphereGeometry(0.1, 6, 4), m.beacon, [5.2, 4.6, 5.2], { kind: 'beacon' });
  return b;
}

export function spentVault(): ModelBuilder {
  // Deep geological repository: a terraced earth berm with a lit monolith
  // portal, a cask on its rail and sleek ventilation pylons.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  slab(b, 16, 12, m.gravel);
  b.box(12.0, 1.2, 8.0, m.concreteWarm, [-1.4, 0.25, -1.6]);
  b.box(10.0, 1.2, 6.6, m.concreteWarm, [-1.4, 1.45, -1.9]);
  b.box(7.6, 1.0, 5.0, m.concreteWarm, [-1.4, 2.65, -2.2]);
  // Monolith portal with a glowing door frame
  taper(b, m.concrete, 5.4, 2.4, 4.6, 0.72, [-1.4, 0.25, 3.0]);
  b.box(2.4, 2.6, 0.1, m.steelDark, [-1.4, 0.25, 4.22]);
  beam(b, cy, [-2.75, 0.3, 4.3], [-2.75, 3.0, 4.3], 0.12, 1.4);
  beam(b, cy, [-0.05, 0.3, 4.3], [-0.05, 3.0, 4.3], 0.12, 1.4);
  beam(b, cy, [-2.75, 3.0, 4.3], [-0.05, 3.0, 4.3], 0.12, 1.4);
  // Rail and a shielded transfer cask
  for (const dx of [-0.5, 0.5]) b.box(0.08, 0.1, 1.6, m.steel, [-1.4 + dx, 0.25, 5.1]);
  b.cyl(0.65, 0.65, 1.6, m.paintWhite, [-1.4, 1.0, 5.1], 20, [Math.PI / 2, 0, 0]);
  b.part(new THREE.TorusGeometry(0.67, 0.05, 6, 24), cy, [-1.4, 1.0, 5.1], { kind: 'pulse', speed: 1.4, material: cy }, [0, 0, 0]);
  // Ventilation pylons
  for (const x of [-6.6, 3.8]) {
    b.cyl(0.35, 0.75, 6.0, m.paintWhite, [x, 0.25, -4.8], 6);
    b.part(new THREE.CylinderGeometry(0.4, 0.4, 0.25, 6, 1, true), cy, [x, 5.7, -4.8], { kind: 'glow', material: cy });
    b.emit({ pos: [x, 6.3, -4.8], radius: 0.3, rate: 0.08, size: 0.7, kind: 'vapor' });
  }
  // Surface handling building
  taper(b, m.paintWhite, 3.8, 4.8, 4.2, 0.8, [5.8, 0.25, 1.4]);
  taper(b, m.glass, 3.8, 4.8, 4.2, 0.8, [5.8, 0.25, 1.4], 1.6, 3.0, 0.1);
  seam(b, cy, 3.2, [5.8, 1.3, 3.65]);
  return b;
}

// ── Grid ────────────────────────────────────────────────────────────────

export function substation400(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 12, m.gravel);
  // Three big single-phase transformers with fire walls
  for (let i = 0; i < 3; i++) {
    const x = -3.6 + i * 3.6;
    b.box(2.2, 2.4, 1.8, m.steelDark, [x, 0.25, 2.4]);
    for (let f = 0; f < 6; f++) b.box(0.05, 1.8, 0.8, m.steel, [x - 0.9 + f * 0.36, 0.45, 1.2]);
    for (let r = 0; r < 6; r++) b.cyl(0.14, 0.14, 0.1, m.insulator, [x, 2.75 + r * 0.22, 2.4], 10);
    if (i < 2) b.box(0.3, 3.2, 2.4, m.concrete, [x + 1.8, 0.25, 2.4]);
  }
  // Gas-insulated switchgear hall and tall gantries
  roofed(b, m, 9.0, 3.0, 2.6, m.cladWhite, [0, -1.6]);
  for (const x of [-5, 5]) b.lattice(8.5, 0.6, m.steel, [x, 0.25, -4.6], 6);
  b.box(10.4, 0.25, 0.25, m.steel, [0, 8.6, -4.6]);
  for (let k = -1; k <= 1; k++) b.cyl(0.08, 0.08, 1.2, m.insulator, [k * 3, 7.6, -4.6], 8);
  return b;
}

export function gridSc(): ModelBuilder {
  // Superconducting link: frosted cryostats and three terminations wrapped in
  // glowing frost rings, feeding a lit cryogenic cable trench.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  const frost = glow(m.glowCyan);
  slab(b, 12, 8, m.concrete);
  for (let i = 0; i < 3; i++) {
    const x = -4.4 + i * 1.6;
    b.cyl(0.7, 0.7, 4.4, m.paintWhite, [x, 0.25, -2.2], 20);
    b.dome(0.7, m.paintWhite, [x, 4.65, -2.2], 0.5, 16);
    for (const y of [1.4, 3.2]) b.part(new THREE.CylinderGeometry(0.72, 0.72, 0.16, 20, 1, true), frost, [x, y, -2.2], { kind: 'pulse', speed: 1.5 + i * 0.3, material: frost });
    b.emit({ pos: [x, 5.0, -2.2], radius: 0.3, rate: 0.15, size: 0.8, kind: 'vapor' });
  }
  taper(b, m.paintWhite, 4.6, 3.4, 3.4, 0.78, [2.8, 0.25, -1.6]);
  taper(b, m.glass, 4.6, 3.4, 3.4, 0.78, [2.8, 0.25, -1.6], 1.2, 2.4, 0.1);
  seam(b, cy, 4.0, [2.8, 0.85, 0.1]);
  b.pipe([-3.7, 3.0, -2.2], [0.5, 3.0, -2.2], 0.16, m.pipeWhite, 10);
  // Cable terminations with stacked frost rings
  for (let i = 0; i < 3; i++) {
    const x = -2 + i * 2;
    b.cyl(0.28, 0.4, 3.6, m.steel, [x, 0.25, 2.2], 16);
    for (let k = 0; k < 4; k++) b.part(new THREE.TorusGeometry(0.46 - k * 0.03, 0.06, 8, 24), frost, [x, 1.0 + k * 0.75, 2.2], { kind: 'pulse', speed: 2 + i * 0.4, material: frost }, [Math.PI / 2, 0, 0]);
    b.part(new THREE.SphereGeometry(0.22, 12, 8), cy, [x, 4.0, 2.2], { kind: 'glow', material: cy });
    b.pipe([x, 0.45, 2.2], [x, 0.45, 3.4], 0.16, m.steelDark, 10);
    b.emit({ pos: [x, 1.0, 2.2], radius: 0.4, rate: 0.06, size: 0.6, kind: 'vapor' });
  }
  // Cryogenic cable trench
  b.box(10.8, 0.14, 0.7, m.steelDark, [0, 0.25, 3.4]);
  b.part(new THREE.BoxGeometry(10.6, 0.04, 0.22), cy, [0, 0.41, 3.4], { kind: 'pulse', speed: 1.2, material: cy });
  return b;
}

export function storageThermal(): ModelBuilder {
  // Molten-salt storage: an insulated hot tank streaked with glowing seams,
  // a cold tank and a sleek capsule steam generator.
  const b = new ModelBuilder();
  const m = materials();
  const hot = glow(m.glowOrange);
  const cy = glow(m.glowCyan);
  slab(b, 12, 12, m.concrete);
  b.cyl(2.4, 2.5, 6.2, m.steelDark, [-2.6, 0.25, -1.6], 36);
  b.dome(2.4, m.steelDark, [-2.6, 6.45, -1.6], 0.22, 32);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2;
    b.part(new THREE.BoxGeometry(0.12, 5.2, 0.12), hot, [-2.6 + Math.cos(a) * 2.47, 3.4, -1.6 + Math.sin(a) * 2.47], { kind: 'pulse', speed: 1.6, material: hot });
  }
  b.part(new THREE.CylinderGeometry(2.5, 2.5, 0.25, 36, 1, true), hot, [-2.6, 5.9, -1.6], { kind: 'glow', material: hot });
  b.cyl(2.2, 2.25, 5.0, m.paintWhite, [2.6, 0.25, -1.6], 36);
  b.dome(2.2, m.paintWhite, [2.6, 5.25, -1.6], 0.22, 32);
  b.part(new THREE.CylinderGeometry(2.27, 2.27, 0.22, 36, 1, true), cy, [2.6, 4.6, -1.6], { kind: 'glow', material: cy });
  b.pipe([-0.2, 1.4, -1.6], [0.45, 1.4, -1.6], 0.32, m.pipeWhite, 14);
  b.pipe([-0.2, 4.0, -1.6], [0.45, 4.0, -1.6], 0.22, m.pipeWhite, 14);
  // Capsule steam generator and pipes from both tanks
  const y = 1.6, z = 3.9;
  b.cyl(0.9, 0.9, 6.0, m.paintWhite, [0, y, z], 28, [0, 0, Math.PI / 2]);
  for (const dx of [-3.0, 3.0]) b.add(new THREE.SphereGeometry(0.9, 20, 12), m.paintWhite, [dx, y, z]);
  for (const x of [-1.5, 0, 1.5]) b.part(new THREE.TorusGeometry(0.92, 0.06, 8, 28), x < 0 ? hot : cy, [x, y, z], { kind: 'pulse', speed: 2, material: x < 0 ? hot : cy }, [0, Math.PI / 2, 0]);
  for (const x of [-2.2, 2.2]) b.box(0.5, 0.75, 1.2, m.steelDark, [x, 0.25, z]);
  b.pipe([-2.6, 1.6, 0.9], [-2.6, 1.6, 3.0], 0.25, m.pipeWhite, 12);
  b.pipe([2.6, 1.6, 0.6], [2.6, 1.6, 3.0], 0.25, m.pipeWhite, 12);
  b.emit({ pos: [-2.6, 6.9, -1.6], radius: 0.8, rate: 0.06, size: 1.0, kind: 'vapor' });
  return b;
}

export function storagePumped(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 20, 16, m.gravel);
  // Upper reservoir on an embankment at the back
  b.add(new THREE.CylinderGeometry(6.2, 7.6, 3.0, 40), m.concreteWarm, [-2, 1.75, -2.6], [0, 0, 0], [1.25, 1, 0.75]);
  b.add(new THREE.CylinderGeometry(5.9, 5.9, 0.06, 40), m.water, [-2, 3.27, -2.6], [0, 0, 0], [1.25, 1, 0.75]);
  // Penstocks down to the powerhouse
  for (const x of [3.2, 4.4]) {
    const pen = new THREE.CylinderGeometry(0.35, 0.35, 6.6, 12, 1, true);
    b.add(pen, m.steelDark, [x, 2.0, 2.4], [-1.05, 0, 0]);
  }
  roofed(b, m, 7.4, 3.6, 3.6, m.concrete, [4.6, 5.6], m.steelDark);
  lights(b, m, 6.8, 2.4, 7.42, 4.6, 6);
  // Tailrace pool with water
  b.box(6.0, 0.3, 2.2, m.concreteDark, [-4.0, 0.25, 6.4]);
  b.box(5.6, 0.06, 1.8, m.water, [-4.0, 0.56, 6.4]);
  b.lattice(8, 0.6, m.steel, [8.6, 0.25, 6.6], 6);
  b.part(new THREE.SphereGeometry(0.12, 6, 4), m.beacon, [8.6, 8.4, 6.6], { kind: 'beacon' });
  return b;
}

// ── Water ───────────────────────────────────────────────────────────────

export function intakeLarge(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 16, 12, m.concrete);
  b.box(14.4, 0.5, 3.6, m.concreteDark, [0, 0.25, -3.6]);
  b.box(14.0, 0.08, 3.2, m.water, [0, 0.72, -3.6]);
  // Travelling screens and the pump hall
  for (let i = 0; i < 4; i++) {
    const x = -5.4 + i * 3.6;
    b.box(2.4, 3.4, 0.4, m.paintGreen, [x, 0.75, -2.1]);
    b.box(2.6, 0.3, 0.6, m.steel, [x, 4.15, -2.1]);
  }
  roofed(b, m, 13.2, 4.6, 4.2, m.cladBlue, [0, 1.8]);
  lights(b, m, 12.4, 3.0, 3.92, 0, 8);
  for (let i = 0; i < 4; i++) b.cyl(0.6, 0.6, 1.0, m.paintYellow, [-4.8 + i * 3.2, 4.85, 1.8], 16);
  b.pipe([-6, 1.0, 4.0], [6, 1.0, 4.0], 0.5, m.pipeBlue, 16);
  return b;
}

export function treatmentEdi(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 12, m.concrete);
  roofed(b, m, 7.0, 4.0, 5.4, m.cladWhite, [-1.8, -2.4], m.cladBlue);
  lights(b, m, 6.4, 2.6, 0.32, -1.8, 6);
  // RO pressure-vessel racks and EDI stacks
  for (let i = 0; i < 5; i++) b.cyl(0.18, 0.18, 6.0, m.pipeWhite, [-1.8, 0.7 + i * 0.35, 1.8], 10, [0, 0, Math.PI / 2]);
  for (let i = 0; i < 4; i++) roofed(b, m, 0.9, 1.6, 0.6, m.paintGreen, [-4.0 + i * 1.4, 3.6], m.steel);
  // Ultra-pure water tanks
  for (const z of [-3.2, 0.4]) {
    b.cyl(1.2, 1.2, 4.6, m.paintWhite, [4.2, 0.25, z], 24);
    b.cyl(1.25, 1.25, 0.15, m.steel, [4.2, 4.85, z], 24);
  }
  b.pipe([4.2, 1.0, 2.0], [4.2, 1.0, 5.4], 0.18, m.pipeBlue);
  return b;
}

export function reservoir(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 20, 16, m.gravel);
  // Earth embankment with a lined basin of water
  b.box(18.4, 1.4, 14.4, m.concreteWarm, [0, 0.25, 0]);
  b.box(16.8, 0.1, 12.8, m.rubber, [0, 1.6, 0]);
  b.box(16.4, 0.08, 12.4, m.water, [0, 1.66, 0]);
  // Outlet tower with a footbridge
  b.cyl(0.9, 0.9, 3.6, m.concrete, [5.6, 0.25, -3.6], 18);
  b.box(4.6, 0.15, 0.6, m.steel, [7.6, 3.4, -3.6]);
  b.box(1.4, 1.0, 1.4, m.cladGrey, [5.6, 3.85, -3.6]);
  b.pipe([-8.6, 0.8, 6.8], [8.6, 0.8, 6.8], 0.35, m.pipeBlue, 14);
  return b;
}

// ── Support ─────────────────────────────────────────────────────────────

export function hqTower(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 12, m.concrete);
  // Glass office tower with setbacks and a lit crown
  b.box(6.4, 3.0, 6.4, m.facade, [0, 0.25, -0.6], 0, 0.35);
  b.box(5.2, 12.0, 5.2, m.facade, [0, 3.25, -0.6], 0, 0.35);
  b.box(4.2, 4.0, 4.2, m.facade, [0, 15.25, -0.6], 0, 0.35);
  for (const y of [3.25, 15.25, 19.25]) b.box(y === 3.25 ? 6.6 : y === 15.25 ? 5.4 : 4.4, 0.2, y === 3.25 ? 6.6 : y === 15.25 ? 5.4 : 4.4, m.paintWhite, [0, y, -0.6]);
  const crown = glow(m.glowCyan);
  b.part(new THREE.BoxGeometry(4.25, 0.35, 4.25), crown, [0, 18.8, -0.6], { kind: 'pulse', speed: 1.2, material: crown });
  b.cyl(0.06, 0.08, 3.0, m.steel, [0, 19.45, -0.6], 8);
  b.part(new THREE.SphereGeometry(0.12, 6, 4), m.beacon, [0, 22.5, -0.6], { kind: 'beacon' });
  // Plaza with a canopy and flags
  b.box(4.0, 0.15, 1.6, m.paintWhite, [0, 2.8, 3.4]);
  for (let i = 0; i < 3; i++) {
    b.cyl(0.05, 0.05, 4.0, m.steel, [-4.4 + i * 0.9, 0.25, 4.6], 6);
    b.box(0.7, 0.45, 0.03, i === 1 ? m.paintWhite : m.cladBlue, [-4.05 + i * 0.9, 3.7, 4.6]);
  }
  return b;
}

export function researchCampus(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 16, 12, m.concrete);
  // Two lab wings joined by a glass bridge
  roofed(b, m, 5.6, 5.0, 8.0, m.facade, [-4.6, -0.6], m.paintWhite);
  roofed(b, m, 5.6, 4.0, 5.6, m.facade, [4.0, -2.0], m.paintWhite);
  b.box(3.6, 1.4, 1.6, m.glass, [-0.2, 2.6, -1.4]);
  // Supercomputer pod with pulsing lights and a test-loop dome
  roofed(b, m, 3.2, 2.2, 2.6, m.steelDark, [4.6, 3.4]);
  const hpc = glow(m.glowCyan);
  b.part(new THREE.BoxGeometry(2.8, 0.12, 0.04), hpc, [4.6, 1.6, 4.72], { kind: 'blink', material: hpc });
  b.dome(1.6, m.cladWhite, [0.4, 0.25, 3.6], 1, 20);
  // Rooftop telescope dome and antenna
  b.dome(1.0, m.steel, [-4.6, 5.47, -2.6], 1, 16);
  b.cyl(0.05, 0.07, 2.6, m.steel, [-4.6, 5.47, 2.0], 8);
  b.part(new THREE.SphereGeometry(0.08, 6, 4), m.beacon, [-4.6, 8.1, 2.0], { kind: 'beacon' });
  return b;
}

export function roboticsDepot(): ModelBuilder {
  // Robotic maintenance hub: a ribbed white drone hangar with a lit portal,
  // a robot arm out front and two pads with hovering drones.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  slab(b, 12, 8, m.concrete);
  const hx = -1.6, hz = -0.8, r = 3.0, len = 7.0;
  b.add(new THREE.CylinderGeometry(r, r, len, 32, 1, false, 0, Math.PI), m.paintWhite, [hx, 0.25, hz], [0, 0, Math.PI / 2]);
  b.add(new THREE.CircleGeometry(r - 0.05, 32, 0, Math.PI), m.glass, [hx + len / 2 + 0.02, 0.25, hz], [0, Math.PI / 2, 0]);
  b.add(new THREE.CircleGeometry(r - 0.05, 32, 0, Math.PI), m.paintWhite, [hx - len / 2 - 0.02, 0.25, hz], [0, -Math.PI / 2, 0]);
  for (const dx of [-2.4, -0.8, 0.8, 2.4]) b.torus(r + 0.03, 0.07, m.steelDark, [hx + dx, 0.25, hz], [0, Math.PI / 2, 0], 32, Math.PI);
  b.part(new THREE.TorusGeometry(r - 0.1, 0.09, 8, 36, Math.PI), cy, [hx + len / 2 + 0.06, 0.25, hz], { kind: 'pulse', speed: 1.4, material: cy }, [0, Math.PI / 2, 0]);
  b.height = Math.max(b.height, 0.25 + r);
  robotArm(b, m, -1.0, 0.25, 3.0, 0.9, 0.5);
  // Drone pads with hovering drones
  for (const [zz, ph] of [[-2.0, 0], [1.8, 2]] as [number, number][]) {
    b.cyl(1.1, 1.1, 0.1, m.steelDark, [4.2, 0.25, zz], 24);
    b.part(new THREE.TorusGeometry(0.95, 0.05, 6, 28), cy, [4.2, 0.37, zz], { kind: 'pulse', speed: 2, material: cy }, [Math.PI / 2, 0, 0]);
    const d = new THREE.Group();
    d.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.55), m.paintWhite));
    for (const [x, z2] of [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 16), m.steelDark);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, 0.06, z2);
      d.add(ring);
    }
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), m.glowCyan);
    eye.position.set(0.28, -0.02, 0);
    d.add(eye);
    d.scale.setScalar(1.7);
    d.position.set(4.2, 1.9, zz);
    b.partGroup(d, { kind: 'float', speed: 1.3, phase: ph });
  }
  return b;
}

export function backupGasTurbine(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 8, m.concrete);
  // Two turbine enclosures with intake filters and exhaust stacks
  for (const z of [-1.6, 1.6]) {
    b.box(6.0, 2.4, 2.2, m.cladWhite, [-1.2, 0.25, z]);
    b.box(1.6, 2.0, 2.2, m.slats, [-4.6, 0.65, z]);
    b.cyl(0.55, 0.65, 6.0, m.steel, [2.6, 0.25, z], 16);
    b.emit({ pos: [2.6, 6.3, z], radius: 0.4, rate: 0.08, size: 0.9, kind: 'smoke' });
  }
  b.cyl(1.0, 1.0, 2.2, m.paintWhite, [4.8, 0.25, 0], 18);
  return b;
}

export function fireStation(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 8, 8, m.concrete);
  // Engine bay with three red doors, crew wing and a hose-drying tower
  b.box(6.2, 3.6, 4.2, m.cladWhite, [-0.5, 0.25, -1.4]);
  for (const x of [-2.4, -0.5, 1.4]) b.box(1.6, 2.6, 0.08, m.paintRed, [x, 0.25, 0.73]);
  b.box(6.4, 0.25, 4.4, m.steelDark, [-0.5, 3.85, -1.4]);
  b.box(1.4, 6.2, 1.4, m.paintRed, [3.3, 0.25, -2.6]);
  b.box(1.6, 0.3, 1.6, m.steelDark, [3.3, 6.45, -2.6]);
  b.box(6.2, 0.5, 0.12, m.sign, [-0.5, 3.2, 0.76]);
  // Two foam tenders on the apron
  for (const x of [-1.8, 0.9]) {
    b.box(2.2, 1.3, 1.0, m.paintRed, [x, 0.35, 2.4]);
    b.box(0.7, 0.9, 1.0, m.glass, [x + 1.1, 0.6, 2.4]);
    b.box(1.6, 0.12, 0.5, m.steel, [x - 0.2, 1.65, 2.4]);
  }
  b.box(0.2, 0.2, 0.2, m.beacon, [3.3, 6.75, -2.6]);
  return b;
}

export function emergencyCentre(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 8, m.concrete);
  // Low bunker with earth berm, comms mast and mobile (FLEX) equipment
  b.box(7.5, 3.2, 5.0, m.concreteDark, [-1.4, 0.25, -0.6]);
  b.box(8.3, 0.9, 5.8, m.gravel, [-1.4, 0.25, -0.6]);
  b.box(7.7, 0.3, 5.2, m.concrete, [-1.4, 3.45, -0.6]);
  b.box(1.8, 2.4, 0.15, m.steelDark, [-1.4, 0.25, 1.95]);
  b.lattice(10, 1.0, m.steel, [-4.2, 3.75, -2.4], 5);
  b.cyl(0.05, 0.05, 1.6, m.steel, [-4.2, 13.7, -2.4], 6);
  b.dome(0.7, m.paintWhite, [1.0, 3.75, -1.6], 0.6, 16);
  for (const [x, z] of [[3.6, 1.8], [3.6, -0.4]] as const) {
    b.box(2.4, 1.5, 1.4, m.paintYellow, [x, 0.25, z]);
    b.box(2.4, 0.2, 1.4, m.steelDark, [x, 1.75, z]);
  }
  b.box(0.2, 0.2, 0.2, m.beacon, [-4.2, 14.5, -2.4]);
  return b;
}

export function floodWall(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  // A section of tall reinforced-concrete wall with a watertight gate and pumps
  b.box(16, 0.3, 3.6, m.gravel, [0, 0, 0]);
  b.box(15.6, 5.0, 1.0, m.concrete, [0, 0.3, -0.6]);
  b.box(15.8, 0.4, 1.3, m.concreteDark, [0, 5.3, -0.6]);
  for (let x = -7; x <= 7; x += 2.33) b.box(0.5, 5.0, 1.6, m.concreteDark, [x, 0.3, -0.4]);
  b.box(3.0, 3.6, 0.3, m.steelDark, [3.5, 0.3, 0.05]);
  b.box(3.0, 0.3, 0.3, m.hazard, [3.5, 3.9, 0.05]);
  for (const x of [-5, -3.2]) b.cyl(0.45, 0.45, 1.6, m.pipeBlue, [x, 0.3, 1.0], 14);
  b.pipe([-5, 1.4, 1.0], [-5, 5.6, -0.6], 0.18, m.pipeBlue);
  return b;
}
