import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Link, Site } from '../../game/types';
import { ModelBuilder, type Vec3 } from '../buildings/builder';
import { materials } from '../buildings/materials';
import { LINK_CLASSES, endpointWorld, tieWorld } from '../../game/network/network';

// The plant's pipes and cables, exactly as the player built them, rebuilt when
// the layout changes:
//  • steam lines (white) on pipe racks, sized by pipe class, one run per circuit
//  • circulating-water pipes (blue), lower down
//  • power cables on poles (MV/HV) or lattice pylons (EHV and above), spaced by
//    the line's maximum span, with sagging conductors; superconducting links
//    are buried in a trench. Tripped cables glow red.
//  • the grid connection pylon at the plot edge and the line leaving the site.

function pipeRun(b: ModelBuilder, a: [number, number], c: [number, number], y: number, r: number, mat: THREE.Material, twin = true) {
  const m = materials();
  const corner: [number, number] = [c[0], a[1]];
  const segs: [[number, number], [number, number]][] = [[a, corner], [corner, c]];
  const offs = twin ? [-r * 1.6, r * 1.6] : [0];
  for (const [p, q] of segs) {
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (len < 0.1) continue;
    const dx = (q[0] - p[0]) / len, dz = (q[1] - p[1]) / len;
    for (const o of offs) {
      const nx = -dz * o, nz = dx * o;
      b.pipe([p[0] + nx, y, p[1] + nz], [q[0] + nx, y, q[1] + nz], r, mat, 8);
    }
    // Rack supports every ~4 m
    const n = Math.max(1, Math.floor(len / 4));
    for (let i = 0; i <= n; i++) {
      const x = p[0] + dx * (len * i) / n, z = p[1] + dz * (len * i) / n;
      b.box(0.14, y - r - 0.05, 0.14, m.steelDark, [x, 0, z], 0, 1);
      b.box(Math.abs(dz) > 0.5 ? r * 5 : 0.14, 0.1, Math.abs(dx) > 0.5 ? r * 5 : 0.14, m.steelDark, [x, y - r - 0.12, z], 0, 1);
    }
  }
  // Elbow
  b.add(new THREE.SphereGeometry(r * 1.15, 8, 6), mat, [corner[0], y, corner[1]]);
}

function cable(b: ModelBuilder, p: Vec3, q: Vec3, mat: THREE.Material, sag = 0.8) {
  const mid = new THREE.Vector3((p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - sag, (p[2] + q[2]) / 2);
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(...p), mid, new THREE.Vector3(...q));
  b.add(new THREE.TubeGeometry(curve, 10, 0.035, 3, false), mat);
}

function pylon(b: ModelBuilder, x: number, z: number, h: number, rotY: number) {
  const m = materials();
  const w = 1.4;
  // Tapered four-leg lattice made of boxes
  const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const [sx, sz] of legs) {
    b.add(new THREE.BoxGeometry(0.12, h, 0.12), m.steel, [x + sx * w * 0.32, h / 2, z + sz * w * 0.32], [sz * 0.06, rotY, -sx * 0.06]);
  }
  for (let i = 1; i < 6; i++) {
    const y = (h * i) / 6;
    const k = w * (0.5 - (i / 6) * 0.3);
    b.box(k * 2, 0.06, 0.06, m.steel, [x, y, z], rotY, 1);
    b.box(0.06, 0.06, k * 2, m.steel, [x, y, z], rotY, 1);
  }
  // Cross arms
  b.box(5, 0.16, 0.16, m.steel, [x, h * 0.82, z], rotY, 1);
  b.box(3.6, 0.16, 0.16, m.steel, [x, h * 0.96, z], rotY, 1);
  // Insulator strings hanging from the arms
  for (const p of armPoints(x, z, h, rotY)) b.cyl(0.09, 0.09, 0.45, m.insulator, [p[0], p[1] - 0.05, p[2]], 8);
}

function armPoints(x: number, z: number, h: number, rotY: number): Vec3[] {
  const c = Math.cos(rotY), s = Math.sin(rotY);
  return [
    [x - 2.3 * c, h * 0.82 - 0.4, z + 2.3 * s],
    [x + 2.3 * c, h * 0.82 - 0.4, z - 2.3 * s],
    [x, h * 0.96 - 0.3, z],
  ];
}

let trippedMat: THREE.MeshStandardMaterial | null = null;
function tripped() {
  return (trippedMat ??= new THREE.MeshStandardMaterial({ color: '#ff4a3a', emissive: '#a01810', emissiveIntensity: 0.8, roughness: 0.6 }));
}

function woodPole(b: ModelBuilder, x: number, z: number, h: number, along: number) {
  const m = materials();
  b.box(0.22, h, 0.22, m.steelDark, [x, 0, z], 0, 1);
  b.box(along > 0.5 ? 0.12 : 2.4, 0.12, along > 0.5 ? 2.4 : 0.12, m.steelDark, [x, h - 0.3, z], 0, 1);
  for (const o of [-1, 1]) b.cyl(0.06, 0.06, 0.3, m.insulator, [x + (along > 0.5 ? 0 : o), h - 0.18, z + (along > 0.5 ? o : 0)], 6);
  b.cyl(0.06, 0.06, 0.3, m.insulator, [x, h, z], 6);
}

/** Points every `span` metres along an L-shaped route a → corner → c. */
function routePoints(a: [number, number], c: [number, number], span: number): [number, number][] {
  const corner: [number, number] = [c[0], a[1]];
  const pts: [number, number][] = [a];
  for (const [p, q] of [[a, corner], [corner, c]] as const) {
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (len < 0.1) continue;
    const n = Math.max(1, Math.ceil(len / span));
    for (let i = 1; i <= n; i++) pts.push([p[0] + ((q[0] - p[0]) * i) / n, p[1] + ((q[1] - p[1]) * i) / n]);
  }
  return pts;
}

function linkGeometry(b: ModelBuilder, site: Site, l: Link) {
  const m = materials();
  const p = endpointWorld(site, l.a);
  const q = endpointWorld(site, l.b);
  if (!p || !q) return;
  const c = LINK_CLASSES[l.kind][l.cls];
  // Spread parallel corridors a little so links between the same rows don't merge.
  const lane = ((l.id % 5) - 2) * 0.45;
  const a: [number, number] = [p[0] + lane, p[1] + lane];
  const d: [number, number] = [q[0] + lane, q[1] + lane];
  if (l.kind === 'steam' || l.kind === 'cooling') {
    const y = l.kind === 'steam' ? 2.6 + l.cls * 0.25 : 1.0 + l.cls * 0.2;
    const mat = l.kind === 'steam' ? m.pipeWhite : m.pipeBlue;
    const runs = Math.min(l.circuits, 4);
    for (let i = 0; i < runs; i++) {
      const o = (i - (runs - 1) / 2) * c.size * 2.6;
      pipeRun(b, [a[0] + o, a[1] + o], [d[0] + o, d[1] + o], y, c.size, mat, false);
    }
    return;
  }
  const mat = l.trip > 0 || l.broken ? tripped() : l.cls === 0 ? m.rubber : m.copper;
  if (c.size === 0) {
    // Superconducting cable: buried, shown as a covered trench with marker posts.
    for (const [x, z] of routePoints(a, d, 12)) b.box(0.25, 0.9, 0.25, m.steel, [x, 0, z], 0, 1);
    pipeRun(b, a, d, 0.12, 0.3, m.concreteDark, false);
    return;
  }
  const span = [30, 50, 70, 90, 100][l.cls] ?? 60;
  const h = c.size;
  const pts = routePoints(a, d, span);
  const sets = Math.min(l.circuits, 2);
  let prev: Vec3[] | null = null;
  for (let i = 0; i < pts.length; i++) {
    const [x, z] = pts[i];
    const nx = pts[Math.min(i + 1, pts.length - 1)];
    const px = pts[Math.max(i - 1, 0)];
    const alongX = Math.abs(nx[0] - px[0]) > Math.abs(nx[1] - px[1]) ? 1 : 0;
    const rotY = alongX ? Math.PI / 2 : 0;
    const end = i === 0 || i === pts.length - 1;
    if (!end) {
      if (l.cls <= 1) woodPole(b, x, z, h, alongX);
      else pylon(b, x, z, h * 1.15, rotY);
    }
    const arms: Vec3[] = [];
    for (let k = 0; k < sets; k++) {
      const off = (k - (sets - 1) / 2) * 1.2;
      for (const side of [-1, 0, 1]) {
        const w = side * (l.cls <= 1 ? 1.0 : 2.2);
        const ax = alongX ? 0 : w, az = alongX ? w : 0;
        arms.push([x + ax + (alongX ? 0 : 0), h - (side === 0 ? -0.25 : 0.35) + off, z + az]);
      }
    }
    if (prev) for (let k = 0; k < arms.length; k++) cable(b, prev[k], arms[k], mat, Math.min(2.4, 0.4 + span * 0.02));
    prev = arms;
  }
}

export function Infrastructure({ site, structure }: { site: Site; structure: number }) {
  const group = useMemo(() => {
    void structure;
    const b = new ModelBuilder();
    for (const l of site.links) linkGeometry(b, site, l);
    // Grid connection at the plot edge next to the access road, and the
    // transmission line leaving the site.
    const [tx, tz] = tieWorld(site.size);
    pylon(b, tx, tz, 9, 0);
    let prev = armPoints(tx, tz, 9, 0);
    const m = materials();
    for (let i = 1; i <= 7; i++) {
      const z = tz + i * 42;
      const x = tx + 4.5 + Math.sin(i * 0.7) * 3;
      pylon(b, x, z, 16, 0);
      const pts = armPoints(x, z, 16, 0);
      for (let k = 0; k < 3; k++) cable(b, prev[k], pts[k], m.rubber, 2.4);
      prev = pts;
    }
    return b.build().group;
  }, [site, structure]);

  useEffect(() => () => {
    group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
  }, [group]);

  return <primitive object={group} />;
}
