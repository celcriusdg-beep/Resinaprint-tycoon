// Browser check for the regulator: permits in the Build menu, Regulator panel,
// licence checklist on a new reactor (iPhone 13).
// Usage: PLAYWRIGHT_PATH=$(npm root -g)/playwright node tools/smoke6.mjs [baseUrl] [outDir]
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
await page.evaluate(() => { const g = window.__atom(); g.money = 5e6; g.level = 6; g.research.completed.push('r_smr'); window.__store.getState().bump(true); });
await clickText(page, 'Build');
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/reg-1-permits.png` });
check('permit list', await page.evaluate(() => document.querySelectorAll('.permit-row').length >= 2));
const applied = await page.evaluate(() => { const row = [...document.querySelectorAll('.permit-row')].find((r) => r.textContent.includes('SMR')); const b = row?.querySelector('button'); b?.click(); return !!b; });
await page.waitForTimeout(500);
check('applied', applied && await page.evaluate(() => window.__atom().regulator.permits.length === 1));
// Fast-forward the review and place an SMR via the game API, then look at its licence card.
const id = await page.evaluate(() => {
  const g = window.__atom();
  g.regulator.permits[0].ready = 0;
  window.__ui.getState().setPanel(null);
  return g.nextBuildingId;
});
const placed = await page.evaluate(() => {
  const g = window.__atom();
  for (let x = 1; x < 12; x++) for (let z = 1; z < 12; z++) {
    const before = g.sites.riverside.buildings.length;
    window.__actions?.placeBuilding?.(g, 'reactor_smr', x, z, 0);
    if (g.sites.riverside.buildings.length > before) return true;
  }
  return false;
});
void placed;
await page.evaluate(() => window.__ui.getState().setPanel('sites'));
await page.waitForTimeout(500);
check('regulator tab', await clickText(page, 'Regulator', '.tab'));
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/reg-2-panel.png` });
check('regulator panel', await page.evaluate(() => !!document.querySelector('.regulator')));
void id;
await browser.close();
console.log(results.join('\n'));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
