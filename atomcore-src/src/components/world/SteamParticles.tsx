import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { emitters } from './sceneRegistry';
import { worldLight } from './Lighting';

// One Points draw call for every steam plume and exhaust on the site. Each
// particle rises, drifts with the wind, grows and fades. CPU cost is a single
// loop over a fixed-size ring buffer.

const vert = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute float aShade;
  varying float vAlpha;
  varying float vShade;
  uniform float uPixel;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixel / -mv.z;
    vAlpha = aAlpha;
    vShade = aShade;
  }
`;

const frag = /* glsl */ `
  varying float vAlpha;
  varying float vShade;
  uniform vec3 uLight;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.05, d) * vAlpha;
    // fake lighting: brighter on the upper side of each puff
    float lit = 0.78 + 0.22 * (0.5 - c.y);
    vec3 col = mix(vec3(0.32, 0.31, 0.3), uLight * lit, vShade);
    gl_FragColor = vec4(col, a);
  }
`;

const WHITE = new THREE.Color('#ffffff');

export function SteamParticles({ max = 1400, wind = [0.9, 0.25] as [number, number] }) {
  const ref = useRef<THREE.Points>(null);
  const data = useMemo(() => {
    const pos = new Float32Array(max * 3);
    const vel = new Float32Array(max * 3);
    const size = new Float32Array(max);
    const alpha = new Float32Array(max);
    const shade = new Float32Array(max);
    const life = new Float32Array(max);
    const maxLife = new Float32Array(max);
    const baseSize = new Float32Array(max);
    for (let i = 0; i < max; i++) pos[i * 3 + 1] = -1000;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aShade', new THREE.BufferAttribute(shade, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      uniforms: { uPixel: { value: 300 }, uLight: { value: new THREE.Color('#f4f6f8') } },
    });
    return { geo, mat, pos, vel, size, alpha, shade, life, maxLife, baseSize, cursor: 0, acc: new Map<object, number>() };
  }, [max]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const d = data;
    d.mat.uniforms.uPixel.value = state.size.height * state.viewport.dpr * 0.9;
    d.mat.uniforms.uLight.value.copy(worldLight.color).lerp(WHITE, 0.6).multiplyScalar(1 - worldLight.night * 0.55);
    // Spawn
    for (const list of emitters.values()) {
      for (const e of list) {
        const act = e.activity();
        if (act <= 0.01) continue;
        const accKey = e as object;
        let acc = (d.acc.get(accKey) ?? 0) + e.rate * act * dt * 14;
        while (acc >= 1) {
          acc -= 1;
          const i = d.cursor;
          d.cursor = (d.cursor + 1) % max;
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * e.radius;
          d.pos[i * 3] = e.pos.x + Math.cos(a) * r;
          d.pos[i * 3 + 1] = e.pos.y;
          d.pos[i * 3 + 2] = e.pos.z + Math.sin(a) * r;
          const up = e.kind === 'steam' ? 2.2 + Math.random() * 1.4 : 1.2 + Math.random();
          d.vel[i * 3] = (Math.random() - 0.5) * 0.4;
          d.vel[i * 3 + 1] = up;
          d.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
          d.life[i] = 0;
          d.maxLife[i] = e.kind === 'steam' ? 4 + Math.random() * 3 : 2.5 + Math.random() * 1.5;
          d.baseSize[i] = e.size * (0.7 + Math.random() * 0.6);
          d.shade[i] = e.kind === 'smoke' ? 0.15 : 1;
        }
        d.acc.set(accKey, acc);
      }
    }
    // Update
    for (let i = 0; i < max; i++) {
      if (d.pos[i * 3 + 1] < -500) continue;
      d.life[i] += dt;
      const t = d.life[i] / d.maxLife[i];
      if (t >= 1) {
        d.pos[i * 3 + 1] = -1000;
        d.alpha[i] = 0;
        continue;
      }
      d.vel[i * 3 + 1] *= 1 - dt * 0.35;
      d.vel[i * 3] += wind[0] * dt * 0.6;
      d.vel[i * 3 + 2] += wind[1] * dt * 0.6;
      d.pos[i * 3] += d.vel[i * 3] * dt;
      d.pos[i * 3 + 1] += d.vel[i * 3 + 1] * dt;
      d.pos[i * 3 + 2] += d.vel[i * 3 + 2] * dt;
      d.size[i] = d.baseSize[i] * (1 + t * 2.6);
      d.alpha[i] = (t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88) * (d.shade[i] < 0.5 ? 0.35 : 0.55);
    }
    const g = d.geo;
    (g.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (g.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (g.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    (g.attributes.aShade as THREE.BufferAttribute).needsUpdate = true;
  });

  return <points ref={ref} geometry={data.geo} material={data.mat} frustumCulled={false} renderOrder={10} />;
}

