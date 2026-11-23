import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useUI } from '../../stores/uiStore';
import { useGameStore } from '../../stores/gameStore';
import { BUILDINGS, footprint } from '../../game/buildings/defs';
import { CELL } from '../../game/constants';
import { buildingCenter } from './sceneRegistry';
import { getTemplate } from '../buildings/registry';

// Selection ring under the selected building and a holographic core
// visualisation hovering over a selected reactor.

export function SelectionMarker() {
  const selectedId = useUI((s) => s.selectedId);
  useGameStore((s) => s.structure);
  const g = useGameStore.getState().game;
  const site = g.sites[g.activeSite];
  const b = site.buildings.find((x) => x.id === selectedId);
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uAspect: { value: new THREE.Vector2(1, 1) } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          varying vec2 vUv; uniform float uTime; uniform vec2 uAspect;
          void main(){
            vec2 d = min(vUv, 1.0 - vUv) * uAspect;
            float e = min(d.x, d.y);
            float border = 1.0 - smoothstep(0.08, 0.32, e);
            float dash = step(0.5, fract((vUv.x + vUv.y) * 6.0 - uTime * 0.6));
            float a = border * (0.55 + 0.45 * dash);
            gl_FragColor = vec4(0.35, 0.9, 1.0, a * 0.95);
          }`,
      }),
    [],
  );
  useFrame((s) => (mat.uniforms.uTime.value = s.clock.elapsedTime));
  if (!b) return null;
  const [w, d] = footprint(BUILDINGS[b.type], b.rot);
  const [cx, cz] = buildingCenter(b, site.size);
  mat.uniforms.uAspect.value.set(w * CELL, d * CELL);
  return (
    <group position={[cx, 0.2, cz]}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} material={mat} renderOrder={6}>
        <planeGeometry args={[w * CELL + 0.8, d * CELL + 0.8]} />
      </mesh>
      {b.reactor && <CoreHologram buildingId={b.id} height={getTemplate(b.type).coreTop} />}
    </group>
  );
}

const RODS = 37;

/** A stylised reactor core: fuel assemblies glow with power, control rods
 *  slide in and out with the setpoint, neutron sparks flicker. */
function CoreHologram({ buildingId, height }: { buildingId: number; height: number }) {
  const fuel = useRef<THREE.InstancedMesh>(null);
  const ctrl = useRef<THREE.Group>(null);
  const sparks = useRef<THREE.Points>(null);
  const group = useRef<THREE.Group>(null);
  const positions = useMemo(() => {
    const list: [number, number][] = [];
    for (let q = -3; q <= 3; q++)
      for (let r = -3; r <= 3; r++) {
        const s = -q - r;
        if (Math.abs(s) > 3) continue;
        list.push([(q + r / 2) * 0.62, r * 0.54]);
      }
    return list.slice(0, RODS);
  }, []);
  const fuelMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#46d8ff', transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), []);
  const shellMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#4fc8ff', transparent: true, opacity: 0.22, wireframe: true, depthWrite: false }), []);
  const ctrlMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#1b2330', transparent: true, opacity: 0.9 }), []);
  const sparkGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(160 * 3), 3));
    return g;
  }, []);
  const sparkMat = useMemo(() => new THREE.PointsMaterial({ color: '#c8f4ff', size: 0.12, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), []);
  const ctrlIdx = useMemo(() => positions.map((_, i) => i).filter((i) => i % 4 === 2), [positions]);

  useFrame((s, dt) => {
    const g = useGameStore.getState().game;
    const b = g.sites[g.activeSite].buildings.find((x) => x.id === buildingId);
    if (!b?.reactor) return;
    const power = b.reactor.power;
    const hot = THREE.MathUtils.clamp((b.reactor.temp - 20) / 400, 0, 1);
    fuelMat.color.setRGB(0.2 + hot * 0.5, 0.65 - hot * 0.2, 0.95 - hot * 0.45).multiplyScalar(0.18 + power * 0.62);
    if (group.current) {
      group.current.rotation.y += dt * 0.25;
      group.current.position.y = height + 1.9 + Math.sin(s.clock.elapsedTime * 1.5) * 0.15;
    }
    if (ctrl.current) {
      const insert = b.reactor.scrammed ? 1 : 1 - b.reactor.setpoint;
      ctrl.current.position.y += (0.2 + (1 - insert) * 2.6 - ctrl.current.position.y) * Math.min(1, dt * 3);
    }
    const p = sparkGeo.attributes.position as THREE.BufferAttribute;
    const n = Math.floor(160 * power);
    for (let i = 0; i < 160; i++) {
      if (i < n && Math.random() < 0.5) p.setXYZ(i, (Math.random() - 0.5) * 4.2, Math.random() * 2.4 - 1.2, (Math.random() - 0.5) * 4.2);
      else if (i >= n) p.setXYZ(i, 0, -999, 0);
    }
    p.needsUpdate = true;
  });

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const setFuel = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    (fuel as React.MutableRefObject<THREE.InstancedMesh | null>).current = mesh;
    positions.forEach(([x, z], i) => {
      dummy.position.set(x, 0, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  return (
    <group ref={group} position={[0, height + 3.2, 0]}>
      <instancedMesh ref={setFuel} args={[undefined, undefined, positions.length]} material={fuelMat}>
        <cylinderGeometry args={[0.13, 0.13, 2.4, 6]} />
      </instancedMesh>
      <mesh material={shellMat}>
        <cylinderGeometry args={[2.5, 2.5, 2.8, 18, 2, true]} />
      </mesh>
      <group ref={ctrl}>
        {ctrlIdx.map((i) => (
          <mesh key={i} position={[positions[i][0], 1.2, positions[i][1]]} material={ctrlMat}>
            <boxGeometry args={[0.16, 2.4, 0.16]} />
          </mesh>
        ))}
      </group>
      <points ref={sparks} geometry={sparkGeo} material={sparkMat} />
    </group>
  );
}
