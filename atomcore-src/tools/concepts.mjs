// Renders concept models (?concept=key), day and night, at two angles.
// Usage: PLAYWRIGHT_PATH=$(npm root -g)/playwright node tools/concepts.mjs baseUrl outDir key,key…
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const [base, out, list] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 700 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
for (const k of list.split(',')) {
  for (const [suf, q] of [['', ''], ['-night', '&night=1'], ['-b', '&angle=125']]) {
    await page.goto(`${base}?concept=${k}${q}`);
    await page.waitForSelector('#viewer-label', { timeout: 30000 });
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${out}/${k}${suf}.png` });
  }
}
await browser.close();
console.log(errors.length ? 'ERRORS ' + errors.join('\n') : 'ok');
