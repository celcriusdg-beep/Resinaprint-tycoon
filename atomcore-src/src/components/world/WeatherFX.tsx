import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../../stores/gameStore';

// Falling rain (short streaks) or snow (flakes) around the point the camera
// looks at. Positions are updated on the CPU (≤ 1 500 drops). Off on low quality.

const RANGE = 70;
const HEIGHT = 50;

export function WeatherFX({ max }: { max: number }) {
  const { camera } = useThree();
  const rain = useRef<THREE.LineSegments>(null);
  const snow = useRef<THREE.Points>(null);
  const drops = useMemo(() => {
    const a = new Float32Array(max * 3);
    for (let i = 0; i < max; i++) {
      a[i * 3] = (Math.random() - 0.5) * RANGE * 2;
      a[i * 3 + 1] = Math.random() * HEIGHT;
      a[i * 3 + 2] = (Math.random() - 0.5) * RANGE * 2;
    }
    return a;
  }, [max]);
  const rainGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 6), 3));
    return g;
  }, [max]);
  const snowGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 3), 3));
    return g;
  }, [max]);
  const rainMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#c9d6e2', transparent: true, opacity: 0.5, depthWrite: false }), []);
  const snowMat = useMemo(() => new THREE.PointsMaterial({ color: '#ffffff', size: 4, sizeAttenuation: false, transparent: true, opacity: 0.95, depthWrite: false }), []);
  const center = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const r = rain.current, sn = snow.current;
    if (!r || !sn) return;
    const g = useGameStore.getState().game;
    const w = g.sites[g.activeSite]?.weather;
    const rate = w ? w.rain : 0;
    const isSnow = !!w && w.air < 0.5;
    r.visible = !!w && rate >= 0.15 && !isSnow;
    sn.visible = !!w && rate >= 0.15 && isSnow;
    if (!w || rate < 0.15) return;
    const n = Math.min(max, Math.round(max * Math.min(1, rate / (isSnow ? 3 : 8))) + 120);
    camera.getWorldDirection(center);
    const k = camera.position.y / Math.max(0.2, -center.y);
    center.multiplyScalar(k).add(camera.position);
    r.position.set(center.x, 0, center.z);
    sn.position.set(center.x, 0, center.z);
    const speed = isSnow ? 4 : 30;
    const windX = Math.min(3, w.wind / 6);
    const dt = Math.min(0.05, delta);
    const t = performance.now() / 1000;
    for (let i = 0; i < n; i++) {
      let y = drops[i * 3 + 1] - speed * dt;
      let x = drops[i * 3] + (isSnow ? Math.sin(t + i) * 1.5 + windX : windX * 4) * dt;
      if (y < 0) {
        y += HEIGHT;
        x = (Math.random() - 0.5) * RANGE * 2;
        drops[i * 3 + 2] = (Math.random() - 0.5) * RANGE * 2;
      }
      if (x > RANGE) x -= RANGE * 2;
      drops[i * 3] = x;
      drops[i * 3 + 1] = y;
    }
    if (isSnow) {
      (snowGeo.attributes.position.array as Float32Array).set(drops.subarray(0, n * 3));
      snowGeo.attributes.position.needsUpdate = true;
      snowGeo.setDrawRange(0, n);
    } else {
      const arr = rainGeo.attributes.position.array as Float32Array;
      const len = 1.6, slant = windX * 0.15;
      for (let i = 0; i < n; i++) {
        const x = drops[i * 3], y = drops[i * 3 + 1], z = drops[i * 3 + 2];
        arr[i * 6] = x; arr[i * 6 + 1] = y; arr[i * 6 + 2] = z;
        arr[i * 6 + 3] = x - slant; arr[i * 6 + 4] = y + len; arr[i * 6 + 5] = z;
      }
      rainGeo.attributes.position.needsUpdate = true;
      rainGeo.setDrawRange(0, n * 2);
    }
  });

  return (
    <>
      <lineSegments ref={rain} geometry={rainGeo} material={rainMat} frustumCulled={false} visible={false} />
      <points ref={snow} geometry={snowGeo} material={snowMat} frustumCulled={false} visible={false} />
    </>
  );
}
