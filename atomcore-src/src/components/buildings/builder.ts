import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { materials } from './materials';

// ModelBuilder collects transformed primitives into one bucket per material and
// merges each bucket into a single geometry. A whole building therefore costs a
// handful of draw calls regardless of how much detail it has. Moving parts
// (fans, turbine shafts, glowing cores) are added as separate named meshes.

export type Vec3 = [number, number, number];

export interface AnimPart {
  object: THREE.Object3D;
  kind: 'spin' | 'glow' | 'pulse' | 'blink' | 'bob' | 'beacon' | 'rock';
  axis?: 'x' | 'y' | 'z';
  speed?: number;
  phase?: number;
  /** Material for glow/pulse parts (cloned per building instance). */
  material?: THREE.MeshStandardMaterial;
}

export interface SteamEmitter {
  pos: Vec3;
  radius: number;
  rate: number; // relative particle rate
  size: number;
  kind: 'steam' | 'smoke' | 'vapor';
}

export interface ModelData {
  group: THREE.Group;
  anims: AnimPart[];
  emitters: SteamEmitter[];
  height: number;
  /** Top of the main reactor structure (excluding stacks), for overlays. */
  coreTop: number;
}

export class ModelBuilder {
  private buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  readonly root = new THREE.Group();
  readonly anims: AnimPart[] = [];
  readonly emitters: SteamEmitter[] = [];
  height = 1;
  coreTop = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();

  add(geo: THREE.BufferGeometry, mat: THREE.Material, pos: Vec3 = [0, 0, 0], rot: Vec3 = [0, 0, 0], scale: Vec3 = [1, 1, 1]): this {
    this.e.set(rot[0], rot[1], rot[2]);
    this.q.setFromEuler(this.e);
    this.m.compose(new THREE.Vector3(...pos), this.q, new THREE.Vector3(...scale));
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    // Normalise attributes so geometries merge cleanly.
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) {
      const n = g.attributes.position.count;
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    }
    g.applyMatrix4(this.m);
    const list = this.buckets.get(mat) ?? [];
    list.push(g);
    this.buckets.set(mat, list);
    const top = pos[1] + 0.01;
    if (top > this.height) this.height = top;
    return this;
  }

  /** Box resting on y (pos is bottom-centre). Large volumes get softly bevelled edges. */
  box(w: number, h: number, d: number, mat: THREE.Material, pos: Vec3 = [0, 0, 0], rotY = 0, uvScale = 0.25): this {
    const small = Math.min(w, h, d);
    let g: THREE.BufferGeometry;
    if (small >= 0.45 && Math.max(w, h, d) >= 1.2) {
      g = new RoundedBoxGeometry(w, h, d, 2, Math.min(0.12, small * 0.08));
      worldUVs(g, uvScale);
    } else {
      g = new THREE.BoxGeometry(w, h, d);
      scaleBoxUVs(g as THREE.BoxGeometry, w, h, d, uvScale);
    }
    this.add(g, mat, [pos[0], pos[1] + h / 2, pos[2]], [0, rotY, 0]);
    this.noteTop(pos, h);
    if (this.autoDetail) this.detailWall(w, h, d, mat, pos, rotY);
    return this;
  }

  /** Highest point so far (for the automatic aircraft beacon). */
  private top: Vec3 = [0, 0, 0];
  private noteTop(pos: Vec3, h: number): void {
    if (pos[1] + h > this.top[1]) this.top = [pos[0], pos[1] + h, pos[2]];
    this.height = Math.max(this.height, pos[1] + h);
  }

  /** Automatic dressing of large clad buildings: roof coping, rooftop units, a wall ladder. */
  autoDetail = true;
  private detailWall(w: number, h: number, d: number, mat: THREE.Material, pos: Vec3, rotY: number): void {
    const m = materials();
    const walls = [m.cladBlue, m.cladGrey, m.cladWhite, m.facade, m.slats, m.concreteWarm];
    if (!walls.includes(mat as THREE.MeshStandardMaterial) || h < 2.4 || w < 2.8 || d < 2.8) return;
    this.autoDetail = false;
    const c = Math.cos(rotY), s = Math.sin(rotY);
    const at = (x: number, z: number, y: number): Vec3 => [pos[0] + x * c + z * s, y, pos[2] - x * s + z * c];
    const top = pos[1] + h;
    // Coping along the roof edge
    const t = 0.16;
    this.box(w + 0.1, 0.22, t, m.steelDark, at(0, d / 2 - t / 2 + 0.05, top), rotY, 1);
    this.box(w + 0.1, 0.22, t, m.steelDark, at(0, -d / 2 + t / 2 - 0.05, top), rotY, 1);
    this.box(t, 0.22, d + 0.1, m.steelDark, at(w / 2 - t / 2 + 0.05, 0, top), rotY, 1);
    this.box(t, 0.22, d + 0.1, m.steelDark, at(-w / 2 + t / 2 - 0.05, 0, top), rotY, 1);
    // Rooftop air handlers (deterministic layout from the size)
    const n = Math.min(4, Math.max(1, Math.floor((w * d) / 30)));
    for (let i = 0; i < n; i++) {
      const fx = ((i + 0.5) / n - 0.5) * (w - 2.2);
      const fz = (((i * 37) % 7) / 7 - 0.5) * (d - 2.2) * 0.6;
      this.box(1.1, 0.55, 0.8, m.paintWhite, at(fx, fz, top), rotY, 1);
      this.box(0.5, 0.08, 0.5, m.steelDark, at(fx, fz, top + 0.55), rotY, 1);
    }
    // Access ladder with safety cage on one gable
    if (h > 12) { this.autoDetail = true; return; }
    const lx = w / 2 - 0.6;
    const lz = d / 2 + 0.06;
    for (const off of [-0.18, 0.18]) this.box(0.04, h + 0.9, 0.04, m.steel, at(lx + off, lz, pos[1]), rotY, 1);
    for (let y = pos[1] + 0.3; y < top + 0.8; y += 0.35) this.box(0.36, 0.03, 0.03, m.steel, at(lx, lz, y), rotY, 1);
    for (let y = pos[1] + 2.2; y < top + 0.8; y += 0.8) this.box(0.5, 0.03, 0.4, m.steel, at(lx, lz + 0.2, y), rotY, 1);
    this.autoDetail = true;
  }

  /** Cylinder resting on y. */
  cyl(rTop: number, rBot: number, h: number, mat: THREE.Material, pos: Vec3 = [0, 0, 0], seg = 24, rot: Vec3 = [0, 0, 0], open = false): this {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open);
    const uvs = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) * Math.max(1, rBot * 1.5), uvs.getY(i) * Math.max(1, h / 4));
    if (rot[0] === 0 && rot[2] === 0) {
      this.add(g, mat, [pos[0], pos[1] + h / 2, pos[2]], rot);
      this.noteTop(pos, h);
    } else this.add(g, mat, pos, rot);
    return this;
  }

  /** Horizontal pipe between two points. */
  pipe(a: Vec3, b: Vec3, r: number, mat: THREE.Material, seg = 10): this {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const len = va.distanceTo(vb);
    if (len < 1e-3) return this;
    const g = new THREE.CylinderGeometry(r, r, len, seg, 1, true);
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    const dir = vb.clone().sub(va).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1));
    const ng = g.toNonIndexed();
    ng.applyMatrix4(m);
    const list = this.buckets.get(mat) ?? [];
    list.push(ng);
    this.buckets.set(mat, list);
    return this;
  }

  /** Dome (upper hemisphere, optionally flattened) sitting on y. */
  dome(r: number, mat: THREE.Material, pos: Vec3, flatten = 1, seg = 28): this {
    const g = new THREE.SphereGeometry(r, seg, Math.max(8, seg / 2), 0, Math.PI * 2, 0, Math.PI / 2);
    this.add(g, mat, pos, [0, 0, 0], [1, flatten, 1]);
    this.height = Math.max(this.height, pos[1] + r * flatten);
    return this;
  }

  lathe(points: [number, number][], mat: THREE.Material, pos: Vec3 = [0, 0, 0], seg = 40): this {
    const g = new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), seg);
    this.add(g, mat, pos);
    this.height = Math.max(this.height, pos[1] + Math.max(...points.map((p) => p[1])));
    return this;
  }

  torus(r: number, tube: number, mat: THREE.Material, pos: Vec3, rot: Vec3 = [Math.PI / 2, 0, 0], seg = 40, arc = Math.PI * 2): this {
    const g = new THREE.TorusGeometry(r, tube, 12, seg, arc);
    this.add(g, mat, pos, rot);
    return this;
  }

  /** Lattice column made of four legs with cross bracing. */
  lattice(h: number, w: number, mat: THREE.Material, pos: Vec3, levels = 4): this {
    const hw = w / 2;
    const legs: [number, number][] = [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]];
    for (const [x, z] of legs) this.box(0.08, h, 0.08, mat, [pos[0] + x, pos[1], pos[2] + z], 0, 1);
    for (let i = 1; i <= levels; i++) {
      const y = pos[1] + (h * i) / levels - 0.04;
      this.box(w, 0.06, 0.06, mat, [pos[0], y, pos[2] - hw], 0, 1);
      this.box(w, 0.06, 0.06, mat, [pos[0], y, pos[2] + hw], 0, 1);
      this.box(0.06, 0.06, w, mat, [pos[0] - hw, y, pos[2]], 0, 1);
      this.box(0.06, 0.06, w, mat, [pos[0] + hw, y, pos[2]], 0, 1);
    }
    return this;
  }

  /** A separate (animated) mesh. */
  part(geo: THREE.BufferGeometry, mat: THREE.Material, pos: Vec3, anim: Omit<AnimPart, 'object'>, rot: Vec3 = [0, 0, 0]): THREE.Mesh {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    this.root.add(mesh);
    this.anims.push({ ...anim, object: mesh });
    return mesh;
  }

  /** A separate animated group (e.g. fan with blades). */
  partGroup(group: THREE.Object3D, anim: Omit<AnimPart, 'object'>): void {
    this.root.add(group);
    this.anims.push({ ...anim, object: group });
  }

  emit(e: SteamEmitter): void {
    this.emitters.push(e);
  }

  build(): ModelData {
    // Aviation obstruction light on anything taller than 11 m that has none yet.
    if (this.top[1] > 11 && !this.anims.some((a) => a.kind === 'beacon')) {
      this.part(new THREE.SphereGeometry(0.14, 6, 4), materials().beacon, [this.top[0], this.top[1] + 0.14, this.top[2]], { kind: 'beacon' });
    }
    for (const [mat, geos] of this.buckets) {
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      this.root.add(mesh);
      for (const g of geos) g.dispose();
    }
    return { group: this.root, anims: this.anims, emitters: this.emitters, height: this.height, coreTop: this.coreTop || this.height };
  }
}

/** Planar UVs from world position (dominant normal axis), for bevelled boxes. */
function worldUVs(g: THREE.BufferGeometry, s: number) {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const nor = g.attributes.normal as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (ax >= ay && ax >= az) uv.setXY(i, z * s, y * s);
    else if (ay >= az) uv.setXY(i, x * s, z * s);
    else uv.setXY(i, x * s, y * s);
  }
}

/** Box UVs in world units so textures keep a consistent scale. */
function scaleBoxUVs(g: THREE.BoxGeometry, w: number, h: number, d: number, s: number) {
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // BoxGeometry faces: +x, -x, +y, -y, +z, -z (4 verts each)
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const idx = f * 4 + i;
      uv.setXY(idx, uv.getX(idx) * dims[f][0] * s, uv.getY(idx) * dims[f][1] * s);
    }
  }
}

/** Fan rotor: hub plus blades, returned as a group centred at origin, spinning about Y. */
export function fanRotor(r: number, blades: number, mat: THREE.Material, hubMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.16, r * 0.16, 0.18, 12), hubMat);
  g.add(hub);
  const bladeGeo = new THREE.BoxGeometry(r * 0.85, 0.04, r * 0.22);
  bladeGeo.translate(r * 0.5, 0, 0);
  for (let i = 0; i < blades; i++) {
    const b = new THREE.Mesh(bladeGeo, mat);
    b.rotation.y = (i / blades) * Math.PI * 2;
    b.rotation.x = 0.25;
    g.add(b);
  }
  return g;
}
