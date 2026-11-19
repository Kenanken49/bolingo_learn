#!/usr/bin/env node
/**
 * Add the installable-web metadata to the exported index.html.
 *
 * The site is exported as a single-page app (`web.output: "single"`), so there
 * is exactly one HTML shell: `dist/index.html`. Expo Router's `app/+html.tsx`
 * only applies to static/server rendering, so the tags are injected here, after
 * `expo export --platform web`, exactly like `publish-wireframes.cjs` does for
 * the design board. `public/` is copied to `dist/` verbatim by Expo, which is
 * where `/manifest.webmanifest` and `/pwa-icon.png` come from.
 *
 * What it adds:
 *   - <link rel="manifest"> so "Add to Home Screen" uses the app name, icon and
 *     standalone display instead of a bare bookmark;
 *   - the Safari-specific apple-* tags (Safari ignores most of the manifest);
 *   - <meta name="theme-color"> for the Android status bar.
 *
 * Idempotent: re-running never duplicates a tag.
 *
 * Usage: node scripts/publish-web-extras.cjs [outDir=dist]
 */
'use strict';
/* global __dirname, require, process, console */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const out = path.resolve(ROOT, process.argv[2] || 'dist');
const indexPath = path.join(out, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error(`publish-web-extras: ${path.relative(ROOT, indexPath)} does not exist — run the web export first.`);
  process.exit(1);
}

/** Every asset the page or the manifest references must actually ship. */
const required = ['manifest.webmanifest', 'pwa-icon.png', 'app-ads.txt'];
for (const file of required) {
  if (!fs.existsSync(path.join(out, file))) {
    console.error(`publish-web-extras: ${file} is missing from the export — is it in public/ (or assets/)?`);
    process.exit(1);
  }
}

const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.webmanifest'), 'utf8'));
if (!manifest.name || !manifest.start_url || !Array.isArray(manifest.icons) || manifest.icons.length === 0) {
  console.error('publish-web-extras: manifest.webmanifest needs name, start_url and at least one icon.');
  process.exit(1);
}
for (const icon of manifest.icons) {
  const iconPath = path.join(out, String(icon.src).replace(/^\//, ''));
  if (!fs.existsSync(iconPath)) {
    console.error(`publish-web-extras: manifest icon ${icon.src} is not in the export.`);
    process.exit(1);
  }
}

let html = fs.readFileSync(indexPath, 'utf8');

/** Inject before </head> once; a marker attribute makes it idempotent. */
const TAGS = [
  '<link rel="manifest" href="/manifest.webmanifest" data-bolingo-pwa="1" />',
  '<link rel="apple-touch-icon" href="/pwa-icon.png" data-bolingo-pwa="1" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" data-bolingo-pwa="1" />',
  '<meta name="apple-mobile-web-app-title" content="Bolingo" data-bolingo-pwa="1" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default" data-bolingo-pwa="1" />',
  `<meta name="theme-color" content="${manifest.theme_color || '#000000'}" data-bolingo-pwa="1" />`,
  '<link rel="alternate" href="/install" data-bolingo-install="1" type="text/html" title="Install Bolingo Learn" />',
];

const missing = TAGS.filter((tag) => !html.includes(tag));
if (missing.length > 0) {
  const block = missing.map((tag) => `    ${tag}`).join('\n');
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${block}\n  </head>`);
  } else {
    console.error('publish-web-extras: index.html has no </head> to inject into.');
    process.exit(1);
  }
  fs.writeFileSync(indexPath, html);
}

console.log(
  `publish-web-extras: manifest + Home Screen meta in dist/index.html (${missing.length} tag(s) added)`
);
