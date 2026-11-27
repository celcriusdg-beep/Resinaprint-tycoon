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

// ── Water ───────────────────────────────────────────────────────────────

/** Translucent blue water seen through glass. */
function clearWater(opacity = 0.55) {
  return new THREE.MeshStandardMaterial({ color: '#2a9fd8', emissive: '#0b4a70', emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.1, transparent: true, opacity, depthWrite: false });
}

export function grapheneDesal(): ModelBuilder {
  // Graphene-membrane desalination: racks of pressure vessels, each lit by a
  // band where the one-atom-thick membrane lets only water through.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  slab(b, 20, 16, m.concrete);
  for (let r = 0; r < 3; r++) {
    const z = -4.8 + r * 4.2;
    for (const x of [-8.2, 8.2]) b.box(0.4, 6.4, 3.0, m.paintWhite, [x, 0.25, z]);
    for (let lv = 0; lv < 4; lv++) {
      for (let c = 0; c < 2; c++) {
        const y = 1.2 + lv * 1.45, zz = z - 0.7 + c * 1.4;
        b.cyl(0.55, 0.55, 15.6, m.paintWhite, [0, y, zz], 20, [0, 0, Math.PI / 2]);
        b.part(new THREE.CylinderGeometry(0.57, 0.57, 0.3, 20, 1, true), cy, [-3 + ((lv + c + r) % 3) * 3, y, zz], { kind: 'pulse', speed: 1.5 + lv * 0.2, material: cy }, [0, 0, Math.PI / 2]);
      }
    }
    for (const zz of [z - 1.45, z + 1.45]) b.box(16.8, 0.3, 0.3, m.paintWhite, [0, 6.65, zz]);
  }
  // Intake header and control hall
  b.pipe([-9.6, 1.0, -6.6], [-9.6, 1.0, 6.6], 0.7, m.pipeBlue, 18);
  taper(b, m.paintWhite, 6.0, 2.6, 3.4, 0.8, [5.6, 0.25, 6.6]);
  seam(b, cy, 5.2, [5.6, 1.4, 7.85]);
  return b;
}

export function waterHarvester(): ModelBuilder {
  // Atmospheric water harvesting: a 40 m tower spreads fine mist nets that
  // catch fog and humidity; glowing channels run the water down to a basin.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  const net = vapour(0.5);
  slab(b, 24, 24, m.concrete);
  // Collection basin
  b.add(new THREE.CylinderGeometry(10.5, 10.8, 1.0, 64, 1, true), m.paintWhite, [0, 0.75, 0]);
  b.add(new THREE.CylinderGeometry(10.4, 10.4, 0.1, 64), clearWater(0.8), [0, 1.1, 0]);
  // Central tower
  b.cyl(0.9, 2.2, 40, m.paintWhite, [0, 0.25, 0], 8);
  for (let k = 0; k < 4; k++) b.part(new THREE.CylinderGeometry(2.0 - k * 0.3, 2.0 - k * 0.3, 0.3, 8, 1, true), cy, [0, 8 + k * 8, 0], { kind: 'pulse', speed: 1.3, material: cy });
  // Eight radial mist nets with lit edges
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const len = 8.6;
    b.add(new THREE.PlaneGeometry(len, 30), net, [Math.cos(a) * (len / 2 + 1.4), 18, Math.sin(a) * (len / 2 + 1.4)], [0, -a, 0]);
    for (let k = 0; k < 5; k++) beam(b, cy, [Math.cos(a) * 1.4, 6 + k * 6, Math.sin(a) * 1.4], [Math.cos(a) * (len + 1.4), 6 + k * 6, Math.sin(a) * (len + 1.4)], 0.06, 1 + k * 0.3);
    const ex = Math.cos(a) * (len + 1.4), ez = Math.sin(a) * (len + 1.4);
    b.cyl(0.14, 0.18, 33, m.paintWhite, [ex, 0.25, ez], 8);
    beam(b, cy, [ex, 3, ez], [ex, 33, ez], 0.12, 1 + i * 0.2);
    beam(b, m.paintWhite, [ex, 33.2, ez], [Math.cos(a) * 1.2, 36, Math.sin(a) * 1.2], 0.25);
  }
  // Condenser crown
  b.torus(3.2, 0.5, m.paintWhite, [0, 38, 0], [Math.PI / 2, 0, 0], 40);
  b.part(new THREE.TorusGeometry(3.2, 0.14, 8, 40), cy, [0, 38.6, 0], { kind: 'pulse', speed: 2, material: cy }, [Math.PI / 2, 0, 0]);
  b.emit({ pos: [0, 28, 0], radius: 8, rate: 0.6, size: 4, kind: 'vapor' });
  beacon(b, m, 40.6);
  return b;
}

export function molecularSieve(): ModelBuilder {
  // Molecular-sieve purification: a faceted crystal adsorber glowing inside an
  // open white frame, ringed by hexagonal sieve beds.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  slab(b, 16, 16, m.concrete);
  podium(b, m, 5.2, 1.2, 6);
  const crystal = cy.clone();
  crystal.flatShading = true;
  b.part(new THREE.OctahedronGeometry(3.4, 0), crystal, [0, 6.6, 0], { kind: 'pulse', speed: 1.2, material: crystal }, [0, 0.4, 0]);
  // Frame around the crystal
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    beam(b, m.paintWhite, [Math.cos(a) * 4.8, 1.45, Math.sin(a) * 4.8], [Math.cos(a) * 2.2, 11.5, Math.sin(a) * 2.2], 0.45);
  }
  b.torus(2.6, 0.3, m.paintWhite, [0, 11.5, 0], [Math.PI / 2, 0, 0], 32);
  // Hexagonal sieve beds around it
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * 6.4, z = Math.sin(a) * 6.4;
    b.cyl(0.8, 0.8, 4.6, m.paintWhite, [x, 0.25, z], 6);
    b.part(new THREE.CylinderGeometry(0.82, 0.82, 0.25, 6, 1, true), cy, [x, 3.6, z], { kind: 'pulse', speed: 1.6 + i * 0.1, material: cy });
    b.pipe([x * 0.82, 2.0, z * 0.82], [x * 0.55, 2.0, z * 0.55], 0.2, m.pipeWhite, 10);
  }
  beacon(b, m, 12.2);
  return b;
}

export function pureCathedral(): ModelBuilder {
  // Ultra-pure water cathedral: five glass towers with glowing water spiralling
  // up inside, standing on white arches.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  const clear = clearGlass();
  slab(b, 24, 24, m.concrete);
  podium(b, m, 10, 1.0, 12);
  const towers: [number, number, number][] = [[0, 0, 32], [6.2, 0, 22], [-6.2, 0, 22], [0, 6.2, 18], [0, -6.2, 18]];
  for (const [x, z, h] of towers) {
    const r = h > 30 ? 2.6 : 1.9;
    b.add(new THREE.CylinderGeometry(r, r, h, 32, 1, true), clear, [x, 1.25 + h / 2, z]);
    b.cyl(r + 0.15, r + 0.15, 0.6, m.paintWhite, [x, 1.25, z], 32);
    b.add(new THREE.ConeGeometry(r + 0.2, 3.2, 32), m.paintWhite, [x, 1.25 + h + 1.6, z]);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      pts.push(new THREE.Vector3(x + Math.cos(t * Math.PI * 10) * (r - 0.6), 1.9 + t * (h - 1.2), z + Math.sin(t * Math.PI * 10) * (r - 0.6)));
    }
    b.part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.22, 8), cy, [0, 0, 0], { kind: 'pulse', speed: 1.5, material: cy });
    b.add(new THREE.CylinderGeometry(r - 0.9, r - 0.9, h - 0.4, 20), clearWater(0.35), [x, 1.25 + h / 2, z]);
  }
  // Arches linking the towers
  for (const [x, z] of [[6.2, 0], [-6.2, 0], [0, 6.2], [0, -6.2]]) {
    const a = Math.atan2(z, x);
    b.add(new THREE.TorusGeometry(2.0, 0.35, 8, 24, Math.PI), m.paintWhite, [x / 2, 1.25, z / 2], [0, -a + Math.PI / 2, 0]);
  }
  beacon(b, m, 37.8);
  return b;
}

export function cavernCistern(): ModelBuilder {
  // A domed water vault: most of it underground, with a glowing oculus over
  // the water and pump houses round the rim.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  slab(b, 20, 20, m.concrete);
  b.cyl(8.6, 8.9, 1.4, m.paintWhite, [0, 0.25, 0], 48);
  b.dome(8.6, m.paintWhite, [0, 1.65, 0], 0.42, 48);
  for (const r of [7.6, 5.6]) b.part(new THREE.TorusGeometry(r, 0.12, 8, 64), cy, [0, 1.65 + Math.sqrt(Math.max(0, 8.6 * 8.6 - r * r)) * 0.42 + 0.05, 0], { kind: 'pulse', speed: 1.2, material: cy }, [Math.PI / 2, 0, 0]);
  b.add(new THREE.CylinderGeometry(2.6, 2.6, 0.2, 40), clearWater(0.9), [0, 5.3, 0]);
  b.torus(2.7, 0.3, m.paintWhite, [0, 5.3, 0], [Math.PI / 2, 0, 0], 40);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(a) * 8.6, z = Math.sin(a) * 8.6;
    taper(b, m.paintWhite, 2.4, 2.4, 2.4, 0.8, [x, 0.25, z]);
    b.part(new THREE.BoxGeometry(0.5, 0.5, 0.5), cy, [x, 2.9, z], { kind: 'pulse', speed: 2, material: cy });
  }
  return b;
}

export function hangingReservoir(): ModelBuilder {
  // A 16 m glass tank of water held 20 m up by four pylons: head pressure for
  // the whole plant, and a landmark you can see from anywhere on the site.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  slab(b, 28, 28, m.concrete);
  const y0 = 18, h = 9, r = 8;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const px = Math.cos(a) * 11.6, pz = Math.sin(a) * 11.6;
    b.cyl(0.8, 1.4, y0 + h + 6, m.paintWhite, [px, 0.25, pz], 6);
    beam(b, cy, [px, 2, pz], [px, y0 + h + 5, pz], 0.14, 1.2);
    beam(b, m.steel, [px, y0 + h + 5.8, pz], [Math.cos(a) * r, y0 + h + 0.4, Math.sin(a) * r], 0.12);
    beam(b, m.paintWhite, [px * 0.95, y0 - 1, pz * 0.95], [Math.cos(a) * (r - 0.5), y0, Math.sin(a) * (r - 0.5)], 0.6);
  }
  b.add(new THREE.CylinderGeometry(r, r, h, 48, 1, true), clearGlass(), [0, y0 + h / 2, 0]);
  b.add(new THREE.CylinderGeometry(r - 0.2, r - 0.2, h - 1.2, 48), clearWater(0.6), [0, y0 + (h - 1.2) / 2 + 0.1, 0]);
  b.cyl(r + 0.3, r + 0.3, 0.8, m.paintWhite, [0, y0 - 0.8, 0], 48);
  b.torus(r + 0.1, 0.25, m.paintWhite, [0, y0 + h, 0], [Math.PI / 2, 0, 0], 48);
  for (const y of [y0 + 2.5, y0 + 5.5]) b.part(new THREE.TorusGeometry(r + 0.05, 0.08, 6, 64), cy, [0, y, 0], { kind: 'pulse', speed: 1.4, material: cy }, [Math.PI / 2, 0, 0]);
  // Down-pipe and pump hall
  b.cyl(0.8, 0.8, y0 - 1, m.pipeWhite, [0, 0.25, 0], 20);
  taper(b, m.paintWhite, 5.0, 5.0, 3.4, 0.78, [0, 0.25, 0]);
  seam(b, cy, 4.2, [0, 1.6, 2.35]);
  beacon(b, m, y0 + h + 6.6, Math.cos(Math.PI / 4) * 11.6, Math.sin(Math.PI / 4) * 11.6);
  return b;
}

// ── Grid ────────────────────────────────────────────────────────────────

export function scMegastation(): ModelBuilder {
  // Superconducting megastation: a cryogenic busbar ring feeding three giant
  // frosted bushings, around a hexagonal control hall.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  const frost = glow(m.glowCyan);
  slab(b, 20, 20, m.concrete);
  b.part(new THREE.TorusGeometry(7.6, 0.45, 10, 80), frost, [0, 1.0, 0], { kind: 'pulse', speed: 1.2, material: frost }, [Math.PI / 2, 0, 0]);
  b.torus(7.6, 0.6, m.paintWhite, [0, 0.7, 0], [Math.PI / 2, 0, 0], 80);
  b.cyl(3.0, 3.6, 5.0, m.paintWhite, [0, 0.25, 0], 6);
  b.part(new THREE.CylinderGeometry(3.05, 3.05, 0.3, 6, 1, true), cy, [0, 3.8, 0], { kind: 'pulse', speed: 1.4, material: cy });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const x = Math.cos(a) * 7.6, z = Math.sin(a) * 7.6;
    b.cyl(0.9, 1.4, 1.6, m.steelDark, [x, 0.25, z], 16);
    b.cyl(0.45, 0.7, 13, m.paintWhite, [x, 1.85, z], 16);
    for (let k = 0; k < 9; k++) b.part(new THREE.TorusGeometry(0.85 - k * 0.04, 0.09, 8, 24), frost, [x, 3 + k * 1.3, z], { kind: 'pulse', speed: 2 + i * 0.3, material: frost }, [Math.PI / 2, 0, 0]);
    b.part(new THREE.SphereGeometry(0.5, 16, 10), cy, [x, 15.2, z], { kind: 'glow', material: cy });
    b.emit({ pos: [x, 2.5, z], radius: 0.8, rate: 0.12, size: 1.2, kind: 'vapor' });
  }
  beacon(b, m, 6);
  return b;
}

export function powerBeacon(): ModelBuilder {
  // Wireless power: a 60 m tower whose emitter crown beams energy upward to
  // relay satellites as a column of light.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  const ray = new THREE.MeshStandardMaterial({ color: '#7fe9ff', emissive: '#3fd4ff', emissiveIntensity: 2.4, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false });
  slab(b, 24, 24, m.concrete);
  podium(b, m, 7.5, 1.6, 6);
  b.cyl(1.4, 4.2, 54, m.paintWhite, [0, 1.85, 0], 6);
  for (let k = 0; k < 6; k++) b.part(new THREE.CylinderGeometry(3.9 - k * 0.45, 3.9 - k * 0.45, 0.35, 6, 1, true), cy, [0, 6 + k * 8.5, 0], { kind: 'pulse', speed: 1.4 + k * 0.1, material: cy });
  // Emitter crown
  const y = 56;
  b.add(new THREE.CylinderGeometry(6, 1.8, 3.0, 6, 1, true), m.paintWhite, [0, y + 1.5, 0]);
  b.part(new THREE.TorusGeometry(6, 0.3, 8, 48), cy, [0, y + 3, 0], { kind: 'pulse', speed: 2, material: cy }, [Math.PI / 2, 0, 0]);
  b.add(new THREE.CircleGeometry(5.8, 6), mirror(m), [0, y + 1.6, 0], [-Math.PI / 2, 0, 0]);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 1.2, 26, 24, 1, true), ray);
  shaft.position.set(0, y + 15, 0);
  const g = new THREE.Group();
  g.add(shaft);
  b.partGroup(g, { kind: 'pulse', speed: 3, material: ray });
  b.height = y + 28;
  // Converter halls
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    taper(b, m.paintWhite, 4.2, 4.2, 3.6, 0.8, [Math.cos(a) * 9.4, 0.25, Math.sin(a) * 9.4]);
    b.pipe([Math.cos(a) * 7.2, 1.2, Math.sin(a) * 7.2], [Math.cos(a) * 4.4, 1.2, Math.sin(a) * 4.4], 0.4, m.copper, 12);
  }
  return b;
}

// ── Fresh fuel storage ──────────────────────────────────────────────────

export function maglevSilo(): ModelBuilder {
  // Maglev fuel silo: a 28 m drum where cassettes of fuel ride a glowing
  // magnetic track; a lit slot runs its full height.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  slab(b, 16, 16, m.concrete);
  b.cyl(5.2, 5.6, 28, m.paintWhite, [0, 0.25, 0], 40);
  b.box(1.4, 25, 0.2, m.glass, [0, 1.8, 5.5]);
  b.part(new THREE.BoxGeometry(0.25, 24.4, 0.12), cy, [0, 14.2, 5.65], { kind: 'pulse', speed: 2, material: cy });
  for (let k = 0; k < 8; k++) b.box(0.9, 1.1, 0.4, m.paintYellow, [0, 2.8 + k * 3.0, 5.42]);
  for (const y of [9, 18, 27]) b.part(new THREE.TorusGeometry(5.35, 0.1, 8, 64), cy, [0, y, 0], { kind: 'pulse', speed: 1.3, material: cy }, [Math.PI / 2, 0, 0]);
  b.dome(5.2, m.paintWhite, [0, 28.25, 0], 0.3, 40);
  taper(b, m.paintWhite, 6.0, 3.4, 3.6, 0.82, [4.4, 0.25, -5.0]);
  beacon(b, m, 30);
  return b;
}

export function fuelCitadel(): ModelBuilder {
  // Fuel citadel: a hexagonal stronghold with six towers and a high-bay core
  // crowned in light, behind a lit security ring.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  slab(b, 24, 24, m.concrete);
  b.part(new THREE.TorusGeometry(11.2, 0.12, 8, 6), cy, [0, 1.5, 0], { kind: 'pulse', speed: 1.4, material: cy }, [Math.PI / 2, 0, Math.PI / 6]);
  b.cyl(9.0, 9.6, 6, m.paintWhite, [0, 0.25, 0], 6);
  b.cyl(6.8, 7.6, 6, m.paintWhite, [0, 6.25, 0], 6);
  b.cyl(3.4, 4.2, 12, m.paintWhite, [0, 12.25, 0], 6);
  for (const [y, r] of [[6.2, 9.1], [12.2, 6.9], [24.2, 3.5]] as [number, number][]) b.part(new THREE.CylinderGeometry(r, r, 0.3, 6, 1, true), cy, [0, y, 0], { kind: 'pulse', speed: 1.3, material: cy });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * 9.3, z = Math.sin(a) * 9.3;
    b.cyl(1.3, 1.5, 11, m.paintWhite, [x, 0.25, z], 6);
    b.cyl(1.6, 1.6, 0.5, m.steelDark, [x, 11.25, z], 6);
    b.part(new THREE.SphereGeometry(0.35, 10, 8), cy, [x, 12.1, z], { kind: 'glow', material: cy });
  }
  b.add(new THREE.ConeGeometry(3.6, 4, 6), m.glass, [0, 26.25, 0]);
  beacon(b, m, 28.6);
  return b;
}

// ── Spent fuel ──────────────────────────────────────────────────────────

export function deepBorehole(): ModelBuilder {
  // Deep borehole disposal: a white derrick over a lit shaft drilled 5 km
  // into bedrock; casks wait on the rail.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  slab(b, 16, 16, m.gravel);
  b.box(8, 1.2, 8, m.concrete, [0, 0.25, 0]);
  b.part(new THREE.TorusGeometry(1.2, 0.18, 8, 32), cy, [0, 1.5, 0], { kind: 'pulse', speed: 1.6, material: cy }, [Math.PI / 2, 0, 0]);
  b.cyl(1.0, 1.0, 0.06, m.steelDark, [0, 1.45, 0], 24);
  for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) beam(b, m.paintWhite, [x, 1.45, z], [x * 0.2, 30, z * 0.2], 0.45);
  for (const y of [8, 15, 22]) {
    const k = 1 - (y - 1.45) / 28.55 * 0.8;
    b.box(6 * k + 0.4, 0.3, 0.3, m.paintWhite, [0, y, 3 * k]);
    b.box(6 * k + 0.4, 0.3, 0.3, m.paintWhite, [0, y, -3 * k]);
    b.box(0.3, 0.3, 6 * k + 0.4, m.paintWhite, [3 * k, y, 0]);
    b.box(0.3, 0.3, 6 * k + 0.4, m.paintWhite, [-3 * k, y, 0]);
  }
  b.cyl(1.0, 1.0, 1.4, m.steelDark, [0, 30, 0], 16);
  beam(b, cy, [0, 1.6, 0], [0, 29.9, 0], 0.08, 2);
  for (const dx of [-0.5, 0.5]) b.box(0.08, 0.1, 5.5, m.steel, [dx, 0.25, 5.2]);
  b.cyl(0.7, 0.7, 2, m.paintWhite, [0, 1.0, 5.6], 20, [Math.PI / 2, 0, 0]);
  taper(b, m.paintWhite, 3.6, 3.0, 3.2, 0.8, [-5.4, 0.25, -5.6]);
  beacon(b, m, 31.8);
  return b;
}

export function transmutationRing(): ModelBuilder {
  // Accelerator-driven transmutation: a proton ring and linac feed a target
  // hall where long-lived waste is burned into short-lived isotopes.
  const b = new ModelBuilder();
  const m = materials();
  const beamMat = glow(m.glowPlasma);
  const cy = glow(m.glowCyan);
  slab(b, 28, 28, m.concrete);
  const R = 11;
  b.torus(R, 0.9, m.paintWhite, [0, 1.6, 0], [Math.PI / 2, 0, 0], 120);
  b.part(new THREE.TorusGeometry(R, 0.25, 8, 120), beamMat, [0, 2.45, 0], { kind: 'pulse', speed: 5, material: beamMat }, [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    b.add(new THREE.BoxGeometry(1.6, 2.4, 2.6), i % 2 ? m.copper : m.steelDark, [Math.cos(a) * R, 1.45, Math.sin(a) * R], [0, -a, 0]);
  }
  // Linac line and the target hall at the centre
  b.box(R - 3, 1.6, 1.6, m.paintWhite, [(R - 3) / 2 + 2.5, 0.25, 0]);
  beam(b, beamMat, [3.2, 1.9, 0], [R - 1, 1.9, 0], 0.18, 6);
  taper(b, m.paintWhite, 7.6, 7.6, 8, 0.6, [-1.0, 0.25, 0]);
  b.part(new THREE.SphereGeometry(1.4, 24, 16), beamMat, [-1.0, 9.0, 0], { kind: 'pulse', speed: 3, material: beamMat });
  b.part(new THREE.TorusGeometry(2.2, 0.12, 8, 40), cy, [-1.0, 9.0, 0], { kind: 'pulse', speed: 2, material: cy }, [Math.PI / 2, 0, 0]);
  seam(b, cy, 6.2, [-1.0, 2.0, 3.55]);
  beacon(b, m, 11);
  return b;
}

// ── Fuel chain ──────────────────────────────────────────────────────────

/** Uranium yellow-green glow. */
function uraniumGlow() {
  return new THREE.MeshStandardMaterial({ color: '#3a4a10', emissive: new THREE.Color('#c8ff4d'), emissiveIntensity: 2.2, roughness: 0.3, toneMapped: false });
}

function hauler(b: ModelBuilder, m: M, x: number, z: number, rot: number) {
  b.add(new THREE.BoxGeometry(3.0, 1.4, 1.8), m.paintWhite, [x, 1.0, z], [0, rot, 0]);
  b.add(new THREE.BoxGeometry(1.0, 1.0, 1.7), m.glass, [x + Math.cos(rot) * 1.0, 1.9, z - Math.sin(rot) * 1.0], [0, rot, 0]);
  for (const d of [-1, 1]) b.add(new THREE.CylinderGeometry(0.45, 0.45, 2.0, 14), m.rubber, [x + Math.cos(rot) * d, 0.7, z - Math.sin(rot) * d], [Math.PI / 2, rot, 0]);
  b.add(new THREE.BoxGeometry(0.1, 0.12, 1.6), m.glowCyan, [x + Math.cos(rot) * 1.52, 1.3, z - Math.sin(rot) * 1.52], [0, rot, 0]);
}

export function roboticBore(): ModelBuilder {
  // Robotic deep bore: a hexagonal drill tower over a glowing cutting head,
  // a conveyor boom to the ore pile and autonomous haulers.
  const b = new ModelBuilder();
  const m = materials();
  const hot = glow(m.glowOrange);
  const cy = glow(m.glowCyan);
  slab(b, 20, 20, m.gravel);
  b.cyl(4.6, 4.6, 0.3, m.steelDark, [-2, 0.25, -2], 32);
  const head = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.45, 8, 32), hot);
  ring.rotation.x = Math.PI / 2;
  head.add(ring);
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.3, 0.5), m.steel);
    t.rotation.y = (i / 6) * Math.PI;
    head.add(t);
  }
  head.position.set(-2, 0.7, -2);
  b.partGroup(head, { kind: 'spin', axis: 'y', speed: 1.5 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    beam(b, m.paintWhite, [-2 + Math.cos(a) * 4.2, 0.4, -2 + Math.sin(a) * 4.2], [-2 + Math.cos(a) * 1.4, 26, -2 + Math.sin(a) * 1.4], 0.55);
  }
  for (const y of [8, 16, 23]) b.part(new THREE.CylinderGeometry(4.4 - y * 0.12, 4.4 - y * 0.12, 0.3, 6, 1, true), cy, [-2, y, -2], { kind: 'pulse', speed: 1.4, material: cy });
  b.cyl(1.8, 1.8, 2.2, m.paintWhite, [-2, 25.5, -2], 6);
  beam(b, cy, [-2, 1, -2], [-2, 25.4, -2], 0.18, 2);
  // Conveyor boom to the ore pile
  beam(b, m.paintWhite, [1.0, 3.0, 0.5], [6.4, 7.0, 5.6], 0.8);
  b.add(new THREE.ConeGeometry(3.4, 4.2, 20), m.concreteDark, [6.6, 2.35, 6.2]);
  // Autonomous haulers
  hauler(b, m, 6.5, -5.5, 0.3);
  hauler(b, m, 2.0, 7.4, -0.4);
  hauler(b, m, -7.0, 6.0, 1.2);
  beacon(b, m, 27);
  return b;
}

export function seawaterExtractor(): ModelBuilder {
  // Uranium from seawater: braided absorbent arrays float in a lagoon and
  // glow as they load up; the elution tower strips the uranium off them.
  const b = new ModelBuilder();
  const m = materials();
  const u = uraniumGlow();
  const cy = glow(m.glowCyan);
  slab(b, 28, 28, m.concrete);
  b.add(new THREE.BoxGeometry(26, 0.8, 18), m.paintWhite, [0, 0.65, 3.5]);
  b.add(new THREE.BoxGeometry(25.2, 0.1, 17.2), clearWater(0.85), [0, 1.0, 3.5]);
  // Floating braid rows
  for (let r = 0; r < 6; r++) {
    const z = -3.5 + r * 2.8;
    b.add(new THREE.CapsuleGeometry(0.35, 21, 4, 10), m.paintWhite, [0, 1.15, z], [0, 0, Math.PI / 2]);
    b.part(new THREE.CylinderGeometry(0.16, 0.16, 20.5, 8), u, [0, 1.15, z + 0.55], { kind: 'pulse', speed: 1 + r * 0.15, material: u }, [0, 0, Math.PI / 2]);
    for (let k = 0; k < 6; k++) b.cyl(0.5, 0.5, 0.5, m.paintYellow, [-9 + k * 3.6, 0.95, z], 12);
  }
  // Pier and elution tower
  b.box(2.0, 0.4, 18, m.paintWhite, [-11.6, 1.2, 3.5]);
  b.cyl(2.2, 2.8, 20, m.paintWhite, [-8.5, 0.25, -9.5], 8);
  for (const y of [6, 12, 18]) b.part(new THREE.CylinderGeometry(2.7 - y * 0.03, 2.7 - y * 0.03, 0.3, 8, 1, true), u, [-8.5, y, -9.5], { kind: 'pulse', speed: 1.3, material: u });
  b.cyl(2.4, 2.4, 0.6, m.steelDark, [-8.5, 20.25, -9.5], 8);
  taper(b, m.paintWhite, 9.0, 5.0, 5.0, 0.76, [4.0, 0.25, -9.4]);
  taper(b, m.glass, 9.0, 5.0, 5.0, 0.76, [4.0, 0.25, -9.4], 1.8, 3.4, 0.1);
  seam(b, cy, 8, [4.0, 1.3, -6.85]);
  beacon(b, m, 21.2, -8.5, -9.5);
  return b;
}

export function plasmaSeparator(): ModelBuilder {
  // Plasma mass separation: ore is vaporised in a torch, ionised and split by
  // a magnetic field into three streams; yellowcake silos collect the heavy one.
  const b = new ModelBuilder();
  const m = materials();
  const plasma = glow(m.glowPlasma);
  const u = uraniumGlow();
  slab(b, 20, 16, m.concrete);
  b.box(15, 1.2, 4.4, m.concreteDark, [-1.5, 0.25, 2.8]);
  // Feed hopper and torch
  b.add(new THREE.ConeGeometry(2.0, 3.0, 4, 1, true), m.paintWhite, [-8.0, 5.6, 2.8], [Math.PI, Math.PI / 4, 0]);
  b.cyl(1.6, 1.6, 2.6, m.paintWhite, [-8.0, 1.45, 2.8], 24);
  b.part(new THREE.CylinderGeometry(0.6, 1.0, 10, 20), plasma, [-1.6, 3.4, 2.8], { kind: 'pulse', speed: 6, material: plasma }, [0, 0, Math.PI / 2]);
  for (let i = 0; i < 6; i++) b.torus(1.7, 0.32, i % 2 ? m.copper : m.paintWhite, [-5.6 + i * 1.6, 3.4, 2.8], [0, Math.PI / 2, 0], 28);
  // Three collector chutes fanning out
  for (const [dz, mat] of [[-1.8, m.paintWhite], [0, m.paintWhite], [1.8, m.paintWhite]] as [number, THREE.Material][]) {
    beam(b, mat, [3.6, 3.4, 2.8], [6.2, 2.0, 2.8 + dz * 1.4], 0.7);
  }
  // Yellowcake silos
  for (let i = 0; i < 3; i++) {
    const x = 7.6, z = -0.2 + i * 2.6;
    b.cyl(1.0, 1.0, 6, m.paintWhite, [x, 0.25, z], 20);
    b.part(new THREE.CylinderGeometry(1.02, 1.02, 0.3, 20, 1, true), u, [x, 4.4, z], { kind: 'pulse', speed: 1.4 + i * 0.2, material: u });
  }
  taper(b, m.paintWhite, 12, 4.4, 5.2, 0.8, [-2, 0.25, -4.8]);
  taper(b, m.glass, 12, 4.4, 5.2, 0.8, [-2, 0.25, -4.8], 2, 3.6, 0.1);
  beacon(b, m, 7, 7.6, 5);
  return b;
}

export function molecularMill(): ModelBuilder {
  // Molecular assembler mill: a honeycomb hive where nano-assemblers pick
  // uranium atoms out of ore; drones orbit the central spire.
  const b = new ModelBuilder();
  const m = materials();
  const u = uraniumGlow();
  const cy = glow(m.glowCyan);
  slab(b, 24, 24, m.concrete);
  podium(b, m, 10.5, 1.0, 6);
  // Honeycomb cells in rings, taller towards the middle
  const cells: [number, number][] = [[0, 0]];
  for (let ring = 1; ring <= 3; ring++) {
    for (let side = 0; side < 6; side++) {
      for (let k = 0; k < ring; k++) {
        const a0 = (side / 6) * Math.PI * 2, a1 = ((side + 2) / 6) * Math.PI * 2;
        const x = Math.cos(a0) * ring * 2.7 + Math.cos(a1) * k * 2.7;
        const z = Math.sin(a0) * ring * 2.7 + Math.sin(a1) * k * 2.7;
        cells.push([x, z]);
      }
    }
  }
  cells.forEach(([x, z], i) => {
    const d = Math.hypot(x, z);
    const h = 12 - d * 1.05;
    if (i === 0) return;
    b.cyl(1.45, 1.45, h, m.paintWhite, [x, 1.25, z], 6, [0, 0, 0]);
    const lit = i % 3 === 0 ? u : cy;
    b.part(new THREE.CylinderGeometry(1.2, 1.2, 0.12, 6), lit, [x, 1.25 + h + 0.07, z], { kind: 'pulse', speed: 1 + (i % 5) * 0.3, material: lit as THREE.MeshStandardMaterial });
  });
  // Central spire with orbiting drones
  b.cyl(0.8, 1.6, 22, m.paintWhite, [0, 1.25, 0], 6);
  b.part(new THREE.OctahedronGeometry(1.2, 0), u, [0, 24.6, 0], { kind: 'pulse', speed: 2, material: u });
  const drones = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), m.glowCyan);
    d.position.set(Math.cos(a) * 4, 16 + (i % 2) * 2.5, Math.sin(a) * 4);
    drones.add(d);
  }
  b.partGroup(drones, { kind: 'spin', axis: 'y', speed: 0.8 });
  b.height = Math.max(b.height, 25.8);
  return b;
}

export function isotopeRing(): ModelBuilder {
  // Electromagnetic isotope separation: a racetrack of C-magnets bends an ion
  // beam so U-235 and U-238 land in different collectors.
  const b = new ModelBuilder();
  const m = materials();
  const beamMat = glow(m.glowPlasma);
  const u = uraniumGlow();
  const cy = glow(m.glowCyan);
  slab(b, 20, 20, m.concrete);
  const L = 8, R = 5.6, y = 2.6;
  const track = new THREE.Shape();
  track.moveTo(-L / 2, -R);
  track.lineTo(L / 2, -R);
  track.absarc(L / 2, 0, R, -Math.PI / 2, Math.PI / 2, false);
  track.lineTo(-L / 2, R);
  track.absarc(-L / 2, 0, R, Math.PI / 2, Math.PI * 1.5, false);
  const pts = track.getSpacedPoints(160).map((p) => new THREE.Vector3(p.x, y, p.y));
  const curve = new THREE.CatmullRomCurve3(pts, true);
  b.add(new THREE.TubeGeometry(curve, 200, 0.7, 12, true), m.paintWhite);
  b.part(new THREE.TubeGeometry(curve, 200, 0.2, 8, true), beamMat, [0, 0.75, 0], { kind: 'pulse', speed: 5, material: beamMat });
  for (let i = 0; i < 20; i++) {
    const p = curve.getPointAt(i / 20);
    const t = curve.getTangentAt(i / 20);
    const a = Math.atan2(t.z, t.x);
    b.add(new THREE.BoxGeometry(1.0, 2.6, 2.4), i % 2 ? m.copper : m.steelDark, [p.x, 1.55, p.z], [0, -a, 0]);
  }
  for (const x of [-L / 2, L / 2]) for (const zz of [-R - 1.6, R + 1.6]) {
    b.cyl(0.7, 0.7, 3.2, m.paintWhite, [x, 0.25, zz], 18);
    b.part(new THREE.CylinderGeometry(0.72, 0.72, 0.25, 18, 1, true), u, [x, 2.4, zz], { kind: 'pulse', speed: 1.5, material: u });
  }
  taper(b, m.paintWhite, 6.0, 4.4, 4.8, 0.74, [0, 0.25, 0]);
  seam(b, cy, 5, [0, 1.6, 2.1]);
  beacon(b, m, 6);
  return b;
}

export function quantumSorter(): ModelBuilder {
  // Quantum isotope sorter: tuned beams from six emitters steer single atoms
  // through a levitating crystal core inside three gyroscope rings.
  const b = new ModelBuilder();
  const m = materials();
  const core = glow(m.glowPlasma);
  core.flatShading = true;
  const cy = glow(m.glowCyan);
  const u = uraniumGlow();
  slab(b, 24, 24, m.concrete);
  podium(b, m, 8.5, 1.6, 6);
  const cyC = 12;
  b.part(new THREE.DodecahedronGeometry(2.6, 0), core, [0, cyC, 0], { kind: 'pulse', speed: 2, material: core });
  const gyro = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.6 + k * 1.1, 0.22, 8, 64), k === 1 ? m.glowCyan : m.paintWhite);
    ring.rotation.set(Math.PI / 2 + k * 0.6, k * 0.9, 0);
    gyro.add(ring);
  }
  gyro.position.y = cyC;
  b.partGroup(gyro, { kind: 'spin', axis: 'y', speed: 0.7 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * 9.4, z = Math.sin(a) * 9.4;
    b.cyl(0.6, 0.9, 9 + (i % 2) * 4, m.paintWhite, [x, 0.25, z], 6);
    const top = 9.25 + (i % 2) * 4;
    b.part(new THREE.SphereGeometry(0.55, 14, 10), i % 2 ? u : cy, [x, top + 0.4, z], { kind: 'glow', material: i % 2 ? u : cy });
    beam(b, i % 2 ? u : cy, [x, top + 0.4, z], [Math.cos(a) * 2.4, cyC, Math.sin(a) * 2.4], 0.08, 4 + i * 0.3);
  }
  b.height = Math.max(b.height, cyC + 6);
  beacon(b, m, 3.0);
  return b;
}

export function fuelPrinter(): ModelBuilder {
  // Additive fuel printer: four big robot arms print fuel assemblies upright
  // on a long bed, laser tips glowing, under a glass gallery roof.
  const b = new ModelBuilder();
  const m = materials();
  const hot = glow(m.glowOrange);
  const cy = glow(m.glowCyan);
  slab(b, 20, 16, m.concrete);
  b.box(18, 0.6, 7, m.concreteDark, [0, 0.25, 2.2]);
  for (const x of [-8.8, 8.8]) for (const zz of [-1.2, 5.6]) b.box(0.4, 7.4, 0.4, m.paintWhite, [x, 0.85, zz]);
  b.box(18.2, 0.35, 7.2, m.paintWhite, [0, 8.25, 2.2]);
  b.box(17.4, 0.08, 6.4, clearGlass(), [0, 8.62, 2.2]);
  seam(b, cy, 18, [0, 8.2, 5.85]);
  for (let i = 0; i < 10; i++) {
    const x = -7.2 + i * 1.6;
    const h = 2.0 + ((i * 7) % 5) * 0.55;
    b.box(0.5, h, 0.5, m.steel, [x, 0.85, 2.2]);
    b.part(new THREE.BoxGeometry(0.55, 0.12, 0.55), hot, [x, 0.85 + h + 0.06, 2.2], { kind: 'pulse', speed: 3 + i * 0.2, material: hot });
  }
  for (let i = 0; i < 4; i++) {
    const x = -6.6 + i * 4.4;
    b.cyl(0.6, 0.8, 0.5, m.steelDark, [x, 0.85, i % 2 ? 4.8 : -0.4], 16);
    const arm = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.6, 16), m.paintWhite);
    base.position.y = 0.3;
    const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.2, 0.5), m.paintWhite);
    l1.position.set(0, 2.0, 0);
    l1.rotation.x = i % 2 ? 0.35 : -0.35;
    const l2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 3.0), m.paintWhite);
    l2.position.set(0, 3.5, i % 2 ? -1.6 : 1.6);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), m.glowOrange);
    tip.position.set(0, 3.0, i % 2 ? -2.9 : 2.9);
    arm.add(base, l1, l2, tip);
    arm.position.set(x, 1.35, i % 2 ? 4.8 : -0.4);
    b.partGroup(arm, { kind: 'rock', axis: 'y', speed: 0.8, phase: i });
  }
  taper(b, m.paintWhite, 12, 3.6, 4.0, 0.8, [0, 0.25, -5.6]);
  beacon(b, m, 9.2, 8.8, 5.6);
  return b;
}

export function fuelFoundry(): ModelBuilder {
  // Autonomous fuel foundry: a stepped tower of open robotic bays around a
  // glowing furnace core, with delivery drones circling the top.
  const b = new ModelBuilder();
  const m = materials();
  const hot = glow(m.glowOrange);
  const cy = glow(m.glowCyan);
  slab(b, 24, 24, m.concrete);
  const levels = [[9.0, 7], [7.4, 7], [5.8, 7], [4.2, 7]];
  let y = 0.25;
  for (const [r, h] of levels) {
    b.cyl(r, r + 0.4, h, m.paintWhite, [0, y, 0], 8);
    b.part(new THREE.CylinderGeometry(r + 0.05, r + 0.05, 0.3, 8, 1, true), cy, [0, y + h - 0.5, 0], { kind: 'pulse', speed: 1.3, material: cy });
    y += h;
  }
  // Furnace slot showing the glowing core
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
    b.part(new THREE.BoxGeometry(0.4, 20, 1.2), hot, [Math.cos(a) * (6.2 - i * 0), 14, Math.sin(a) * 6.2], { kind: 'pulse', speed: 2, material: hot }, [0, -a, 0]);
  }
  // Robot arms on the terraces
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const lvl = i % 3;
    const r = levels[lvl + 1][0] + 0.9;
    const yy = 0.25 + (lvl + 1) * 7;
    const arm = new THREE.Group();
    const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.4, 0.4), m.paintWhite);
    l1.position.y = 1.2;
    const l2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 0.35), m.paintWhite);
    l2.position.set(1.0, 2.4, 0);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), m.glowCyan);
    tip.position.set(2.1, 2.2, 0);
    arm.add(l1, l2, tip);
    arm.position.set(Math.cos(a) * r, yy, Math.sin(a) * r);
    b.partGroup(arm, { kind: 'rock', axis: 'y', speed: 1, phase: i });
  }
  const drones = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.8), m.paintWhite);
    d.position.set(Math.cos(a) * 7, 31, Math.sin(a) * 7);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), m.glowCyan);
    l.position.set(Math.cos(a) * 7, 30.8, Math.sin(a) * 7);
    drones.add(d, l);
  }
  b.partGroup(drones, { kind: 'spin', axis: 'y', speed: 0.5 });
  b.cyl(1.0, 1.6, 4, m.paintWhite, [0, y, 0], 8);
  beacon(b, m, y + 4.4);
  return b;
}

export function muonArch(): ModelBuilder {
  // Muon tomography: cosmic-ray muons pass through each cask; detector panels
  // in a giant arch image the fuel inside without opening it.
  const b = new ModelBuilder();
  const m = materials();
  const det = glow(m.ledGreen);
  const cy = glow(m.glowCyan);
  slab(b, 16, 16, m.concrete);
  b.add(new THREE.TorusGeometry(6.0, 0.9, 12, 40, Math.PI), m.paintWhite, [0, 0.25, 0], [0, 0, 0]);
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * Math.PI;
    b.part(new THREE.BoxGeometry(0.9, 1.4, 1.9), det, [Math.cos(a) * 5.0, 0.25 + Math.sin(a) * 5.0, 0], { kind: 'pulse', speed: 2 + i * 0.2, material: det }, [0, 0, a - Math.PI / 2]);
  }
  for (const dx of [-0.6, 0.6]) b.box(0.1, 0.12, 15, m.steel, [dx, 0.25, 0]);
  b.cyl(1.0, 1.0, 3.2, m.paintWhite, [0, 1.3, -2.5], 20, [Math.PI / 2, 0, 0]);
  b.part(new THREE.TorusGeometry(1.03, 0.07, 6, 24), cy, [0, 1.3, -2.5], { kind: 'pulse', speed: 2, material: cy }, [0, 0, 0]);
  taper(b, m.paintWhite, 4.4, 3.6, 3.4, 0.8, [5.2, 0.25, 5.0]);
  taper(b, m.glass, 4.4, 3.6, 3.4, 0.8, [5.2, 0.25, 5.0], 1.2, 2.5, 0.1);
  beacon(b, m, 7.4);
  return b;
}

export function aiSpire(): ModelBuilder {
  // AI inspection spire: a twisting 40 m tower of compute; a scanning halo
  // rides up and down it while inspection lanes run at its foot.
  const b = new ModelBuilder();
  const m = materials();
  const cy = glow(m.glowCyan);
  const scan = glow(m.ledGreen);
  slab(b, 24, 24, m.concrete);
  podium(b, m, 8, 1.0, 8);
  for (let k = 0; k < 20; k++) {
    const s = 7.0 - k * 0.22;
    b.add(new THREE.BoxGeometry(s, 1.9, s), k % 4 === 3 ? m.glass : m.paintWhite, [0, 1.25 + 0.95 + k * 1.95, 0], [0, k * 0.09, 0]);
  }
  for (let k = 0; k < 5; k++) b.part(new THREE.BoxGeometry(7.1 - (k * 4 + 3) * 0.22, 0.14, 7.1 - (k * 4 + 3) * 0.22), cy, [0, 1.25 + (k * 4 + 3) * 1.95 + 1.9, 0], { kind: 'pulse', speed: 1.3, material: cy }, [0, (k * 4 + 3) * 0.09, 0]);
  const halo = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5.8, 0.2, 8, 48), m.glowCyan);
  ring.rotation.x = Math.PI / 2;
  halo.add(ring);
  halo.position.y = 20;
  b.partGroup(halo, { kind: 'float', speed: 0.5 });
  b.height = 42;
  // Inspection lanes with assemblies and scan gates
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const ex = Math.cos(a), ez = Math.sin(a);
    beam(b, m.steelDark, [ex * 6, 1.4, ez * 6], [ex * 11.5, 0.5, ez * 11.5], 0.8);
    const gx = ex * 9, gz = ez * 9;
    b.add(new THREE.TorusGeometry(1.2, 0.18, 8, 24), m.paintWhite, [gx, 1.6, gz], [0, -a + Math.PI / 2, 0]);
    b.part(new THREE.TorusGeometry(1.0, 0.05, 6, 24), scan, [gx, 1.6, gz], { kind: 'pulse', speed: 3, material: scan }, [0, -a + Math.PI / 2, 0]);
  }
  beacon(b, m, 42.4);
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
  graphene_desal: { name: 'T5 Graphene Desalination Array', size: [5, 4], build: grapheneDesal },
  water_harvester: { name: 'T6 Atmospheric Water Harvester', size: [6, 6], build: waterHarvester },
  molecular_sieve: { name: 'T5 Molecular Sieve Plant', size: [4, 4], build: molecularSieve },
  pure_cathedral: { name: 'T6 Ultra-Pure Water Cathedral', size: [6, 6], build: pureCathedral },
  cavern_cistern: { name: 'T5 Cavern Cistern', size: [5, 5], build: cavernCistern },
  hanging_reservoir: { name: 'T6 Hanging Reservoir', size: [7, 7], build: hangingReservoir },
  sc_megastation: { name: 'T5 Superconducting Megastation', size: [5, 5], build: scMegastation },
  power_beacon: { name: 'T6 Wireless Power Beacon', size: [6, 6], build: powerBeacon },
  maglev_silo: { name: 'T5 Maglev Fuel Silo', size: [4, 4], build: maglevSilo },
  fuel_citadel: { name: 'T6 Fuel Citadel', size: [6, 6], build: fuelCitadel },
  deep_borehole: { name: 'T5 Deep Borehole Disposal', size: [4, 4], build: deepBorehole },
  transmutation_ring: { name: 'T6 Transmutation Accelerator', size: [7, 7], build: transmutationRing },
  robotic_bore: { name: 'T5 Robotic Deep Bore', size: [5, 5], build: roboticBore },
  seawater_extractor: { name: 'T6 Seawater Uranium Extractor', size: [7, 7], build: seawaterExtractor },
  plasma_separator: { name: 'T5 Plasma Ore Separator', size: [5, 4], build: plasmaSeparator },
  molecular_mill: { name: 'T6 Molecular Assembler Mill', size: [6, 6], build: molecularMill },
  isotope_ring: { name: 'T5 Isotope Separator Ring', size: [5, 5], build: isotopeRing },
  quantum_sorter: { name: 'T6 Quantum Isotope Sorter', size: [6, 6], build: quantumSorter },
  fuel_printer: { name: 'T5 Additive Fuel Printer', size: [5, 4], build: fuelPrinter },
  fuel_foundry: { name: 'T6 Autonomous Fuel Foundry', size: [6, 6], build: fuelFoundry },
  muon_arch: { name: 'T5 Muon Tomography Scanner', size: [4, 4], build: muonArch },
  ai_spire: { name: 'T6 AI Inspection Spire', size: [6, 6], build: aiSpire },
};
