#!/usr/bin/env node
/**
 * Guard the website publish (Coolify → Docker → Expo web export).
 *
 * The site is a single-page app served by `server/index.mjs`, so a missing SPA
 * fallback turns every deep link and every store-review click into a 404. The
 * same container runs the public API, and AdMob account standing depends on a
 * reachable app-ads.txt once the domain is linked. So the checks are:
 *
 *   1. The Dockerfile runs the Expo export, publishes `dist`, and starts the
 *      Node server (the Coolify contract).
 *   2. `server/index.mjs` keeps the 200 SPA fallback, the directory index, the
 *      cache headers and both API routes the client calls.
 *   3. public/app-ads.txt exists (Expo copies public/ to the dist root) with a
 *      google.com DIRECT entry — placeholder publisher id is allowed, a
 *      missing file is not.
 *   4. The docs tell the owner the manual steps no gate can do: linking the
 *      domain in the AdMob console and swapping the placeholder pub id.
 *   5. The adaptive wireframe board still publishes.
 *
 * No network call, no hosting account needed.
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

check('The Dockerfile builds the Expo web export into dist', () => {
  assert(fs.existsSync(path.join(ROOT, 'Dockerfile')), 'Dockerfile is missing');
  const docker = read('Dockerfile');
  assert(/expo export --platform web/.test(docker), 'the image build must run the Expo web export');
  assert(/COPY --from=build \/app\/dist \.\/dist/.test(docker), 'the runtime image must serve dist/');
  assert(/CMD \["node", "server\/index\.mjs"\]/.test(docker), 'the container must start server/index.mjs');
  assert(/EXPOSE 3000/.test(docker) && /HEALTHCHECK/.test(docker), 'port 3000 and a healthcheck make Coolify able to route traffic');
});

/**
 * Does a .dockerignore pattern remove `target` from the build context?
 * Handles the three shapes this repo uses: an exact path, a directory prefix,
 * and a single `*` (`.env.*`, `*.log`). Later lines win, as in Docker.
 */
function dockerIgnored(patterns, target) {
  let ignored = false;
  for (const raw of patterns) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const negate = line.startsWith('!');
    const pattern = (negate ? line.slice(1) : line).replace(/\/+$/, '');
    const star = pattern.indexOf('*');
    const hit =
      star === -1
        ? target === pattern || target.startsWith(`${pattern}/`)
        : target.startsWith(pattern.slice(0, star)) && (star === pattern.length - 1 || target.endsWith(pattern.slice(star + 1)));
    if (hit) ignored = !negate;
  }
  return ignored;
}

check('The Docker build context contains everything both stages read', () => {
  const patterns = read('.dockerignore').split(/\r?\n/);
  // Stage 2 runs the Expo export (app source + assets + config) and
  // publish-wireframes.cjs (design/); stage 3 copies server/ and db/migrations.
  const required = [
    'Dockerfile',
    'package.json',
    'package-lock.json',
    'app.config.js',
    'babel.config.js',
    'metro.config.js',
    'tailwind.config.js',
    'global.css',
    'tsconfig.json',
    'src',
    'components',
    'lib',
    'assets',
    'content',
    'public',
    'design',
    'server',
    'db',
    'scripts',
  ];
  for (const path of required) {
    assert(!dockerIgnored(patterns, path), `.dockerignore excludes ${path}, which the image build needs`);
  }
  assert(dockerIgnored(patterns, '.env'), 'the local .env must never enter the build context');
  assert(dockerIgnored(patterns, 'node_modules'), 'node_modules must come from npm ci, not the context');
});

check('Every deep link serves the router instead of 404ing', () => {
  const server = read('server/index.mjs');
  assert(/index\.html/.test(server) && /path\.extname\(url\.pathname\)/.test(server), 'a missing-asset 404 needs the index.html fallback for extensionless paths');
  assert(/fileAt\(path\.join\(target, 'index\.html'\)\)/.test(server), '/wireframes and other directories must serve their own index');
  const send = server.slice(server.indexOf('async function sendFile'));
  assert(/res\.writeHead\(200\)/.test(send), 'the SPA fallback must be a 200, not a redirect');
});

check('Cache headers keep bundles hot and HTML fresh', () => {
  const server = read('server/index.mjs');
  assert(/immutable/.test(server) && /_expo\/static\//.test(server), 'fingerprinted bundles must cache immutably');
  assert(/max-age=0, must-revalidate/.test(server), 'HTML must never cache');
  assert(/app-ads\.txt/.test(server), 'app-ads.txt gets its own cache lifetime');
});

check('The container answers both public API routes the app calls', () => {
  const server = read('server/index.mjs');
  assert(/credentials: \{ handler: credentials/.test(server), '/api/credentials must be routed');
  assert(/jobs: \{ handler: jobs/.test(server), '/api/jobs must be routed');
  assert(/api\/health/.test(server), '/api/health is what the Docker healthcheck reads');
  for (const handler of ['server/api/credentials.mjs', 'server/api/jobs.mjs']) {
    assert(fs.existsSync(path.join(ROOT, handler)), `${handler} is missing`);
  }
  assert(fs.existsSync(path.join(ROOT, 'server', 'migrate.mjs')), 'server/migrate.mjs applies db/migrations');
});

check('No hosting config is left pointing at Netlify', () => {
  assert(!fs.existsSync(path.join(ROOT, 'netlify.toml')), 'netlify.toml must be gone after the Coolify move');
  assert(!fs.existsSync(path.join(ROOT, 'netlify')), 'the netlify/ directory must be gone after the Coolify move');
  const pkg = JSON.parse(read('package.json'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert(!Object.keys(deps).some((d) => d.startsWith('@netlify/')), 'no @netlify/* dependency may remain');
  assert(deps.pg, 'pg is required to reach DATABASE_URL');
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
  for (const needle of ['Coolify', 'Dockerfile', 'DATABASE_URL', 'app-ads.txt', 'AdMob console', 'dist']) {
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
  const docker = read('Dockerfile');
  assert(/expo export --platform web && node scripts\/publish-wireframes\.cjs/.test(docker), 'the image build must copy the wireframe board after the export');
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
console.log('Web publish gate OK — Coolify Dockerfile, SPA fallback, API routes and app-ads.txt are wired.');
