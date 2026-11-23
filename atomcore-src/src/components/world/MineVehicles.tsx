import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { Building } from '../../game/types';
import { EXCAVATORS, TRUCKS } from '../../game/supply/vehicles';
import { makeExcavator, makeTruck } from '../buildings/models/supply';
import { useGameStore } from '../../stores/gameStore';

// Animated mining fleet inside an open-pit mine. Shows the largest machines
// the player owns (up to three diggers and four trucks) at their tier's scale:
// a compact digger is tiny next to a bucket-wheel excavator.

const DIG_SPOTS: [number, number, number][] = [[-2.4, 0.3, -2.2], [1.8, 0.3, -2.6], [-2.6, 0.3, 2.0]];

export function MineVehicles({ building }: { building: Building }) {
  const v = building.vehicles!;
  const excavators = useMemo(() => {
    const list: number[] = [];
    for (let t = EXCAVATORS.length - 1; t >= 0 && list.length < 3; t--) for (let i = 0; i < (v.excavators[t] ?? 0) && list.length < 3; i++) list.push(t);
    return list.map((tier, i) => {
      const g = makeExcavator(tier);
      const sc = EXCAVATORS[tier].scale;
      g.scale.setScalar(sc);
      const [x, y, z] = DIG_SPOTS[i];
      if (tier === 4) {
        // The bucket-wheel sits in a corner with its boom reaching diagonally across the pit.
        g.position.set(-4.2, y, 4.2);
        g.rotation.y = Math.PI / 4;
      } else {
        g.position.set(x, y, z);
        g.rotation.y = i * 2.1;
      }
      return g;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.excavators.join(',')]);
  const trucks = useMemo(() => {
    const list: number[] = [];
    for (let t = TRUCKS.length - 1; t >= 0 && list.length < 4; t--) for (let i = 0; i < (v.trucks[t] ?? 0) && list.length < 4; i++) list.push(t);
    return list.map((tier) => {
      const g = makeTruck(tier);
      g.scale.setScalar(TRUCKS[tier].scale);
      return g;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.trucks.join(',')]);
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    const g = useGameStore.getState().game;
    const working = g.sites[g.activeSite].stats.oreRate > 0 && building.status === 'active';
    const t = state.clock.elapsedTime;
    excavators.forEach((ex, i) => {
      ex.traverse((o) => {
        if (!working) return;
        if (o.userData.swing) o.rotation.y = Math.sin(t * 0.7 + i) * 0.9;
        if (o.userData.dig) o.rotation.z = 0.35 + Math.sin(t * 1.4 + i) * 0.35;
        if (o.userData.spinWheel) o.rotation.z -= 0.02;
      });
    });
    // Trucks loop: pit floor → up the ramp → stockpile → back down
    trucks.forEach((tr, i) => {
      const speed = working ? 0.09 : 0;
      const p = (((t * speed + i / Math.max(1, trucks.length)) % 1) + 1) % 1;
      const path = truckPath(p);
      tr.position.set(path.x, path.y, path.z);
      tr.rotation.y = path.heading;
    });
  });

  return (
    <group ref={group}>
      {excavators.map((e, i) => <primitive key={`e${i}`} object={e} />)}
      {trucks.map((tr, i) => <primitive key={`t${i}`} object={tr} />)}
    </group>
  );
}

/** Loop around the pit floor, up the ramp on the +x side and back. */
function truckPath(p: number): { x: number; y: number; z: number; heading: number } {
  const pts: [number, number, number][] = [
    [-2.5, 0.3, 2.8], [2.2, 0.3, 2.8], [4.9, 0.4, 1.0], [5.2, 2.6, -5.4], [3.0, 2.9, -6.6], [-0.5, 0.3, -2.8], [-2.8, 0.3, -0.5],
  ];
  const n = pts.length;
  const f = p * n;
  const i = Math.floor(f) % n;
  const j = (i + 1) % n;
  const k = f - Math.floor(f);
  const a = pts[i], b = pts[j];
  const x = a[0] + (b[0] - a[0]) * k;
  const y = a[1] + (b[1] - a[1]) * k;
  const z = a[2] + (b[2] - a[2]) * k;
  return { x, y, z, heading: Math.atan2(-(b[2] - a[2]), b[0] - a[0]) };
}
