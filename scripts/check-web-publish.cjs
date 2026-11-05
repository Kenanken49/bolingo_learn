#!/usr/bin/env node
/**
 * Guard the website publish (Netlify → Expo web export).
 *
 * The site is a single-page app, so a missing SPA fallback turns every
 * deep link and every store-review click into a 404. And AdMob account
 * standing depends on a reachable app-ads.txt once the domain is linked.
 * So the checks are:
 *
 *   1. netlify.toml exists with the Expo export build, the `dist` publish
 *      directory, and a 200 SPA rewrite for every path.
 *   2. public/app-ads.txt exists (Expo copies public/ to the dist root) with
 *      a google.com DIRECT entry — placeholder publisher id is allowed, a
 *      missing file is not.
 *   3. The docs tell the owner the two manual steps no gate can do: linking
 *      the domain in the AdMob console and swapping the placeholder pub id.
 *
 * No network call, no Netlify account needed.
 */

'use strict';

/* global __dirname, console, process -- Node provides these to CommonJS scripts. */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`[ok] ${name}`);
  } catch (e) {
    failures += 1;
    console.error(`[FAIL] ${name}: ${e instanceof Error ? e.message : e}`);
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

check('netlify.toml builds the Expo web export into dist', () => {
  assert(fs.existsSync(path.join(ROOT, 'netlify.toml')), 'netlify.toml is missing');
  const toml = read('netlify.toml');
  assert(/expo export --platform web/.test(toml), 'the Netlify build must run the Expo web export');
  assert(/publish\s*=\s*"dist"/.test(toml), 'the Netlify publish directory must be dist');
});

check('Every deep link serves the router instead of 404ing', () => {
  const toml = read('netlify.toml');
  assert(/from\s*=\s*"\/\*"/.test(toml) && /to\s*=\s*"\/index\.html"/.test(toml), 'a /* → /index.html rewrite is missing');
  assert(/status\s*=\s*200/.test(toml), 'the SPA rewrite must be a 200, not a redirect');
});

check('app-ads.txt ships at the site root for AdMob verification', () => {
  const p = path.join(ROOT, 'public', 'app-ads.txt');
  assert(fs.existsSync(p), 'public/app-ads.txt is missing (Expo copies public/ to the dist root)');
  const body = read('public/app-ads.txt');
  assert(/^google\.com,\s*pub-\d+,\s*DIRECT,/m.test(body), 'app-ads.txt needs a google.com DIRECT entry');
  if (/pub-0{16}/.test(body)) {
    console.warn('[warn] app-ads.txt still carries the placeholder publisher id — replace it after the AdMob signup.');
  }
});

check('The publish docs name the manual steps', () => {
  assert(fs.existsSync(path.join(ROOT, 'docs', 'web-publish.md')), 'docs/web-publish.md is missing');
  const docs = read('docs/web-publish.md');
  for (const needle of ['netlify.toml', 'app-ads.txt', 'AdMob console', 'dist']) {
    assert(docs.includes(needle), `docs/web-publish.md must explain ${needle}`);
  }
});

check('No lazy icon font can red-screen the site', () => {
  const appIcon = read('components/AppIcon.tsx');
  assert(!/FontAwesome/.test(appIcon), 'AppIcon must not use FontAwesome (its lazy web fetch trips the 12s font timeout)');
  assert(!/lib: 'fa'/.test(appIcon), 'no fa glyph entries may remain');
  const layout = read('src/app/_layout.tsx');
  assert(/Ionicons\.font/.test(layout) && /MaterialCommunityIcons\.font/.test(layout), 'icon fonts must preload at boot, not on first glyph');
  assert(/fontsLoaded \|\| fontError/.test(layout), 'a font failure must hide the splash, never wedge the app');
});

check('The adaptive wireframe board is published at /wireframes/', () => {
  const toml = read('netlify.toml');
  assert(/expo export --platform web && node scripts\/publish-wireframes\.cjs/.test(toml), 'the build must copy the wireframe board after the export');
  const os = require('node:os');
  const { execFileSync } = require('node:child_process');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-'));
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'publish-wireframes.cjs'), out], { stdio: 'pipe' });
    for (const f of ['wireframes/index.html', 'wireframes/styles.css', 'wireframes/app.js', 'wireframes-v2/assets/bingo-happy.png', 'wireframes-v2/assets/learner.svg']) {
      assert(fs.existsSync(path.join(out, f)), `published board is missing ${f}`);
    }
    const html = fs.readFileSync(path.join(out, 'wireframes', 'index.html'), 'utf8');
    assert(html.includes('<base href="/wireframes/">'), '/wireframes without a slash needs the base href');
    for (const m of html.matchAll(/(?:src|href)="(?!https?:|#|data:)([^"]+)"/g)) {
      if (m[1] === '/wireframes/') continue;
      assert(fs.existsSync(path.join(out, 'wireframes', m[1])), `board links to a file that is not published: ${m[1]}`);
    }
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

if (failures > 0) {
  console.error(`Web publish gate FAILED — ${failures} check(s) failed.`);
  process.exit(1);
}
console.log('Web publish gate OK — Netlify config, SPA fallback and app-ads.txt are wired.');
