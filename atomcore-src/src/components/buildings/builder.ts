import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ModelBuilder collects transformed primitives into one bucket per material and
// merges each bucket into a single geometry. A whole building therefore costs a
// handful of draw calls regardless of how much detail it has. Moving parts
// (fans, turbine shafts, glowing cores) are added as separate named meshes.

export type Vec3 = [number, number, number];

export interface AnimPart {
  object: THREE.Object3D;
  kind: 'spin' | 'glow' | 'pulse' | 'blink' | 'bob' | 'beacon';
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
}

export class ModelBuilder {
  private buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  readonly root = new THREE.Group();
  readonly anims: AnimPart[] = [];
  readonly emitters: SteamEmitter[] = [];
  height = 1;
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

  /** Box resting on y (pos is bottom-centre). */
  box(w: number, h: number, d: number, mat: THREE.Material, pos: Vec3 = [0, 0, 0], rotY = 0, uvScale = 0.25): this {
    const g = new THREE.BoxGeometry(w, h, d);
    scaleBoxUVs(g, w, h, d, uvScale);
    this.add(g, mat, [pos[0], pos[1] + h / 2, pos[2]], [0, rotY, 0]);
    this.height = Math.max(this.height, pos[1] + h);
    return this;
  }

  /** Cylinder resting on y. */
  cyl(rTop: number, rBot: number, h: number, mat: THREE.Material, pos: Vec3 = [0, 0, 0], seg = 24, rot: Vec3 = [0, 0, 0], open = false): this {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open);
    const uvs = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) * Math.max(1, rBot * 1.5), uvs.getY(i) * Math.max(1, h / 4));
    if (rot[0] === 0 && rot[2] === 0) {
      this.add(g, mat, [pos[0], pos[1] + h / 2, pos[2]], rot);
      this.height = Math.max(this.height, pos[1] + h);
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
    return { group: this.root, anims: this.anims, emitters: this.emitters, height: this.height };
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
