import { Suspense, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor, AdaptiveDpr, Stats } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing';
import { useGameStore } from '../../stores/gameStore';
import { useSettings, resolveQuality } from '../../stores/settingsStore';
import { useUI } from '../../stores/uiStore';
import { LOCATION_BY_ID } from '../../game/progression/locations';
import { Terrain } from './Terrain';
import { Lighting } from './Lighting';
import { CameraRig } from './CameraRig';
import { BuildingObject } from './BuildingObject';
import { Infrastructure } from './Infrastructure';
import { SteamParticles } from './SteamParticles';
import { PlacementLayer } from './Placement';
import { SelectionMarker, ConnectMarkers } from './Overlays';
import { WeatherFX } from './WeatherFX';
import { SiteLights, Traffic } from './SiteLife';

const QUALITY = {
  low: { dpr: [0.75, 1] as [number, number], shadows: false, shadowSize: 1024, bloom: false, particles: 500, trees: 120, aa: false, weatherFx: 0, traffic: 3 },
  medium: { dpr: [1, 1.5] as [number, number], shadows: true, shadowSize: 1024, bloom: true, particles: 900, trees: 260, aa: false, weatherFx: 900, traffic: 6 },
  high: { dpr: [1, 2] as [number, number], shadows: true, shadowSize: 2048, bloom: true, particles: 1500, trees: 420, aa: true, weatherFx: 1500, traffic: 8 },
};

function World() {
  useGameStore((s) => s.structure);
  const g = useGameStore.getState().game;
  const site = g.sites[g.activeSite];
  const loc = LOCATION_BY_ID[site.id];
  const quality = useSettings((s) => s.quality);
  const dayNight = useSettings((s) => s.dayNight);
  const q = QUALITY[resolveQuality(quality)];
  const structure = useGameStore((s) => s.structure);
  return (
    <>
      <Lighting shadows={q.shadows} shadowSize={q.shadowSize} dayNight={dayNight} siteSize={site.size} theme={loc.theme} />
      <Terrain loc={loc} siteSize={site.size} trees={q.trees} />
      {site.buildings.map((b) => (
        <BuildingObject key={`${site.id}-${b.id}-${b.type}`} building={b} siteSize={site.size} />
      ))}
      <Infrastructure site={site} structure={structure} />
      <SiteLights siteSize={site.size} />
      {q.traffic > 0 && <Traffic key={`tr-${site.id}-${site.size}`} siteSize={site.size} count={q.traffic} />}
      <SteamParticles key={site.id} max={q.particles} />
      {q.weatherFx > 0 && <WeatherFX key={`wx-${site.id}`} max={q.weatherFx} />}
      <PlacementLayer siteSize={site.size} />
      <ConnectMarkers />
      <SelectionMarker />
      <CameraRig siteSize={site.size} siteId={site.id} />
    </>
  );
}

export default function GameCanvas() {
  const quality = useSettings((s) => s.quality);
  const showFps = useSettings((s) => s.showFps);
  const tier = resolveQuality(quality);
  const q = QUALITY[tier];
  const [dpr, setDpr] = useState(q.dpr[1]);
  const glOptions = useMemo(
    () => ({ antialias: !q.bloom, powerPreference: 'high-performance' as const, alpha: false, stencil: false }),
    [q.bloom],
  );
  return (
    <Canvas
      key={tier}
      shadows={q.shadows ? 'soft' : false}
      dpr={dpr}
      gl={glOptions}
      camera={{ fov: 40, near: 1, far: 2000, position: [60, 70, 60] }}
      onCreated={(state) => {
        state.gl.toneMapping = THREE.ACESFilmicToneMapping;
        state.gl.outputColorSpace = THREE.SRGBColorSpace;
        if (new URLSearchParams(window.location.search).has('debug')) (window as unknown as { __r3f: unknown }).__r3f = state;
      }}
      onPointerMissed={() => {
        if (!useUI.getState().placement) useUI.getState().select(null);
      }}
      style={{ touchAction: 'none' }}
    >
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(q.dpr[0], d - 0.25))}
        onIncline={() => setDpr((d) => Math.min(q.dpr[1], d + 0.25))}
      />
      <AdaptiveDpr pixelated={false} />
      <Suspense fallback={null}>
        <World />
      </Suspense>
      {q.bloom && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={0.9} luminanceThreshold={1.05} luminanceSmoothing={0.15} radius={0.65} />
          {q.aa ? <SMAA /> : <></>}
          <Vignette eskil={false} offset={0.25} darkness={0.55} />
        </EffectComposer>
      )}
      {showFps && <Stats className="fps-stats" />}
    </Canvas>
  );
}
