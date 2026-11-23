// Browser smoke test: loads the built game in an emulated iPhone and a desktop
// window, exercises the main flows through the real UI, reports console errors
// and saves screenshots. Software WebGL is slow, so it uses ?quality=low.
// Usage: PLAYWRIGHT_PATH=$(npm root -g)/playwright node tools/smoke.mjs [baseUrl] [outDir]
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

const clickText = (page, text, sel = 'button') =>
  page.evaluate(([t, s]) => {
    const el = [...document.querySelectorAll(s)].find((x) => x.textContent.trim().includes(t));
    if (!el) return false;
    el.click();
    return true;
  }, [text, sel]);
const state = (page) => page.evaluate(async () => {
  const s = window.__atom?.();
  return s ? { money: Math.round(s.money), buildings: s.sites[s.activeSite].buildings.length, setpoint: s.sites[s.activeSite].buildings[0].reactor?.setpoint } : null;
});
const check = (name, ok, detail = '') => { results.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`); };

async function open(name, ctxOpts, url) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}`));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForSelector('.hud', { timeout: 60000 });
  await page.waitForTimeout(5000);
  return { ctx, page };
}

// ── Phone ──────────────────────────────────────────────
{
  const { ctx, page } = await open('iphone', { ...devices['iPhone 13'], deviceScaleFactor: 1 }, base + '?quality=low&debug=1');
  await page.screenshot({ path: `${out}/phone-0-welcome.png` });
  check('welcome modal shown', await clickText(page, 'Start operating'));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/phone-1-plant.png` });

  await clickText(page, 'Build');
  await page.waitForTimeout(800);
  await clickText(page, 'Support', '.tab');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/phone-2-build.png` });
  const before = await state(page);
  check('build card clickable', await clickText(page, 'Research Laboratory', '.build-card'));
  await page.waitForTimeout(800);
  // Tap on the ground near the plant, then confirm
  const vp = page.viewportSize();
  await page.touchscreen.tap(vp.width * 0.3, vp.height * 0.62);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/phone-3-placing.png` });
  await page.evaluate(() => document.querySelector('.round-btn.primary')?.click());
  await page.waitForTimeout(1500);
  const after = await state(page);
  check('building placed via tap + confirm', after && before && after.buildings === before.buildings + 1, JSON.stringify({ before, after }));
  await page.screenshot({ path: `${out}/phone-4-placed.png` });

  // Select the reactor through the Plant panel and raise the setpoint
  await clickText(page, 'Plant');
  await page.waitForTimeout(600);
  await clickText(page, 'Plant', '.tab');
  await page.waitForTimeout(500);
  await clickText(page, 'Pilot Reactor', '.list-row');
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const r = document.querySelector('.reactor-card input[type=range]');
    if (!r) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(r, '1');
    r.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/phone-5-reactor.png` });
  const s3 = await state(page);
  check('reactor setpoint raised', s3?.setpoint === 1, JSON.stringify(s3));
  await page.evaluate(() => document.querySelector('.sheet-body')?.scrollTo(0, 9999));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/phone-6-reactor-bottom.png` });

  for (const [tab, file] of [['Research', 'phone-7-research'], ['Goals', 'phone-8-goals'], ['Market', 'phone-9-market'], ['Sites', 'phone-10-sites'], ['Settings', 'phone-11-settings']]) {
    await clickText(page, tab, '.nav-btn');
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/${file}.png` });
  }
  await ctx.close();
}

// ── Desktop ────────────────────────────────────────────
{
  const { ctx, page } = await open('desktop', { viewport: { width: 1280, height: 800 } }, base + '?quality=low&debug=1');
  await clickText(page, 'Start operating');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/desktop-1-plant.png` });
  await clickText(page, 'Research', '.nav-btn');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/desktop-2-research.png` });
  await clickText(page, 'Plant', '.nav-btn');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/desktop-3-finance.png` });
  // Reload: the save must persist
  const s1 = await state(page);
  await page.evaluate(() => window.__persist?.());
  await page.waitForTimeout(800);
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.hud', { timeout: 60000 });
  await page.waitForTimeout(4000);
  const s2 = await state(page);
  check('save persists across reload', s1 && s2 && Math.abs(s2.money - s1.money) < Math.max(500, s1.money * 0.2), JSON.stringify({ s1, s2 }));
  await ctx.close();
}

await browser.close();
console.log(results.join('\n'));
console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'No console errors');
