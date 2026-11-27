import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CELL } from '../../game/constants';
import { useGameStore } from '../../stores/gameStore';
import { ModelBuilder } from '../buildings/builder';
import { materials } from '../buildings/materials';
import { worldLight } from './Lighting';
import { roadX } from './Terrain';

// Life around the plant: floodlight masts that light the site at night (lamp
// heads glow and cast soft pools of light — no real light sources, so it is
// cheap on phones) and road traffic: fuel tankers, cask transporters and staff
// buses driving in on the access road and around the site road, with
// headlights after dark.

let lampMat: THREE.MeshStandardMaterial | null = null;
let headMat: THREE.MeshStandardMaterial | null = null;
let tailMat: THREE.MeshStandardMaterial | null = null;
function lamps() {
  lampMat ??= new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#ffe2a8', emissiveIntensity: 0.1, roughness: 0.4 });
  headMat ??= new THREE.MeshStandardMaterial({ color: '#fffbe8', emissive: '#fff1c4', emissiveIntensity: 0.2 });
  tailMat ??= new THREE.MeshStandardMaterial({ color: '#7a1010', emissive: '#ff2a1a', emissiveIntensity: 0.3 });
  return { lampMat, headMat, tailMat };
}

function poolTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,226,170,0.9)');
  grd.addColorStop(0.5, 'rgba(255,214,150,0.35)');
  grd.addColorStop(1, 'rgba(255,214,150,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function SiteLights({ siteSize }: { siteSize: number }) {
  const half = (siteSize * CELL) / 2;
  const { group, pools } = useMemo(() => {
    const b = new ModelBuilder();
    b.autoDetail = false;
    const m = materials();
    const { lampMat } = lamps();
    const spots: [number, number][] = [];
    const step = 28;
    const n = Math.max(1, Math.round((half * 2) / step));
    for (let i = 0; i <= n; i++) {
      const p = -half + (2 * half * i) / n;
      spots.push([p, -half - 2.5], [p, half + 2.5], [-half - 2.5, p], [half + 2.5, p]);
    }
    const uniq = spots.filter((s, i) => spots.findIndex((o) => Math.abs(o[0] - s[0]) < 1 && Math.abs(o[1] - s[1]) < 1) === i);
    for (const [x, z] of uniq) {
      b.cyl(0.12, 0.18, 14, m.steel, [x, 0, z], 8);
      b.box(1.6, 0.15, 0.6, m.steelDark, [x, 14, z], 0, 1);
      // Lamp heads tilted towards the plant
      const dx = -Math.sign(x) * (Math.abs(x) >= half ? 1 : 0), dz = -Math.sign(z) * (Math.abs(z) >= half ? 1 : 0);
      for (const o of [-0.5, 0.5]) b.box(0.42, 0.3, 0.42, lampMat, [x + o + dx * 0.25, 13.7, z + dz * 0.25], 0, 1);
    }
    const tex = poolTexture();
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const geo = new THREE.PlaneGeometry(26, 26);
    geo.rotateX(-Math.PI / 2);
    const pools = new THREE.InstancedMesh(geo, mat, uniq.length);
    uniq.forEach(([x, z], i) => {
      const inward = 9;
      const px = x - Math.sign(x) * (Math.abs(x) >= half ? inward : 0);
      const pz = z - Math.sign(z) * (Math.abs(z) >= half ? inward : 0);
      pools.setMatrixAt(i, new THREE.Matrix4().makeTranslation(px, 0.2, pz));
    });
    pools.renderOrder = 2;
    return { group: b.build().group, pools };
  }, [half]);

  useFrame(() => {
    const n = worldLight.night;
    const { lampMat, headMat, tailMat } = lamps();
    lampMat.emissiveIntensity = 0.1 + n * 3.2;
    headMat.emissiveIntensity = 0.2 + n * 3;
    tailMat.emissiveIntensity = 0.3 + n * 2;
    (pools.material as THREE.MeshBasicMaterial).opacity = Math.max(0, n - 0.2) * 0.55;
    pools.visible = n > 0.22;
  });

  return (
    <>
      <primitive object={group} />
      <primitive object={pools} />
    </>
  );
}

// ── Traffic ──────────────────────────────────────────────────────────────

type VehicleKind = 'tanker' | 'cask' | 'bus' | 'van';

function vehicleModel(kind: VehicleKind): THREE.Group {
  const b = new ModelBuilder();
  b.autoDetail = false;
  const m = materials();
  const { headMat, tailMat } = lamps();
  const cab = kind === 'bus' ? m.paintYellow : kind === 'van' ? m.paintWhite : m.cladBlue;
  if (kind === 'bus') {
    b.box(2.4, 2.6, 9.5, cab, [0, 0.45, 0]);
    b.box(2.42, 0.7, 8.6, m.glass, [0, 1.75, -0.2]);
  } else if (kind === 'van') {
    b.box(2.0, 2.0, 4.8, cab, [0, 0.4, 0]);
    b.box(2.02, 0.6, 1.0, m.glass, [0, 1.4, 1.9]);
  } else {
    b.box(2.4, 2.4, 2.2, cab, [0, 0.45, 3.6]);
    b.box(2.42, 0.7, 0.3, m.glass, [0, 1.8, 4.65]);
    b.box(2.0, 0.3, 7.0, m.steelDark, [0, 0.75, -1.2]);
    if (kind === 'tanker') {
      b.cyl(1.1, 1.1, 6.4, m.paintWhite, [0, 2.0, -1.2], 16, [Math.PI / 2, 0, 0]);
      b.box(2.3, 0.25, 6.4, m.hazard, [0, 0.9, -1.2], 0, 1);
    } else {
      // Spent-fuel cask on a heavy-haul trailer
      b.cyl(1.05, 1.05, 4.2, m.steel, [0, 2.1, -1.4], 20, [Math.PI / 2, 0, 0]);
      for (const z of [-3.0, 0.2]) b.cyl(1.2, 1.2, 0.35, m.steelDark, [0, 2.1, z], 20, [Math.PI / 2, 0, 0]);
      b.box(0.15, 0.6, 7.0, m.paintYellow, [1.05, 0.95, -1.2], 0, 1);
      b.box(0.15, 0.6, 7.0, m.paintYellow, [-1.05, 0.95, -1.2], 0, 1);
    }
  }
  const len = kind === 'bus' ? 4.75 : kind === 'van' ? 2.4 : 4.7;
  for (const x of [-0.8, 0.8]) {
    b.box(0.35, 0.25, 0.08, headMat, [x, 0.75, len], 0, 1);
    b.box(0.3, 0.2, 0.08, tailMat, [x, 0.75, kind === 'bus' ? -4.75 : kind === 'van' ? -2.4 : -4.7], 0, 1);
  }
  const wheels = kind === 'bus' ? [-3.2, 3.2] : kind === 'van' ? [-1.6, 1.6] : [-3.8, -2.6, 3.2];
  for (const z of wheels) for (const x of [-1.15, 1.15]) b.cyl(0.45, 0.45, 0.3, m.rubber, [x, 0.45, z], 12, [0, 0, Math.PI / 2]);
  return b.build().group;
}

interface Car {
  obj: THREE.Group;
  t: number;
  speed: number;
  lane: number;
}

export function Traffic({ siteSize, count }: { siteSize: number; count: number }) {
  const half = (siteSize * CELL) / 2;
  const rx = roadX(siteSize);
  const path = useMemo(() => {
    // In along the access road, west along the site road, back again and out.
    const zr = half - CELL / 2;
    const far = 420;
    const pts = [new THREE.Vector3(rx, 0, far), new THREE.Vector3(rx, 0, zr), new THREE.Vector3(-half + 6, 0, zr)];
    const out = [...pts, ...pts.slice(0, -1).reverse()];
    const lens = [0];
    for (let i = 1; i < out.length; i++) lens.push(lens[i - 1] + out[i].distanceTo(out[i - 1]));
    return { pts: out, lens, total: lens[lens.length - 1] };
  }, [half, rx]);
  const cars = useMemo<Car[]>(() => {
    const kinds: VehicleKind[] = ['tanker', 'bus', 'cask', 'van', 'van', 'tanker', 'bus', 'cask'];
    return Array.from({ length: count }, (_, i) => ({
      obj: vehicleModel(kinds[i % kinds.length]),
      t: (i / Math.max(1, count)) * path.total,
      speed: 9 + (i % 3) * 2,
      lane: 0,
    }));
  }, [count, path]);
  const root = useRef<THREE.Group>(null);
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), d: new THREE.Vector3() }), []);

  useFrame((_, delta) => {
    const g = useGameStore.getState().game;
    const busy = g.sites[g.activeSite]?.buildings.length ?? 0;
    const dt = Math.min(0.1, delta);
    cars.forEach((c, i) => {
      // Fewer vehicles on a small plant.
      c.obj.visible = i < Math.max(2, Math.ceil(busy / 3));
      if (!c.obj.visible) return;
      c.t = (c.t + c.speed * dt) % path.total;
      let k = 1;
      while (k < path.lens.length - 1 && path.lens[k] < c.t) k++;
      const p0 = path.pts[k - 1], p1 = path.pts[k];
      const f = (c.t - path.lens[k - 1]) / Math.max(1e-6, path.lens[k] - path.lens[k - 1]);
      tmp.d.copy(p1).sub(p0).normalize();
      tmp.a.copy(p0).lerp(p1, f);
      // Keep right: offset to the right of the direction of travel.
      tmp.a.x += -tmp.d.z * 1.6;
      tmp.a.z += tmp.d.x * 1.6;
      c.obj.position.set(tmp.a.x, 0.2, tmp.a.z);
      c.obj.rotation.y = Math.atan2(tmp.d.x, tmp.d.z);
    });
  });

  return (
    <group ref={root}>
      {cars.map((c, i) => <primitive key={i} object={c.obj} />)}
    </group>
  );
}
