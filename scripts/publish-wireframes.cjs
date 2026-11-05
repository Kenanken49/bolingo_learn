#!/usr/bin/env node
/**
 * Copy the adaptive wireframe board into the web export so the site serves
 * it at /wireframes/. Runs after `expo export --platform web` (netlify.toml).
 * `design/` stays the only source; nothing here is imported by the app.
 *
 * The board loads Bingo art from `../wireframes-v2/assets`, so those files are
 * copied alongside, and a <base href="/wireframes/"> keeps relative links
 * working when the page is opened as /wireframes (no trailing slash).
 *
 * Usage: node scripts/publish-wireframes.cjs [outDir=dist]
 */
'use strict';
/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const out = path.resolve(ROOT, process.argv[2] || 'dist');
const SRC = path.join(ROOT, 'design', 'wireframes-v3-adaptive');
const ASSETS = path.join(ROOT, 'design', 'wireframes-v2', 'assets');

if (!fs.existsSync(out)) {
  console.error(`publish-wireframes: ${out} does not exist — run the web export first.`);
  process.exit(1);
}
const dest = path.join(out, 'wireframes');
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(SRC, dest, { recursive: true, filter: (p) => !p.endsWith('README.md') });
fs.cpSync(ASSETS, path.join(out, 'wireframes-v2', 'assets'), { recursive: true });

const indexPath = path.join(dest, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
if (!html.includes('<base ')) html = html.replace(/<head>/i, '<head>\n<base href="/wireframes/">');
fs.writeFileSync(indexPath, html);
console.log(`publish-wireframes: board copied to ${path.relative(ROOT, dest)}/`);
