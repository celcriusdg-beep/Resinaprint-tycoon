// Browser check for building tags: present, names when zoomed in, icons when out, toggle (iPhone 13).
// Usage: PLAYWRIGHT_PATH=$(npm root -g)/playwright node tools/smoke9.mjs [baseUrl] [outDir]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = process.argv[2] || 'http://localhost:4173/';
const out = process.argv[3] || 'tests/output';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`);
const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(base + '?quality=low&showcase', { waitUntil: 'load' });
await page.waitForSelector('.hud', { timeout: 60000 });
await page.waitForTimeout(3000);
const count = () => page.evaluate(() => {
  const all = [...document.querySelectorAll('.btag')];
  return { tags: all.length, visible: all.filter((t) => t.style.display !== 'none').length, full: all.filter((t) => t.classList.contains('full') && t.style.display !== 'none').length };
});
const c0 = await count();
check('tags exist', c0.tags > 3 && c0.visible > 3, JSON.stringify(c0));
await page.screenshot({ path: `${out}/tags-1-default.png` });
for (let i = 0; i < 4; i++) { await page.click('[aria-label="Zoom in"]'); await page.waitForTimeout(250); }
await page.waitForTimeout(1200);
const c1 = await count();
check('names when zoomed in', c1.full > 0, JSON.stringify(c1));
await page.screenshot({ path: `${out}/tags-2-zoomed-in.png` });
for (let i = 0; i < 9; i++) { await page.click('[aria-label="Zoom out"]'); await page.waitForTimeout(250); }
await page.waitForTimeout(1200);
const c2 = await count();
check("icons when zoomed out", c2.full <= c1.full && c2.visible > 3, JSON.stringify(c2));
await page.screenshot({ path: `${out}/tags-3-zoomed-out.png` });
await page.click('[aria-label="Building labels"]');
await page.waitForTimeout(500);
check('toggle off', (await count()).tags === 0);
await page.click('[aria-label="Building labels"]');
await page.waitForTimeout(800);
check('toggle on', (await count()).tags > 0);
await browser.close();
console.log(results.join('\n'));
console.log(errors.length ? 'ERRORS\n' + errors.join('\n') : 'No console errors');
