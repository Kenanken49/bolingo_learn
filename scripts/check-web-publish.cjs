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
 *   6. The QR code the install page paints for a phone actually decodes.
 *   7. An installed app reads that release record and offers a newer build.
 *
 * No network call, no hosting account needed.
 */

'use strict';

/* global __dirname, console, process, require, module, Uint8ClampedArray -- Node provides these to CommonJS scripts. */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

// The QR and the update rule are app TypeScript. Load the shipped modules the way
// check-labex.cjs does, so this gate tests the code the bundle runs rather than a copy of it.
const ts = require('typescript');
require.extensions['.ts'] = (nodeModule, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename,
  });
  nodeModule._compile(outputText, filename);
};

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
  // The deployment box is ~2 GB. An unbounded Metro export gets OOM-killed and
  // Coolify reports "exit code 137"; minification is the peak-memory step.
  assert(/max-old-space-size/.test(docker), 'the image build must cap the Node heap, or the box OOM-kills the export (137)');
  assert(/--no-minify/.test(docker), 'the web export must skip minification to stay inside the box memory');
  assert(/--max-workers 1/.test(docker), 'the web export must not fan out workers on a 1 vCPU box');

  // The runtime image carries the server, not the app toolchain. Copying the
  // full dependency tree (~1.5 GB of Expo/React Native build packages) cost
  // minutes per deploy; server/package.json is the whole list the server needs.
  assert(/AS runtime-deps/.test(docker), 'the runtime dependencies need their own stage built from server/package.json');
  assert(/COPY --from=runtime-deps \/app\/node_modules/.test(docker), 'the runtime stage must copy node_modules from runtime-deps');
  assert(!/COPY --from=deps \/app\/node_modules/.test(docker), 'the runtime stage must not copy the full app toolchain into the image');

  const serverPkg = JSON.parse(read('server/package.json'));
  const rootLock = JSON.parse(read('package-lock.json'));
  const serverLock = JSON.parse(read('server/package-lock.json'));
  assert(/^\d+\.\d+\.\d+$/.test(serverPkg.dependencies.pg), 'server/package.json must pin pg exactly, not with a range, or the image drifts from the app lock');
  assert(
    serverLock.packages['node_modules/pg'].version === rootLock.packages['node_modules/pg'].version,
    `the runtime pg (${serverLock.packages['node_modules/pg'].version}) must match the version the app lock resolves (${rootLock.packages['node_modules/pg'].version})`,
  );
});

check('The website offers the app download from the shell', () => {
  // The app is not in a store, so the download has to be reachable from inside
  // the product, not only from a link somebody shares.
  const shell = read('components/dashboard/Shell.tsx');
  // A router.push() pill cannot be middle-clicked, opened in a new tab, bookmarked
  // or crawled, so the entry has to be a real link on the web.
  assert(/<Link[\s\S]{0,160}href="\/install"/.test(shell), 'the dashboard top bar must render /install as a real link');
  assert(!/router\.push\('\/install'\)/.test(shell), 'the download entry must not navigate with router.push on web');
  assert(/Download app/.test(shell), 'the download entry needs a visible label');
  const install = read('src/app/install.tsx');
  assert(/\/download\/android/.test(install), 'the install page must use the stable /download/android route');
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
  // The RUN is multi-line on purpose (memory flags); match across lines.
  assert(/expo export --platform web[\s\S]{0,400}?publish-wireframes\.cjs/.test(docker), 'the image build must copy the wireframe board after the export');
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

check('The web install path is single-source, signed and honest', () => {
  assert(fs.existsSync(path.join(ROOT, 'src', 'app', 'install.tsx')), 'bolingo.co.ke/install page is missing');
  const page = read('src/app/install.tsx');
  assert(/download\/android/.test(page), 'the install page must link to /download/android');
  // A download that only works through window.open is a download a popup blocker
  // can eat, so the web page must render the real thing the browser can save.
  assert(/createElement\(\s*'a'/.test(page), 'the web download must be a real anchor, not only window.open');
  assert(/href: apkHref/.test(page), 'the download anchor must carry the /download/android href');
  assert(/sha256/.test(page), 'the install page must show the build checksum');
  assert(/latest\.json/.test(page), 'the install page must read the published build metadata');
  // A laptop reader cannot tap a phone screen, so the page hands the same URL
  // over as a QR. It has to carry the absolute address (a relative href means
  // nothing to a camera) and it belongs on web only.
  assert(/<PhoneQr/.test(page), 'the install page must offer a QR code for the phone handoff');
  assert(/from '\.\.\/\.\.\/lib\/install-qr'/.test(page), 'the QR must come from lib/install-qr');
  assert(/payload=\{`\$\{PUBLIC_SITE\}\/download\/android`\}/.test(page), 'the QR must encode the absolute download URL');
  assert(/Platform\.OS === 'web'[\s\S]{0,60}<PhoneQr/.test(page), 'the QR is a desktop-to-phone affordance and must not appear in the native app');
  assert(/Add to Home Screen/i.test(page), 'iPhone users need the Add to Home Screen path (Apple forbids web installs)');
  const layout = read('src/app/_layout.tsx');
  assert(/name="install"/.test(layout), 'the install route must be registered in the app layout');

  const server = read('server/index.mjs');
  assert(/download\/android/.test(server), 'the server must route /download/android');
  assert(/application\/vnd\.android\.package-archive/.test(server), 'APKs need the Android MIME type');
  assert(/latest\.json/.test(server), 'the download route reads the published build metadata');
  assert(/BOLINGO_APK_DIR/.test(server), 'the binary streams from the host release volume');

  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  assert(manifest.name && manifest.start_url === '/' && Array.isArray(manifest.icons) && manifest.icons.length > 0, 'the web manifest needs name, start_url and an icon');
  for (const icon of manifest.icons) {
    assert(fs.existsSync(path.join(ROOT, 'public', String(icon.src).replace(/^\//, ''))), `manifest icon ${icon.src} is missing from public/`);
  }

  assert(fs.existsSync(path.join(ROOT, 'scripts', 'publish-web-extras.cjs')), 'the post-export metadata script is missing');
  assert(/publish-web-extras\.cjs/.test(read('Dockerfile')), 'the image build must run publish-web-extras.cjs');
  const pkg = JSON.parse(read('package.json'));
  assert(/publish-web-extras/.test(pkg.scripts['build:web']), 'npm run build:web must run publish-web-extras.cjs');

  assert(fs.existsSync(path.join(ROOT, 'scripts', 'publish-android-apk.cjs')), 'the APK publishing script is missing');
  const eas = JSON.parse(read('eas.json'));
  assert(eas.build && eas.build.apk && eas.build.apk.android && eas.build.apk.android.buildType === 'apk', 'eas.json needs an apk profile that builds an APK (not an AAB)');

  assert(fs.existsSync(path.join(ROOT, 'docs', 'install-from-web.md')), 'docs/install-from-web.md is missing');
  const docs = read('docs/install-from-web.md');
  for (const needle of ['SHA-256', 'Supabase', 'Add to Home Screen', 'keystore', '/var/data/app-downloads', 'arm64-v8a', 'QR']) {
    assert(docs.includes(needle), `docs/install-from-web.md must explain ${needle}`);
  }

  // The APK is a build artifact: only the metadata is committed.
  assert(/public\/downloads\/\*\.apk/.test(read('.gitignore')), '.gitignore must keep published APKs out of git');
});

/** What the child process below does: exercise the download route for real. */
const APK_STREAM_TEST = String.raw`
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const { createBolingoServer } = await import(process.env.SERVER_MODULE);
const server = createBolingoServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const meta = path.join(process.env.BOLINGO_DIST, 'downloads', 'latest.json');
const apk = path.join(process.env.BOLINGO_APK_DIR, JSON.parse(readFileSync(meta, 'utf8')).fileName);
const bytes = readFileSync(apk);
const problems = [];
const ok = (condition, message) => { if (!condition) problems.push(message); };
const get = async (headers) => {
  const res = await fetch(base + '/download/android', { headers });
  return { res, body: Buffer.from(await res.arrayBuffer()) };
};

let r = await get({});
ok(r.res.status === 200, 'full download: expected 200, got ' + r.res.status);
ok(r.body.equals(bytes), 'full download: the body is not the published file');
ok(r.res.headers.get('content-type') === 'application/vnd.android.package-archive', 'full download: wrong MIME type');
ok(/attachment; filename="[^"]+\.apk"/.test(r.res.headers.get('content-disposition') || ''), 'full download: not offered as an attachment');
ok(r.res.headers.get('accept-ranges') === 'bytes', 'no Accept-Ranges, so a broken download cannot resume');
ok(r.res.headers.get('cache-control') !== 'no-store', 'the binary may be cached; only the metadata must not');

r = await get({ Range: 'bytes=1000-1999' });
ok(r.res.status === 206, 'range: expected 206, got ' + r.res.status);
ok(r.body.length === 1000, 'range: expected 1000 bytes, got ' + r.body.length);
ok(r.body.equals(bytes.subarray(1000, 2000)), 'range: wrong slice');
ok(r.res.headers.get('content-range') === 'bytes 1000-1999/' + bytes.length, 'range: wrong Content-Range');

r = await get({ Range: 'bytes=' + (bytes.length - 256) + '-' });
ok(r.res.status === 206 && r.body.length === 256, 'open-ended range: expected the tail of the file');

r = await get({ Range: 'bytes=99999999-' });
ok(r.res.status === 416, 'range past the end: expected 416, got ' + r.res.status);

const head = await fetch(base + '/download/android', { method: 'HEAD' });
ok(head.status === 200 && head.headers.get('content-length') === String(bytes.length), 'HEAD: must report the size without a body');

// The release volume is where a publish lands: its record must beat the image's.
const volume = process.env.BOLINGO_APK_DIR;
writeFileSync(path.join(volume, 'latest.json'), JSON.stringify({ version: '9.9.10', fileName: 'other.apk', sizeBytes: 3, sha256: 'a'.repeat(64) }));
writeFileSync(path.join(volume, 'other.apk'), Buffer.from('abc'));
const metaRes = await fetch(base + '/downloads/latest.json');
const metaBody = await metaRes.text();
ok(metaRes.status === 200 && JSON.parse(metaBody).version === '9.9.10', 'the volume record must be the one /install reads');
ok(metaRes.headers.get('cache-control') === 'no-store', 'a build record behind a cache hides the new release');
r = await get({});
ok(r.res.status === 200 && r.body.toString() === 'abc', 'the download must follow the volume record');
rmSync(path.join(volume, 'latest.json'));
rmSync(path.join(volume, 'other.apk'));

rmSync(apk);
r = await get({});
ok(r.res.status === 503, 'missing binary: expected an honest 503, got ' + r.res.status);
ok(![301, 302, 307, 308].includes(r.res.status), 'missing binary: must not redirect the caller back to this route');

writeFileSync(meta, '{}');
r = await get({});
ok(r.res.status === 503, 'record with no file named: expected 503, got ' + r.res.status);

rmSync(meta);
r = await get({});
ok(r.res.status === 404, 'no metadata: expected 404, because no build is published');

server.close();
console.log(problems.length ? 'STREAM_FAIL ' + problems.join(' | ') : 'STREAM_OK');
process.exit(problems.length ? 1 : 0);
`;

check('The published Android binary streams from the release volume and resumes', () => {
  const os = require('node:os');
  const crypto = require('node:crypto');
  const { execFileSync } = require('node:child_process');
  // Windows: the ESM loader refuses a bare "C:\…" path, so hand it a file URL.
  const { pathToFileURL } = require('node:url');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apk-stream-'));
  const dist = path.join(root, 'dist');
  const volume = path.join(root, 'volume');
  fs.mkdirSync(path.join(dist, 'downloads'), { recursive: true });
  fs.mkdirSync(volume, { recursive: true });
  const fileName = 'bolingo-learn-9.9.9.apk';
  const bytes = crypto.randomBytes(4096);
  fs.writeFileSync(path.join(volume, fileName), bytes);
  fs.writeFileSync(
    path.join(dist, 'downloads', 'latest.json'),
    JSON.stringify({
      version: '9.9.9',
      packageName: 'com.bolingo.learn',
      fileName,
      sizeBytes: bytes.length,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      url: 'https://bolingo.co.ke/download/android',
    }),
  );
  try {
    const out = execFileSync(process.execPath, ['--input-type=module', '-e', APK_STREAM_TEST], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        BOLINGO_DIST: dist,
        BOLINGO_APK_DIR: volume,
        SERVER_MODULE: pathToFileURL(path.join(ROOT, 'server', 'index.mjs')).href,
      },
    }).toString();
    assert(/STREAM_OK/.test(out), `the download route misbehaved: ${out.slice(0, 500)}`);
  } catch (error) {
    assert(false, `the download route misbehaved: ${String(error.stderr || error.message).slice(0, 700)}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

check('The install page QR code decodes back to the download URL', () => {
  const { qrMatrix } = require(path.join(ROOT, 'lib', 'install-qr.ts'));
  const jsQr = require('jsqr');
  const jsQR = jsQr.default || jsQr;
  const payload = 'https://bolingo.co.ke/download/android';

  const { count, rows, pathData } = qrMatrix(payload);
  assert(count >= 21 && count <= 41, `QR is ${count}×${count}, outside the version 1–40 grid`);

  // Paint exactly what the browser paints: the SVG path, nothing else. If the
  // run-length packing ever drifts from the matrix, this is what catches it.
  const scale = 6;
  const quiet = 4;
  const size = (count + quiet * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  const run = /M(\d+) (\d+)h(\d+)v1h-\3z/g;
  let cursor = 0;
  let painted = 0;
  let match;
  while ((match = run.exec(pathData))) {
    assert(match.index === cursor, `QR path data has a gap or unexpected command at ${cursor}`);
    cursor = match.index + match[0].length;
    const x = Number(match[1]);
    const y = Number(match[2]);
    const length = Number(match[3]);
    assert(y < count && x + length <= count, `QR run ${match[0]} falls outside the ${count}×${count} grid`);
    for (let col = x; col < x + length; col += 1) {
      painted += 1;
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          const offset = (((y + quiet) * scale + dy) * size + (col + quiet) * scale + dx) * 4;
          data[offset] = 0;
          data[offset + 1] = 0;
          data[offset + 2] = 0;
        }
      }
    }
  }
  assert(cursor === pathData.length, 'QR path data ends mid-command');

  const darkModules = rows.reduce((total, line) => total + line.filter(Boolean).length, 0);
  assert(painted === darkModules, `the path paints ${painted} modules but the matrix has ${darkModules}`);
  assert(painted > count, `only ${painted} dark modules — a real code needs hundreds`);

  const found = jsQR(data, size, size);
  assert(found, 'a QR reader cannot decode the code the install page paints');
  assert(found.data === payload, `the QR decodes to ${found.data}, not ${payload}`);
});

/** Fails the check when `fn` returns instead of throwing. */
function throws(fn, message) {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(message);
}

check('A sideloaded install is offered a newer build from the release record', () => {
  const {
    parseRelease,
    parseVersion,
    compareVersions,
    decideUpdate,
    releaseSizeLabel,
  } = require(path.join(ROOT, 'lib', 'releaseManifest.ts'));

  // The record baked into the image is the one every installed app reads, so it
  // has to be the shape the app parses and point at the stable download route.
  const shipped = JSON.parse(read('public/downloads/latest.json'));
  const release = parseRelease(shipped);
  assert(
    release.url === 'https://bolingo.co.ke/download/android',
    `the update must open the stable download route, not ${release.url}`
  );
  assert(parseVersion(release.version), `the published version "${release.version}" is not a release number`);
  assert(/^[0-9a-f]{64}$/.test(release.sha256 || ''), 'the record the app reads must carry the checksum it was built with');
  assert(releaseSizeLabel(release) === '166 MB', `the update card size line should read 166 MB, got ${releaseSizeLabel(release)}`);

  // The app compares its own baked-in version, so the committed record must not
  // look newer than the committed config — a learner on the shipped build has to
  // see nothing, not a prompt to reinstall the version they already have.
  const appConfig = read('app.config.js');
  const installed = (appConfig.match(/version:\s*'([^']+)'/) || [])[1];
  const installedPackage = (appConfig.match(/package:\s*'([^']+)'/) || [])[1];
  assert(installed, 'app.config.js must declare the version the update check compares against');
  assert(installedPackage === shipped.packageName, `the record is published for ${shipped.packageName} but the app builds ${installedPackage}`);
  const asBuilt = decideUpdate({ platform: 'android', installed, installedPackage, release });
  assert(!asBuilt.offer, `the app would offer its own release (installed ${installed}, published ${release.version})`);
  assert(asBuilt.reason === 'not-newer', `an up to date install should read as current, got ${asBuilt.reason}`);

  // What an update actually looks like, on both sides of the comparison.
  const newer = { ...release, version: '9.9.9' };
  const offer = decideUpdate({ platform: 'android', installed, installedPackage, release: newer });
  assert(offer.offer && offer.release.url === newer.url, 'a newer published build must be offered with its download url');
  assert(compareVersions('1.10.0', '1.9.0') === 1, 'versions must compare numerically — 1.10.0 is newer than 1.9.0');
  assert(compareVersions('1.0.1', '1.0.1') === 0 && compareVersions('2', '1.9.9') === 1, 'short and equal release numbers must compare correctly');
  assert(compareVersions('garbage', '1.0.0') === 0, 'an unreadable version must fail closed, not offer');
  assert(
    decideUpdate({ platform: 'android', installed: '2.0.0', installedPackage, release }).reason === 'not-newer',
    'a build older than this install must never be offered, or the app downgrades the learner'
  );

  // Silence is the correct answer for everything the app cannot act on.
  for (const platform of ['ios', 'web', 'windows']) {
    assert(
      decideUpdate({ platform, installed, installedPackage, release: newer }).reason === 'not-installable',
      `${platform} installs cannot install an Android APK and must say nothing`
    );
  }
  assert(
    decideUpdate({ platform: 'android', installed, installedPackage: 'com.example.other', release: newer }).reason === 'wrong-package',
    'a record for a different application id must not offer a download'
  );
  assert(
    decideUpdate({ platform: 'android', installed: '', installedPackage, release: newer }).reason === 'unknown-version',
    'an install that cannot read its own version must not offer anything'
  );

  // "Not now" lasts the session, and only for that release.
  assert(
    decideUpdate({ platform: 'android', installed, installedPackage, release: newer, dismissedVersion: '9.9.9' }).reason === 'dismissed',
    'a release the learner turned down must not be raised again in the same session'
  );
  assert(
    decideUpdate({ platform: 'android', installed, installedPackage, release: { ...newer, version: '9.9.10' }, dismissedVersion: '9.9.9' }).offer,
    'a newer release after a dismissal must be offered again'
  );

  // A record that cannot be trusted must be rejected rather than half-read.
  throws(() => parseRelease(null), 'a missing release record must fail closed');
  throws(() => parseRelease({ url: 'https://bolingo.co.ke/download/android' }), 'a record with no version must be rejected');
  throws(() => parseRelease({ version: 'nightly' }), 'a record with an unreadable version must be rejected');
  throws(() => parseRelease({ version: '1.0.1' }), 'a record with no download url must be rejected');
  throws(
    () => parseRelease({ version: '1.0.1', url: 'http://bolingo.co.ke/download/android' }),
    'an http download must be rejected — the app only ever opens https'
  );

  // The screens: the dashboard asks once a session, Settings can ask on demand.
  const updater = read('lib/appUpdate.ts');
  assert(/\/downloads\/latest\.json/.test(updater), 'the app must read the release record the server serves no-store');
  assert(/Platform\.OS !== 'android'/.test(updater), 'only Android installs may ask for the release record');
  assert(/api<unknown>\(MANIFEST_PATH\)/.test(updater), 'the check must reuse lib/api so the web build stays same-origin');
  assert(/setTimeout\(/.test(updater), 'a background update check must time out instead of hanging on a dead host');
  assert(/openURL\(release\.url\)/.test(updater), 'accepting the update must open the published download');

  const home = read('src/app/index.tsx');
  assert(/<UpdateCard/.test(home) && /checkAppUpdate\(\)/.test(home), 'the dashboard must check and offer the update');
  assert(/dismissAppUpdate\(update\.release\.version\)/.test(home), 'the dashboard must record a turned-down release');

  const card = read('components/dashboard/UpdateCard.tsx');
  assert(/onDownload/.test(card) && /onDismiss/.test(card), 'the update card needs both actions, not just the nag');
  assert((card.match(/accessibilityRole="button"/g) || []).length >= 2, 'each update action needs a button role');

  const settings = read('src/app/settings.tsx');
  assert(/checkAppUpdate\(true\)/.test(settings), 'Settings must be able to re-check, so "Not now" is never forever');
  assert(!/v1\.0\.0 \| Made for learners/.test(settings), 'the footer must report the installed version, not a literal');

  const docs = read('docs/contact-and-updates.md');
  assert(/latest\.json/.test(docs) && /in-app/.test(docs), 'the update docs must explain the in-app APK check');
});

check('Contact and feedback are wired on web and in the app', () => {
  assert(fs.existsSync(path.join(ROOT, 'src', 'app', 'contact.tsx')), 'the Contact screen is missing');
  const page = read('src/app/contact.tsx');
  assert(/SUPPORT_EMAIL/.test(page) && /SUPPORT_PHONES/.test(page), 'the Contact screen must show the support address and phones');
  assert(/sendFeedback/.test(page), 'the Contact screen must use the feedback API');

  const support = read('lib/support.ts');
  assert(support.includes('support@bolingo.co.ke'), 'lib/support.ts must publish the support address');
  assert(/\+254711617407/.test(support) && /\+254735336030/.test(support), 'both support numbers must be dialable');
  assert(support.includes('bolingolearn@pm.me'), 'feedback must be delivered to the owner inbox');

  const layout = read('src/app/_layout.tsx');
  assert(/name="contact"/.test(layout), 'the contact route must be registered');
  assert(read('src/app/settings.tsx').includes("router.push('/contact')"), 'Settings must link to Contact');

  const server = read('server/index.mjs');
  assert(/feedback: \{ handler: feedback/.test(server), '/api/feedback must be routed');
  assert(fs.existsSync(path.join(ROOT, 'server', 'api', 'feedback.mjs')), 'server/api/feedback.mjs is missing');
  assert(fs.existsSync(path.join(ROOT, 'server', 'lib', 'mailer.mjs')), 'server/lib/mailer.mjs is missing');
  assert(fs.existsSync(path.join(ROOT, 'db', 'migrations', '0001_feedback.sql')), 'the feedback migration is missing');
});

check('One push updates the website and the installed apps', () => {
  const workflowPath = path.join(ROOT, '.github', 'workflows', 'release.yml');
  assert(fs.existsSync(workflowPath), '.github/workflows/release.yml is missing');
  const workflow = read('.github/workflows/release.yml');
  assert(/COOLIFY_DEPLOY_WEBHOOK/.test(workflow), 'the release workflow must deploy the website');
  assert(/eas-cli@latest update/.test(workflow), 'the release workflow must publish an OTA app update');
  assert(/--environment production/.test(workflow) && /--platform all/.test(workflow), 'the OTA update needs the production environment and every platform');
  assert(/coolify-hosting/.test(workflow), 'the workflow must run on the branch Coolify builds');
  const docs = read('docs/contact-and-updates.md');
  for (const needle of ['COOLIFY_DEPLOY_WEBHOOK', 'EXPO_TOKEN', 'support@bolingo.co.ke', 'bolingolearn@pm.me']) {
    assert(docs.includes(needle), `docs/contact-and-updates.md must explain ${needle}`);
  }
});

if (failures > 0) {
  console.error(`Web publish gate FAILED — ${failures} check(s) failed.`);
  process.exit(1);
}
console.log('Web publish gate OK — Coolify Dockerfile, SPA fallback, API routes and app-ads.txt are wired.');
