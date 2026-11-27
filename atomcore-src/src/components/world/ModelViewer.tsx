import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { BuildingType } from '../../game/types';
import { BUILDINGS, footprint } from '../../game/buildings/defs';
import { CELL } from '../../game/constants';
import { instantiate } from '../buildings/registry';
import { setNightFactor } from '../buildings/materials';
import { CONCEPTS } from '../buildings/models/legendary';

// Developer model viewer: ?viewer=<building type>[&night=1][&angle=deg]
// Renders one building on a neutral pad so models can be checked one by one.

function Scene({ type, concept, night, angle }: { type: BuildingType; concept?: string; night: boolean; angle: number }) {
  const { gl, scene, camera } = useThree();
  const inst = useMemo(() => {
    if (concept) {
      const d = CONCEPTS[concept].build().build();
      return { group: d.group, dispose: (): void => undefined };
    }
    return instantiate(type);
  }, [type, concept]);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.background = new THREE.Color(night ? '#0b111b' : '#aebfcc');
    setNightFactor(night ? 1 : 0);
    const box = new THREE.Box3().setFromObject(inst.group);
    const size = box.getSize(new THREE.Vector3());
    const r = Math.max(Math.max(size.x, size.z, size.y * 1.2) * 1.15 + 4, size.y * 1.75);
    const a = (angle * Math.PI) / 180;
    camera.position.set(Math.cos(a) * r, r * 0.62, Math.sin(a) * r);
    camera.lookAt(0, size.y * (size.y > size.x * 1.5 ? 0.45 : 0.35), 0);
    return () => inst.dispose();
  }, [gl, scene, camera, inst, night, angle]);
  const [w, d] = concept ? CONCEPTS[concept].size : footprint(BUILDINGS[type], 0);
  return (
    <>
      <hemisphereLight args={['#cfe3ff', '#5a5040', night ? 0.25 : 0.8]} />
      <directionalLight position={[60, 90, 40]} intensity={night ? 0.25 : 2.6} castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w * CELL + 6, d * CELL + 6]} />
        <meshStandardMaterial color={night ? '#30343a' : '#9a9c98'} roughness={0.95} />
      </mesh>
      <primitive object={inst.group} />
    </>
  );
}

export default function ModelViewer() {
  const p = new URLSearchParams(window.location.search);
  const type = (p.get('viewer') ?? 'turbine') as BuildingType;
  const concept = p.get('concept') ?? undefined;
  if (concept && !CONCEPTS[concept]) return <div style={{ color: '#fff', padding: 20 }}>Unknown concept {concept}</div>;
  if (!concept && !BUILDINGS[type]) return <div style={{ color: '#fff', padding: 20 }}>Unknown building type {type}</div>;
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas shadows camera={{ fov: 40, near: 0.5, far: 2000 }} gl={{ antialias: true }}
        onCreated={(s) => { s.gl.toneMapping = THREE.ACESFilmicToneMapping; s.gl.outputColorSpace = THREE.SRGBColorSpace; }}>
        <Scene type={type} concept={concept} night={p.has('night')} angle={Number(p.get('angle') ?? 35)} />
      </Canvas>
      <div id="viewer-label" style={{ position: 'fixed', left: 10, top: 8, color: '#fff', font: '600 14px system-ui', textShadow: '0 1px 3px #000' }}>
        {concept ? CONCEPTS[concept].name : `${BUILDINGS[type].name} · ${type}`}
      </div>
    </div>
  );
}
