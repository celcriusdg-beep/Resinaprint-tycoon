// Browser check for emergencies: alarm card, choosing a response, the
// preparedness section (iPhone 13).
// Usage: PLAYWRIGHT_PATH=$(npm root -g)/playwright node tools/smoke7.mjs [baseUrl] [outDir]
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
const clickText = (page, text, sel = 'button') => page.evaluate(([t, s]) => {
  const el = [...document.querySelectorAll(s)].find((x) => x.textContent.trim().includes(t));
  if (!el) return false;
  el.click();
  return true;
}, [text, sel]);
const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(base + '?quality=low&debug=1', { waitUntil: 'load' });
await page.waitForSelector('.hud', { timeout: 60000 });
await page.waitForTimeout(3000);
await clickText(page, 'Start operating');
await page.waitForTimeout(800);
await page.evaluate(() => {
  const g = window.__atom();
  g.emergencies.push({ id: 99901, kind: 'loca', siteId: 'riverside', target: g.sites.riverside.buildings[0].id, started: g.gameTime, deadline: g.gameTime + 30 });
});
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/em-1-card.png` });
check('alarm card', await page.evaluate(() => !!document.querySelector('.emergency')));
check('respond', await clickText(page, 'SCRAM and start safety injection', '.em-opt'));
await page.waitForTimeout(800);
check('resolved', await page.evaluate(() => window.__atom().emergencies.length === 0 && window.__atom().incidents.length === 1));
await page.screenshot({ path: `${out}/em-2-after.png` });
await page.evaluate(() => window.__ui.getState().setPanel('regulator'));
await page.waitForTimeout(600);
await page.evaluate(() => [...document.querySelectorAll('h3')].find((h) => h.textContent.includes('Emergency'))?.scrollIntoView());
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/em-3-prep.png` });
check('preparedness', await page.evaluate(() => [...document.querySelectorAll('h3')].some((h) => h.textContent.includes('Emergency preparedness'))));
await browser.close();
console.log(results.join('\n'));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
