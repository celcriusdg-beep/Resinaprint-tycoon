import * as THREE from 'three';
import { ModelBuilder, fanRotor } from '../builder';
import { materials } from '../materials';

// Water and fuel-cycle buildings, plus the mining vehicles.

let earthMats: { earth: THREE.MeshStandardMaterial; ore: THREE.MeshStandardMaterial; rock: THREE.MeshStandardMaterial } | null = null;
export function earth() {
  if (!earthMats) {
    earthMats = {
      earth: new THREE.MeshStandardMaterial({ color: '#8a6a4a', roughness: 1 }),
      ore: new THREE.MeshStandardMaterial({ color: '#b8a04a', roughness: 0.95 }),
      rock: new THREE.MeshStandardMaterial({ color: '#6f6458', roughness: 1, flatShading: true }),
    };
  }
  return earthMats;
}

function slab(b: ModelBuilder, w: number, d: number, mat?: THREE.Material) {
  b.box(w - 0.3, 0.2, d - 0.3, mat ?? materials().concreteDark, [0, 0, 0]);
}

/** Square frame (four boxes) used for pit terraces. */
function frame(b: ModelBuilder, outer: number, inner: number, h: number, y: number, mat: THREE.Material) {
  const t = (outer - inner) / 2;
  b.box(outer, h, t, mat, [0, y, -outer / 2 + t / 2]);
  b.box(outer, h, t, mat, [0, y, outer / 2 - t / 2]);
  b.box(t, h, inner, mat, [-outer / 2 + t / 2, y, 0]);
  b.box(t, h, inner, mat, [outer / 2 - t / 2, y, 0]);
}

export function uraniumMine(): ModelBuilder {
  const b = new ModelBuilder();
  const e = earth();
  // Pit floor and stepped benches rising to the rim
  b.box(15.6, 0.22, 15.6, e.earth, [0, 0, 0], 0, 0.1);
  b.box(7.6, 0.1, 7.6, e.ore, [0, 0.22, 0], 0, 0.1);
  frame(b, 10.4, 7.6, 0.9, 0.2, e.rock);
  frame(b, 13.0, 10.4, 1.8, 0.2, e.earth);
  frame(b, 15.6, 13.0, 2.7, 0.2, e.rock);
  // Haul ramp cut into the benches
  b.add(new THREE.BoxGeometry(2.2, 0.2, 7), e.earth, [5.2, 1.4, -2.5], [0.36, 0, 0]);
  // Ore stockpile and a site office
  b.add(new THREE.ConeGeometry(1.6, 1.8, 10), e.ore, [5.9, 3.8, 5.9]);
  b.box(2.2, 1.2, 1.4, materials().cladWhite, [-5.8, 2.9, -6.1]);
  b.box(0.6, 0.35, 0.05, materials().windowGlow, [-5.8, 3.4, -5.38]);
  b.emit({ pos: [0, 0.6, 0], radius: 3, rate: 0.12, size: 2.2, kind: 'smoke' });
  return b;
}

export function oreMill(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  const e = earth();
  slab(b, 12, 12);
  b.box(4.2, 5.2, 4.0, m.cladGrey, [-3.4, 0.2, -3.4]);
  b.box(4.4, 0.25, 4.2, m.steelDark, [-3.4, 5.4, -3.4]);
  // Inclined conveyor feeding the crusher
  b.add(new THREE.BoxGeometry(1.0, 0.3, 7.5), m.steelDark, [-3.4, 3.0, 2.6], [-0.55, 0, 0]);
  b.add(new THREE.BoxGeometry(0.8, 0.15, 7.5), e.ore, [-3.4, 3.2, 2.6], [-0.55, 0, 0]);
  // Leach tanks
  for (let i = 0; i < 3; i++) {
    b.cyl(1.1, 1.1, 2.8, m.steel, [1.4 + i * 1.6 - 0.3, 0.2, -3.8 + (i % 2) * 0.2], 18);
    b.cyl(1.15, 1.15, 0.12, m.paintYellow, [1.4 + i * 1.6 - 0.3, 3.0, -3.8 + (i % 2) * 0.2], 18);
  }
  // Thickener (wide shallow tank with liquid)
  b.cyl(2.3, 2.3, 0.9, m.concrete, [2.6, 0.2, 2.4], 28, [0, 0, 0], true);
  b.cyl(2.2, 2.2, 0.05, m.water, [2.6, 0.95, 2.4], 28);
  b.box(4.4, 0.12, 0.2, m.steelDark, [2.6, 1.3, 2.4]);
  // Drums of yellowcake
  for (let i = 0; i < 6; i++) b.cyl(0.28, 0.28, 0.85, m.paintYellow, [-5 + (i % 3) * 0.65, 0.2, 4.6 + Math.floor(i / 3) * 0.65], 10);
  b.emit({ pos: [-3.4, 6, -3.4], radius: 0.6, rate: 0.12, size: 1.2, kind: 'vapor' });
  return b;
}

export function enrichmentPlant(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 16, 12);
  // Long cascade halls
  for (const z of [-2.6, 1.6]) {
    b.box(14.4, 3.2, 3.6, m.cladWhite, [0, 0.2, z]);
    b.box(14.6, 0.2, 3.8, m.steelDark, [0, 3.4, z]);
    for (let i = 0; i < 6; i++) b.box(1.2, 0.5, 1.0, m.steel, [-6 + i * 2.4, 3.6, z]);
  }
  b.box(14.4, 0.6, 0.6, m.pipeWhite, [0, 2.0, -0.5]);
  // Feed & withdrawal station with UF6 cylinders on cradles
  for (let i = 0; i < 4; i++) {
    b.pipe([-6.2 + i * 2.3, 0.75, 4.6], [-4.8 + i * 2.3, 0.75, 4.6], 0.5, i % 2 ? m.paintGreen : m.paintWhite, 14);
    b.box(1.4, 0.25, 0.6, m.steelDark, [-5.5 + i * 2.3, 0.2, 4.6]);
  }
  b.box(2.2, 2.4, 2.4, m.concreteDark, [6.0, 0.2, 4.5]);
  b.emit({ pos: [6, 2.8, 4.5], radius: 0.4, rate: 0.06, size: 1, kind: 'vapor' });
  return b;
}

export function fuelFab(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 12);
  b.box(9.6, 3.4, 7.0, m.cladBlue, [-0.6, 0.2, -1.6]);
  // Saw-tooth roof with north lights
  for (let i = 0; i < 4; i++) {
    b.add(new THREE.BoxGeometry(2.4, 0.15, 7.2), m.steelDark, [-4.2 + i * 2.4, 4.1, -1.6], [0, 0, 0.42]);
    b.box(0.08, 0.9, 7.0, m.glass, [-3.05 + i * 2.4, 3.6, -1.6]);
  }
  b.box(2.4, 2.4, 0.06, m.slats, [-0.6, 0.2, 1.95]);
  // Finished assemblies waiting for shipment (tall square bundles in a rack)
  for (let i = 0; i < 5; i++) b.box(0.32, 3.6, 0.32, m.steel, [3.2 + (i % 3) * 0.6, 0.2, 3.6 + Math.floor(i / 3) * 0.7]);
  b.box(2.2, 0.15, 1.8, m.paintYellow, [3.8, 0.2, 3.9]);
  b.box(1.6, 1.8, 1.4, m.cladWhite, [-4.4, 0.2, 3.8]);
  return b;
}

export function fuelQa(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 8, 8, m.concrete);
  b.box(5.8, 2.8, 4.6, m.cladWhite, [0, 0.2, -0.8]);
  b.box(6.0, 0.2, 4.8, m.steelDark, [0, 3.0, -0.8]);
  b.box(4.6, 0.6, 0.06, m.windowGlow, [0, 1.6, 1.52]);
  const scan = materials().glowCyan.clone();
  // Ultrasonic scanning ring around a fuel assembly on its inspection stand
  b.cyl(0.9, 1.0, 0.25, m.steelDark, [2.2, 0.2, 2.6], 20);
  b.box(0.22, 2.6, 0.22, m.paintYellow, [2.2, 0.45, 2.6]);
  for (const x of [1.1, 3.3]) b.box(0.14, 2.4, 0.14, m.steel, [x, 0.2, 2.6]);
  b.box(2.4, 0.14, 0.14, m.steel, [2.2, 2.6, 2.6]);
  b.part(new THREE.TorusGeometry(0.55, 0.06, 8, 32), scan, [2.2, 1.4, 2.6], { kind: 'pulse', material: scan, speed: 3 }, [Math.PI / 2, 0, 0]);
  return b;
}

export function waterIntake(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 8, 8, m.concrete);
  // Intake bay with screens and water
  b.box(7.4, 0.9, 3.0, m.concreteDark, [0, 0.2, -2.1]);
  b.box(6.6, 0.05, 2.4, m.water, [0, 0.9, -2.1]);
  for (let i = 0; i < 4; i++) b.box(0.1, 1.6, 2.5, m.steelDark, [-2.4 + i * 1.6, 0.9, -2.1]);
  // Pump house
  b.box(4.2, 2.6, 3.0, m.cladBlue, [-0.8, 0.2, 1.8]);
  b.box(4.4, 0.2, 3.2, m.steelDark, [-0.8, 2.8, 1.8]);
  // Large discharge pipes
  for (let i = 0; i < 3; i++) b.pipe([1.4, 0.7 + i * 0.05, 0.9 + i * 0.9], [3.9, 0.7 + i * 0.05, 0.9 + i * 0.9], 0.32, m.pipeBlue, 12);
  b.box(0.9, 1.2, 0.9, m.paintYellow, [2.6, 0.2, -0.2]);
  return b;
}

export function waterWells(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 8, 8, materials().gravel);
  const spots: [number, number][] = [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]];
  for (const [x, z] of spots) {
    b.box(1.2, 0.5, 1.2, m.concreteDark, [x, 0.2, z]);
    b.cyl(0.18, 0.18, 0.9, m.pipeBlue, [x, 0.7, z], 10);
    b.box(0.5, 0.6, 0.4, m.paintGreen, [x + 0.4, 0.7, z - 0.3]);
    // Pump jack: rocking beam on an A-frame
    b.box(0.12, 1.4, 0.12, m.steelDark, [x - 0.35, 0.7, z]);
    b.box(0.12, 1.4, 0.12, m.steelDark, [x + 0.35, 0.7, z]);
    const beam = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.16, 0.16), m.paintYellow);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.55, 0.3), m.paintYellow);
    head.position.set(-1.0, -0.15, 0);
    beam.add(bar, head);
    beam.position.set(x, 2.15, z);
    b.partGroup(beam, { kind: 'rock', axis: 'z', speed: 1.4, phase: x + z });
  }
  b.pipe([-1.9, 0.5, 0], [1.9, 0.5, 0], 0.12, m.pipeBlue);
  b.pipe([0, 0.5, -1.9], [0, 0.5, 1.9], 0.12, m.pipeBlue);
  return b;
}

export function waterTreatment(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 12);
  for (const [x, z] of [[-2.9, -2.9], [2.9, -2.9]] as [number, number][]) {
    b.cyl(2.3, 2.3, 1.2, m.concrete, [x, 0.2, z], 32, [0, 0, 0], true);
    b.cyl(2.2, 2.2, 0.05, m.water, [x, 1.25, z], 32);
    b.box(4.4, 0.1, 0.25, m.steelDark, [x, 1.5, z]);
    b.cyl(0.25, 0.25, 0.6, m.steel, [x, 1.2, z], 10);
  }
  // Filter & ion-exchange building
  b.box(6.4, 3.0, 3.6, m.cladWhite, [-1.6, 0.2, 3.0]);
  b.box(6.6, 0.2, 3.8, m.cladBlue, [-1.6, 3.2, 3.0]);
  b.box(5.6, 0.5, 0.06, m.windowGlow, [-1.6, 2.0, 4.82]);
  // Chemical tanks
  for (let i = 0; i < 2; i++) b.cyl(0.6, 0.6, 2.4, m.paintWhite, [3.6 + i * 1.4, 0.2, 2.6], 14);
  b.pipe([-2.9, 0.8, -0.6], [-2.9, 0.8, 1.2], 0.2, m.pipeBlue);
  b.pipe([2.9, 0.8, -0.6], [2.9, 0.8, 1.2], 0.2, m.pipeBlue);
  return b;
}

export function waterTank(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 8, 8, m.concrete);
  b.cyl(3.2, 3.2, 6.0, m.cladWhite, [0, 0.2, 0], 36);
  b.dome(3.25, m.steel, [0, 6.2, 0], 0.18, 36);
  for (let i = 0; i < 4; i++) b.cyl(3.25, 3.25, 0.08, m.cladBlue, [0, 1.2 + i * 1.4, 0], 36);
  // Ladder and level gauge
  b.box(0.5, 6.1, 0.08, m.paintYellow, [0, 0.2, 3.3]);
  b.box(0.12, 5.2, 0.12, m.glass, [1.4, 0.6, 2.95]);
  b.part(new THREE.SphereGeometry(0.08, 6, 4), m.beacon, [0, 6.9, 0], { kind: 'beacon' });
  return b;
}

export function dryCooling(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 8);
  // Elevated steel table with A-frame finned tube bundles and fans
  for (const x of [-5, -1.7, 1.7, 5]) for (const z of [-2.8, 2.8]) b.box(0.3, 3.0, 0.3, m.steel, [x, 0.2, z]);
  b.box(11.2, 0.3, 6.4, m.steelDark, [0, 3.2, 0]);
  for (let i = 0; i < 3; i++) {
    const x = -3.6 + i * 3.6;
    for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(3.2, 3.2, 0.25), m.slats, [x, 4.6, s * 1.25], [s * 0.6, 0, 0]);
    b.cyl(1.4, 1.4, 0.3, m.steelDark, [x, 3.5, 0], 24, [0, 0, 0], true);
    const rotor = fanRotor(1.3, 6, m.steelDark, m.steel);
    rotor.position.set(x, 3.65, 0);
    b.partGroup(rotor, { kind: 'spin', axis: 'y', speed: 7 });
  }
  b.pipe([-5.4, 6.0, 0], [5.4, 6.0, 0], 0.4, m.pipeWhite, 12);
  return b;
}

export function dryCask(): ModelBuilder {
  const b = new ModelBuilder();
  const m = materials();
  slab(b, 12, 8, m.concrete);
  for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) {
    const x = -4.2 + i * 2.1, z = -1.6 + row * 3.0;
    b.cyl(0.8, 0.8, 2.6, m.concrete, [x, 0.2, z], 18);
    b.cyl(0.84, 0.84, 0.15, m.steel, [x, 2.8, z], 18);
    for (let v = 0; v < 4; v++) b.box(0.18, 0.12, 0.08, m.steelDark, [x + Math.cos(v * 1.57) * 0.82, 0.5, z + Math.sin(v * 1.57) * 0.82]);
  }
  b.box(11.4, 1.6, 0.05, m.steelDark, [0, 0.2, 3.7]);
  b.box(0.05, 1.6, 7.4, m.steelDark, [5.7, 0.2, 0]);
  b.box(1.2, 2.0, 1.2, m.cladWhite, [5.0, 0.2, -3.0]);
  return b;
}

// ── Vehicles ────────────────────────────────────────────────────────────

const tiresMat = () => materials().rubber;

export function makeExcavator(tier: number): THREE.Group {
  const m = materials();
  const g = new THREE.Group();
  const yellow = m.paintYellow;
  if (tier === 4) {
    // Bucket-wheel excavator: crawler base, superstructure, long boom with wheel, counter boom and conveyor
    const base = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 2.6), m.steelDark);
    base.position.y = 0.4;
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.0), yellow);
    body.position.y = 1.6;
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.6, 0.3), m.steel);
    mast.position.set(0, 3.6, 0);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.45, 0.6), yellow);
    boom.position.set(3.4, 2.4, 0);
    boom.rotation.z = -0.22;
    const wheel = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.14, 8, 24), m.steel);
    wheel.add(rim);
    for (let i = 0; i < 12; i++) {
      const bucket = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.6), m.steelDark);
      const a = (i / 12) * Math.PI * 2;
      bucket.position.set(Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0);
      bucket.rotation.z = a;
      wheel.add(bucket);
    }
    wheel.position.set(6.6, 1.3, 0);
    wheel.userData.spinWheel = true;
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4, 0.35, 0.5), yellow);
    counter.position.set(-2.4, 3.0, 0);
    counter.rotation.z = 0.15;
    const weight = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 1.1), m.concreteDark);
    weight.position.set(-4.2, 3.2, 0);
    const cables = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.06, 0.06), m.steelDark);
    cables.position.set(3, 4.3, 0);
    cables.rotation.z = -0.4;
    g.add(base, body, mast, boom, wheel, counter, weight, cables);
    return g;
  }
  // Tracked excavator / shovel
  const tracks = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 1.3), m.rubber);
  tracks.position.y = 0.22;
  const house = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 1.1), tier >= 3 ? m.cladWhite : yellow);
  body.position.set(-0.15, 0.8, 0);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.5), m.glass);
  cab.position.set(0.3, 1.35, 0.25);
  const arm = new THREE.Group();
  const boom = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 0.18), yellow);
  boom.position.set(0.75, 0, 0);
  const stick = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.16), yellow);
  stick.position.set(1.5, -0.45, 0);
  const bucket = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.5), m.steelDark);
  bucket.position.set(1.55, -1.05, 0);
  arm.add(boom, stick, bucket);
  arm.position.set(0.4, 1.15, -0.2);
  arm.rotation.z = 0.5;
  arm.userData.dig = true;
  house.add(body, cab, arm);
  house.userData.swing = true;
  g.add(tracks, house);
  return g;
}

export function makeTruck(tier: number): THREE.Group {
  const m = materials();
  const g = new THREE.Group();
  const paint = tier >= 2 ? m.paintYellow : tier === 1 ? m.paintGreen : m.paintRed;
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 0.9), m.steelDark);
  chassis.position.y = 0.55;
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.6, 1.0), paint);
  bed.position.set(-0.3, 1.0, 0);
  const load = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.2, 0.8), earth().ore);
  load.position.set(-0.3, 1.35, 0);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.85), tier >= 2 ? m.cladWhite : paint);
  cab.position.set(0.72, 1.0, 0);
  g.add(chassis, bed, load, cab);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 14);
  for (const x of [-0.7, 0.65]) for (const z of [-0.5, 0.5]) {
    const w = new THREE.Mesh(wheelGeo, tiresMat());
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.36, z);
    g.add(w);
  }
  return g;
}
