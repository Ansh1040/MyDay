// Builds the hosted browser preview: a normal production build without the service worker,
// with index.html converted to page content (the host wraps it in its own document skeleton).
// Output: preview-dist/ (elsewhere.html + assets/*). Prints the asset list for publishing.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const out = 'preview-dist';
execSync(`npx vite build --outDir ${out} --emptyOutDir`, { stdio: 'inherit', env: { ...process.env, VITE_PREVIEW: '1' } });

const html = readFileSync(join(out, 'index.html'), 'utf8');
const pick = (re) => [...html.matchAll(re)].map((m) => m[0]);
const head = [
  '<title>Elsewhere</title>',
  ...pick(/<meta name="(description|theme-color)"[^>]*>/g),
  ...pick(/<link rel="stylesheet"[^>]*>/g),
  ...pick(/<link rel="modulepreload"[^>]*>/g),
  ...pick(/<script type="module"[^>]*><\/script>/g),
];
const page = `${head.join('\n')}\n<div id="root"></div>\n`;
writeFileSync(join(out, 'elsewhere.html'), page);

const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const assets = walk(join(out, 'assets')).map((p) => relative(out, p).replace(/\\/g, '/'));
writeFileSync(join(out, 'files.json'), JSON.stringify(assets, null, 1));
console.log(`page: ${out}/elsewhere.html, ${assets.length} asset files`);
