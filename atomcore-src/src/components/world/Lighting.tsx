import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { dayPhase } from '../../game/simulation/plant';
import { useGameStore } from '../../stores/gameStore';
import { setNightFactor } from '../buildings/materials';
import { CELL } from '../../game/constants';

// Sun, sky, fog and image-based lighting. The sun follows the in-game day
// (same cycle as electricity demand), with a floor on night darkness so the
// plant stays readable. Reflections come from a generated room environment,
// so no HDR file is downloaded.

export const worldLight = { color: new THREE.Color('#ffffff'), night: 0 };

interface Props {
  shadows: boolean;
  shadowSize: number;
  dayNight: boolean;
  siteSize: number;
  theme: string;
}

const FOG: Record<string, string> = { river: '#b9c8d2', coast: '#bccbd6', desert: '#e2c9a6', arctic: '#d5dfe6' };

export function Lighting({ shadows, shadowSize, dayNight, siteSize, theme }: Props) {
  const { gl, scene } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const skyRef = useRef<THREE.Mesh>(null);
  const fogColor = useMemo(() => new THREE.Color(FOG[theme] ?? FOG.river), [theme]);
  const nightFog = useMemo(() => new THREE.Color('#141c28'), []);
  const tmp = useMemo(() => new THREE.Color(), []);
  const sunWarm = useMemo(() => new THREE.Color('#ffb070'), []);
  const sunNoon = useMemo(() => new THREE.Color('#fff4e2'), []);
  const moon = useMemo(() => new THREE.Color('#8fa8d8'), []);
  const sunPos = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.fog = new THREE.Fog(fogColor, 160, 520);
    return () => {
      env.dispose();
      pmrem.dispose();
      scene.environment = null;
      scene.fog = null;
    };
  }, [gl, scene, fogColor]);

  useEffect(() => {
    const l = sun.current;
    if (!l) return;
    const half = (siteSize * CELL) / 2 + 20;
    const cam = l.shadow.camera as THREE.OrthographicCamera;
    cam.left = -half;
    cam.right = half;
    cam.top = half;
    cam.bottom = -half;
    cam.near = 1;
    cam.far = 400;
    cam.updateProjectionMatrix();
    l.shadow.mapSize.set(shadowSize, shadowSize);
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.04;
    l.shadow.map?.dispose();
    (l.shadow as unknown as { map: null }).map = null;
  }, [siteSize, shadowSize]);

  useFrame(() => {
    const g = useGameStore.getState().game;
    // Phase 0.25 = sunrise, 0.5 = noon, 0.75 = sunset (offset so the evening demand peak is at dusk)
    const p = dayNight ? (dayPhase(g.gameTime) + 0.0) % 1 : 0.42;
    const ang = (p - 0.25) * Math.PI * 2;
    const elev = Math.sin(ang);
    const day = THREE.MathUtils.smoothstep(elev, -0.12, 0.25);
    const night = 1 - day;
    sunPos.set(Math.cos(ang) * 120, Math.max(8, elev * 160), -60 + Math.sin(p * Math.PI * 2) * 40);
    if (sun.current) {
      sun.current.position.copy(sunPos);
      const low = 1 - THREE.MathUtils.smoothstep(elev, 0.05, 0.5);
      tmp.copy(sunNoon).lerp(sunWarm, low * day).lerp(moon, night);
      sun.current.color.copy(tmp);
      sun.current.intensity = 0.35 + day * 2.6;
      worldLight.color.copy(tmp).lerp(new THREE.Color('#ffffff'), 0.5 * day);
    }
    if (hemi.current) hemi.current.intensity = 0.35 + day * 0.55;
    scene.environmentIntensity = 0.25 + day * 0.7;
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(fogColor).lerp(nightFog, night * 0.85);
    gl.toneMappingExposure = 0.85 + day * 0.25;
    worldLight.night = night;
    setNightFactor(night);
    if (skyRef.current) {
      const mat = skyRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.sunPosition.value.set(Math.cos(ang) * 120, elev * 160, sunPos.z);
      mat.uniforms.rayleigh.value = 1.2 + night * 2;
      mat.uniforms.turbidity.value = theme === 'desert' ? 9 : 6;
    }
    scene.background = null;
  });

  return (
    <>
      <Sky ref={skyRef as never} distance={4000} sunPosition={[100, 60, -50]} mieCoefficient={0.004} mieDirectionalG={0.85} />
      <hemisphereLight ref={hemi} args={['#cfe3ff', '#5a5040', 0.8]} />
      <directionalLight ref={sun} castShadow={shadows} position={[80, 120, -40]} intensity={2.6} />
    </>
  );
}
