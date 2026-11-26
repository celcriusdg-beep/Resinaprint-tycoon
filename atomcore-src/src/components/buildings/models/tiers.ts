import * as THREE from 'three';
import { ModelBuilder, fanRotor } from '../builder';
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
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 20, 12);
  roofed(b, m, 18.6, 8.2, 8.4, m.cladWhite, [0, -1.4], m.cladBlue);
  b.box(18.65, 0.9, 8.45, m.cladBlue, [0, 6.2, -1.4]);
  lights(b, m, 17, 4.6, 2.85, 0, 12);
  // Turbine deck on the open side with HP/IP/LP casings and a big generator
  b.box(17.6, 1.0, 2.4, m.concrete, [0, 0.25, 4.2]);
  turbineSet(b, m, -8.2, 8.0, 2.3, 4.2, 1.0);
  // Feedwater heaters and a crane gantry
  for (let i = 0; i < 4; i++) b.cyl(0.4, 0.4, 3.2, m.steel, [-6 + i * 1.2, 1.4, 2.9], 12, [0, 0, Math.PI / 2]);
  b.box(18.6, 0.3, 0.3, m.paintYellow, [0, 8.6, 2.9]);
  stack(b, 9.0, -5.0, 11, 0.3);
  return b;
}

export function turbineSco2(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 12, m.concrete);
  // Compact turbomachinery hall with a glass front: the turbine is tiny
  roofed(b, m, 6.2, 3.6, 5.0, m.glass, [-2.4, -2.6], m.paintWhite);
  const core = glow(m.glowCyan);
  b.part(new THREE.CylinderGeometry(0.35, 0.35, 3.2, 16), core, [-2.4, 1.6, -2.6], { kind: 'pulse', speed: 3, material: core }, [0, 0, Math.PI / 2]);
  b.cyl(0.8, 0.8, 1.4, m.paintYellow, [0.2, 1.6, -2.6], 18, [0, 0, Math.PI / 2]);
  // Printed-circuit recuperator blocks and CO2 inventory tanks
  for (let i = 0; i < 3; i++) roofed(b, m, 1.4, 2.4, 1.4, m.steel, [-4.4 + i * 1.8, 2.8], m.steelDark);
  for (let i = 0; i < 4; i++) b.cyl(0.45, 0.45, 3.2, m.paintWhite, [2.6 + (i % 2) * 1.2, 0.25, 1.2 + Math.floor(i / 2) * 2.2], 14);
  // Dry gas coolers with fans
  roofed(b, m, 4.0, 2.0, 3.0, m.cladGrey, [3.6, -3.2]);
  fan(b, m, 2.8, 2.9, -3.2, 0.6, 7);
  fan(b, m, 4.4, 2.9, -3.2, 0.6, 7);
  b.pipe([0.8, 2.0, -2.0], [2.2, 2.0, -2.0], 0.22, m.pipeWhite);
  return b;
}

export function turbineMhd(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 16, 12);
  // Superconducting magnet: a big torus-wrapped duct with glowing plasma channel
  b.box(10, 1.2, 3.6, m.concrete, [-1.5, 0.25, -2.2]);
  for (let i = 0; i < 5; i++) b.torus(1.6, 0.38, m.copper, [-5 + i * 1.75, 3.1, -2.2], [0, Math.PI / 2, 0], 28);
  const plasma = glow(m.glowPlasma);
  b.part(new THREE.CylinderGeometry(0.75, 0.95, 9.2, 20), plasma, [-1.5, 3.1, -2.2], { kind: 'pulse', speed: 6, material: plasma }, [0, 0, Math.PI / 2]);
  b.cyl(1.2, 1.2, 1.4, m.steelDark, [-6.8, 3.1, -2.2], 20, [0, 0, Math.PI / 2]);
  // Cryostat tanks, inverter hall and the steam bottoming section
  for (const x of [-5.5, -3.5]) b.cyl(0.7, 0.7, 3.4, m.paintWhite, [x, 0.25, 3.0], 16);
  roofed(b, m, 6.0, 4.0, 4.2, m.cladBlue, [3.4, 3.0]);
  lights(b, m, 5.4, 2.6, 0.88, 3.4, 5);
  roofed(b, m, 3.4, 5.2, 3.4, m.cladGrey, [5.6, -2.6]);
  b.pipe([3.5, 3.1, -2.2], [3.9, 3.1, -2.2], 0.6, m.steelDark);
  stack(b, 6.8, 4.8, 10, 0.4);
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
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 16, 12, m.concrete);
  // Intake channel with water and travelling screens
  b.box(14.6, 0.5, 3.4, m.concreteDark, [0, 0.25, -3.6]);
  b.box(14.2, 0.08, 3.0, m.water, [0, 0.72, -3.6]);
  for (let i = 0; i < 6; i++) b.box(0.25, 2.6, 3.2, m.paintGreen, [-6 + i * 2.4, 0.75, -3.6]);
  // Pump house with four big vertical pumps and the outfall pipes
  roofed(b, m, 13.6, 4.2, 4.0, m.cladBlue, [0, 0.6]);
  lights(b, m, 12.6, 2.4, 2.62, 0, 8);
  for (let i = 0; i < 4; i++) {
    const x = -5 + i * 3.3;
    b.cyl(0.55, 0.55, 1.2, m.paintYellow, [x, 4.45, 0.6], 16);
    b.pipe([x, 0.9, 2.6], [x, 0.9, 5.6], 0.55, m.pipeBlue, 16);
  }
  b.box(0.8, 5, 0.8, m.steel, [7.0, 0.25, 4.6]);
  b.part(new THREE.SphereGeometry(0.1, 6, 4), m.beacon, [7.0, 5.4, 4.6], { kind: 'beacon' });
  return b;
}

export function coolingSky(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 16, 16, m.gravel);
  // Rows of tilted radiative panels with a faint infrared glow
  const ir = glow(m.glowCyan);
  const panels = new THREE.Group();
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      const x = -5 + c * 5, z = -6 + r * 3;
      b.box(0.12, 0.9, 0.12, m.steel, [x - 1.8, 0.25, z]);
      b.box(0.12, 0.9, 0.12, m.steel, [x + 1.8, 0.25, z]);
      b.add(new THREE.BoxGeometry(4.4, 0.08, 2.2), m.glass, [x, 1.25, z], [-0.35, 0, 0]);
      const p = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.02, 2.1), ir);
      p.position.set(x, 1.31, z);
      p.rotation.x = -0.35;
      panels.add(p);
    }
  }
  b.partGroup(panels, { kind: 'pulse', speed: 0.8, material: ir });
  // Coolant manifold and control hut
  b.pipe([-7.4, 0.6, -6.5], [-7.4, 0.6, 6.5], 0.22, m.pipeWhite);
  roofed(b, m, 2.0, 2.0, 2.0, m.cladWhite, [6.6, 6.6]);
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
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 16, 12, m.concrete);
  roofed(b, m, 9.6, 5.0, 8.0, m.cladGrey, [-2.4, -0.6], m.steelDark);
  // Laser beam lines visible through a long window
  b.box(8.8, 0.9, 0.06, m.glass, [-2.4, 2.6, 3.42]);
  const beam = glow(m.glowPlasma);
  for (let i = 0; i < 3; i++) b.part(new THREE.BoxGeometry(8.2, 0.05, 0.05), beam, [-2.4, 2.3 + i * 0.3, 3.3], { kind: 'pulse', speed: 7 + i, material: beam });
  // Chillers and a separation vacuum vessel
  for (let i = 0; i < 3; i++) roofed(b, m, 1.6, 1.4, 1.6, m.cladWhite, [5.0, -3.6 + i * 2.2]);
  b.cyl(1.0, 1.0, 3.2, m.steel, [5.2, 0.25, 3.6], 18);
  b.dome(1.0, m.steel, [5.2, 3.45, 3.6], 0.5, 16);
  return b;
}

export function fabAuto(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 16, 12, m.concrete);
  roofed(b, m, 13.6, 5.4, 7.4, m.cladWhite, [0, -1.6], m.cladBlue);
  b.box(12.8, 1.0, 0.06, m.glass, [0, 3.8, 2.12]);
  // Sintering furnace glow and a robot arm swinging inside the window
  const furnace = glow(m.glowOrange);
  b.part(new THREE.BoxGeometry(3.0, 0.5, 0.1), furnace, [-3.6, 3.7, 2.0], { kind: 'pulse', speed: 2, material: furnace });
  const arm = new THREE.Group();
  const a1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.2), m.paintYellow);
  a1.position.y = 0.6;
  const a2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 0.16), m.paintYellow);
  a2.position.set(0.45, 1.2, 0);
  arm.add(a1, a2);
  arm.position.set(2.2, 3.2, 1.9);
  b.partGroup(arm, { kind: 'rock', axis: 'y', speed: 1.4 });
  // Loading dock with fuel containers
  for (let i = 0; i < 3; i++) b.box(1.2, 1.0, 2.0, m.paintYellow, [-4 + i * 1.6, 0.25, 4.4]);
  b.box(1.8, 2.4, 0.06, m.hazard, [4.2, 0.25, 2.12]);
  stack(b, 6.6, -4.8, 8.5, 0.28);
  return b;
}

export function qaAuto(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 8, m.concrete);
  roofed(b, m, 8.0, 3.4, 5.0, m.facade, [-1.2, -0.6], m.paintWhite);
  // Scanner gantry with a sweeping beam
  b.box(0.3, 2.6, 0.3, m.steel, [4.0, 0.25, -1.6]);
  b.box(0.3, 2.6, 0.3, m.steel, [4.0, 0.25, 1.6]);
  b.box(0.4, 0.4, 3.6, m.paintWhite, [4.0, 2.85, 0]);
  const scan = glow(m.ledGreen);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.4, 0.06), scan);
  beam.position.set(4.0, 1.6, 0);
  const g = new THREE.Group();
  g.add(beam);
  b.partGroup(g, { kind: 'bob', speed: 1.6 });
  for (let i = 0; i < 4; i++) b.box(0.5, 0.3, 3.2, m.steel, [-4.4 + i * 0.7, 0.25, 3.0]);
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
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 16, 12, m.gravel);
  // Portal into the hillside: a sloped earth mound with a concrete tunnel mouth
  b.add(new THREE.CylinderGeometry(4.2, 6.4, 3.4, 6, 1), m.concreteWarm, [-1.6, 1.95, -1.4], [0, Math.PI / 6, 0], [1.2, 1, 0.8]);
  b.box(4.0, 3.0, 1.6, m.concrete, [-1.6, 0.25, 2.6]);
  b.box(2.6, 2.2, 0.06, m.rubber, [-1.6, 0.25, 3.42]);
  b.box(3.0, 0.3, 0.1, m.hazard, [-1.6, 2.6, 3.44]);
  // Rail into the tunnel with a shielded transfer cask
  for (const dx of [-0.5, 0.5]) b.box(0.08, 0.1, 4.6, m.steel, [-1.6 + dx, 0.25, 5.2]);
  b.cyl(0.7, 0.7, 1.8, m.paintWhite, [-1.6, 1.0, 4.8], 18, [Math.PI / 2, 0, 0]);
  // Ventilation shafts and the surface handling building
  for (const x of [-4.8, 1.6]) {
    b.cyl(0.45, 0.45, 4.6, m.concreteDark, [x, 0.25, -4.2], 14);
    b.emit({ pos: [x, 4.9, -4.2], radius: 0.3, rate: 0.08, size: 0.7, kind: 'vapor' });
  }
  roofed(b, m, 3.6, 3.8, 4.4, m.cladGrey, [5.6, 1.6]);
  lights(b, m, 3.0, 2.4, 3.82, 5.6, 3);
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
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 8, m.concrete);
  // Cryogenic plant: LN2 dewars, cold box and the cable terminations
  for (let i = 0; i < 3; i++) {
    b.cyl(0.7, 0.7, 4.4, m.paintWhite, [-4.4 + i * 1.6, 0.25, -2.2], 18);
    b.dome(0.7, m.paintWhite, [-4.4 + i * 1.6, 4.65, -2.2], 0.5, 14);
  }
  roofed(b, m, 4.2, 3.0, 3.0, m.cladBlue, [1.8, -1.8]);
  const frost = glow(m.glowCyan);
  for (let i = 0; i < 3; i++) {
    b.cyl(0.3, 0.3, 2.4, m.steel, [-2 + i * 2, 0.25, 2.4], 14);
    b.part(new THREE.TorusGeometry(0.34, 0.06, 8, 20), frost, [-2 + i * 2, 1.6, 2.4], { kind: 'pulse', speed: 2 + i * 0.5, material: frost }, [Math.PI / 2, 0, 0]);
    b.pipe([-2 + i * 2, 0.4, 2.4], [-2 + i * 2, 0.4, 3.9], 0.18, m.steelDark);
  }
  b.emit({ pos: [-4.4, 5.0, -2.2], radius: 0.3, rate: 0.2, size: 0.8, kind: 'vapor' });
  return b;
}

export function storageThermal(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 12, m.concrete);
  // Hot tank (glowing seam) and cold tank
  b.cyl(2.4, 2.4, 5.2, m.steel, [-2.6, 0.25, -1.6], 32);
  b.dome(2.4, m.steel, [-2.6, 5.45, -1.6], 0.25, 28);
  const hot = glow(m.glowOrange);
  b.part(new THREE.CylinderGeometry(2.42, 2.42, 0.18, 32, 1, true), hot, [-2.6, 4.2, -1.6], { kind: 'glow', material: hot });
  b.cyl(2.2, 2.2, 4.4, m.cladWhite, [2.6, 0.25, -1.6], 32);
  b.dome(2.2, m.cladWhite, [2.6, 4.65, -1.6], 0.25, 28);
  b.pipe([-0.2, 1.4, -1.6], [0.4, 1.4, -1.6], 0.3, m.pipeWhite);
  // Steam generator train and turbine
  roofed(b, m, 8.0, 2.8, 2.6, m.cladGrey, [0, 3.8]);
  b.cyl(0.4, 0.4, 3.0, m.paintRed, [-3.0, 3.3, 3.8], 14, [0, 0, Math.PI / 2]);
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
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 8, m.concrete);
  roofed(b, m, 7.0, 3.6, 5.6, m.cladGrey, [-1.8, -0.6]);
  for (let i = 0; i < 3; i++) b.box(1.6, 2.6, 0.06, m.hazard, [-4.0 + i * 2.2, 0.25, 2.22]);
  // Drone landing pads with hovering drones
  for (const z of [-2.0, 1.4]) {
    b.cyl(0.9, 0.9, 0.08, m.paintYellow, [3.8, 0.25, z], 20);
    const d = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.5), m.steelDark);
    d.add(body);
    for (const [x, zz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) {
      const rot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 10), m.steel);
      rot.position.set(x, 0.1, zz);
      d.add(rot);
    }
    d.position.set(3.8, 1.6, z);
    b.partGroup(d, { kind: 'spin', axis: 'y', speed: 0.6 });
  }
  b.height = Math.max(b.height, 2);
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
