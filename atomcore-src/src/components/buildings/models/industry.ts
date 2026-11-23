import * as THREE from 'three';
import { ModelBuilder, fanRotor } from '../builder';
import { materials } from '../materials';
import { stack } from './reactors';

// Large late-game buildings. Units are metres; one grid cell is 4 m and the
// origin is the footprint centre at ground level.

function slab(b: ModelBuilder, w: number, d: number, mat?: THREE.Material) {
  b.box(w - 0.3, 0.25, d - 0.3, mat ?? materials().concreteDark, [0, 0, 0]);
}

function glow(base: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  return base.clone();
}

/** Row of lit windows on a face. axis 'x' runs along x at depth z; 'z' runs along z at x. */
function windows(b: ModelBuilder, axis: 'x' | 'z', from: number, to: number, y: number, at: number, n: number, mat: THREE.Material, h = 0.5) {
  const step = (to - from) / n;
  for (let i = 0; i < n; i++) {
    const c = from + step * (i + 0.5);
    if (axis === 'x') b.box(step * 0.62, h, 0.06, mat, [c, y, at]);
    else b.box(0.06, h, step * 0.62, mat, [at, y, c]);
  }
}

// ── Gigawatt reactor (4×4) ──────────────────────────────────────────────

export function eprReactor(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 16, 16);
  const cx = -2.2, cz = -2.2, r = 4.9;
  // Outer containment shell (double wall) with ring beam and dome
  b.cyl(r + 0.35, r + 0.35, 0.6, m.concreteDark, [cx, 0.25, cz], 56);
  b.cyl(r, r, 8.6, m.concrete, [cx, 0.25, cz], 56);
  b.cyl(r + 0.12, r + 0.12, 0.4, m.concreteDark, [cx, 8.85, cz], 56);
  b.dome(r, m.concrete, [cx, 9.2, cz], 0.78, 48);
  b.torus(r * 0.55, 0.08, m.concreteDark, [cx, 9.2 + r * 0.78 * 0.83, cz], [Math.PI / 2, 0, 0], 40);
  // Vertical tendon pilasters
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    b.box(0.6, 8.6, 0.6, m.concreteDark, [cx + Math.cos(a) * (r - 0.1), 0.25, cz + Math.sin(a) * (r - 0.1)], -a);
  }
  // Equipment hatch & personnel airlock
  b.pipe([cx + r * 0.66, 2.6, cz + r * 0.75], [cx + r * 0.82, 2.6, cz + r * 0.93], 1.1, m.steelDark, 24);
  // Cherenkov glow ring under the dome and aviation lights
  const ck = m.glowCyan.clone();
  b.part(new THREE.CylinderGeometry(r + 0.03, r + 0.03, 0.26, 48, 1, true), ck, [cx, 7.4, cz], { kind: 'glow', material: ck });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.part(new THREE.SphereGeometry(0.11, 6, 4), m.beacon, [cx + Math.cos(a) * r * 0.62, 9.2 + r * 0.78 * 0.78, cz + Math.sin(a) * r * 0.62], { kind: 'beacon', phase: i });
  }
  // Four safeguard buildings (one per safety train) hugging the containment
  const sg: [number, number, number, number][] = [[4.1, -5.6, 3.0, 3.6], [4.1, -1.6, 3.0, 3.6], [-6.4, 4.9, 3.2, 3.0], [-2.4, 5.4, 3.6, 2.6]];
  for (const [x, z, w, d] of sg) {
    b.box(w, 5.2, d, m.concreteWarm, [x, 0.25, z]);
    b.box(w + 0.15, 0.25, d + 0.15, m.steelDark, [x, 5.45, z]);
    b.box(0.9, 0.5, 0.9, m.steel, [x, 5.7, z]);
  }
  windows(b, 'z', -7.2, 0, 3.6, 5.62, 6, m.windowGlow);
  // Turbine-side auxiliary block with control room glazing
  b.box(4.2, 6.4, 5.6, m.cladGrey, [5.0, 0.25, 4.3]);
  b.box(4.35, 0.3, 5.75, m.steelDark, [5.0, 6.65, 4.3]);
  b.box(4.24, 0.9, 5.64, m.glass, [5.0, 4.6, 4.3]);
  windows(b, 'x', 3.1, 6.9, 2.4, 7.12, 4, m.windowGlow);
  // Fuel building with hazard-striped cask door
  b.box(3.4, 7.2, 4.0, m.cladWhite, [-6.0, 0.25, 1.4]);
  b.box(3.55, 0.25, 4.15, m.steelDark, [-6.0, 7.45, 1.4]);
  b.box(0.06, 2.8, 2.2, m.hazard, [-7.72, 0.25, 1.4]);
  // Main steam & feedwater lines to the turbine island
  for (let i = 0; i < 4; i++) {
    const z = cz - 2.4 + i * 1.6;
    b.pipe([cx + r * 0.9, 4.4, z], [7.7, 4.4, z], 0.22, i % 2 ? m.pipeBlue : m.pipeWhite);
  }
  // Emergency diesel buildings with exhausts
  for (const x of [-1.4, 2.0]) {
    b.box(2.6, 2.6, 2.0, m.paintGreen, [x, 0.25, 6.8]);
    b.cyl(0.18, 0.18, 1.6, m.steelDark, [x + 0.8, 2.85, 6.8], 10);
  }
  b.coreTop = 9.2 + r * 0.78;
  stack(b, 7.0, -7.0, 17, 0.55);
  b.emit({ pos: [5.0, 7.2, 4.3], radius: 0.8, rate: 0.25, size: 1.2, kind: 'vapor' });
  return b;
}

// ── Mega cooling tower (5×5) ────────────────────────────────────────────

export function megaTower(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 20, 20);
  b.cyl(9.4, 9.6, 0.7, m.concreteDark, [0, 0.2, 0], 64);
  const legs = 40;
  for (let i = 0; i < legs; i++) {
    const a = (i / legs) * Math.PI * 2;
    b.add(new THREE.BoxGeometry(0.24, 2.8, 0.24), m.concrete, [Math.cos(a) * 8.55, 2.2, Math.sin(a) * 8.55], [0, -a, i % 2 ? 0.35 : -0.35]);
  }
  const h = 30, y0 = 3.4, steps = 26;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const throat = 0.75;
    const k = (t - throat) / (t < throat ? throat : 1 - throat);
    pts.push([5.3 + (t < throat ? 3.15 : 0.95) * k * k, y0 + t * (h - y0)]);
  }
  const shellMat = m.concrete.clone();
  shellMat.side = THREE.DoubleSide;
  b.add(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 72), shellMat);
  b.height = h;
  // Red-and-white aviation bands near the rim
  const band = (i0: number, i1: number, mat: THREE.Material) => {
    const seg = pts.slice(i0, i1 + 1).map(([x, y]) => new THREE.Vector2(x + 0.03, y));
    const g = new THREE.LatheGeometry(seg, 72);
    const mm = (mat as THREE.MeshStandardMaterial).clone();
    mm.side = THREE.DoubleSide;
    b.add(g, mm);
  };
  band(steps - 2, steps, m.paintRed);
  band(steps - 4, steps - 3, m.paintRed);
  b.torus(pts[steps][0], 0.2, m.concreteDark, [0, h, 0], [Math.PI / 2, 0, 0], 72);
  b.cyl(8.2, 8.2, 0.05, m.rubber, [0, 3.4, 0], 56);
  // Internal spray fill hint and inlet culverts
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) b.pipe([Math.cos(a) * 9.8, 1.2, Math.sin(a) * 9.8], [Math.cos(a) * 7.8, 1.2, Math.sin(a) * 7.8], 0.6, m.pipeBlue);
  // Circulating-water pump house at the base
  b.box(1.6, 2.6, 2.4, m.cladGrey, [9.0, 0.2, 0]);
  b.box(1.7, 0.15, 2.5, m.steelDark, [9.0, 2.8, 0]);
  b.emit({ pos: [0, h, 0], radius: 5.2, rate: 4.2, size: 9, kind: 'steam' });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.part(new THREE.SphereGeometry(0.16, 6, 4), m.beacon, [Math.cos(a) * pts[steps][0], h + 0.2, Math.sin(a) * pts[steps][0]], { kind: 'beacon', phase: i * 0.8 });
  }
  return b;
}

// ── HVDC converter station (4×3) ────────────────────────────────────────

export function hvdcStation(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 16, 12, m.gravel);
  const valve = glow(m.glowCyan);
  for (const x of [-4.2, 1.6]) {
    // Valve hall: tall windowless shed with a blue light band
    b.box(5.2, 6.4, 6.4, m.cladWhite, [x, 0.25, -2.2]);
    b.box(5.35, 0.3, 6.55, m.steelDark, [x, 6.65, -2.2]);
    b.box(5.22, 0.35, 6.42, m.cladBlue, [x, 5.2, -2.2]);
    b.part(new THREE.BoxGeometry(4.2, 0.18, 0.05), valve, [x, 3.0, 1.03], { kind: 'pulse', speed: 2.6, material: valve });
    // Converter transformers in front, bushings poking into the hall
    for (const dx of [-1.6, 0, 1.6]) {
      b.box(1.3, 2.0, 1.9, m.steelDark, [x + dx, 0.25, 2.4]);
      for (let f = 0; f < 4; f++) b.box(1.2, 1.4, 0.05, m.steel, [x + dx, 0.45, 3.4 + f * 0.12]);
      b.pipe([x + dx, 2.4, 1.6], [x + dx, 3.6, 1.0], 0.1, m.insulator, 8);
    }
  }
  // DC yard: smoothing reactors on post insulators and a terminal tower
  for (const z of [-4.2, -1.2]) {
    b.cyl(0.08, 0.08, 1.8, m.insulator, [6.2, 0.25, z], 8);
    b.cyl(0.7, 0.7, 1.1, m.steel, [6.2, 2.05, z], 18);
  }
  b.lattice(10, 1.0, m.steel, [6.4, 0.25, 3.2], 7);
  b.box(4.2, 0.2, 0.2, m.steel, [6.4, 10.1, 3.2]);
  for (const x of [4.6, 8.2]) b.cyl(0.07, 0.07, 1.0, m.insulator, [x, 9.1, 3.2], 8);
  b.part(new THREE.SphereGeometry(0.14, 6, 4), m.beacon, [6.4, 10.5, 3.2], { kind: 'beacon' });
  // Control building
  b.box(3.2, 2.6, 2.2, m.facade, [-5.6, 0.25, 4.3], 0, 0.35);
  b.box(3.35, 0.2, 2.35, m.paintWhite, [-5.6, 2.85, 4.3]);
  // Fence
  for (const s of [-1, 1]) {
    b.box(15.4, 1.6, 0.04, m.steelDark, [0, 0.25, s * 5.75]);
    b.box(0.04, 1.6, 11.4, m.steelDark, [s * 7.75, 0.25, 0]);
  }
  return b;
}

// ── Hyperscale data centre (4×3) ────────────────────────────────────────

export function dataCenter(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 16, 12, m.concrete);
  // Data halls: dark metal boxes with glowing light strips
  b.box(13.6, 4.6, 6.8, m.steelDark, [-0.6, 0.25, -1.8]);
  b.box(13.8, 0.25, 7.0, m.cladGrey, [-0.6, 4.85, -1.8]);
  const led = glow(m.glowCyan);
  const strips = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.12, 0.04), led);
    s.position.set(-0.6, 1.2 + i * 1.3, 1.63);
    strips.add(s);
  }
  for (const x of [-7.42, 6.22]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3.6, 0.12), led);
    s.position.set(x, 2.6, 1.0);
    strips.add(s);
  }
  b.partGroup(strips, { kind: 'pulse', speed: 1.4, material: led });
  // Rooftop chillers with spinning fans
  for (let i = 0; i < 5; i++) {
    for (const z of [-3.4, -0.4]) {
      const x = -5.8 + i * 2.6;
      b.box(2.2, 0.9, 2.2, m.cladWhite, [x, 5.1, z]);
      const fan = fanRotor(0.85, 5, m.steelDark, m.steel);
      fan.position.set(x, 6.05, z);
      b.partGroup(fan, { kind: 'spin', axis: 'y', speed: 6 });
    }
  }
  // Backup generator yard and fuel tanks
  for (let i = 0; i < 6; i++) {
    const x = -6.6 + i * 2.1;
    b.box(1.6, 1.6, 2.4, m.paintWhite, [x, 0.25, 4.4]);
    b.cyl(0.12, 0.12, 1.2, m.steelDark, [x + 0.5, 1.85, 4.0], 8);
  }
  b.cyl(0.9, 0.9, 2.2, m.steel, [6.6, 0.25, 4.3], 18);
  // Fibre / microwave mast
  b.lattice(9, 0.6, m.steel, [6.6, 0.25, -4.6], 6);
  b.part(new THREE.SphereGeometry(0.12, 6, 4), m.beacon, [6.6, 9.4, -4.6], { kind: 'beacon' });
  b.emit({ pos: [-0.6, 6.2, -1.9], radius: 4, rate: 0.35, size: 1.5, kind: 'vapor' });
  return b;
}

// ── Hydrogen electrolysis plant (3×3) ───────────────────────────────────

export function hydrogenPlant(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 12, m.concrete);
  // Electrolyser hall with visible stacks behind glazing
  b.box(6.0, 3.8, 4.4, m.cladWhite, [-2.6, 0.25, -3.2]);
  b.box(6.15, 0.2, 4.55, m.steelDark, [-2.6, 4.05, -3.2]);
  b.box(5.6, 1.4, 0.05, m.glass, [-2.6, 1.6, -0.98]);
  const cell = glow(m.glowCyan);
  for (let i = 0; i < 5; i++) b.part(new THREE.BoxGeometry(0.6, 1.0, 0.6), cell, [-4.8 + i * 1.1, 1.0, -2.0], { kind: 'pulse', speed: 3 + i * 0.3, material: cell });
  // Spherical hydrogen storage on legs
  for (const [x, z] of [[2.8, -3.4], [2.8, 0.6], [-1.2, 3.4]] as const) {
    const s = new THREE.SphereGeometry(1.75, 28, 18);
    b.add(s, m.paintWhite, [x, 2.85, z]);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      b.box(0.14, 1.8, 0.14, m.steel, [x + Math.cos(a) * 1.4, 0.25, z + Math.sin(a) * 1.4]);
    }
    b.torus(1.76, 0.06, m.steelDark, [x, 2.85, z]);
    b.height = Math.max(b.height, 4.6);
  }
  // Pipe rack linking everything
  b.pipe([-2.6, 2.2, -0.9], [2.8, 2.2, -0.9], 0.14, m.pipeWhite);
  b.pipe([2.8, 2.2, -0.9], [2.8, 2.2, 3.4], 0.14, m.pipeWhite);
  b.pipe([2.8, 2.2, 3.4], [-1.2, 2.2, 3.4], 0.14, m.pipeWhite);
  for (const [x, z] of [[0, -0.9], [2.8, 1.4], [0.8, 3.4]] as const) b.box(0.12, 2.1, 0.12, m.steelDark, [x, 0.25, z]);
  // Compressor house and vent stack with a pilot flame
  b.box(2.2, 2.0, 2.2, m.cladGrey, [-4.4, 0.25, 3.6]);
  b.cyl(0.18, 0.22, 6.5, m.steel, [5.0, 0.25, 4.8], 10);
  const flame = glow(m.glowOrange);
  b.part(new THREE.ConeGeometry(0.22, 0.7, 8), flame, [5.0, 7.1, 4.8], { kind: 'pulse', speed: 9, material: flame });
  b.box(1.2, 0.05, 0.6, m.sign, [-2.6, 3.2, -0.97]);
  return b;
}

// ── Reverse-osmosis water plant (3×2) ───────────────────────────────────

export function desalPlant(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 8, m.concrete);
  b.box(7.0, 3.4, 4.0, m.cladBlue, [-2.2, 0.25, -1.4]);
  b.box(7.15, 0.2, 4.15, m.cladWhite, [-2.2, 3.65, -1.4]);
  windows(b, 'x', -5.4, 1.0, 2.0, 0.63, 6, m.windowGlow);
  // Membrane racks visible outside (rows of white pressure tubes)
  for (let i = 0; i < 4; i++) b.cyl(0.16, 0.16, 6.0, m.pipeWhite, [-2.2, 0.8 + i * 0.4, 1.6], 10, [0, 0, Math.PI / 2]);
  // Product water tanks
  for (const z of [-2.0, 1.4]) {
    b.cyl(1.4, 1.4, 3.8, m.cladWhite, [3.9, 0.25, z], 28);
    b.cyl(1.45, 1.45, 0.15, m.steelDark, [3.9, 4.05, z], 28);
  }
  // Brine / settling basin
  b.box(3.4, 0.3, 1.6, m.concreteDark, [-3.6, 0.25, 2.9]);
  b.box(3.1, 0.06, 1.3, m.water, [-3.6, 0.52, 2.9]);
  b.pipe([-5.8, 0.6, 3.6], [5.8, 0.6, 3.6], 0.2, m.pipeBlue);
  return b;
}

// ── Medical isotope facility (2×2) ──────────────────────────────────────

export function isotopeLab(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 8, 8, m.concrete);
  // Heavy shielded hot-cell block
  b.box(5.2, 3.4, 3.8, m.concrete, [-0.6, 0.25, -1.2]);
  b.box(5.35, 0.25, 3.95, m.concreteDark, [-0.6, 3.65, -1.2]);
  // Lead-glass hot-cell windows glowing blue
  const hot = glow(m.glowCyan);
  for (let i = 0; i < 3; i++) b.part(new THREE.BoxGeometry(0.9, 0.7, 0.05), hot, [-2.2 + i * 1.6, 1.5, 0.72], { kind: 'pulse', speed: 1.8 + i * 0.4, material: hot });
  // Clean office wing
  b.box(3.0, 2.4, 2.4, m.facade, [1.8, 0.25, 2.2], 0, 0.35);
  b.box(3.15, 0.2, 2.55, m.paintWhite, [1.8, 2.65, 2.2]);
  // Shipping casks and hazard door
  for (let i = 0; i < 3; i++) b.cyl(0.32, 0.32, 0.8, m.paintYellow, [-2.8 + i * 0.8, 0.25, 2.6], 14);
  b.box(1.4, 2.0, 0.06, m.hazard, [-1.4, 0.25, 0.76]);
  stack(b, 2.8, -2.8, 7.5, 0.3);
  return b;
}

// ── Visitor centre & atom monument (3×2) ────────────────────────────────

export function visitorCenter(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 8, m.concrete);
  // Glass pavilion with a cantilevered sloping roof
  b.box(6.2, 3.0, 3.8, m.glass, [-2.4, 0.25, -1.6]);
  b.add(new THREE.BoxGeometry(7.6, 0.25, 5.0), m.paintWhite, [-2.4, 3.5, -1.6], [0.12, 0, 0]);
  for (const x of [-5.3, 0.5]) b.box(0.18, 3.0, 0.18, m.paintWhite, [x, 0.25, 0.3]);
  // Observation tower with deck
  b.cyl(0.6, 0.75, 9.5, m.concreteWarm, [-5.0, 0.25, -3.0], 20);
  b.cyl(1.5, 1.5, 0.25, m.paintWhite, [-5.0, 9.75, -3.0], 24);
  b.cyl(1.45, 1.45, 0.9, m.glass, [-5.0, 10.0, -3.0], 24, [0, 0, 0], true);
  b.part(new THREE.SphereGeometry(0.12, 6, 4), m.beacon, [-5.0, 11.1, -3.0], { kind: 'beacon' });
  // Giant atom sculpture: nucleus plus three spinning electron orbits
  const plinthX = 3.4, plinthZ = -1.2;
  b.cyl(1.6, 1.8, 0.6, m.concreteDark, [plinthX, 0.25, plinthZ], 28);
  b.cyl(0.18, 0.18, 2.6, m.steel, [plinthX, 0.85, plinthZ], 10);
  const nucleus = glow(m.glowOrange);
  b.part(new THREE.SphereGeometry(0.55, 20, 14), nucleus, [plinthX, 4.4, plinthZ], { kind: 'pulse', speed: 1.5, material: nucleus });
  const ring = glow(m.glowCyan);
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.07, 8, 48), ring);
    const electron = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), ring);
    electron.position.set(1.9, 0, 0);
    orbit.add(electron);
    g.add(orbit);
    g.position.set(plinthX, 4.4, plinthZ);
    g.rotation.set(Math.PI / 2 + (i - 1) * 1.05, 0, (i * Math.PI) / 3);
    orbit.userData.spin = true;
    b.partGroup(g, { kind: 'spin', axis: i === 1 ? 'y' : 'x', speed: 0.55 + i * 0.12, material: ring });
  }
  b.height = Math.max(b.height, 6.4);
  // Flags and parking with a few cars
  for (let i = 0; i < 3; i++) {
    b.cyl(0.05, 0.05, 4.2, m.steel, [-0.6 + i * 1.0, 0.25, 2.4], 6);
    b.box(0.7, 0.45, 0.03, i === 1 ? m.paintWhite : m.paintRed, [-0.25 + i * 1.0, 3.9, 2.4]);
  }
  b.box(5.2, 0.05, 2.4, m.rubber, [3.0, 0.26, 2.6]);
  const cars = [m.paintRed, m.cladBlue, m.paintWhite, m.paintYellow];
  for (let i = 0; i < 4; i++) {
    b.box(0.8, 0.45, 1.6, cars[i], [1.0 + i * 1.3, 0.3, 2.6]);
    b.box(0.7, 0.32, 0.8, m.glass, [1.0 + i * 1.3, 0.75, 2.5]);
  }
  return b;
}

// ── Rail fuel terminal (5×2) ────────────────────────────────────────────

export function railTerminal(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 20, 8, m.gravel);
  // Two tracks with sleepers
  for (const z of [-2.2, 0.6]) {
    for (const dz of [-0.36, 0.36]) b.box(19.6, 0.12, 0.08, m.steel, [0, 0.3, z + dz]);
    for (let i = 0; i < 32; i++) b.box(0.22, 0.06, 1.1, m.concreteDark, [-9.6 + i * 0.62, 0.25, z]);
  }
  // Locomotive
  b.box(4.2, 1.6, 1.3, m.paintYellow, [-6.6, 0.45, -2.2]);
  b.box(1.4, 0.8, 1.3, m.paintYellow, [-5.2, 2.05, -2.2]);
  b.box(0.05, 0.5, 1.0, m.glass, [-4.47, 2.2, -2.2]);
  b.box(4.0, 0.2, 1.36, m.steelDark, [-6.6, 2.05, -2.2]);
  b.part(new THREE.SphereGeometry(0.1, 6, 4), m.beacon, [-4.5, 1.9, -2.2], { kind: 'beacon' });
  // Flatcars carrying horizontal fuel flasks
  for (let i = 0; i < 3; i++) {
    const x = -2.0 + i * 3.4;
    b.box(3.0, 0.3, 1.3, m.steelDark, [x, 0.45, -2.2]);
    b.cyl(0.5, 0.5, 2.4, m.paintWhite, [x, 1.25, -2.2], 18, [0, 0, Math.PI / 2]);
    for (const dx of [-0.9, 0, 0.9]) b.cyl(0.53, 0.53, 0.12, m.steel, [x + dx, 1.25, -2.2], 18, [0, 0, Math.PI / 2]);
  }
  // Gantry crane spanning both tracks (slowly travelling)
  const crane = new THREE.Group();
  const yel = m.paintYellow;
  for (const dz of [-3.2, 1.8]) for (const dx of [-0.6, 0.6]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 5.2, 0.22), yel);
    leg.position.set(dx, 2.85, dz);
    crane.add(leg);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 5.6), yel);
  beam.position.set(0, 5.5, -0.7);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 0.4), m.steelDark);
  hook.position.set(0, 4.4, -1.0);
  crane.add(beam, hook);
  b.partGroup(crane, { kind: 'bob', speed: 0.25 });
  b.height = Math.max(b.height, 5.8);
  // Receiving warehouse and buffer stops
  b.box(8.0, 3.2, 2.0, m.cladGrey, [3.6, 0.25, 2.7]);
  b.box(8.15, 0.2, 2.15, m.steelDark, [3.6, 3.45, 2.7]);
  for (let i = 0; i < 3; i++) b.box(1.8, 2.2, 0.05, m.hazard, [0.9 + i * 2.6, 0.25, 1.68]);
  for (const z of [-2.2, 0.6]) b.box(0.4, 0.8, 1.2, m.paintRed, [9.5, 0.25, z]);
  return b;
}
