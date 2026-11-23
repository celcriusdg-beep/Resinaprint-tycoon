import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import type { MapControls as MapControlsImpl } from 'three-stdlib';
import { useUI } from '../../stores/uiStore';
import { CELL } from '../../game/constants';
import { getGame } from '../../stores/gameStore';
import { buildingRect } from '../../game/buildings/grid';

// Angled isometric-style camera. Mouse: left-drag pan, right-drag rotate,
// wheel zoom. Touch: one finger pan, two fingers pinch-zoom and rotate.
// Keyboard: WASD/arrows pan, Q/E rotate, +/- zoom.

const DEFAULT_DIR = new THREE.Vector3(1, 1.05, 1).normalize();

/** Target and distance that frame the buildings of the active site. */
function framePlant(siteSize: number, aspect: number): { target: THREE.Vector3; distance: number | null } {
  const g = getGame();
  const site = g.sites[g.activeSite];
  if (!site.buildings.length) return { target: new THREE.Vector3(), distance: null };
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const b of site.buildings) {
    const r = buildingRect(b);
    minX = Math.min(minX, r.x); minZ = Math.min(minZ, r.z);
    maxX = Math.max(maxX, r.x + r.w); maxZ = Math.max(maxZ, r.z + r.d);
  }
  const cx = ((minX + maxX) / 2 - siteSize / 2) * CELL;
  const cz = ((minZ + maxZ) / 2 - siteSize / 2) * CELL;
  const extent = Math.max(maxX - minX, maxZ - minZ) * CELL;
  const distance = Math.max(38, extent * (aspect < 1 ? 3.4 : 2.3) + 18);
  return { target: new THREE.Vector3(cx, 0, cz), distance };
}

export function CameraRig({ siteSize, siteId }: { siteSize: number; siteId: string }) {
  const controls = useRef<MapControlsImpl>(null);
  const { camera } = useThree();
  const anim = useRef<{ target: THREE.Vector3; pos: THREE.Vector3; t: number } | null>(null);
  const keys = useRef(new Set<string>());
  const half = (siteSize * CELL) / 2;

  // Fit the whole plot: phones in portrait need to stand further back.
  const aspect = typeof window !== 'undefined' ? window.innerWidth / Math.max(1, window.innerHeight) : 1.5;
  const defaultDistance = Math.max(70, half * (aspect < 1 ? 4.4 : 3.1));

  // Frame the plant (its buildings, or the plot if empty) when switching sites
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const { target, distance } = framePlant(siteSize, aspect);
    c.target.copy(target);
    camera.position.copy(target).add(DEFAULT_DIR.clone().multiplyScalar(distance ?? defaultDistance));
    c.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  // Commands from the UI (inspect / rotate / zoom / reset buttons)
  const cmd = useUI((s) => s.camera);
  useEffect(() => {
    const c = controls.current;
    if (!cmd || !c) return;
    const offset = camera.position.clone().sub(c.target);
    if (cmd.kind === 'focus') {
      const target = new THREE.Vector3(cmd.x, 0, cmd.z);
      const dist = cmd.distance ?? 32;
      const dir = offset.clone().normalize();
      anim.current = { target, pos: target.clone().add(dir.multiplyScalar(dist)), t: 0 };
    } else if (cmd.kind === 'rotate') {
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), cmd.delta);
      anim.current = { target: c.target.clone(), pos: c.target.clone().add(offset), t: 0 };
    } else if (cmd.kind === 'zoom') {
      const len = THREE.MathUtils.clamp(offset.length() * cmd.factor, c.minDistance, c.maxDistance);
      anim.current = { target: c.target.clone(), pos: c.target.clone().add(offset.setLength(len)), t: 0 };
    } else if (cmd.kind === 'reset') {
      const { target, distance } = framePlant(siteSize, aspect);
      anim.current = { target, pos: target.clone().add(DEFAULT_DIR.clone().multiplyScalar(distance ?? defaultDistance)), t: 0 };
    }
  }, [cmd, camera, defaultDistance]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      keys.current.add(e.key.toLowerCase());
      const ui = useUI.getState();
      if (e.key === 'q' || e.key === 'Q') ui.cameraCmd({ kind: 'rotate', delta: Math.PI / 4 });
      if (e.key === 'e' || e.key === 'E') ui.cameraCmd({ kind: 'rotate', delta: -Math.PI / 4 });
      if (e.key === '+' || e.key === '=') ui.cameraCmd({ kind: 'zoom', factor: 0.8 });
      if (e.key === '-') ui.cameraCmd({ kind: 'zoom', factor: 1.25 });
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    // Keyboard panning relative to the view direction
    const k = keys.current;
    if (k.size) {
      const fwd = c.target.clone().sub(camera.position).setY(0).normalize();
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
      const move = new THREE.Vector3();
      if (k.has('w') || k.has('arrowup')) move.add(fwd);
      if (k.has('s') || k.has('arrowdown')) move.sub(fwd);
      if (k.has('d') || k.has('arrowright')) move.add(right);
      if (k.has('a') || k.has('arrowleft')) move.sub(right);
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(dt * 40 * (camera.position.distanceTo(c.target) / 60));
        c.target.add(move);
        camera.position.add(move);
      }
    }
    if (anim.current) {
      const a = anim.current;
      a.t = Math.min(1, a.t + dt * 2.2);
      const e = 1 - Math.pow(1 - a.t, 3);
      c.target.lerp(a.target, e);
      camera.position.lerp(a.pos, e);
      if (a.t >= 1) anim.current = null;
    }
    // Keep the focus point over the site
    const lim = half + 30;
    const clamped = c.target.clone();
    clamped.x = THREE.MathUtils.clamp(clamped.x, -lim, lim);
    clamped.z = THREE.MathUtils.clamp(clamped.z, -lim, lim);
    clamped.y = 0;
    const delta = clamped.sub(c.target);
    if (delta.lengthSq() > 0) {
      c.target.add(delta);
      camera.position.add(delta);
    }
    c.update();
  });

  return (
    <MapControls
      ref={controls as never}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      minDistance={14}
      maxDistance={Math.max(170, half * 4)}
      minPolarAngle={0.25}
      maxPolarAngle={1.28}
      screenSpacePanning={false}
      zoomSpeed={0.9}
      rotateSpeed={0.6}
      panSpeed={1.1}
    />
  );
}
