// Browser check for weather & seasons: HUD weather pill, Weather panel with
// forecast, rain and snow effects (iPhone 13).
// Usage: PLAYWRIGHT_PATH=$(npm root -g)/playwright node tools/smoke4.mjs [baseUrl] [outDir]
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
await page.goto(base + '?quality=medium&debug=1', { waitUntil: 'load' });
await page.waitForSelector('.hud', { timeout: 60000 });
await page.waitForTimeout(3000);
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Start operating'))?.click());
await page.waitForTimeout(1500);
check('weather pill', await page.evaluate(() => !!document.querySelector('[aria-label^="Weather"]')));
await page.click('[aria-label^="Weather"]');
await page.waitForTimeout(1000);
await page.screenshot({ path: `${out}/wx-1-panel.png` });
check('weather panel', await page.evaluate(() => document.querySelectorAll('.wx-day').length === 3));
await page.evaluate(() => document.querySelector('.wx-days')?.scrollIntoView());
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/wx-2-forecast.png` });
await page.evaluate(() => window.__ui.getState().setPanel(null));
// Rain storm now
await page.evaluate(() => {
  const g = window.__atom();
  const w = g.sites.riverside.weather;
  w.fronts.push({ kind: 'storm', start: g.gameTime - 60, end: g.gameTime + 600, strength: 1 });
  w.fronts.sort((a, b) => a.start - b.start);
});
await page.waitForTimeout(3000);
await page.screenshot({ path: `${out}/wx-3-storm.png` });
// Winter with snow
await page.evaluate(() => {
  const g = window.__atom();
  const w = g.sites.riverside.weather;
  g.gameTime = 240 * 23.4;
  w.fronts = [{ kind: 'coldsnap', start: g.gameTime - 300, end: g.gameTime + 900, strength: 1 }, { kind: 'rain', start: g.gameTime - 100, end: g.gameTime + 400, strength: 1 }];
  w.planned = g.gameTime + 240 * 5;
  w.snow = 0.8;
});
await page.waitForTimeout(3500);
await page.screenshot({ path: `${out}/wx-4-snow.png` });
check('snow', await page.evaluate(() => window.__atom().sites.riverside.weather.air < 0.5));
await browser.close();
console.log(results.join('\n'));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
