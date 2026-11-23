import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Building, Site } from '../../game/types';
import { BUILDINGS } from '../../game/buildings/defs';
import { CELL } from '../../game/constants';
import { ModelBuilder, type Vec3 } from '../buildings/builder';
import { materials } from '../buildings/materials';
import { buildingCenter } from './sceneRegistry';
import { roadX } from './Terrain';

// Automatically routed plant infrastructure, rebuilt when the layout changes:
//  • steam lines on pipe racks from each reactor to its nearest turbine hall
//  • cooling-water lines from each turbine hall to the nearest cooling unit
//  • overhead power lines from turbine halls to substations, and from the
//    site's grid tie out along the access road on lattice pylons.

function nearest(from: Building, list: Building[], size: number): Building | null {
  const [fx, fz] = buildingCenter(from, size);
  let best: Building | null = null;
  let bd = Infinity;
  for (const b of list) {
    const [x, z] = buildingCenter(b, size);
    const d = (x - fx) ** 2 + (z - fz) ** 2;
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  return best;
}

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
}

function armPoints(x: number, z: number, h: number, rotY: number): Vec3[] {
  const c = Math.cos(rotY), s = Math.sin(rotY);
  return [
    [x - 2.3 * c, h * 0.82 - 0.4, z + 2.3 * s],
    [x + 2.3 * c, h * 0.82 - 0.4, z - 2.3 * s],
    [x, h * 0.96 - 0.3, z],
  ];
}

export function Infrastructure({ site, structure }: { site: Site; structure: number }) {
  const group = useMemo(() => {
    void structure;
    const b = new ModelBuilder();
    const m = materials();
    const size = site.size;
    const built = site.buildings.filter((x) => x.status !== 'constructing');
    const reactors = built.filter((x) => x.reactor);
    const turbines = built.filter((x) => BUILDINGS[x.type].category === 'power');
    const cooling = built.filter((x) => BUILDINGS[x.type].category === 'cooling');
    const subs = built.filter((x) => x.type === 'substation');
    for (const r of reactors) {
      const t = nearest(r, turbines, size);
      if (!t) continue;
      pipeRun(b, buildingCenter(r, size), buildingCenter(t, size), 2.6, 0.22, m.pipeWhite);
    }
    for (const t of turbines) {
      const c = nearest(t, cooling, size);
      if (!c) continue;
      const a = buildingCenter(t, size);
      const d = buildingCenter(c, size);
      pipeRun(b, [a[0] + 0.5, a[1] + 0.5], [d[0] + 0.5, d[1] + 0.5], 1.2, 0.28, m.pipeBlue);
    }
    // Grid tie at the plot edge next to the access road
    const plotHalf = (size * CELL) / 2;
    const rx = roadX(size);
    const tie: [number, number] = [rx + 4.5, plotHalf + 4];
    pylon(b, tie[0], tie[1], 9, 0);
    const tiePts = armPoints(tie[0], tie[1], 9, 0);
    const feeders = subs.length ? subs : turbines;
    const feedHeight = subs.length ? 4.7 : 5.5;
    for (const f of feeders) {
      const [x, z] = buildingCenter(f, size);
      const pts: Vec3[] = [[x - 1.6, feedHeight, z], [x + 1.6, feedHeight, z], [x, feedHeight + 0.3, z]];
      for (let k = 0; k < 3; k++) cable(b, pts[k], tiePts[k], m.rubber, 1.2);
    }
    if (subs.length) {
      for (const t of turbines) {
        const s = nearest(t, subs, size);
        if (!s) continue;
        const [x1, z1] = buildingCenter(t, size);
        const [x2, z2] = buildingCenter(s, size);
        cable(b, [x1, 5.4, z1], [x2, 4.7, z2], m.copper, 0.6);
      }
    }
    // Transmission line leaving the site
    let prev = tiePts;
    for (let i = 1; i <= 7; i++) {
      const z = plotHalf + 4 + i * 42;
      const x = rx + 9 + Math.sin(i * 0.7) * 3;
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
