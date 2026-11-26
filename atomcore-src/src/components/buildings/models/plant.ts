import * as THREE from 'three';
import { ModelBuilder, fanRotor } from '../builder';
import { materials } from '../materials';
import { stack } from './reactors';

function slab(b: ModelBuilder, w: number, d: number, mat?: THREE.Material) {
  b.box(w - 0.3, 0.2, d - 0.3, mat ?? materials().concreteDark, [0, 0, 0]);
}

export function mechCooling(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 8, 8);
  // Cold water basin
  b.box(7.2, 0.6, 7.2, m.concrete, [0, 0.2, 0]);
  // Cell structure with louvres
  b.box(6.8, 2.6, 6.8, m.cladGrey, [0, 0.8, 0]);
  for (const s of [-1, 1]) {
    b.box(6.4, 1.3, 0.05, m.slats, [0, 1.0, s * 3.42]);
    b.box(0.05, 1.3, 6.4, m.slats, [s * 3.42, 1.0, 0]);
  }
  b.box(7.0, 0.2, 7.0, m.steelDark, [0, 3.4, 0]);
  // Four fan stacks
  for (const [x, z] of [[-1.7, -1.7], [1.7, -1.7], [-1.7, 1.7], [1.7, 1.7]]) {
    b.cyl(1.35, 1.5, 1.1, m.cladWhite, [x, 3.6, z], 28, [0, 0, 0], true);
    b.cyl(1.3, 1.3, 0.08, m.steelDark, [x, 3.6, z], 24);
    const rotor = fanRotor(1.25, 6, m.steelDark, m.steel);
    rotor.position.set(x, 4.2, z);
    b.partGroup(rotor, { kind: 'spin', axis: 'y', speed: 9 + Math.random() * 2 });
    b.emit({ pos: [x, 4.7, z], radius: 0.9, rate: 0.55, size: 2.2, kind: 'steam' });
  }
  // Access stair and pipes
  b.box(0.8, 3.4, 0.4, m.paintYellow, [3.7, 0.2, -2.8]);
  b.pipe([-3.8, 0.6, 2.4], [-3.4, 0.6, 2.4], 0.3, m.pipeBlue);
  b.pipe([-3.8, 0.6, 1.4], [-3.4, 0.6, 1.4], 0.3, m.pipeBlue);
  return b;
}

export function coolingTower(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 12);
  // Basin
  b.cyl(5.7, 5.8, 0.6, m.concreteDark, [0, 0.2, 0], 48);
  // Diagonal support columns (X-legs)
  const legs = 24;
  for (let i = 0; i < legs; i++) {
    const a = (i / legs) * Math.PI * 2;
    const r = 5.15;
    b.add(new THREE.BoxGeometry(0.16, 1.7, 0.16), m.concrete, [Math.cos(a) * r, 1.6, Math.sin(a) * r], [0, -a, i % 2 ? 0.35 : -0.35]);
  }
  // Hyperbolic shell (lathe profile)
  const h = 16;
  const pts: [number, number][] = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = 2.4 + t * (h - 2.4);
    // radius: hyperbola with throat at 72% height
    const throat = 0.72;
    const k = (t - throat) / (t < throat ? throat : 1 - throat);
    const r = 3.15 + (t < throat ? 1.85 : 0.6) * k * k;
    pts.push([r, y]);
  }
  const shell = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 56);
  const shellMat = m.concrete.clone();
  shellMat.side = THREE.DoubleSide;
  b.add(shell, shellMat);
  b.height = h;
  // Top ring and inner darkness
  b.torus(pts[steps][0], 0.12, m.concreteDark, [0, h, 0], [Math.PI / 2, 0, 0], 56);
  b.cyl(4.9, 4.9, 0.05, m.rubber, [0, 2.4, 0], 40);
  // Stair tower
  b.box(0.8, h * 0.4, 0.8, m.steelDark, [5.3, 0.2, 0]);
  // Warm water inlet
  b.pipe([5.9, 1.0, -2], [4.6, 1.0, -2], 0.4, m.pipeBlue);
  b.emit({ pos: [0, h, 0], radius: 3.2, rate: 2.6, size: 5.5, kind: 'steam' });
  // Aviation lights on the rim
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    b.part(new THREE.SphereGeometry(0.12, 6, 4), m.beacon, [Math.cos(a) * pts[steps][0], h + 0.15, Math.sin(a) * pts[steps][0]], { kind: 'beacon', phase: i * 0.7 });
  }
  return b;
}

function turbineHallBase(b: ModelBuilder, w: number, d: number, h: number, sets: number) {
  const m = materials();
  slab(b, w, d);
  const hw = w - 0.8, hd = d - 1.6;
  // Hall shell: blue cladding with a white band and a pitched roof
  b.box(hw, h, hd, m.cladBlue, [0, 0.2, -0.4]);
  b.box(hw + 0.05, 0.6, hd + 0.05, m.cladWhite, [0, 0.2 + h - 1.4, -0.4]);
  // Clerestory glass band
  b.box(hw - 0.6, 0.7, 0.06, m.glass, [0, 0.2 + h - 2.4, -0.4 + hd / 2 + 0.01]);
  b.box(hw - 0.6, 0.7, 0.06, m.glass, [0, 0.2 + h - 2.4, -0.4 - hd / 2 - 0.01]);
  // Low pitched roof: two slabs meeting at a ridge along the hall
  const slope = 0.16;
  const half = (hd + 0.4) / 2;
  const rise = Math.sin(slope) * half;
  for (const sgn of [-1, 1]) {
    b.add(new THREE.BoxGeometry(hw + 0.4, 0.14, half / Math.cos(slope) + 0.05), m.steelDark,
      [0, 0.2 + h + rise / 2 + 0.05, -0.4 + sgn * half / 2], [sgn * slope, 0, 0]);
  }
  b.box(hw + 0.45, 0.12, 0.25, m.steel, [0, 0.2 + h + rise, -0.4]);
  // Roll-up door and personnel doors
  b.box(2.2, 2.6, 0.06, m.slats, [-hw / 2 + 2, 0.2, -0.4 + hd / 2 + 0.02]);
  b.box(2.3, 0.15, 0.1, m.hazard, [-hw / 2 + 2, 2.8, -0.4 + hd / 2 + 0.03]);
  // Roof ventilators (animated)
  for (let i = 0; i < sets + 1; i++) {
    const x = -hw / 2 + ((i + 0.5) * hw) / (sets + 1);
    b.cyl(0.45, 0.45, 0.5, m.steel, [x, 0.2 + h + 0.35, -0.4], 14);
    const rotor = fanRotor(0.4, 4, m.steelDark, m.steel);
    rotor.position.set(x, 0.2 + h + 0.9, -0.4);
    b.partGroup(rotor, { kind: 'spin', axis: 'y', speed: 6 });
    b.emit({ pos: [x, 0.2 + h + 1.0, -0.4], radius: 0.2, rate: 0.08, size: 0.9, kind: 'vapor' });
  }
  // Exterior: main transformers on the long side
  for (let i = 0; i < sets; i++) {
    const x = -hw / 2 + 1.5 + i * ((hw - 3) / Math.max(1, sets - 1 || 1));
    const z = -0.4 + hd / 2 + 1.0;
    b.box(1.3, 1.4, 1.0, m.steelDark, [x, 0.2, z]);
    for (let f = 0; f < 5; f++) b.box(0.05, 1.1, 0.9, m.steel, [x - 0.8 - f * 0.08, 0.3, z]);
    b.cyl(0.07, 0.07, 0.6, m.insulator, [x - 0.3, 1.6, z], 8);
    b.cyl(0.07, 0.07, 0.6, m.insulator, [x + 0.3, 1.6, z], 8);
  }
  // Steam inlet header along the back wall
  b.pipe([-hw / 2, h * 0.6, -0.4 - hd / 2 - 0.5], [hw / 2, h * 0.6, -0.4 - hd / 2 - 0.5], 0.3, m.pipeWhite);
  for (let i = 0; i < sets; i++) {
    const x = -hw / 2 + ((i + 0.5) * hw) / sets;
    b.pipe([x, h * 0.6, -0.4 - hd / 2 - 0.5], [x, h * 0.6, -0.4 - hd / 2], 0.22, m.pipeWhite);
  }
  // Exposed exciter shaft at the gable end (spins with load)
  const shaft = new THREE.Group();
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.0, 16), m.steel);
  s.rotation.z = Math.PI / 2;
  shaft.add(s);
  const coupling = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.2), m.paintYellow);
  shaft.add(coupling);
  shaft.position.set(hw / 2 + 0.55, 1.2, -0.4);
  b.partGroup(shaft, { kind: 'spin', axis: 'x', speed: 14 });
  b.box(0.9, 1.6, 1.3, m.cladWhite, [hw / 2 + 1.1 - 0.2, 0.2, -0.4]);
}

export function turbineHall(): ModelBuilder {
  const b = new ModelBuilder();
  turbineHallBase(b, 12, 8, 4.6, 2);
  return b;
}

export function turbineHallLarge(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  turbineHallBase(b, 16, 12, 7.0, 3);
  // Gantry crane rail above the roof line and a hydrogen plant
  b.box(1.4, 2.4, 1.4, m.paintWhite, [-6.6, 0.2, 5.2]);
  b.cyl(0.4, 0.4, 2.2, m.paintWhite, [-5.2, 0.2, 5.3], 12);
  b.cyl(0.4, 0.4, 2.2, m.paintWhite, [-4.4, 0.2, 5.3], 12);
  return b;
}

export function substation(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 8, 8, m.gravel);
  // Two step-up transformers with radiators and bushings
  for (const x of [-1.8, 1.8]) {
    b.box(1.8, 1.6, 1.3, m.steelDark, [x, 0.2, 0.6]);
    b.box(1.9, 0.12, 1.4, m.steel, [x, 1.8, 0.6]);
    for (let f = 0; f < 7; f++) b.box(0.05, 1.3, 0.6, m.steel, [x - 0.8 + f * 0.27, 0.35, -0.35]);
    b.cyl(0.32, 0.32, 0.7, m.steel, [x + 0.6, 1.92, 0.9], 14); // conservator
    for (let k = -1; k <= 1; k++) {
      // ribbed bushings
      for (let r = 0; r < 4; r++) b.cyl(0.11, 0.11, 0.08, m.insulator, [x + k * 0.5, 1.95 + r * 0.16, 0.4], 10);
      b.cyl(0.05, 0.05, 0.7, m.insulator, [x + k * 0.5, 1.92, 0.4], 8);
    }
    b.box(0.5, 0.4, 0.3, m.ledGreen, [x - 0.6, 0.6, 1.26]);
  }
  // Steel gantry (lattice) carrying the outgoing lines
  for (const x of [-3.2, 3.2]) b.lattice(4.6, 0.4, m.steel, [x, 0.2, -2.6], 5);
  b.box(6.8, 0.2, 0.2, m.steel, [0, 4.7, -2.6]);
  for (let k = -1; k <= 1; k++) {
    b.cyl(0.06, 0.06, 0.6, m.insulator, [k * 1.8, 4.1, -2.6], 8);
    b.pipe([k * 1.8, 4.1, -2.6], [k * 0.5 + (k < 0 ? -1.3 : k > 0 ? 1.3 : 0), 2.5, 0.4], 0.03, m.copper, 4);
  }
  // Control kiosk
  b.box(1.6, 2.0, 1.4, m.cladWhite, [-2.6, 0.2, 2.9]);
  b.box(0.6, 0.6, 0.05, m.windowGlow, [-2.6, 1.2, 3.62]);
  // Perimeter fence
  for (const s of [-1, 1]) {
    b.box(7.4, 1.4, 0.04, m.steelDark, [0, 0.2, s * 3.7]);
    b.box(0.04, 1.4, 7.4, m.steelDark, [s * 3.7, 0.2, 0]);
  }
  return b;
}

export function battery(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 8, 8, m.concrete);
  const leds = m.ledGreen.clone();
  const ledGroup = new THREE.Group();
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 2; i++) {
      const x = -1.6 + i * 3.2;
      const z = -1.7 + row * 3.0;
      b.box(2.9, 2.1, 1.8, m.cladWhite, [x, 0.2, z]);
      // container ribs
      for (let r = 0; r < 9; r++) b.box(0.05, 2.0, 1.82, m.paintWhite, [x - 1.35 + r * 0.34, 0.25, z]);
      // HVAC units on top
      b.box(0.9, 0.45, 1.0, m.steel, [x - 0.7, 2.3, z]);
      b.box(0.9, 0.45, 1.0, m.steel, [x + 0.7, 2.3, z]);
      for (let k = 0; k < 4; k++) {
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.02), leds);
        led.position.set(x - 1.1 + k * 0.25, 1.7, z + 0.92);
        ledGroup.add(led);
      }
    }
  }
  b.partGroup(ledGroup, { kind: 'blink', material: leds });
  // Inverter / transformer skid
  b.box(1.6, 1.4, 1.2, m.steelDark, [2.8, 0.2, 3.1]);
  b.box(1.8, 1.0, 0.8, m.paintGreen, [-2.6, 0.2, 3.3]);
  return b;
}

export function lab(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 8, 8, m.concrete);
  // Two-tier lab: glass facade with white fins
  b.box(6.6, 3.0, 4.8, m.facade, [0, 0.2, -1.0], 0, 0.35);
  b.box(6.8, 0.2, 5.0, m.paintWhite, [0, 3.2, -1.0]);
  b.box(4.4, 2.4, 3.6, m.facade, [-0.9, 3.4, -1.4], 0, 0.35);
  b.box(4.6, 0.2, 3.8, m.paintWhite, [-0.9, 5.8, -1.4]);
  for (let i = 0; i < 8; i++) b.box(0.12, 3.0, 0.3, m.paintWhite, [-3.2 + i * 0.92, 0.2, 1.45]);
  // Entrance canopy
  b.box(2.4, 0.15, 1.6, m.paintWhite, [1.5, 2.4, 2.1]);
  b.box(0.15, 2.4, 0.15, m.steel, [2.6, 0.2, 2.8]);
  b.box(0.15, 2.4, 0.15, m.steel, [0.4, 0.2, 2.8]);
  // Rooftop satellite dish (slowly scanning)
  const dish = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.9, 18, 8, 0, Math.PI * 2, 0, Math.PI / 3.2), m.paintWhite);
  bowl.rotation.x = -Math.PI / 2.6;
  bowl.position.y = 0.6;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.6, 8), m.steel);
  mast.position.y = 0.3;
  dish.add(bowl, mast);
  dish.position.set(2.2, 3.4, -2.2);
  b.partGroup(dish, { kind: 'spin', axis: 'y', speed: 0.35 });
  // Antenna mast and particle-accelerator style ring building
  b.cyl(0.05, 0.08, 2.4, m.steel, [-2.4, 5.9, -2.6], 8);
  b.part(new THREE.SphereGeometry(0.08, 6, 4), m.beacon, [-2.4, 8.35, -2.6], { kind: 'beacon' });
  b.torus(1.2, 0.35, m.cladWhite, [2.0, 0.55, 2.6], [Math.PI / 2, 0, 0], 32);
  return b;
}

export function admin(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 8, 8, m.concrete);
  // Podium
  b.box(7.0, 1.6, 6.0, m.concreteWarm, [0, 0.2, 0.4]);
  b.box(4.0, 1.2, 0.06, m.glass, [0.6, 0.35, 3.42]);
  // Tower with glass curtain wall
  b.box(4.6, 9.0, 4.2, m.facade, [-0.6, 1.8, -0.4], 0, 0.3);
  for (let i = 0; i < 5; i++) b.box(0.12, 9.0, 0.12, m.steel, [-2.9 + i * 1.15, 1.8, 1.72]);
  b.box(4.8, 0.3, 4.4, m.steelDark, [-0.6, 10.8, -0.4]);
  // Rooftop plant and the company sign
  b.box(1.6, 0.8, 1.2, m.steel, [-1.4, 11.1, -1.0]);
  b.box(3.6, 0.9, 0.08, m.sign, [-0.6, 9.6, 1.72]);
  b.cyl(0.04, 0.06, 2.0, m.steel, [0.8, 11.1, 0.4], 8);
  b.part(new THREE.SphereGeometry(0.08, 6, 4), m.beacon, [0.8, 13.15, 0.4], { kind: 'beacon' });
  // Parking with cars
  const colors = [m.paintRed, m.paintWhite, m.cladBlue, m.steelDark];
  for (let i = 0; i < 4; i++) {
    b.box(0.8, 0.5, 1.6, colors[i], [-3.0 + i * 1.1, 0.2, 3.2 - 0.1]);
    b.box(0.7, 0.3, 0.8, m.glass, [-3.0 + i * 1.1, 0.7, 3.1]);
  }
  return b;
}

export function maintenance(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 8, 8, m.concrete);
  // Arched hangar
  // Half cylinder lying along z, curved side up (squashed to a low arch)
  const arch = new THREE.CylinderGeometry(3.0, 3.0, 5.6, 24, 1, false, -Math.PI / 2, Math.PI);
  b.add(arch, m.cladGrey, [0, 0.2, -0.6], [-Math.PI / 2, 0, 0], [1, 1, 0.75]);
  // Gable walls closing the arch
  const gable = new THREE.CircleGeometry(3.0, 24, 0, Math.PI);
  b.add(gable, m.cladGrey, [0, 0.2, -3.4], [0, Math.PI, 0], [1, 0.75, 1]);
  b.box(5.4, 2.6, 0.06, m.hazard, [0, 0.2, 2.2]);
  b.box(4.6, 2.3, 0.07, m.slats, [0, 0.2, 2.21]);
  // Gantry crane outside
  b.box(0.25, 3.6, 0.25, m.paintYellow, [-3.4, 0.2, 3.3]);
  b.box(0.25, 3.6, 0.25, m.paintYellow, [3.4, 0.2, 3.3]);
  b.box(7.1, 0.35, 0.35, m.paintYellow, [0, 3.8, 3.3]);
  const hook = new THREE.Group();
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), m.steelDark);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4), m.steelDark);
  cable.position.y = -0.85;
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.25), m.paintRed);
  block.position.y = -1.6;
  hook.add(trolley, cable, block);
  hook.position.set(0, 3.6, 3.3);
  b.partGroup(hook, { kind: 'bob', axis: 'x', speed: 0.4 });
  // Crates & spare parts
  b.box(0.9, 0.9, 0.9, m.paintGreen, [-2.6, 0.2, 3.0]);
  b.box(0.7, 0.7, 0.7, m.paintGreen, [-1.7, 0.2, 3.2]);
  b.cyl(0.35, 0.35, 0.9, m.paintRed, [2.5, 0.2, 2.9], 12);
  b.cyl(0.35, 0.35, 0.9, m.paintYellow, [3.0, 0.2, 2.6], 12);
  // Roof vents on the arch
  b.cyl(0.12, 0.14, 0.7, m.steelDark, [1.4, 2.0, -1.5], 8);
  b.cyl(0.12, 0.14, 0.7, m.steelDark, [-1.4, 2.0, -1.5], 8);
  return b;
}

export function fuelDepot(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 8, 8, m.concrete);
  // Heavy storage bunker with ribs
  b.box(5.0, 2.4, 3.6, m.concreteDark, [-0.6, 0.2, -1.6]);
  for (let i = 0; i < 6; i++) b.box(0.3, 2.5, 3.8, m.concrete, [-2.9 + i * 0.92, 0.2, -1.6]);
  b.box(2.0, 1.9, 0.06, m.hazard, [-0.6, 0.2, 0.22]);
  b.box(1.8, 1.7, 0.07, m.steelDark, [-0.6, 0.2, 0.23]);
  // Dry casks
  for (let i = 0; i < 4; i++) {
    b.cyl(0.55, 0.55, 2.0, m.concrete, [-2.6 + i * 1.4, 0.2, 2.3], 18);
    b.cyl(0.58, 0.58, 0.12, m.steel, [-2.6 + i * 1.4, 2.2, 2.3], 18);
  }
  // Security fence & guard post
  b.box(7.4, 1.5, 0.04, m.steelDark, [0, 0.2, 3.7]);
  b.box(0.04, 1.5, 7.4, m.steelDark, [3.7, 0.2, 0]);
  b.box(1.0, 2.0, 1.0, m.cladWhite, [3.0, 0.2, -3.0]);
  b.box(0.8, 0.5, 0.05, m.windowGlow, [3.0, 1.3, -2.48]);
  b.box(0.7, 0.7, 0.05, m.paintYellow, [2.0, 1.0, 3.73]);
  return b;
}

export function emergencyGenerator(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 8, 4, m.concrete);
  for (let i = 0; i < 2; i++) {
    const x = -1.8 + i * 3.6;
    b.box(3.0, 1.9, 2.4, m.paintGreen, [x, 0.2, -0.2]);
    for (let r = 0; r < 5; r++) b.box(0.05, 1.6, 2.42, m.steelDark, [x - 1.2 + r * 0.6, 0.3, -0.2]);
    b.box(1.2, 0.8, 0.06, m.slats, [x, 0.6, 1.02]);
    b.cyl(0.16, 0.16, 1.4, m.steelDark, [x + 0.9, 2.1, -0.8], 10);
    b.emit({ pos: [x + 0.9, 3.5, -0.8], radius: 0.1, rate: 0.05, size: 0.7, kind: 'smoke' });
  }
  b.cyl(0.6, 0.6, 1.8, m.paintWhite, [0, 0.2, 1.4], 16, [0, 0, 0]);
  return b;
}

export { stack };
