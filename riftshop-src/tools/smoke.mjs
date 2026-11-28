// Browser walk-through on an iPhone: first run, shelve + open packs, binder, PSA grading + reveal,
// deals board, distributor, customers. Usage: PLAYWRIGHT_PATH=$(npm root -g)/playwright node tools/smoke.mjs [baseUrl] [outDir]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = process.argv[2] || 'http://localhost:4174/';
const out = process.argv[3] || 'tests/output';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
const errors = [];
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`);
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); });
const click = (text, sel = 'button') => page.evaluate(([t, s]) => {
  const el = [...document.querySelectorAll(s)].find((x) => x.textContent.trim().includes(t));
  if (!el) return false; el.click(); return true;
}, [text, sel]);
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
await page.goto(base + '?debug');
await page.waitForSelector('.top', { timeout: 30000 });
await page.waitForTimeout(800);
await shot('01-first-run');
check('first run', await click('Open my first pack'));
await page.waitForTimeout(400);
// Put Unleashed packs on the shelf at a fair price
check('shelve', await click('Put on shelf'));
await page.waitForTimeout(300);
await shot('02-shelve');
check('confirm shelve', await click('on the shelf'));
await page.waitForTimeout(300);
await shot('03-stock');
// Open Vendetta packs
check('open', await click('Open', '.sealed-row button.primary'));
await page.waitForTimeout(400);
await shot('04-pack');
await page.click('.tear-pack', { force: true });
await page.waitForTimeout(400);
for (let i = 0; i < 14; i++) { await page.click('.reveal-card', { force: true }); await page.waitForTimeout(80); }
await page.waitForTimeout(300);
await shot('05-pack-summary');
await click('Done');
// Grade the best card with PSA, the next with Beckett
await page.click('.grid4 .slot');
await page.waitForTimeout(300);
check('grade it', await click('Grade it'));
await page.waitForTimeout(200);
await click('Express');
await page.waitForTimeout(200);
await shot('06-grade-psa');
check('send PSA', await click('Send to PSA'));
await page.waitForTimeout(200);
await page.click('.modal .x');
await page.click('.grid4 .slot');
await page.waitForTimeout(300);
await click('Grade it');
await click('BECKETT');
await click('Express');
await page.waitForTimeout(200);
await shot('07-grade-bgs');
check('send BGS', await click('Send to BGS'));
await page.click('.modal .x');
// Fast-forward a shop day: grades come back
await page.evaluate(() => window.__advance(13));
await page.waitForTimeout(600);
check('grade reveal', await page.evaluate(() => !!document.querySelector('.grade-pop')));
await shot('08-reveal');
await click('Next slab');
await page.waitForTimeout(600);
await shot('09-reveal-2');
await click('Nice');
await click('Grading', 'nav button');
await page.waitForTimeout(300);
await shot('10-slabs');
check('slabs shown', await page.evaluate(() => document.querySelectorAll('.slab').length >= 2));
// Put a slab in the display case
await page.click('.slab-grid > div');
await page.waitForTimeout(300);
await click('Put in display case');
await click('Confirm');
await page.waitForTimeout(200);
await page.click('.modal .x').catch(() => {});
await click('Market', 'nav button');
await page.waitForTimeout(400);
await shot('11-market');
check('buy deal', await page.evaluate(() => { const b = document.querySelector('.deal button:not([disabled])'); if (!b) return false; b.click(); return true; }));
await click('Shop', 'nav button');
await page.waitForTimeout(300);
// Fill the display case from the store: tap an empty spot, pick a card, price it.
check('case picker', await page.evaluate(() => { const b = document.querySelector('.case-spot.empty'); if (!b) return false; b.click(); return true; }));
await page.waitForTimeout(300);
await page.click('.pick-cards .pick');
await page.waitForTimeout(300);
await shot('12a-case-sheet');
check('put in case', await click('Put in the display case'));
await page.waitForTimeout(300);
await page.evaluate(() => window.__advance(3));
await page.waitForTimeout(500);
await page.evaluate(() => document.querySelector('.content').scrollTo(0, 0));
await shot('12-shop');
check('customers bought', await page.evaluate(() => [...document.querySelectorAll('.feed-row.sale')].length > 0));
await browser.close();
console.log(results.join('\n'));
console.log(errors.length ? 'ERRORS\n' + errors.join('\n') : 'No console errors');
