// Renders every building model on its own (day, and night with ?night) for review.
// Usage: PLAYWRIGHT_PATH=$(npm root -g)/playwright node tools/models.mjs [baseUrl] [outDir] [type,type…] [night]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = process.argv[2] || 'http://localhost:4173/';
const out = process.argv[3] || 'tests/output/models';
const only = process.argv[4] ? process.argv[4].split(',') : null;
const night = process.argv[5] === 'night';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 640, height: 460 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const types = only ?? (await (async () => {
  await page.goto(base + '?viewer=turbine');
  await page.waitForTimeout(1500);
  return [];
})());
for (const t of types) {
  await page.goto(`${base}?viewer=${t}${night ? '&night=1' : ''}`);
  await page.waitForSelector('#viewer-label', { timeout: 30000 });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/${t}${night ? '-night' : ''}.png` });
}
await browser.close();
console.log(errors.length ? 'ERRORS ' + errors.join('\n') : `rendered ${types.length}`);
