import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useUI } from '../../stores/uiStore';
import { useGameStore, getGame } from '../../stores/gameStore';
import { BUILDINGS, footprint } from '../../game/buildings/defs';
import { checkPlacement } from '../../game/buildings/grid';
import { CELL } from '../../game/constants';
import { instantiate } from '../buildings/registry';
import { placeAt } from '../../ui/actions';

// Placement mode: a translucent copy of the building follows the pointer
// (desktop) or the last tap (touch), snapping to the grid and turning red where
// it would collide. Desktop click places immediately; touch uses Confirm.

const ghostOk = new THREE.MeshStandardMaterial({ color: '#46e08a', emissive: '#1d8a4a', emissiveIntensity: 0.6, transparent: true, opacity: 0.55, depthWrite: false });
const ghostBad = new THREE.MeshStandardMaterial({ color: '#ff5a4a', emissive: '#a02018', emissiveIntensity: 0.6, transparent: true, opacity: 0.55, depthWrite: false });

let lastPointerType = 'mouse';

export function PlacementLayer({ siteSize }: { siteSize: number }) {
  const placement = useUI((s) => s.placement);
  const plot = siteSize * CELL;

  const toCell = (p: THREE.Vector3, type: keyof typeof BUILDINGS, rot: number) => {
    const [w, d] = footprint(BUILDINGS[type], rot);
    const x = Math.round(p.x / CELL + siteSize / 2 - w / 2);
    const z = Math.round(p.z / CELL + siteSize / 2 - d / 2);
    return { x, z };
  };

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const pl = useUI.getState().placement;
    if (!pl) return;
    lastPointerType = e.nativeEvent.pointerType || 'mouse';
    if (lastPointerType !== 'mouse') return;
    const { x, z } = toCell(e.point, pl.type, pl.rot);
    if (x !== pl.x || z !== pl.z) useUI.getState().updatePlacement({ x, z });
  };

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    lastPointerType = e.nativeEvent.pointerType || 'mouse';
  };

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    const pl = useUI.getState().placement;
    if (!pl || e.delta > 8) return;
    e.stopPropagation();
    const { x, z } = toCell(e.point, pl.type, pl.rot);
    if (lastPointerType === 'mouse') {
      useUI.getState().updatePlacement({ x, z });
      placeAt(x, z, e.nativeEvent.shiftKey);
    } else {
      useUI.getState().updatePlacement({ x, z });
    }
  };

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]} visible={false}
        onPointerMove={onMove} onPointerDown={onDown} onClick={onClick}>
        <planeGeometry args={[plot + 40, plot + 40]} />
        <meshBasicMaterial />
      </mesh>
      {placement && <GridOverlay siteSize={siteSize} />}
      {placement && placement.x !== null && placement.z !== null && (
        <Ghost key={placement.type} siteSize={siteSize} />
      )}
    </>
  );
}

function Ghost({ siteSize }: { siteSize: number }) {
  const placement = useUI((s) => s.placement)!;
  const structure = useGameStore((s) => s.structure);
  const inst = useMemo(() => instantiate(placement.type), [placement.type]);
  const group = useRef<THREE.Group>(null);
  const site = getGame().sites[getGame().activeSite];
  const valid = useMemo(
    () => checkPlacement(site, placement.type, placement.x!, placement.z!, placement.rot, placement.moveId) === null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placement.x, placement.z, placement.rot, placement.type, placement.moveId, structure, site],
  );
  useEffect(() => {
    inst.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.material = valid ? ghostOk : ghostBad;
        m.castShadow = false;
      }
    });
  }, [inst, valid]);
  useEffect(() => () => inst.dispose(), [inst]);
  const [w, d] = footprint(BUILDINGS[placement.type], placement.rot);
  const cx = (placement.x! + w / 2 - siteSize / 2) * CELL;
  const cz = (placement.z! + d / 2 - siteSize / 2) * CELL;
  useFrame((s) => {
    if (group.current) group.current.position.y = 0.15 + Math.sin(s.clock.elapsedTime * 4) * 0.08;
  });
  return (
    <group position={[cx, 0, cz]}>
      <group ref={group} rotation={[0, -placement.rot * (Math.PI / 2), 0]}>
        <primitive object={inst.group} />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
        <planeGeometry args={[w * CELL - 0.2, d * CELL - 0.2]} />
        <meshBasicMaterial color={valid ? '#3dff8a' : '#ff4a3a'} transparent opacity={0.28} depthWrite={false} />
      </mesh>
    </group>
  );
}

function GridOverlay({ siteSize }: { siteSize: number }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uCells: { value: siteSize }, uTime: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          varying vec2 vUv; uniform float uCells; uniform float uTime;
          void main(){
            vec2 g = fract(vUv * uCells);
            vec2 d = min(g, 1.0 - g);
            float line = 1.0 - smoothstep(0.0, 0.04, min(d.x, d.y));
            float pulse = 0.55 + 0.15 * sin(uTime * 2.0);
            gl_FragColor = vec4(0.45, 0.9, 1.0, line * pulse);
          }`,
      }),
    [siteSize],
  );
  useFrame((s) => (mat.uniforms.uTime.value = s.clock.elapsedTime));
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.16, 0]} material={mat} renderOrder={5}>
      <planeGeometry args={[siteSize * CELL, siteSize * CELL]} />
    </mesh>
  );
}
