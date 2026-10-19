// Replaces Capacitor's default launcher icons and splash images with Elsewhere artwork (same dimensions).
import { chromium } from 'playwright-core';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const res = 'android/app/src/main/res';
const pngSize = (f) => { const b = readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });

const mark = `<circle cx="338" cy="176" r="70" fill="#E4572E"/><path d="M150 360 L150 152 L292 152 M150 256 L262 256 M150 360 L300 360" fill="none" stroke="#1E1A16" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>`;
const svgFor = (name, w, h) => {
  if (name === 'ic_launcher_foreground.png') // adaptive foreground: transparent, mark within the 66% safe zone
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 512 512"><g transform="translate(115 115) scale(0.55)">${mark}</g></svg>`;
  if (name === 'ic_launcher_round.png')
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 512 512"><circle cx="256" cy="256" r="256" fill="#F7F2EA"/><g transform="translate(64 64) scale(0.75)">${mark}</g></svg>`;
  if (name === 'ic_launcher.png')
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#F7F2EA"/><g transform="translate(40 40) scale(0.85)">${mark}</g></svg>`;
  // splash: ivory background, small centred mark + wordmark
  const s = Math.min(w, h) * 0.22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#F7F2EA"/><g transform="translate(${w / 2 - s / 2} ${h / 2 - s / 2 - s * 0.2}) scale(${s / 512})">${mark}</g><text x="50%" y="${h / 2 + s * 0.65}" text-anchor="middle" font-family="Georgia, serif" font-size="${s * 0.22}" fill="#1E1A16">Elsewhere</text></svg>`;
};

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
let n = 0;
for (const f of walk(res).filter((p) => /(ic_launcher(_round|_foreground)?|splash)\.png$/.test(p))) {
  const [w, h] = pngSize(f);
  const name = f.split(/[\/]/).pop();
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svgFor(name, w, h)}</body></html>`);
  await page.screenshot({ path: f, omitBackground: true });
  n++;
}
await browser.close();
console.log('rendered', n, 'android assets');
