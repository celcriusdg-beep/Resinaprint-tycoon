import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import type { Building } from '../../game/types';
import { BUILDINGS, footprint } from '../../game/buildings/defs';
import { CELL } from '../../game/constants';
import { instantiate } from '../buildings/registry';
import { materials } from '../buildings/materials';
import { useGameStore } from '../../stores/gameStore';
import { useUI } from '../../stores/uiStore';
import { activity, buildingCenter, emitters } from './sceneRegistry';
import { pickConnectTarget } from '../../ui/actions';
import { audio } from '../../systems/audio/audio';
import { MineVehicles } from './MineVehicles';

const charred = new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 1, metalness: 0 });

interface Props {
  building: Building;
  siteSize: number;
}

const tmpV = new THREE.Vector3();

export function BuildingObject({ building, siteSize }: Props) {
  const def = BUILDINGS[building.type];
  const inst = useMemo(() => instantiate(building.type), [building.type]);
  const modelRef = useRef<THREE.Group>(null);
  const scaffoldRef = useRef<THREE.Group>(null);
  const [w, d] = footprint(def, building.rot);
  const [cx, cz] = buildingCenter(building, siteSize);
  const rotY = -building.rot * (Math.PI / 2);

  useEffect(() => () => inst.dispose(), [inst]);

  // A destroyed reactor becomes a charred, partly collapsed ruin.
  const destroyed = building.status === 'destroyed';
  useEffect(() => {
    if (!destroyed) return;
    inst.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) mesh.material = charred;
    });
    inst.group.scale.set(1, 0.55, 1);
    inst.group.rotation.z = 0.04;
  }, [destroyed, inst]);

  // Register steam emitters in world space.
  useEffect(() => {
    const m = new THREE.Matrix4().makeRotationY(rotY).setPosition(cx, 0, cz);
    const ruinSmoke = building.status === 'destroyed'
      ? [{ pos: new THREE.Vector3(cx, inst.height * 0.5, cz), radius: 2, rate: 2.2, size: 4, kind: 'smoke' as const, activity: () => 1 }]
      : [];
    const list = inst.emitters.map((e) => ({
      pos: new THREE.Vector3(...e.pos).applyMatrix4(m),
      radius: e.radius,
      rate: e.rate,
      size: e.size,
      kind: e.kind,
      activity: () => {
        const g = useGameStore.getState().game;
        return activity(building, g.sites[g.activeSite]);
      },
    }));
    emitters.set(building.id, building.status === 'destroyed' ? ruinSmoke : list);
    return () => {
      emitters.delete(building.id);
    };
  }, [inst, cx, cz, rotY, building, building.status]);

  const scaffold = useMemo(() => makeScaffold(w * CELL, d * CELL, Math.max(3, inst.height * 0.9)), [w, d, inst.height]);

  useFrame((state, dt) => {
    const g = useGameStore.getState().game;
    const site = g.sites[g.activeSite];
    const act = activity(building, site);
    const t = state.clock.elapsedTime;
    const constructing = building.status === 'constructing';
    const model = modelRef.current;
    if (model) {
      const target = constructing ? 0.08 + 0.92 * building.progress : 1;
      model.scale.y += (target - model.scale.y) * Math.min(1, dt * 4);
    }
    if (scaffoldRef.current) scaffoldRef.current.visible = constructing || building.status === 'upgrading';
    for (const a of inst.anims) {
      switch (a.kind) {
        case 'spin': {
          const ax = a.axis ?? 'y';
          a.object.rotation[ax] += (a.speed ?? 1) * dt * (a.speed && a.speed < 1 ? 1 : act);
          break;
        }
        case 'glow':
          if (a.material) a.material.emissiveIntensity = 0.05 + act * 2.6 * (0.94 + 0.06 * Math.sin(t * 7 + building.id));
          break;
        case 'pulse':
          if (a.material) a.material.emissiveIntensity = act * (2.2 + 1.2 * Math.sin(t * (a.speed ?? 2)));
          a.object.scale.setScalar(0.92 + 0.08 * act + 0.02 * Math.sin(t * 3));
          break;
        case 'blink':
          if (a.material) a.material.emissiveIntensity = act > 0 ? (Math.sin(t * 3 + building.id) > -0.2 ? 2.2 : 0.4) : 0.05;
          break;
        case 'beacon':
          (a.object as THREE.Mesh).visible = Math.sin(t * 2.2 + (a.phase ?? 0)) > 0.3;
          break;
        case 'bob':
          a.object.position.x = Math.sin(t * (a.speed ?? 0.5) + building.id) * 2.5;
          break;
        case 'float': {
          // Gentle vertical drift around the part's own height.
          const y0 = (a.object.userData.y0 ??= a.object.position.y) as number;
          a.object.position.y = y0 + Math.sin(t * (a.speed ?? 0.6) + (a.phase ?? 0) + building.id) * 0.6;
          break;
        }
        case 'rock':
          a.object.rotation[a.axis ?? 'z'] = act > 0 ? Math.sin(t * (a.speed ?? 1) * 2 + (a.phase ?? 0)) * 0.35 : 0;
          break;
      }
    }
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (useUI.getState().placement) return;
    if (e.delta > 8) return; // it was a drag, not a tap
    e.stopPropagation();
    audio.sfx('click');
    if (useUI.getState().connect) {
      pickConnectTarget(building.id);
      return;
    }
    useUI.getState().select(building.id);
  };

  return (
    <group position={[cx, 0, cz]}>
      <group rotation={[0, rotY, 0]}>
        <group ref={modelRef} scale={[1, building.status === 'constructing' ? 0.08 : 1, 1]}>
          <primitive object={inst.group} onClick={onClick}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); if (!useUI.getState().placement) document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = ''; }} />
        </group>
      </group>
      <primitive object={scaffold} ref={scaffoldRef} visible={building.status === 'constructing' || building.status === 'upgrading'} />
      {building.status === 'broken' && <BrokenMarker height={inst.height} />}
      {building.status === 'refueling' && <BrokenMarker height={inst.height} color="#ffb020" />}
      {destroyed && <BrokenMarker height={inst.height * 0.6} color="#ff2a10" />}
      {building.vehicles && building.status !== 'constructing' && <MineVehicles building={building} />}
    </group>
  );
}

function BrokenMarker({ height, color = '#ff4a1a' }: { height: number; color?: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.position.y = height + 2 + Math.sin(s.clock.elapsedTime * 3) * 0.3;
    ref.current.rotation.y += 0.03;
  });
  return (
    <mesh ref={ref} position={[0, height + 2, 0]}>
      <octahedronGeometry args={[0.7, 0]} />
      <meshStandardMaterial color="#401000" emissive={color} emissiveIntensity={3} toneMapped={false} />
    </mesh>
  );
}

/** Yellow scaffold frame shown during construction or upgrades. */
function makeScaffold(w: number, d: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const m = materials().scaffold;
  const hw = w / 2 - 0.3, hd = d / 2 - 0.3;
  const post = new THREE.BoxGeometry(0.12, h, 0.12);
  const railX = new THREE.BoxGeometry(w - 0.6, 0.08, 0.08);
  const railZ = new THREE.BoxGeometry(0.08, 0.08, d - 0.6);
  const nx = Math.max(2, Math.round(w / 2.5));
  const nz = Math.max(2, Math.round(d / 2.5));
  for (let i = 0; i <= nx; i++) {
    for (const z of [-hd, hd]) {
      const p = new THREE.Mesh(post, m);
      p.position.set(-hw + (2 * hw * i) / nx, h / 2, z);
      g.add(p);
    }
  }
  for (let i = 1; i < nz; i++) {
    for (const x of [-hw, hw]) {
      const p = new THREE.Mesh(post, m);
      p.position.set(x, h / 2, -hd + (2 * hd * i) / nz);
      g.add(p);
    }
  }
  for (let y = 1.5; y < h; y += 1.8) {
    for (const z of [-hd, hd]) {
      const r = new THREE.Mesh(railX, m);
      r.position.set(0, y, z);
      g.add(r);
    }
    for (const x of [-hw, hw]) {
      const r = new THREE.Mesh(railZ, m);
      r.position.set(x, y, 0);
      g.add(r);
    }
  }
  // Small tower crane
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.35, h + 4, 0.35), m);
  mast.position.set(hw + 0.8, (h + 4) / 2, -hd);
  const jib = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.3, 0.3), m);
  jib.position.set(hw + 0.8 - w * 0.35, h + 4, -hd);
  g.add(mast, jib);
  void tmpV;
  return g;
}
