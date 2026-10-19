// Smoke test: boots the built app in local Chrome (playwright-core), completes onboarding,
// visits every route in all 4 themes × day/night, and reports console/page errors.
// Usage: npm run build && npx vite preview --port 4173 & node scripts/smoke.mjs [--shots dir]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4180/';
const shotsIdx = process.argv.indexOf('--shots');
const SHOTS = shotsIdx > 0 ? process.argv[shotsIdx + 1] : null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const ROUTES = [
  '/discover', '/search?q=music', '/saved', '/topic/music', '/twist', '/journeys', '/rabbit/music-mood', '/skills', '/skill/soundscapes',
  '/tickets', '/quests', '/collections', '/collection/col-surprised', '/perspectives', '/import', '/create', '/notes', '/note/new?kind=text',
  '/remix', '/builder', '/builder/new', '/capsules', '/capsule/new?kind=prediction', '/you', '/history', '/entry/new?kind=opinion', '/map',
  '/progress', '/settings', '/settings/appearance', '/settings/profile', '/settings/notifications', '/settings/privacy', '/settings/data',
  '/settings/about', '/install', '/x/s-soundscape-first', '/x/r-mood-pair', '/x/s-sound-hunt-walk', '/perspective/p-boredom',
];

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`[pageerror] ${page.url()} :: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`[console] ${page.url()} :: ${m.text()}`));

await page.goto(BASE);
await page.waitForTimeout(800);
// Onboarding: skip through.
for (let i = 0; i < 15; i++) {
  const btn = page.getByRole('button', { name: /^(skip|skip for now|next|continue|finish|start exploring|get started|let.?s go|done)/i }).last();
  if (!(await btn.count())) break;
  await btn.click().catch(() => {});
  await page.waitForTimeout(150);
  if (page.url().includes('/discover') && (await page.locator('.tabbar').count())) break;
}
console.log('after onboarding:', page.url(), 'tabbar:', await page.locator('.tabbar').count());


const themes = ['vermilion', 'cobalt', 'plum', 'graphite'];
const modes = ['light', 'dark'];
const results = [];
for (const r of ROUTES) {
  await page.goto(BASE + '#' + r);
  await page.waitForTimeout(250);
  const title = await page.locator('h1').first().textContent().catch(() => null);
  const notFound = await page.getByText(/doesn.t exist|not found|couldn.t find/i).count();
  results.push(`${r} → h1="${(title || '').trim().slice(0, 40)}"${notFound ? ' [NOT-FOUND TEXT]' : ''}`);
}
console.log(results.join('\n'));

if (SHOTS) {
  for (const t of themes)
    for (const m of modes) {
      await page.evaluate(([t, m]) => { document.documentElement.dataset.theme = t; document.documentElement.dataset.mode = m; }, [t, m]);
      for (const r of ['/discover', '/rabbit/music-mood', '/skill/soundscapes', '/history']) {
        await page.goto(BASE + '#' + r);
        await page.waitForTimeout(200);
        await page.evaluate(([t, m]) => { document.documentElement.dataset.theme = t; document.documentElement.dataset.mode = m; }, [t, m]);
        await page.screenshot({ path: `${SHOTS}/${t}-${m}-${r.replace(/[/?=]/g, '_')}.png` });
      }
    }
}

console.log(`\n${errors.length} errors`);
console.log([...new Set(errors)].slice(0, 60).join('\n'));
await browser.close();
