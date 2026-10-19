// Renders PNG icons from the SVG sources using the locally installed Chrome (playwright-core, no download).
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync } from 'node:fs';

const out = (p) => new URL('../' + p, import.meta.url);
const jobs = [
  ['public/icon.svg', 'public/icon-192.png', 192],
  ['public/icon.svg', 'public/icon-512.png', 512],
  ['public/icon-maskable.svg', 'public/icon-maskable-512.png', 512],
  ['public/icon-maskable.svg', 'resources/icon-1024.png', 1024],
];
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
mkdirSync(out('resources'), { recursive: true });
for (const [src, dest, size] of jobs) {
  const svg = readFileSync(out(src), 'utf8');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: out(dest).pathname.slice(1), omitBackground: true });
  console.log('wrote', dest);
}
await browser.close();
