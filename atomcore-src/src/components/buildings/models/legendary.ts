import * as THREE from 'three';
import { ModelBuilder, type Vec3 } from '../builder';
import { materials } from '../materials';
import { slab, glow, taper, seam, beam, mirror, type M } from './tiers';

// T5 "Cutting-edge" and T6 "Legendary" buildings. Units are metres (one grid
// cell = 4 m); origin is the footprint centre at ground level.

/** See-through glass for casings that show the machinery inside. */
function clearGlass() {
  return new THREE.MeshStandardMaterial({ color: '#bfe6ff', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.22, depthWrite: false });
}

/** Translucent white vapour for vortex/plume shapes. */
function vapour(opacity = 0.35) {
  return new THREE.MeshStandardMaterial({ color: '#f2f6fa', roughness: 1, metalness: 0, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
}

function podium(b: ModelBuilder, m: M, r: number, h: number, sides = 6, y = 0.25) {
  b.cyl(r, r + 0.6, h, m.paintWhite, [0, y, 0], sides);
  b.cyl(r + 0.05, r + 0.05, 0.25, m.steelDark, [0, y + h, 0], sides);
}

function beacon(b: ModelBuilder, m: M, y: number, x = 0, z = 0) {
  b.part(new THREE.SphereGeometry(0.3, 8, 6), m.beacon, [x, y, z], { kind: 'beacon' });
  b.height = Math.max(b.height, y + 0.3);
}

// ── Reactors ────────────────────────────────────────────────────────────

export function stellarator(): ModelBuilder {
  // Twisted magnetic bottle: 40 modular coils that roll as they go round,
  // holding a violet plasma ribbon with a five-fold twist.
  const b = new ModelBuilder();
  const m = materials();
  const plasma = glow(m.glowPlasma);
  const cy = glow(m.glowCyan);
  slab(b, 20, 20, m.concrete);
  podium(b, m, 8.6, 1.4, 10);
  const R = 6.2, y0 = 5.4, N = 5;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 160; i++) {
    const t = (i / 160) * Math.PI * 2;
    const r = R + 0.9 * Math.cos(N * t);
    pts.push(new THREE.Vector3(Math.cos(t) * r, y0 + 0.9 * Math.sin(N * t), Math.sin(t) * r));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true);
  b.part(new THREE.TubeGeometry(curve, 240, 0.75, 14, true), plasma, [0, 0, 0], { kind: 'pulse', speed: 2.5, material: plasma });
  // Modular coils: tilted rings around the plasma, rolling with the twist
  for (let i = 0; i < 40; i++) {
    const t = (i / 40) * Math.PI * 2;
    const p = curve.getPointAt(i / 40);
    const g = new THREE.TorusGeometry(1.55, 0.26, 8, 24);
    g.rotateY(Math.PI / 2);
    g.rotateX(N * t * 0.5);
    b.add(g, i % 2 ? m.paintWhite : m.steel, [p.x, p.y, p.z], [0, -t, 0]);
  }
  // Cryostat struts, ports and a glowing equatorial ring
  for (let i = 0; i < 10; i++) {
    const t = (i / 10) * Math.PI * 2;
    b.box(0.6, y0 - 2.5, 0.6, m.steelDark, [Math.cos(t) * R, 1.65, Math.sin(t) * R]);
  }
  b.part(new THREE.TorusGeometry(8.4, 0.12, 8, 80), cy, [0, 1.7, 0], { kind: 'pulse', speed: 1.4, material: cy }, [Math.PI / 2, 0, 0]);
  // Central control column
  b.cyl(1.4, 1.8, 9, m.paintWhite, [0, 1.65, 0], 6);
  b.part(new THREE.CylinderGeometry(1.45, 1.45, 0.3, 6, 1, true), cy, [0, 8.5, 0], { kind: 'glow', material: cy });
  beacon(b, m, 10.9);
  b.coreTop = 8;
  return b;
}

export function laserCitadel(): ModelBuilder {
  // Inertial fusion: a 12 m target sphere at the centre of a ring of laser
  // halls; beamlines converge on it and direct-conversion rings belt it.
  const b = new ModelBuilder();
  const m = materials();
  const beamMat = glow(m.glowPlasma);
  const cy = glow(m.glowCyan);
  const core = glow(m.glowOrange);
  slab(b, 28, 28, m.concrete);
  podium(b, m, 9.5, 2.0, 12);
  const cyC = 10.5;
  // Target chamber
  b.add(new THREE.SphereGeometry(6, 40, 28), m.paintWhite, [0, cyC, 0]);
  for (const y of [-2.2, 0, 2.2]) b.torus(Math.sqrt(36 - y * y) + 0.05, 0.12, m.steelDark, [0, cyC + y, 0]);
  b.part(new THREE.TorusGeometry(6.6, 0.35, 10, 64), core, [0, cyC, 0], { kind: 'pulse', speed: 3, material: core }, [Math.PI / 2, 0, 0]);
  for (const y of [-1.2, 1.2]) b.part(new THREE.TorusGeometry(6.5, 0.12, 8, 64), cy, [0, cyC + y, 0], { kind: 'pulse', speed: 2, material: cy }, [Math.PI / 2, 0, 0]);
  // Twelve laser halls and beamlines
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    const hx = Math.cos(a) * 12.0, hz = Math.sin(a) * 12.0;
    const up = i % 2 ? 4.0 : -2.0;
    b.add(new THREE.BoxGeometry(3.2, 3.4, 2.4), m.paintWhite, [hx, 2.0, hz], [0, -a, 0]);
    seam(b, cy, 2.2, [Math.cos(a) * 13.62, 2.6, Math.sin(a) * 13.62], -a + Math.PI / 2);
    const start: Vec3 = [Math.cos(a) * 10.6, 3.4, Math.sin(a) * 10.6];
    const end: Vec3 = [Math.cos(a) * 6.2, cyC + up, Math.sin(a) * 6.2];
    beam(b, m.paintWhite, start, end, 0.9);
    beam(b, m.steelDark, [start[0], start[1] - 0.3, start[2]], [end[0], end[1] - 0.3, end[2]], 0.95);
    beam(b, beamMat, [start[0], start[1] + 0.5, start[2]], [end[0], end[1] + 0.5, end[2]], 0.3, 6 + i * 0.3);
  }
  // Crown and mast
  b.cyl(1.0, 1.6, 2.4, m.paintWhite, [0, cyC + 5.8, 0], 12);
  b.cyl(0.2, 0.35, 6, m.steel, [0, cyC + 8.2, 0], 10);
  b.part(new THREE.TorusGeometry(1.2, 0.08, 8, 32), cy, [0, cyC + 10, 0], { kind: 'pulse', speed: 1.4, material: cy }, [Math.PI / 2, 0, 0]);
  beacon(b, m, cyC + 14.4);
  b.coreTop = cyC + 6;
  return b;
}

// ── Turbines ────────────────────────────────────────────────────────────

export function heliumBrayton(): ModelBuilder {
  // Closed-cycle helium turbine: a long transparent casing showing glowing
  // rotor stages, fed by recuperator towers, driving a huge generator.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  const clear = clearGlass();
  slab(b, 20, 12, m.concrete);
  b.box(18.6, 1.0, 5.2, m.concreteDark, [0, 0.25, 2.4]);
  const y = 3.3, z = 2.4;
  // Rotor stages inside a glass casing
  const rotor = new THREE.Group();
  for (let i = 0; i < 14; i++) {
    const r = 1.0 + Math.min(i, 13 - i) * 0.12 + (i > 8 ? 0.35 : 0);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.12, 24), i % 3 === 0 ? cy : m.steel);
    disc.rotation.z = Math.PI / 2;
    disc.position.x = -7 + i * 0.85;
    rotor.add(disc);
  }
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 17, 12), m.steelDark);
  shaft.rotation.z = Math.PI / 2;
  rotor.add(shaft);
  rotor.position.set(0, y, z);
  b.partGroup(rotor, { kind: 'spin', axis: 'x', speed: 10 });
  b.add(new THREE.CylinderGeometry(2.3, 1.7, 12.4, 40, 1, true), clear, [-1.2, y, z], [0, 0, Math.PI / 2]);
  for (const x of [-7.4, -3.2, 1.0, 5.0]) b.torus(2.0 + (x + 7.4) * 0.04, 0.12, m.paintWhite, [x, y, z], [0, Math.PI / 2, 0], 40);
  for (const x of [-6.5, 2.5]) b.box(1.0, y - 1.25 - 1.6, 0.8, m.steelDark, [x, 1.25, z]);
  // Generator
  b.cyl(2.0, 2.0, 3.4, m.paintWhite, [7.2, y, z], 36, [0, 0, Math.PI / 2]);
  for (const x of [6.0, 7.2, 8.4]) b.part(new THREE.TorusGeometry(2.03, 0.08, 8, 36), cy, [x, y, z], { kind: 'pulse', speed: 2, material: cy }, [0, Math.PI / 2, 0]);
  b.box(2.8, y - 1.25 - 1.6, 1.6, m.steelDark, [7.2, 1.25, z]);
  // Recuperator towers and helium inventory
  for (let i = 0; i < 4; i++) {
    const x = -7 + i * 3.4;
    b.cyl(1.1, 1.3, 9, m.paintWhite, [x, 0.25, -3.6], 8);
    b.part(new THREE.CylinderGeometry(1.15, 1.15, 0.25, 8, 1, true), cy, [x, 7.4, -3.6], { kind: 'pulse', speed: 1.5, material: cy });
    b.pipe([x, 3.3, -2.4], [x, 3.3, 0.2], 0.35, m.pipeWhite, 12);
  }
  for (const x of [5.6, 7.6]) {
    b.add(new THREE.CapsuleGeometry(0.8, 4.5, 6, 16), m.paintWhite, [x, 3.1, -3.6]);
  }
  beacon(b, m, 9.7, -7, -3.6);
  return b;
}

export function plasmaCollector(): ModelBuilder {
  // Direct conversion: no turbine at all. A column of plasma exhaust passes
  // through stacked electrode rings that collect its charge as current.
  const b = new ModelBuilder();
  const m = materials();
  const plasma = glow(m.glowPlasma);
  const arc = glow(m.glowCyan);
  slab(b, 24, 24, m.concrete);
  podium(b, m, 7.2, 1.6, 8);
  const H = 22;
  b.part(new THREE.CylinderGeometry(0.9, 1.4, H - 2, 24), plasma, [0, 1.85 + (H - 2) / 2, 0], { kind: 'pulse', speed: 4, material: plasma });
  for (let k = 0; k < 8; k++) {
    const y = 3.4 + k * 2.4;
    const r = 3.6 - k * 0.18;
    b.torus(r, 0.42, k % 2 ? m.copper : m.paintWhite, [0, y, 0], [Math.PI / 2, 0, 0], 48);
    b.part(new THREE.TorusGeometry(r - 0.55, 0.06, 6, 48), arc, [0, y, 0], { kind: 'pulse', speed: 3 + k * 0.4, material: arc }, [Math.PI / 2, 0, 0]);
    // Arcs jumping between rings
    for (let j = 0; j < 3; j++) {
      const a = (j / 3) * Math.PI * 2 + k;
      beam(b, arc, [Math.cos(a) * r, y + 0.4, Math.sin(a) * r], [Math.cos(a + 0.5) * (r - 0.18), y + 2.0, Math.sin(a + 0.5) * (r - 0.18)], 0.05, 9 + j);
    }
  }
  // Four support pylons and busbars to the inverter halls
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const px = Math.cos(a) * 4.6, pz = Math.sin(a) * 4.6;
    b.cyl(0.35, 0.5, H - 1, m.paintWhite, [px, 1.85, pz], 8);
    const hx = Math.cos(a) * 9.6, hz = Math.sin(a) * 9.6;
    taper(b, m.paintWhite, 4.0, 4.0, 3.6, 0.8, [hx, 0.25, hz]);
    beam(b, m.copper, [px, 6, pz], [hx, 3.2, hz], 0.35);
    beam(b, arc, [px, 6.3, pz], [hx, 3.5, hz], 0.08, 2);
  }
  b.cyl(2.0, 3.0, 1.2, m.steelDark, [0, H + 0.4, 0], 24);
  beacon(b, m, H + 2);
  return b;
}

// ── Cooling ─────────────────────────────────────────────────────────────

export function vortexTower(): ModelBuilder {
  // Atmospheric vortex engine: warm air enters through angled vanes and spins
  // up into a standing tornado that carries the heat into the sky.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  slab(b, 24, 24, m.concrete);
  // Arena wall with 24 angled vanes
  const R = 10.2;
  b.add(new THREE.CylinderGeometry(R + 0.6, R + 0.9, 1.4, 64, 1, true), m.paintWhite, [0, 0.95, 0]);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    b.add(new THREE.BoxGeometry(0.25, 7.5, 3.0), m.paintWhite, [Math.cos(a) * R, 5.4, Math.sin(a) * R], [0, -a + 0.7, 0]);
  }
  b.add(new THREE.CylinderGeometry(R + 1.2, R + 1.2, 0.5, 64, 1, true), m.paintWhite, [0, 9.4, 0]);
  b.part(new THREE.TorusGeometry(R + 1.22, 0.1, 8, 96), cy, [0, 9.3, 0], { kind: 'pulse', speed: 1.4, material: cy }, [Math.PI / 2, 0, 0]);
  // Heat exchanger floor glowing under the vortex
  b.part(new THREE.CylinderGeometry(7.5, 7.5, 0.1, 48), cy, [0, 0.45, 0], { kind: 'pulse', speed: 0.8, material: cy });
  // The vortex: stacked translucent rings and swirl ribbons, spinning
  const vx = new THREE.Group();
  const v1 = vapour(0.32), v2 = vapour(0.18);
  for (let k = 0; k < 16; k++) {
    const y = 1.5 + k * 2.6;
    const r = 2.2 + Math.pow(k / 15, 1.6) * 6 + Math.sin(k) * 0.3;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.5 + k * 0.05, 8, 40), k % 2 ? v1 : v2);
    ring.rotation.x = Math.PI / 2 + Math.sin(k * 1.3) * 0.08;
    ring.position.set(Math.sin(k * 0.7) * 0.6, y, Math.cos(k * 0.7) * 0.6);
    vx.add(ring);
  }
  const core = new THREE.Mesh(new THREE.CylinderGeometry(7, 1.6, 42, 32, 1, true), v2);
  core.position.y = 22;
  vx.add(core);
  b.partGroup(vx, { kind: 'spin', axis: 'y', speed: 1.2 });
  b.height = 43;
  b.emit({ pos: [0, 42, 0], radius: 7, rate: 4, size: 10, kind: 'steam' });
  // Pump house
  taper(b, m.paintWhite, 3.6, 3.0, 3.2, 0.8, [10.6, 0.25, 10.6]);
  return b;
}

export function heatSpire(): ModelBuilder {
  // A 110 m needle of heat pipes: working fluid boils at the base, rises, and
  // dumps its heat through radiator fins high above the weather.
  const b = new ModelBuilder();
  const m = materials();
  const hot = glow(m.glowOrange);
  const cy = glow(m.glowCyan);
  const mir = mirror(m);
  slab(b, 24, 24, m.concrete);
  podium(b, m, 7.5, 2.2, 6);
  // Tripod legs
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    beam(b, m.paintWhite, [Math.cos(a) * 9.5, 0.25, Math.sin(a) * 9.5], [Math.cos(a) * 1.8, 30, Math.sin(a) * 1.8], 1.1);
    beam(b, cy, [Math.cos(a) * 9.4, 0.8, Math.sin(a) * 9.4], [Math.cos(a) * 1.9, 29.5, Math.sin(a) * 1.9], 0.12, 1.4);
  }
  // Spire
  b.cyl(0.6, 2.4, 108, m.paintWhite, [0, 2.45, 0], 6);
  for (let k = 0; k < 8; k++) b.part(new THREE.CylinderGeometry(2.3 - k * 0.2, 2.3 - k * 0.2, 0.4, 6, 1, true), cy, [0, 12 + k * 9, 0], { kind: 'pulse', speed: 1.4, material: cy });
  // Radiator fins near the top, glowing hot
  for (let k = 0; k < 6; k++) {
    const y = 74 + k * 5.5;
    const w = 12 - k * 1.5;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + k * 0.25;
      b.add(new THREE.BoxGeometry(w, 4.6, 0.16), mir, [Math.cos(a) * w * 0.5, y, Math.sin(a) * w * 0.5], [0, -a, 0]);
      b.part(new THREE.BoxGeometry(w, 0.4, 0.22), hot, [Math.cos(a) * w * 0.5, y + 2.3, Math.sin(a) * w * 0.5], { kind: 'pulse', speed: 1.2 + k * 0.1, material: hot }, [0, -a, 0]);
    }
  }
  for (const [y, r] of [[71.5, 7.4], [103, 3.8]] as [number, number][]) b.part(new THREE.TorusGeometry(r, 0.3, 8, 48), hot, [0, y, 0], { kind: 'pulse', speed: 1.2, material: hot }, [Math.PI / 2, 0, 0]);
  beacon(b, m, 110.8);
  b.emit({ pos: [0, 100, 0], radius: 3, rate: 0.5, size: 4, kind: 'vapor' });
  return b;
}

// ── Energy storage ──────────────────────────────────────────────────────

export function gravityTower(): ModelBuilder {
  // Gravity storage: cranes stack 30-tonne composite blocks into a tower to
  // store energy, and lower them to give it back.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  slab(b, 20, 20, m.concrete);
  // Core tower
  b.cyl(2.2, 3.0, 44, m.paintWhite, [0, 0.25, 0], 4, [0, 0, 0]);
  for (const y of [10, 22, 34]) b.part(new THREE.CylinderGeometry(2.6 - y * 0.012, 2.6 - y * 0.012, 0.35, 4, 1, true), cy, [0, y, 0], { kind: 'pulse', speed: 1.3, material: cy });
  // Four stepped stacks of blocks
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const steps = 7 - i;
    for (let k = 0; k < steps; k++) {
      for (let j = 0; j < 2; j++) {
        const r = 5.6 + j * 2.4;
        b.box(2.0, 1.6, 2.0, k % 2 ? m.concreteWarm : m.concrete, [Math.cos(a) * r, 0.25 + k * 1.7, Math.sin(a) * r], a);
      }
    }
  }
  // Crane trolleys at the top on four arms, one lifting a block
  const crane = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(11, 0.7, 0.9), m.paintWhite);
    arm.position.set(Math.cos(a) * 5.5, 0, Math.sin(a) * 5.5);
    arm.rotation.y = -a;
    crane.add(arm);
    const cable = new THREE.Mesh(new THREE.BoxGeometry(0.06, 14, 0.06), m.steelDark);
    cable.position.set(Math.cos(a) * 8.6, -7, Math.sin(a) * 8.6);
    crane.add(cable);
    const blk = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.6, 2.0), m.concrete);
    blk.position.set(Math.cos(a) * 8.6, -14.6, Math.sin(a) * 8.6);
    crane.add(blk);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), m.glowCyan);
    lamp.position.set(Math.cos(a) * 10.8, -0.5, Math.sin(a) * 10.8);
    crane.add(lamp);
  }
  crane.position.y = 43.5;
  b.partGroup(crane, { kind: 'spin', axis: 'y', speed: 0.15 });
  b.cyl(1.6, 1.6, 1.4, m.steelDark, [0, 44.2, 0], 16);
  beacon(b, m, 46.2);
  return b;
}

export function smesRing(): ModelBuilder {
  // Superconducting magnetic energy storage: a 22 m ring of cold coil holding
  // current that circulates forever, with its cryoplant in the middle.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  const flow = glow(m.glowCyan);
  slab(b, 28, 28, m.concrete);
  const R = 11, y = 4.2;
  b.torus(R, 1.7, m.paintWhite, [0, y, 0], [Math.PI / 2, 0, 0], 96);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    b.torus(1.78, 0.14, i % 2 ? m.steelDark : m.steel, [Math.cos(a) * R, y, Math.sin(a) * R], [0, -a, 0], 24);
  }
  // The current: a bright band on top of the ring and a pulse ring inside
  b.part(new THREE.TorusGeometry(R, 0.22, 8, 120), flow, [0, y + 1.65, 0], { kind: 'pulse', speed: 2.2, material: flow }, [Math.PI / 2, 0, 0]);
  b.part(new THREE.TorusGeometry(R - 1.75, 0.12, 8, 120), cy, [0, y, 0], { kind: 'pulse', speed: 1.4, material: cy }, [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    b.box(0.8, y - 1.6, 1.4, m.paintWhite, [Math.cos(a) * R, 0.25, Math.sin(a) * R], -a);
  }
  // Cryoplant and power-conditioning hall in the middle
  taper(b, m.paintWhite, 7.0, 7.0, 5.0, 0.72, [0, 0.25, 0]);
  taper(b, m.glass, 7.0, 7.0, 5.0, 0.72, [0, 0.25, 0], 1.8, 3.2, 0.1);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    b.pipe([Math.cos(a) * 3.2, 1.6, Math.sin(a) * 3.2], [Math.cos(a) * (R - 1.6), y - 1, Math.sin(a) * (R - 1.6)], 0.3, m.pipeWhite, 12);
  }
  for (const [x, z] of [[-1.6, -1.6], [1.6, 1.6], [1.6, -1.6]]) {
    b.cyl(0.6, 0.6, 4.5, m.paintWhite, [x, 5.2, z], 16);
    b.emit({ pos: [x, 9.8, z], radius: 0.4, rate: 0.12, size: 1, kind: 'vapor' });
  }
  beacon(b, m, 11);
  return b;
}

/** Preview list for the model viewer (?concept=key) while these are being designed. */
export const CONCEPTS: Record<string, { name: string; size: [number, number]; build: () => ModelBuilder }> = {
  stellarator: { name: 'T5 Stellarator Fusion Plant', size: [5, 5], build: stellarator },
  laser_citadel: { name: 'T6 Laser Fusion Citadel', size: [7, 7], build: laserCitadel },
  helium_brayton: { name: 'T5 Helium Brayton Megaturbine', size: [5, 3], build: heliumBrayton },
  plasma_collector: { name: 'T6 Direct-Conversion Plasma Collector', size: [6, 6], build: plasmaCollector },
  vortex_tower: { name: 'T5 Atmospheric Vortex Tower', size: [6, 6], build: vortexTower },
  heat_spire: { name: 'T6 Stratospheric Heat Spire', size: [6, 6], build: heatSpire },
  gravity_tower: { name: 'T5 Gravity Storage Tower', size: [5, 5], build: gravityTower },
  smes_ring: { name: 'T6 Superconducting Magnetic Ring', size: [7, 7], build: smesRing },
};
