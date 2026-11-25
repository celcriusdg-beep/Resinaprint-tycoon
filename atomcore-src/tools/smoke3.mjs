// Browser check for pipes & cables: building panel Connections card, connect
// mode, size picker and building a link through the real UI (iPhone 13).
// Usage: PLAYWRIGHT_PATH=$(npm root -g)/playwright node tools/smoke3.mjs [baseUrl] [outDir]
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
await page.waitForTimeout(4000);
await clickText(page, 'Start operating');
await page.waitForTimeout(1500);
const links0 = await page.evaluate(() => window.__atom().sites.riverside.links.length);
check('starter plant is wired', links0 === 3, `links=${links0}`);
// A second turbine hall, built instantly for the test
const tid = await page.evaluate(() => {
  const g = window.__atom();
  const site = g.sites.riverside;
  const b = { ...site.buildings[1], id: g.nextBuildingId++, x: 11, z: 5 };
  site.buildings.push(b);
  window.__store.getState().bump(true);
  return b.id;
});
await page.evaluate((id) => window.__ui.getState().select(id), tid);
await page.waitForTimeout(1200);
await page.evaluate(() => document.querySelector('.connections')?.scrollIntoView());
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/net-1-panel.png` });
check('connections card shown', await page.evaluate(() => !!document.querySelector('.connections')));
check('missing hint shown', await page.evaluate(() => document.querySelector('.connections')?.textContent.includes('Needs')));
check('start steam connect', await clickText(page, '+ Steam line'));
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/net-2-pick.png` });
check('connect bar shown', await page.evaluate(() => !!document.querySelector('.connect-bar')));
check('nearest', await clickText(page, 'Nearest'));
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/net-3-size.png` });
check('size chips', await page.evaluate(() => document.querySelectorAll('.size-chip').length === 5));
check('build link', await clickText(page, 'Build ·'));
await page.waitForTimeout(1200);
const links1 = await page.evaluate(() => window.__atom().sites.riverside.links.length);
check('link built', links1 === links0 + 1, `links=${links1}`);
// Power cable to the grid connection, picked with the Grid button
await page.evaluate((id) => window.__ui.getState().startConnect(id, 'power'), tid);
await page.waitForTimeout(600);
check('grid button', await clickText(page, 'Grid'));
await page.waitForTimeout(500);
await clickText(page, 'Build ·');
await page.waitForTimeout(800);
// Tap a building in connect mode via the 3D scene: cooling-water from the new hall, tap the fan cooling.
await page.evaluate((id) => window.__ui.getState().startConnect(id, 'cooling'), tid);
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/net-4-cooling-pick.png` });
await clickText(page, 'Nearest');
await page.waitForTimeout(400);
await clickText(page, 'Build ·');
await page.waitForTimeout(1500);
const st = await page.evaluate(() => { const s = window.__atom().sites.riverside; return { links: s.links.length, stats: { el: s.stats.electricMW, exp: s.stats.exportMW, cool: s.stats.coolingRatio } }; });
check('all three links built', st.links === links0 + 3, JSON.stringify(st));
await page.evaluate(() => window.__ui.getState().cameraCmd({ kind: 'focus', x: -10, z: -10, distance: 45 }));
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/net-5-scene.png` });
await page.evaluate((id) => window.__ui.getState().select(id), tid);
await page.waitForTimeout(800);
await page.evaluate(() => document.querySelector('.connections')?.scrollIntoView());
await clickText(page, 'Fan Cooling', '.link-main');
await page.waitForTimeout(500);
await page.evaluate(() => document.querySelector('.link-editor')?.scrollIntoView());
await page.screenshot({ path: `${out}/net-6-editor.png` });
await ctx.close();

// Showcase overview
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p2 = await ctx2.newPage();
p2.on('pageerror', (e) => errors.push('showcase pageerror: ' + e.message));
await p2.goto(base + '?quality=low&debug=1&showcase=1', { waitUntil: 'load' });
await p2.waitForSelector('.hud', { timeout: 60000 });
await p2.waitForTimeout(4000);
await clickText(p2, 'Start operating');
await p2.waitForTimeout(6000);
await p2.screenshot({ path: `${out}/net-7-showcase.png` });
const sc = await p2.evaluate(() => { const s = window.__atom().sites.riverside; return { links: s.links.length, el: Math.round(s.stats.electricMW), exp: Math.round(s.stats.exportMW) }; });
check('showcase wired', sc.links > 40, JSON.stringify(sc));
await ctx2.close();
await browser.close();
console.log(results.join('\n'));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
