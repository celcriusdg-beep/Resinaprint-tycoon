import * as THREE from 'three';

// Shared materials with procedurally generated textures (no image downloads).
// Materials are created once and shared by every building, so the GPU only
// sees a small, fixed set of shader programs and textures.

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

function tex(c: HTMLCanvasElement, repeat = 1, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Concrete: mottled grey with fine speckles and faint formwork seams. */
function concreteTexture(base: number, seed: number): THREE.CanvasTexture {
  const [c, g] = canvas(256, 256);
  const r = seeded(seed);
  g.fillStyle = `rgb(${base},${base},${base - 4})`;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const v = base + (r() - 0.5) * 40;
    g.fillStyle = `rgba(${v},${v},${v - 3},${0.15 + r() * 0.25})`;
    const s = 1 + r() * 3;
    g.fillRect(r() * 256, r() * 256, s, s);
  }
  for (let i = 0; i < 30; i++) {
    g.fillStyle = `rgba(0,0,0,${0.02 + r() * 0.04})`;
    g.beginPath();
    g.ellipse(r() * 256, r() * 256, 10 + r() * 40, 6 + r() * 25, r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = 'rgba(0,0,0,0.12)';
  g.lineWidth = 1;
  for (let y = 0; y <= 256; y += 64) {
    g.beginPath();
    g.moveTo(0, y + 0.5);
    g.lineTo(256, y + 0.5);
    g.stroke();
  }
  return tex(c, 1);
}

/** Corrugated cladding: vertical ribs with light/shadow. */
function corrugatedTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128);
  for (let x = 0; x < 128; x++) {
    const v = 200 + Math.sin((x / 128) * Math.PI * 16) * 40;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(x, 0, 1, 128);
  }
  g.fillStyle = 'rgba(0,0,0,0.15)';
  g.fillRect(0, 126, 128, 2);
  return tex(c, 1);
}

/** Office facade: window grid with an emissive map of randomly lit windows. */
function facadeTextures(): { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture } {
  const [c, g] = canvas(256, 256);
  const [e, ge] = canvas(256, 256);
  const r = seeded(7);
  g.fillStyle = '#3a4652';
  g.fillRect(0, 0, 256, 256);
  ge.fillStyle = '#000';
  ge.fillRect(0, 0, 256, 256);
  const cols = 8, rows = 8;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = x * 32 + 3, py = y * 32 + 4;
      const grd = g.createLinearGradient(px, py, px + 26, py + 24);
      grd.addColorStop(0, '#7fa6c4');
      grd.addColorStop(1, '#2b3f52');
      g.fillStyle = grd;
      g.fillRect(px, py, 26, 22);
      if (r() < 0.45) {
        const warm = r() < 0.75;
        ge.fillStyle = warm ? `rgba(255,${200 + r() * 40},${130 + r() * 50},1)` : 'rgba(190,225,255,1)';
        ge.fillRect(px, py, 26, 22);
      }
    }
  }
  g.fillStyle = '#c9d0d6';
  for (let y = 0; y < rows; y++) g.fillRect(0, y * 32 + 28, 256, 4);
  return { map: tex(c, 1), emissive: tex(e, 1) };
}

/** Striped hazard pattern for doors and barriers. */
function hazardTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(64, 64);
  g.fillStyle = '#1c1c1c';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#e8b52c';
  for (let i = -64; i < 128; i += 22) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 11, 0);
    g.lineTo(i + 11 - 64, 64);
    g.lineTo(i - 64, 64);
    g.fill();
  }
  return tex(c, 1);
}

/** Roll-up door / louvres: horizontal slats. */
function slatTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(64, 64);
  for (let y = 0; y < 64; y++) {
    const v = 150 + Math.sin((y / 64) * Math.PI * 10) * 35;
    g.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
    g.fillRect(0, y, 64, 1);
  }
  return tex(c, 1);
}

/** Brand sign texture. */
function signTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(512, 128);
  g.fillStyle = '#000';
  g.fillRect(0, 0, 512, 128);
  g.font = 'bold 84px system-ui, -apple-system, Segoe UI, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#7fe8ff';
  g.fillText('ATOMCORE', 256, 68);
  const t = tex(c, 1);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export interface MaterialSet {
  concrete: THREE.MeshStandardMaterial;
  concreteDark: THREE.MeshStandardMaterial;
  concreteWarm: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  steelDark: THREE.MeshStandardMaterial;
  pipeWhite: THREE.MeshStandardMaterial;
  pipeBlue: THREE.MeshStandardMaterial;
  cladBlue: THREE.MeshStandardMaterial;
  cladGrey: THREE.MeshStandardMaterial;
  cladWhite: THREE.MeshStandardMaterial;
  paintYellow: THREE.MeshStandardMaterial;
  paintRed: THREE.MeshStandardMaterial;
  paintWhite: THREE.MeshStandardMaterial;
  paintGreen: THREE.MeshStandardMaterial;
  copper: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  facade: THREE.MeshStandardMaterial;
  hazard: THREE.MeshStandardMaterial;
  slats: THREE.MeshStandardMaterial;
  insulator: THREE.MeshStandardMaterial;
  gravel: THREE.MeshStandardMaterial;
  windowGlow: THREE.MeshStandardMaterial;
  ledGreen: THREE.MeshStandardMaterial;
  ledRed: THREE.MeshStandardMaterial;
  beacon: THREE.MeshStandardMaterial;
  sign: THREE.MeshStandardMaterial;
  glowCyan: THREE.MeshStandardMaterial; // Cherenkov blue (per-reactor clones animate intensity)
  glowOrange: THREE.MeshStandardMaterial;
  glowPlasma: THREE.MeshStandardMaterial;
  scaffold: THREE.MeshStandardMaterial;
  water: THREE.MeshStandardMaterial;
}

let set: MaterialSet | null = null;

const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);

export function materials(): MaterialSet {
  if (set) return set;
  const concreteMap = concreteTexture(186, 1);
  const concreteDarkMap = concreteTexture(130, 2);
  const corr = corrugatedTexture();
  const facade = facadeTextures();
  const slats = slatTexture();
  set = {
    concrete: std({ map: concreteMap, color: '#e3e1dc', roughness: 0.92, metalness: 0 }),
    concreteDark: std({ map: concreteDarkMap, color: '#b9bab8', roughness: 0.95 }),
    concreteWarm: std({ map: concreteMap, color: '#e9dccb', roughness: 0.9 }),
    steel: std({ color: '#a9b0b6', roughness: 0.38, metalness: 0.85 }),
    steelDark: std({ color: '#4d555c', roughness: 0.5, metalness: 0.8 }),
    pipeWhite: std({ color: '#e7e9ea', roughness: 0.45, metalness: 0.25 }),
    pipeBlue: std({ color: '#3d79b8', roughness: 0.4, metalness: 0.35 }),
    cladBlue: std({ map: corr, color: '#3f6e9c', roughness: 0.55, metalness: 0.45 }),
    cladGrey: std({ map: corr, color: '#9aa3ab', roughness: 0.55, metalness: 0.45 }),
    cladWhite: std({ map: corr, color: '#e6eaee', roughness: 0.5, metalness: 0.3 }),
    paintYellow: std({ color: '#e6ad25', roughness: 0.5, metalness: 0.3 }),
    paintRed: std({ color: '#c0392b', roughness: 0.5, metalness: 0.2 }),
    paintWhite: std({ color: '#f1f2f2', roughness: 0.55, metalness: 0.1 }),
    paintGreen: std({ color: '#4f7a54', roughness: 0.6, metalness: 0.2 }),
    copper: std({ color: '#b87333', roughness: 0.35, metalness: 0.9 }),
    rubber: std({ color: '#1d1f21', roughness: 0.9 }),
    glass: std({ color: '#2d4a63', roughness: 0.08, metalness: 0.9, envMapIntensity: 1.4 }),
    facade: std({ map: facade.map, emissiveMap: facade.emissive, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.25, metalness: 0.6 }),
    hazard: std({ map: hazardTexture(), roughness: 0.6 }),
    slats: std({ map: slats, color: '#c8ced4', roughness: 0.5, metalness: 0.5 }),
    insulator: std({ color: '#7c4a32', roughness: 0.3, metalness: 0.1 }),
    gravel: std({ map: concreteTexture(120, 9), color: '#a6a39a', roughness: 1 }),
    windowGlow: std({ color: '#2b3946', emissive: new THREE.Color('#ffd9a0'), emissiveIntensity: 0.15, roughness: 0.2, metalness: 0.5 }),
    ledGreen: std({ color: '#103010', emissive: new THREE.Color('#38ff6a'), emissiveIntensity: 2.2 }),
    ledRed: std({ color: '#301010', emissive: new THREE.Color('#ff3a2a'), emissiveIntensity: 2.4 }),
    beacon: std({ color: '#401010', emissive: new THREE.Color('#ff2a1a'), emissiveIntensity: 3 }),
    sign: std({ map: signTexture(), emissiveMap: signTexture(), emissive: new THREE.Color('#ffffff'), emissiveIntensity: 1.2, roughness: 0.4 }),
    glowCyan: std({ color: '#0a3a55', emissive: new THREE.Color('#3fd4ff'), emissiveIntensity: 2.5, roughness: 0.2, toneMapped: false }),
    glowOrange: std({ color: '#3a1a05', emissive: new THREE.Color('#ff8a2a'), emissiveIntensity: 2.5, roughness: 0.3, toneMapped: false }),
    glowPlasma: std({ color: '#2a0530', emissive: new THREE.Color('#ff5cf0'), emissiveIntensity: 3, roughness: 0.2, toneMapped: false }),
    scaffold: std({ color: '#f0b429', roughness: 0.6, metalness: 0.4 }),
    water: std({ color: '#2a5d73', roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.88, envMapIntensity: 1.5 }),
  };
  return set;
}

/** Night-time lighting: windows and signs glow brighter after dusk. */
export function setNightFactor(night: number): void {
  const m = materials();
  m.facade.emissiveIntensity = 0.05 + night * 1.6;
  m.windowGlow.emissiveIntensity = 0.1 + night * 1.8;
  m.sign.emissiveIntensity = 0.6 + night * 1.6;
}
