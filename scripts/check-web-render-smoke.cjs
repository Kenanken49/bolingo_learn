#!/usr/bin/env node
/**
 * scripts/check-web-render-smoke.cjs
 *
 * Why: the website once served Expo's "Welcome to Expo / touch src/app/index.tsx"
 * starter screen in production while every gate stayed green. The deploy container
 * only runs `expo export`, and an export succeeds even when Expo Router mounts zero
 * routes: the bundler resolves `src/app` through a context map, and when that map
 * comes back empty the entry bundle is still valid JavaScript, it just renders the
 * fallback screen. `check:web` proves the Dockerfile and the server are wired; it
 * never builds a bundle, so nothing proved the bundle had a screen in it. (The root
 * cause was a `node_modules` junction on another volume — `npm run check:env` names
 * that in a millisecond; this gate owns the outcome and costs minutes.)
 *
 * What: run the deploy's own export — `expo export --platform web`, same flags as the
 * Dockerfile — into a scratch directory, then assert two things about what came out.
 *   1. The shell is real: `index.html` exists, keeps the `<div id="root">` the app
 *      mounts into, and every script it references is a file the export wrote bytes
 *      to. A dangling reference is a 404 and the learner gets a blank page.
 *   2. Every route file in `src/app` appears in the emitted JavaScript as an Expo
 *      Router context key: `"./quiz/[lessonId].tsx"`. Metro writes that map itself —
 *      `JSON.stringify("./" + path.relative(appRoot, file))` in its
 *      `createFileMap` — and Expo Router's web context filter is anchored on the same
 *      `./` form, so the key is in the bundle exactly when `require.context` found the
 *      file. Keeping the `./` is what makes this a proof instead of a substring hunt:
 *      a nested `settings/index.tsx` cannot satisfy a shallow `index.tsx`.
 *
 * Contract: Metro runs locally, so the check needs no network and no hosting account;
 * it reads the repository and writes only inside os.tmpdir(). Takes no arguments.
 * Steps are fatal and reported one at a time, because an export costs a couple of
 * minutes and the first broken step is the only one worth reading. The scratch
 * directory is deleted on success and kept on failure with its path printed, so its
 * `index.html` can be opened, and every failure points at `npm run check:env` for the
 * one machine-level cause that produces several of these shapes. Exits 1 on the first
 * failure, 0 when everything holds.
 *
 * Budget: measured 112 s end to end on a desktop (119 chunks, 24.9 MB of JS), inside the
 * deploy container's own limits, which the child pins: --max-workers 1 for its 1 vCPU
 * and NODE_OPTIONS=--max-old-space-size=1536 for its heap. So the export cannot outgrow
 * a CI runner, and a bundle that would not fit the web image cannot pass here. The
 * export aborts at 9 minutes and content/quality/gates.json caps the gate at 600 s —
 * minutes of headroom over the measurement, and little enough that one hung Metro cannot
 * eat a job that has 36 other gates to run.
 *
 * CI: no secrets needed, on purpose. The web build is single-page (app.config.js sets no
 * `web.output`), so `expo export` inlines `EXPO_PUBLIC_*` values and never executes app
 * code; a missing one bakes `undefined` into a bundle that is deleted a second later. The
 * config's hard failures are all gated on EAS_BUILD_PROFILE === 'production'. Requiring
 * secrets here would make a required check red on every fork pull request.
 *
 * Used by: npm run check:web-render, and the `web-render` gate in
 *   content/quality/gates.json that `npm run gate` and CI run.
 */
'use strict';
/* global require, process, __dirname, console */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'src', 'app');
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), 'bolingo-web-render-'));
const OUT_DIR = path.join(SCRATCH, 'dist');

/** Route files Expo Router's context scans. */
const ROUTE_EXTENSIONS = new Set(['.tsx', '.ts', '.jsx', '.js']);

/**
 * Files the web context skips on purpose — API routes and the document shell, per the
 * filter in node_modules/expo-router/_ctx.web.js. Requiring their keys in the bundle
 * would fail a correct export.
 */
const NOT_A_ROUTE = /(?:\+api|\+html|\+middleware|\+native-intent)\.[tj]sx?$/;

function fail(message) {
  console.error(`[FAIL] ${message}`);
  console.error(
    `\nThe export under test is kept in ${OUT_DIR} — open its index.html to see the screen a learner would have got.`
  );
  // One pointer for every failure mode, including the one where the export dies
  // half-written: a node_modules link onto another volume breaks bundling on Windows
  // in several shapes, and `check:env` says in a millisecond whether it is that.
  console.error('`npm run check:env` says whether this machine can bundle itself at all.');
  process.exit(1);
}

/** Every file under `dir`, absolute; empty when the directory is not there. */
function filesUnder(dir) {
  try {
    return fs
      .readdirSync(dir, { recursive: true })
      .map((relative) => path.join(dir, relative))
      .filter((abs) => fs.statSync(abs).isFile());
  } catch {
    return [];
  }
}

/** A script the browser can load: it exists and has bytes in it. */
function nonEmpty(target) {
  try {
    return fs.statSync(target).size > 0;
  } catch {
    return false;
  }
}

/** The routes that must be in the bundle, as `src/app`-relative posix paths. */
function routeFiles() {
  return filesUnder(APP_DIR)
    .filter((abs) => ROUTE_EXTENSIONS.has(path.extname(abs)) && !NOT_A_ROUTE.test(abs))
    .map((abs) => path.relative(APP_DIR, abs).split(path.sep).join('/'))
    .sort();
}

/** The same file `npx expo` runs. */
function expoCli() {
  try {
    return require.resolve('expo/bin/cli');
  } catch {
    throw new Error(`the expo CLI cannot be resolved from ${ROOT} — run npm ci before the gates.`);
  }
}

/** Abort the export here: under the 600 s the catalog gives this gate, over the build. */
const EXPORT_TIMEOUT_SECONDS = 9 * 60;

/** Seconds the export took, or the run is over. */
function exportWeb(cli) {
  const started = Date.now();
  // Same flags as the Dockerfile: --no-minify is the peak-memory step on the deploy
  // box and would only make the keys harder to see, --max-workers 1 matches the
  // 1 vCPU runner, and --output-dir keeps a gate run off the real dist/.
  const result = spawnSync(
    process.execPath,
    [cli, 'export', '--platform', 'web', '--output-dir', OUT_DIR, '--no-minify', '--max-workers', '1'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: EXPORT_TIMEOUT_SECONDS * 1000,
      env: {
        ...process.env,
        CI: '1',
        EXPO_NO_TELEMETRY: '1',
        // The deploy container builds under --max-old-space-size=1536 and says so:
        // that is the peak the export has to fit in. Inheriting the caller's value
        // means an export that dies on the deploy box passes the gate here.
        NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=1536',
      },
    }
  );
  const seconds = Math.round((Date.now() - started) / 1000);
  const tail = `${result.stdout || ''}${result.stderr || ''}`
    .trim()
    .split(/\r?\n/)
    .slice(-12)
    .join('\n    ');
  // A timeout is the interesting case, and spawnSync only reports it through error.code:
  // say so and show how far Metro got, rather than claiming the CLI never started.
  if (result.error) {
    fail(
      result.error.code === 'ETIMEDOUT'
        ? `expo export was still bundling after ${EXPORT_TIMEOUT_SECONDS}s, so Metro hung on a transform or a prompt. Last output:\n    ${tail}`
        : `expo export could not be started: ${result.error.message}`
    );
  }
  if (result.status !== 0) fail(`expo export exited ${result.status} after ${seconds}s.\n    ${tail}`);
  return seconds;
}

function main() {
  const routes = routeFiles();
  // A single root screen cannot smoke-test this app, and an empty list would let the
  // per-route assertion below grade nothing.
  if (routes.length < 10) {
    fail(`src/app only lists ${routes.length} route files in ${APP_DIR} — expected the app's screens, not an emptied router folder.`);
  }

  const seconds = exportWeb(expoCli());

  const htmlPath = path.join(OUT_DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) fail('the export wrote no index.html — nothing for the server to serve.');
  const html = fs.readFileSync(htmlPath, 'utf8');
  if (!html.includes('id="root"')) fail('index.html lost the #root element the app mounts into.');
  const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map((match) => match[1]);
  if (scripts.length === 0) fail('index.html references no script, so the page loads and renders nothing.');
  // path.join keeps a leading `/` from the shell inside the export directory, which is
  // what an absolute `src="/_expo/..."` refers to once the page is served.
  const brokenScripts = scripts.filter((src) => !nonEmpty(path.join(OUT_DIR, src)));
  if (brokenScripts.length > 0) {
    fail(`index.html references ${brokenScripts.length} of ${scripts.length} script(s) the export never wrote, e.g. ${brokenScripts[0]}.`);
  }

  const chunks = filesUnder(path.join(OUT_DIR, '_expo', 'static', 'js')).filter((abs) => abs.endsWith('.js'));
  const bundle = chunks.map((abs) => fs.readFileSync(abs, 'utf8')).join('\n');
  console.log(`[ok] exported in ${seconds}s: ${chunks.length} chunks, ${(bundle.length / 1048576).toFixed(1)} MB of JS`);

  const missing = routes.filter((rel) => !bundle.includes(`./${rel}`));
  if (missing.length > 0) {
    const shown = missing.slice(0, 12).join(', ') + (missing.length > 12 ? ', …' : '');
    fail(
      `${missing.length}/${routes.length} src/app routes are absent from the bundle as Expo Router context keys, ` +
        `so the site renders Expo's starter screen for them: ${shown}.`
    );
  }
  console.log(`[ok] all ${routes.length} src/app routes are mounted in the bundle.`);
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

fs.rmSync(SCRATCH, { recursive: true, force: true });
console.log('\n[ok] web render smoke: the exported bundle has its screens in it.');
