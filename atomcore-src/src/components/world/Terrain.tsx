import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../stores/gameStore';
import { DAY_LENGTH } from '../../game/constants';
import { YEAR_DAYS } from '../../game/weather/weather';
import { CELL } from '../../game/constants';
import type { LocationDef } from '../../game/progression/locations';
import { materials } from '../buildings/materials';
import { ROAD_ROWS } from '../../game/buildings/grid';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Procedural landscape around the plant: rolling hills that rise to distant
// mountains, a river / sea / fjord depending on the site, trees or rocks,
// the concrete plant pad, fence and access road.

function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function vnoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, oct = 5): number {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    v += amp * vnoise(x * f, y * f);
    f *= 2.03;
    amp *= 0.5;
  }
  return v;
}

const THEMES = {
  river: { low: '#5d7a3a', mid: '#4b6a33', high: '#7c7a6a', peak: '#9a9a92', water: '#2b5c70', mountain: 38, tree: '#2f5a2e', waterLevel: -0.5 },
  coast: { low: '#76824a', mid: '#5f7440', high: '#8a8571', peak: '#a5a093', water: '#1f5f7a', mountain: 30, tree: '#355e33', waterLevel: -0.5 },
  desert: { low: '#bf9f75', mid: '#ad8a5f', high: '#946546', peak: '#7f5238', water: '#000000', mountain: 34, tree: '#7a6a3a', waterLevel: -99 },
  arctic: { low: '#aebbc3', mid: '#9eabb4', high: '#6f7a82', peak: '#d3dde3', water: '#24485c', mountain: 60, tree: '#2c4a3a', waterLevel: -0.5 },
} as const;

export function waterDistance(theme: LocationDef['theme'], x: number, z: number, plotHalf: number): number {
  // Signed distance-like value: < 0 means inside water.
  const along = (x - z) / Math.SQRT2;
  const across = (x + z) / Math.SQRT2;
  if (theme === 'river') {
    const centre = -(plotHalf + 48) + Math.sin(along / 45) * 12;
    return Math.abs(across - centre) - 11;
  }
  if (theme === 'coast' || theme === 'arctic') {
    const shore = -(plotHalf + 40) + Math.sin(along / 60) * 14 + Math.sin(along / 23) * 4;
    return across - shore;
  }
  return 999;
}

function terrainHeight(theme: LocationDef['theme'], x: number, z: number, plotHalf: number): number {
  const t = THEMES[theme];
  const r = Math.sqrt(x * x + z * z);
  const flat = plotHalf * 1.45 + 12;
  const rise = Math.max(0, r - flat);
  const n = fbm(x / 70, z / 70);
  let h = (n - 0.45) * 6 * Math.min(1, rise / 40);
  // Mountains towards the horizon
  h += Math.pow(Math.max(0, rise - 60) / 160, 1.6) * t.mountain * (0.6 + 0.8 * fbm(x / 120 + 7, z / 120 + 3));
  if (theme === 'desert') h += Math.sin(x / 18 + fbm(x / 40, z / 40) * 4) * 1.2 * Math.min(1, rise / 30);
  const wd = waterDistance(theme, x, z, plotHalf);
  if (wd < 8) {
    const k = Math.max(0, Math.min(1, (8 - wd) / 10));
    h = h * (1 - k) - 3 * k;
  }
  return h;
}

function makeGround(theme: LocationDef['theme'], plotHalf: number) {
  const size = 900;
  const seg = 180;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const t = THEMES[theme];
  const cLow = new THREE.Color(t.low), cMid = new THREE.Color(t.mid), cHigh = new THREE.Color(t.high), cPeak = new THREE.Color(t.peak);
  const sand = new THREE.Color(theme === 'arctic' ? '#9aa2a6' : '#b6a77d');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = terrainHeight(theme, x, z, plotHalf);
    pos.setY(i, h);
    const n = fbm(x / 25, z / 25, 3);
    if (h < 0.2 && waterDistance(theme, x, z, plotHalf) < 6) c.copy(sand);
    else if (h < 4) c.copy(cLow).lerp(cMid, n);
    else if (h < 18) c.copy(cMid).lerp(cHigh, Math.min(1, (h - 4) / 14));
    else c.copy(cHigh).lerp(cPeak, Math.min(1, (h - 18) / 14));
    c.offsetHSL(0, 0, (n - 0.5) * 0.06);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function gridPadTexture(cells: number): THREE.CanvasTexture {
  const px = 32;
  const c = document.createElement('canvas');
  c.width = c.height = Math.min(2048, cells * px);
  const s = c.width / cells;
  const g = c.getContext('2d')!;
  g.fillStyle = '#8a8c8a';
  g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 4000; i++) {
    const v = 110 + Math.random() * 50;
    g.fillStyle = `rgba(${v},${v},${v},0.35)`;
    g.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 2);
  }
  g.strokeStyle = 'rgba(60,60,60,0.35)';
  g.lineWidth = 1;
  for (let i = 0; i <= cells; i++) {
    g.beginPath();
    g.moveTo(i * s + 0.5, 0);
    g.lineTo(i * s + 0.5, c.height);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i * s + 0.5);
    g.lineTo(c.width, i * s + 0.5);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function roadTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#3a3c3f';
  g.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 600; i++) {
    const v = 50 + Math.random() * 30;
    g.fillStyle = `rgba(${v},${v},${v},0.5)`;
    g.fillRect(Math.random() * 64, Math.random() * 256, 1.5, 1.5);
  }
  g.fillStyle = '#e8e2c8';
  g.fillRect(30, 0, 4, 110);
  g.fillStyle = '#d0d0d0';
  g.fillRect(3, 0, 2, 256);
  g.fillRect(59, 0, 2, 256);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

interface Props {
  loc: LocationDef;
  siteSize: number;
  trees: number;
}

export function Terrain({ loc, siteSize, trees }: Props) {
  const plotHalf = (siteSize * CELL) / 2;
  const theme = loc.theme;
  const ground = useMemo(() => makeGround(theme, plotHalf), [theme, plotHalf]);
  // Ground layers are drawn with polygon offsets so each one reliably sits on top of the one
  // below at any distance, whatever the depth-buffer precision (phones with MSAA can be low).
  const groundMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4 }), []);
  const snowMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#dfe6ea', roughness: 0.95, transparent: true, opacity: 0, depthWrite: false }), []);
  const tint = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    const g = useGameStore.getState().game;
    const w = g.sites[g.activeSite]?.weather;
    // Seasonal grass colour: fresh in spring, dry in summer, golden in autumn, grey-green in winter.
    const yp = ((g.gameTime / DAY_LENGTH / YEAR_DAYS) % 1) * 4;
    const i = Math.floor(yp) % 4;
    const f = yp - Math.floor(yp);
    const blend = f < 0.85 ? 0 : (f - 0.85) / 0.15;
    tint.set(SEASON_TINT[theme][i]).lerp(new THREE.Color(SEASON_TINT[theme][(i + 1) % 4]), blend);
    groundMat.color.copy(tint);
    snowMat.opacity = Math.min(0.8, (w?.snow ?? 0) * 0.9);
    snowMat.visible = snowMat.opacity > 0.02;
  });
  const padTex = useMemo(() => gridPadTexture(siteSize), [siteSize]);
  const roadLen = 450 - plotHalf;
  const roadTex = useMemo(() => {
    const tx = roadTexture();
    tx.repeat.set(1, (siteSize * CELL) / 12);
    return tx;
  }, [siteSize]);
  const accessTex = useMemo(() => {
    const tx = roadTexture();
    tx.repeat.set(1, roadLen / 12);
    return tx;
  }, [roadLen]);
  const t = THEMES[theme];

  const fence = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.07, 1.3, 0.07);
    const posts: THREE.Matrix4[] = [];
    const e = plotHalf + 1.2;
    const roadGap = (x: number, z: number) => z > 0 && Math.abs(x - roadX(siteSize)) < 5 && z > e - 1;
    for (let p = -e; p <= e; p += 3) {
      for (const [x, z] of [[p, -e], [p, e], [-e, p], [e, p]]) {
        if (roadGap(x, z)) continue;
        posts.push(new THREE.Matrix4().makeTranslation(x, 0.65, z));
      }
    }
    const mesh = new THREE.InstancedMesh(geo, materials().steelDark, posts.length);
    posts.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.castShadow = true;
    return mesh;
  }, [plotHalf, siteSize]);

  const forest = useMemo(() => makeForest(theme, plotHalf, trees, siteSize), [theme, plotHalf, trees, siteSize]);

  const rx = roadX(siteSize);
  return (
    <group>
      <mesh geometry={ground} material={groundMat} receiveShadow />
      <mesh geometry={ground} material={snowMat} position={[0, 0.03, 0]} />
      {t.waterLevel > -50 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, t.waterLevel, 0]} material={materials().water}>
          <planeGeometry args={[900, 900]} />
        </mesh>
      )}
      {/* Plant pad */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[siteSize * CELL + 3, 0.12, siteSize * CELL + 3]} />
        <meshStandardMaterial color="#9a9c98" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.16, 0]} receiveShadow>
        <planeGeometry args={[siteSize * CELL, siteSize * CELL]} />
        <meshStandardMaterial map={padTex} color="#c4c6c4" roughness={0.92} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-4} />
      </mesh>
      {/* Internal road along the south edge and the access road leaving the site */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.2, plotHalf - (ROAD_ROWS * CELL) / 2]} receiveShadow>
        <planeGeometry args={[ROAD_ROWS * CELL, siteSize * CELL]} />
        <meshStandardMaterial map={roadTex} roughness={0.85} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[rx, 0.19, plotHalf + roadLen / 2]} receiveShadow>
        <planeGeometry args={[CELL * 1.6, roadLen]} />
        <meshStandardMaterial map={accessTex} roughness={0.85} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-6} />
      </mesh>
      <primitive object={fence} />
      <primitive object={forest} />
    </group>
  );
}

const SEASON_TINT: Record<LocationDef['theme'], [string, string, string, string]> = {
  river: ['#ffffff', '#f1ebc4', '#e9cf9a', '#d5dad8'],
  coast: ['#ffffff', '#f3eecf', '#e6d3a5', '#d8dcdc'],
  desert: ['#ffffff', '#fff3df', '#f6eadb', '#eee8e2'],
  arctic: ['#ffffff', '#f0f4e4', '#e8dcc0', '#e6ecef'],
};

export function roadX(siteSize: number): number {
  return (siteSize * CELL) / 2 - CELL * 2;
}

/** Conifer: three stacked, slightly irregular cones merged into one geometry. */
function conifer(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const tiers = [[1.25, 2.0, 0.5], [0.95, 1.7, 1.45], [0.6, 1.4, 2.35]];
  for (const [r, h, y] of tiers) {
    const c = new THREE.ConeGeometry(r, h, 9, 2);
    const pos = c.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const k = 1 + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.12;
      pos.setX(i, pos.getX(i) * k);
      pos.setZ(i, pos.getZ(i) * k);
    }
    c.translate(0, y + h / 2, 0);
    parts.push(c.toNonIndexed());
  }
  const g = mergeGeometries(parts)!;
  g.computeVertexNormals();
  return g;
}

function makeForest(theme: LocationDef['theme'], plotHalf: number, count: number, siteSize: number): THREE.Group {
  const g = new THREE.Group();
  if (count <= 0) return g;
  const desert = theme === 'desert';
  const foliageGeo = desert ? new THREE.DodecahedronGeometry(1, 1) : conifer();
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.25, 1.4, 5);
  const t = THEMES[theme];
  const foliageMat = new THREE.MeshStandardMaterial({ color: desert ? '#8a5a3a' : t.tree, roughness: 0.85 });
  const snowMat = new THREE.MeshStandardMaterial({ color: '#dfe8ec', roughness: 0.85 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#4a3a2a', roughness: 1 });
  const foliage = new THREE.InstancedMesh(foliageGeo, theme === 'arctic' ? snowMat : foliageMat, count);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const p = new THREE.Vector3();
  const color = new THREE.Color();
  let n = 0;
  let tries = 0;
  const rx = roadX(siteSize);
  while (n < count && tries < count * 20) {
    tries++;
    // Cluster trees with noise, keep clear of plot, road and water
    const a = Math.random() * Math.PI * 2;
    const r = plotHalf + 10 + Math.pow(Math.random(), 0.8) * 200;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x - rx) < 6 && z > plotHalf) continue;
    if (fbm(x / 40, z / 40, 3) < (desert ? 0.55 : 0.45)) continue;
    if (waterDistance(theme, x, z, plotHalf) < 4) continue;
    const h = terrainHeight(theme, x, z, plotHalf);
    if (h > 22) continue;
    const s = desert ? 0.5 + Math.random() * 1.1 : 0.55 + Math.random() * 0.55;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * 6);
    sc.set(s, desert ? s * 0.7 : s * (0.9 + Math.random() * 0.4), s);
    p.set(x, h + (desert ? 0.3 * s : 0.4 * s), z);
    m.compose(p, q, sc);
    foliage.setMatrixAt(n, m);
    color.setHSL(desert ? 0.06 : 0.3 + Math.random() * 0.05, 0.3, 0.75 + Math.random() * 0.35);
    foliage.setColorAt(n, color);
    p.set(x, h + 0.4 * s, z);
    m.compose(p, q, new THREE.Vector3(s, s * 0.6, s));
    trunks.setMatrixAt(n, desert ? new THREE.Matrix4().makeScale(0, 0, 0) : m);
    n++;
  }
  foliage.count = n;
  trunks.count = n;
  foliage.castShadow = true;
  g.add(foliage, trunks);
  return g;
}
