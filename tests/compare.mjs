// Side-by-side check: the original single-file game vs. the multi-file copy.
// Both run in a 390px-wide Chromium with the same seeded Math.random and a frozen clock,
// play the same scripted days, and are compared on game state, rendered screens and screenshots.
//
// Usage: node tests/compare.mjs [days]   (serves the repo itself on a free port)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'tests', 'output');
const DAYS = +(process.argv[2] || 60);
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const TARGETS = { original: '/original/Resinaprint-Tycoon-v2.1.html', copy: process.env.CONTROL ? '/original/Resinaprint-Tycoon-v2.1.html' : '/index.html' };

// Deterministic environment: seeded random, frozen wall clock, a fixed number of animation frames.
const INIT = () => {
  let a = 123456789;
  Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  let T = 1767225600000; Date.now = () => T; window.__advanceClock = ms => { T += ms; };
  performance.now = () => 1000;
  let frames = 0; const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => (++frames <= 12 ? raf(t => { cb(t); window.__drawn = frames; }) : 0);
  window.__resetFrames = () => { frames = 0; window.__drawn = 0; };
  window.__errors = [];
  window.addEventListener('error', e => window.__errors.push(String(e.message)));
};

// One scripted in-game day. Runs inside the page, using the game's own actions and click handlers.
const PLAY_DAY = () => {
  const clickFirst = () => { const b = [...document.querySelectorAll('#modalRoot [data-choice]')].find(x => !x.disabled); if (b) b.click(); return !!b; };
  const settle = () => { let g = 20; while (modalOpen() && g-- > 0) clickFirst(); while (queue.length && g-- > 0) { nextQueued(); clickFirst(); } };
  settle();
  // An active player: works the bench every 2 hours, grows the studio when cash allows.
  for (let step = 0; step < 12; step++) {
    for (const pr of S.printers) if (pr.cond < 30 && pr.state !== 'printing' && S.cash > serviceFee(pr) + 100) A.service({ id: pr.id });
    A.doAll();
    if (!S.cds.tiktok && S.energy > 40 && S.orders.length < 15) A.camp({ k: 'tiktok' });
    if ((S.resin.estd || 0) < 800 && S.cash > 150) A.resin({ k: 'estd', n: '1' });
    if (!S.biz.kvk && S.cash > 300) { A.kvk(); settle(); }
    if (S.printers.length < space().printers && S.cash > 1500) A.buyPrinter({ k: S.ws ? 'saturn' : 'photon' });
    if (S.biz.kvk && studioStaff().length < space().staff && S.cash > 2000 + wages() * 14) {
      const role = ['packer', 'painter', 'support', 'post', 'tech'][S.staff.length % 5];
      A.hire({ k: role }); settle();
    }
    if (S.biz.kvk && S.ws === 0 && S.cash > 6000) { A.move({ k: '1' }); settle(); }
    if (S.washer === 'bucket' && S.cash > 400) A.washer({ k: 'mercury' });
    if (!S.up.coffee && S.cash > 300) A.upgrade({ k: 'coffee' });
    advance(2); settle();
  }
  save(); render(); afterSim(); settle();
  return { day: S.day, cash: S.cash };
};

const snap = () => {
  const s = JSON.parse(JSON.stringify(S)); delete s.lastT; delete s.savedAt;
  return { S: s, summary: { day: S.day, cash: Math.round(S.cash * 100) / 100, sold: S.sold, revenue: Math.round(S.revenue * 100) / 100, printers: S.printers.length, level: S.lv, xp: S.xp, staff: S.staff.length, rating: +S.rating.toFixed(4), hype: +S.hype.toFixed(4) } };
};

const TABS = ['studio', 'orders', 'buy', 'team', 'empire'];
const sha = b => crypto.createHash('sha256').update(b).digest('hex').slice(0, 16);

const results = {};
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [name, url] of Object.entries(TARGETS)) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  const consoleErr = [];
  page.on('pageerror', e => consoleErr.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) consoleErr.push(m.text()); });
  await page.goto(BASE + url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const r = { shots: {}, html: {}, errors: consoleErr };
  const shot = async (key, full = true) => {
    await page.waitForTimeout(2300); // let any toast fade
    const buf = await page.screenshot({ fullPage: full, animations: 'disabled', path: path.join(OUT, `${name}-${key}.png`) });
    r.shots[key] = sha(buf);
  };
  await shot('intro', false);
  await page.click('[data-choice="0"]');               // "Open the hok"
  r.start = await page.evaluate(snap);
  for (const t of TABS) {                               // fresh-game screens
    await page.click(`#tabs [data-tab="${t}"]`);
    r.html['start-' + t] = await page.evaluate(() => document.getElementById('main').innerHTML);
    await shot('start-' + t);
  }
  await page.click('#tabs [data-tab="studio"]');
  r.days = [];
  for (let d = 0; d < DAYS; d++) r.days.push(await page.evaluate(PLAY_DAY));
  r.end = await page.evaluate(snap);
  // Live clock: real seconds passing (12 s = 1 game hour), then a 30-minute absence with the away report.
  // Each step waits until the game's own 250 ms tick has consumed the elapsed time.
  const clearModals = () => page.evaluate(() => { let g = 30; while (modalOpen() && g-- > 0) { const b = [...document.querySelectorAll('#modalRoot [data-choice]')].find(x => !x.disabled); if (!b) break; b.click(); } });
  await clearModals();
  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => window.__advanceClock(3000));
    await page.waitForFunction(() => S.lastT === Date.now(), null, { polling: 50 });
    await clearModals();
  }
  r.live = await page.evaluate(snap);
  await page.evaluate(() => window.__advanceClock(30 * 60 * 1000));
  await page.waitForFunction(() => /While you were away/.test(document.getElementById('modalRoot').innerHTML), null, { polling: 50, timeout: 60000 });
  r.away = await page.evaluate(() => document.getElementById('modalRoot').innerHTML);
  await shot('away-report', false);
  await page.click('[data-choice="0"]');
  r.afterAway = await page.evaluate(snap);
  // Save/load: reload the page; the game must resume from localStorage exactly where it was.
  // Compare the lasting game data; staff task timers and the pause flag are reset on load by design.
  const KEEP = ['day', 'hour', 'cash', 'sold', 'revenue', 'lv', 'xp', 'rating', 'hype', 'printers', 'staff', 'orders', 'stock', 'resin', 'up', 'biz', 'contracts'];
  const lasting = s => JSON.stringify(KEEP.map(k => k === 'staff' ? s.staff.map(({ cd, act, ...x }) => x) : s[k]));
  const before = lasting(r.afterAway.S);
  await page.reload({ waitUntil: 'load' });
  const after = await page.evaluate(() => JSON.parse(JSON.stringify(S)));
  r.reloadOk = lasting(after) === before;
  for (const t of TABS) {                               // later-game screens
    await page.click(`#tabs [data-tab="${t}"]`);
    r.html['end-' + t] = await page.evaluate(() => document.getElementById('main').innerHTML);
    await shot('end-' + t);
  }
  // Sub-screens: every segment of Orders, Buy and Empire.
  for (const [t, ks] of [['orders', ['queue', 'dms', 'jobs', 'catalog', 'delivery']], ['buy', ['printers', 'resin', 'gear', 'space']], ['empire', ['stores', 'upgrades', 'media', 'company', 'goals', 'more']]]) {
    await page.click(`#tabs [data-tab="${t}"]`);
    for (const k of ks) {
      await page.click(`[data-a="sub"][data-t="${t}"][data-k="${k}"]`);
      r.html[`sub-${t}-${k}`] = await page.evaluate(() => document.getElementById('main').innerHTML);
    }
  }
  // 3D views: a printer and a figure, opened by tapping their pictures like a player would.
  r.webgl = {};
  for (const [key, sel, tab] of [['3d-printer', '[data-a="view3d"][data-t="p"]', 'studio'], ['3d-figure', '[data-a="view3d"][data-t="f"][data-k="desk"]', 'orders']]) {
    await page.click(`#tabs [data-tab="${tab}"]`);
    if (tab === 'orders') await page.click('[data-a="sub"][data-t="orders"][data-k="catalog"]');
    await page.evaluate(() => window.__resetFrames());
    await page.click(sel);
    await page.waitForFunction(() => window.__drawn >= 12, null, { polling: 50, timeout: 60000 });
    r.webgl[key] = await page.evaluate(() => { const c = document.getElementById('v3c'); return !!c && c.style.display !== 'none' && c.width > 10; });
    await shot(key, false);
    await page.click('[data-choice="0"]');
  }
  // Exact 3D geometry and SVG artwork for every printer and product (seeded, so deterministic).
  r.geometry = await page.evaluate(() => {
    const h = a => { let x = 2166136261; const s = typeof a === 'string' ? a : JSON.stringify(a); for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619); return (x >>> 0).toString(16); };
    const out = {};
    const geo = sc => h(sc.batches.map(b => [b.p.join(','), b.c.join(','), b.i.join(','), Array.from(b.n).map(v => v.toFixed(5)).join(','), b.alpha, b.add, b.em, b.anim, b.unlit]).concat([sc.pts.d ? sc.pts.d.join(',') : 0, sc.min, sc.max]));
    for (const k of Object.keys(PRINTERS)) { out['3d-p-' + k] = geo(buildPrinter3(k)); out['svg-p-' + k] = h(printerArt(k)); }
    for (const k of PKEYS) { out['3d-f-' + k] = geo(buildFigure3(k)); out['svg-f-' + k] = h(prodArt(k)); }
    return out;
  });
  r.pageErrors = await page.evaluate(() => window.__errors);
  results[name] = r;
  await ctx.close();
}
// Tolerant pixel comparison: share of pixels whose colour differs visibly (any channel > 24/255).
const pixel = {};
{
  const page = await browser.newPage();
  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  for (const k of Object.keys(results.original.shots)) {
    pixel[k] = await page.evaluate(async ([a, b]) => {
      const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
      const [x, y] = await Promise.all([load(a), load(b)]);
      if (x.width !== y.width || x.height !== y.height) return { size: false, pct: 100 };
      const px = img => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
      const p = px(x), q = px(y); let n = 0;
      for (let i = 0; i < p.length; i += 4) if (Math.abs(p[i] - q[i]) > 24 || Math.abs(p[i + 1] - q[i + 1]) > 24 || Math.abs(p[i + 2] - q[i + 2]) > 24) n++;
      return { size: true, pct: +(100 * n / (p.length / 4)).toFixed(3) };
    }, [`/tests/output/original-${k}.png`, `/tests/output/copy-${k}.png`]);
  }
}
await browser.close();
server.close();

// ---- compare ----
const A = results.original, B = results.copy, diffs = [];
const deep = (x, y, p = '') => {
  if (typeof x !== typeof y || Array.isArray(x) !== Array.isArray(y)) return diffs.push(`${p}: ${JSON.stringify(x)} vs ${JSON.stringify(y)}`);
  if (x && typeof x === 'object') { for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) deep(x[k], y[k], p + '.' + k); return; }
  if (x !== y) diffs.push(`${p}: ${JSON.stringify(x)} vs ${JSON.stringify(y)}`);
};
deep(A.start.S, B.start.S, 'start.S');
deep(A.days, B.days, 'days');
deep(A.end.S, B.end.S, 'end.S');
deep(A.live.S, B.live.S, 'live.S');
deep(A.afterAway.S, B.afterAway.S, 'afterAway.S');
if (A.away !== B.away) diffs.push('away report HTML differs');
if (!A.reloadOk || !B.reloadOk) diffs.push(`reload from save — original ok: ${A.reloadOk}, copy ok: ${B.reloadOk}`);
for (const k in A.html) if (A.html[k] !== B.html[k]) diffs.push(`screen ${k}: HTML differs`);
for (const k in A.geometry) if (A.geometry[k] !== B.geometry[k]) diffs.push(`${k}: 3D geometry / artwork differs`);
for (const k in pixel) if (!pixel[k].size || pixel[k].pct > 0.5) diffs.push(`screenshot ${k}: ${pixel[k].pct}% of pixels differ`);
const shotDiff = Object.keys(A.shots).filter(k => A.shots[k] !== B.shots[k]);

const lines = [];
lines.push(`Simulated days: ${DAYS}`);
lines.push('');
lines.push('| | Original | Copy |', '|---|---|---|');
for (const k of Object.keys(A.end.summary)) lines.push(`| ${k} | ${A.end.summary[k]} | ${B.end.summary[k]} |`);
lines.push('');
lines.push(`Bank closures (game over + restart) during the run — original: ${A.days.filter((d, i) => i && d.day < A.days[i - 1].day).length}, copy: ${B.days.filter((d, i) => i && d.day < B.days[i - 1].day).length}`);
lines.push(`Full game state (every field of S) identical at start: ${JSON.stringify(A.start.S) === JSON.stringify(B.start.S)}`);
lines.push(`Day-by-day cash identical: ${JSON.stringify(A.days) === JSON.stringify(B.days)}`);
lines.push(`Full game state identical after ${DAYS} days: ${JSON.stringify(A.end.S) === JSON.stringify(B.end.S)}`);
lines.push(`Live clock (60 s real time) state identical: ${JSON.stringify(A.live.S) === JSON.stringify(B.live.S)}; game hour after: ${A.live.S.hour}`);
lines.push(`30-min away report identical: ${A.away === B.away}; state after report identical: ${JSON.stringify(A.afterAway.S) === JSON.stringify(B.afterAway.S)}`);
lines.push(`Reload resumes from save — original: ${A.reloadOk}, copy: ${B.reloadOk}`);
lines.push(`Rendered screens compared (HTML): ${Object.keys(A.html).length}, differing: ${Object.keys(A.html).filter(k => A.html[k] !== B.html[k]).length}`);
lines.push(`Screenshots compared: ${Object.keys(A.shots).length}, pixel-identical: ${Object.keys(A.shots).length - shotDiff.length}${shotDiff.length ? ' (differ: ' + shotDiff.join(', ') + ')' : ''}`);
lines.push(`3D models + SVG pictures compared: ${Object.keys(A.geometry).length}, differing: ${Object.keys(A.geometry).filter(k => A.geometry[k] !== B.geometry[k]).length}`);
lines.push(`Visible pixel difference per screenshot (%): ${Object.entries(pixel).map(([k, v]) => k + ' ' + v.pct).join(', ')}`);
lines.push(`WebGL 3D view rendered — original: ${JSON.stringify(A.webgl)}, copy: ${JSON.stringify(B.webgl)}`);
lines.push(`JS errors — original: ${JSON.stringify([...A.errors, ...A.pageErrors])}, copy: ${JSON.stringify([...B.errors, ...B.pageErrors])}`);
lines.push('');
lines.push(diffs.length ? `DIFFERENCES (${diffs.length}):\n` + diffs.slice(0, 50).join('\n') : 'No differences found.');
fs.writeFileSync(path.join(OUT, 'days.json'), JSON.stringify({ original: A.days, copy: B.days }));
const report = lines.join('\n');
fs.writeFileSync(path.join(OUT, 'report.md'), report + '\n');
console.log(report);
process.exit(diffs.length ? 1 : 0);
