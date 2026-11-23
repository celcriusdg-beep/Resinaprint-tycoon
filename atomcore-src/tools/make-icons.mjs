// Renders the app icon and iOS launch screens to PNG using Playwright's Chromium.
// Usage: node tools/make-icons.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

function iconSvg(size, { padding = 0, rounded = false } = {}) {
  const s = 512;
  const inner = s - padding * 2;
  const k = inner / s;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${s} ${s}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#17405a"/><stop offset="0.55" stop-color="#0d1c2a"/><stop offset="1" stop-color="#070b10"/>
    </radialGradient>
    <linearGradient id="tower" x1="0" x2="1">
      <stop offset="0" stop-color="#8b98a3"/><stop offset="0.45" stop-color="#e7ecef"/><stop offset="1" stop-color="#6d7882"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#bff4ff" stop-opacity="1"/><stop offset="0.4" stop-color="#4fd1ff" stop-opacity="0.55"/><stop offset="1" stop-color="#4fd1ff" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  <rect width="${s}" height="${s}" rx="${rounded ? 112 : 0}" fill="url(#bg)"/>
  <g transform="translate(${padding} ${padding}) scale(${k})">
    <!-- steam -->
    <g fill="#e9f1f6" opacity="0.55" filter="url(#blur)">
      <circle cx="250" cy="150" r="44"/><circle cx="300" cy="120" r="52"/><circle cx="355" cy="95" r="40"/>
    </g>
    <!-- cooling tower -->
    <path d="M150 440 C 175 340, 205 260, 196 182 L 316 182 C 307 260, 337 340, 362 440 Z" fill="url(#tower)"/>
    <path d="M196 182 L316 182 L312 196 L200 196 Z" fill="#59636c"/>
    <rect x="120" y="436" width="272" height="18" rx="4" fill="#3b4650"/>
    <!-- reactor core: glowing hexagonal fuel lattice -->
    <circle cx="256" cy="318" r="128" fill="url(#glow)"/>
    <polygon points="359.9,378.0 256.0,438.0 152.1,378.0 152.1,258.0 256.0,198.0 359.9,258.0" fill="#0a2536" fill-opacity="0.85" stroke="#7fe8ff" stroke-width="10" stroke-linejoin="round"/>
    <g fill="#9ff0ff"><circle cx="180.0" cy="318.0" r="12.5"/><circle cx="199.0" cy="351.0" r="12.5"/><circle cx="218.0" cy="384.0" r="12.5"/><circle cx="199.0" cy="285.0" r="12.5"/><circle cx="218.0" cy="318.0" r="12.5"/><circle cx="237.0" cy="351.0" r="12.5"/><circle cx="256.0" cy="384.0" r="12.5"/><circle cx="218.0" cy="252.0" r="12.5"/><circle cx="237.0" cy="285.0" r="12.5"/><circle cx="256.0" cy="318.0" r="12.5"/><circle cx="275.0" cy="351.0" r="12.5"/><circle cx="294.0" cy="384.0" r="12.5"/><circle cx="256.0" cy="252.0" r="12.5"/><circle cx="275.0" cy="285.0" r="12.5"/><circle cx="294.0" cy="318.0" r="12.5"/><circle cx="313.0" cy="351.0" r="12.5"/><circle cx="294.0" cy="252.0" r="12.5"/><circle cx="313.0" cy="285.0" r="12.5"/><circle cx="332.0" cy="318.0" r="12.5"/></g>
    <circle cx="256" cy="318" r="14" fill="#ffffff"/>
  </g>
</svg>`;
}

function splashSvg(w, h) {
  const icon = Math.round(Math.min(w, h) * 0.32);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><radialGradient id="g" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#13283a"/><stop offset="1" stop-color="#0b1016"/></radialGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <g transform="translate(${(w - icon) / 2} ${h * 0.36 - icon / 2})">${iconSvg(icon, { rounded: true }).replace(/^<svg[^>]*>/, `<svg width="${icon}" height="${icon}" viewBox="0 0 512 512">`)}</g>
  <text x="${w / 2}" y="${h * 0.36 + icon / 2 + w * 0.12}" fill="#e8f6ff" font-family="-apple-system, Helvetica, Arial, sans-serif" font-weight="800" font-size="${w * 0.085}" text-anchor="middle" letter-spacing="${w * 0.018}">ATOMCORE</text>
  <text x="${w / 2}" y="${h * 0.36 + icon / 2 + w * 0.18}" fill="#8ea2b3" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="${w * 0.032}" text-anchor="middle" letter-spacing="${w * 0.008}">NUCLEAR POWER TYCOON</text>
</svg>`;
}

const browser = await chromium.launch();
const page = await browser.newPage();
async function render(svg, w, h, out) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0;background:#000">${svg}</body></html>`);
  const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: w, height: h } });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buf);
  console.log('wrote', out);
}

await render(iconSvg(192), 192, 192, join(root, 'icons/icon-192.png'));
await render(iconSvg(512), 512, 512, join(root, 'icons/icon-512.png'));
await render(iconSvg(512, { padding: 64 }), 512, 512, join(root, 'icons/icon-maskable-512.png'));
await render(iconSvg(180), 180, 180, join(root, 'icons/apple-touch-icon.png'));
writeFileSync(join(root, 'favicon.svg'), iconSvg(64, { rounded: true }));
for (const [w, h] of [[1290, 2796], [1179, 2556], [1284, 2778], [1170, 2532], [1125, 2436], [828, 1792], [750, 1334]]) {
  await render(splashSvg(w, h), w, h, join(root, `splash/splash-${w}x${h}.png`));
}
await browser.close();
