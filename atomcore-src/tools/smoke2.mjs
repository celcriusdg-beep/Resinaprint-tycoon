// Second browser test: offline earnings modal, service-worker offline load,
// desktop mouse placement and starting research through the UI.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = process.argv[2] || 'http://localhost:4173/';
const out = process.argv[3] || 'tests/output';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
const errors = [];
const check = (n, ok, d = '') => results.push(`${ok ? 'PASS' : 'FAIL'} ${n} ${d}`);
const clickText = (page, text, sel = 'button') => page.evaluate(([t, s]) => {
  const el = [...document.querySelectorAll(s)].find((x) => x.textContent.trim().includes(t));
  if (el) el.click();
  return !!el;
}, [text, sel]);

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const url = base + '?quality=low&debug=1';
await page.goto(url, { waitUntil: 'load' });
await page.waitForSelector('.hud', { timeout: 60000 });
await page.waitForTimeout(4000);
await clickText(page, 'Start operating');

// ── Research through the UI ──
await clickText(page, 'Research', '.nav-btn');
await page.waitForTimeout(600);
await clickText(page, 'High-Efficiency Fans', '.tree-node');
await page.waitForTimeout(400);
await clickText(page, 'Start research');
await page.waitForTimeout(800);
const active = await page.evaluate(() => window.__atom().research.active);
check('research started via UI', active === 'c_fans', String(active));
await page.keyboard.press('Escape');

// ── Desktop mouse placement ──
await clickText(page, 'Build', '.nav-btn');
await page.waitForTimeout(500);
await clickText(page, 'Cooling', '.tab');
await page.waitForTimeout(300);
const n0 = await page.evaluate(() => window.__atom().sites.riverside.buildings.length);
await clickText(page, 'Mechanical Draft Cooling', '.build-card');
await page.waitForTimeout(800);
await page.mouse.move(520, 560);
await page.waitForTimeout(1500);
await page.mouse.move(530, 565);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/s2-ghost.png` });
await page.mouse.click(530, 565);
await page.waitForTimeout(1500);
const n1 = await page.evaluate(() => window.__atom().sites.riverside.buildings.length);
check('desktop click placement', n1 === n0 + 1, `${n0} -> ${n1}`);

// ── Offline earnings: rewind the save's timestamp by 2 hours, reload ──
await page.evaluate(() => window.__persist());
await page.waitForTimeout(500);
const rewound = await page.evaluate(() => new Promise((res) => {
  const req = indexedDB.open('atomcore');
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction('kv', 'readwrite');
    const st = tx.objectStore('kv');
    const g = st.get('atomcore-save');
    g.onsuccess = () => {
      const v = g.result;
      v.savedAt -= 2 * 3600 * 1000;
      v.state.savedAt = v.savedAt;
      st.put(v, 'atomcore-save');
      tx.oncomplete = () => res(true);
    };
  };
  req.onerror = () => res(false);
}));
// Make sure the page does not save over our edit before reloading
await page.evaluate(() => { window.__persist = () => {}; });
await ctx.setOffline(false);
const m0 = await page.evaluate(() => window.__atom().money);
await page.goto(url, { waitUntil: 'load' });
await page.waitForSelector('.hud', { timeout: 60000 });
await page.waitForTimeout(4000);
const modal = await page.evaluate(() => document.querySelector('.modal h2')?.textContent);
const m1 = await page.evaluate(() => window.__atom().money);
check('offline earnings modal', rewound && modal === 'Welcome back', `${modal} money ${Math.round(m0)} -> ${Math.round(m1)}`);
await page.screenshot({ path: `${out}/s2-offline.png` });

// ── Service worker: reload with the network disabled ──
const swReady = await page.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return false;
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 15000))]);
  return !!reg;
});
await page.waitForTimeout(2000);
await ctx.setOffline(true);
let offlineOk = false;
try {
  await page.reload({ waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('.hud', { timeout: 60000 });
  offlineOk = true;
} catch (e) {
  offlineOk = false;
}
check('service worker registered', swReady);
check('loads offline from cache', offlineOk);
await page.screenshot({ path: `${out}/s2-offline-load.png` });
await ctx.setOffline(false);

await browser.close();
console.log(results.join('\n'));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'No console errors');
