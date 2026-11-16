#!/usr/bin/env node
/**
 * scripts/check-environment.cjs
 *
 * Why: this checkout's `node_modules` is a junction to another volume, and that
 * silently broke the web bundle. Metro canonicalises every module path through the
 * link, so Expo Router's `require.context` compares `D:\…\node_modules\…` keys against
 * a `C:\…` project root, matches nothing, and mounts **0 routes**. The export still
 * exits 0 and `index.html` still renders — as Expo's "Welcome to Expo / touch
 * src/app/index.tsx" starter screen. `check:web-render` proves that outcome, but it
 * costs a couple of minutes; this command names the cause in a millisecond, so a red
 * render gate arrives with its explanation already in the same run report.
 *
 * What: two findings, each printed as one line.
 *   · node_modules volume — does `node_modules` resolve at all, and does it resolve on
 *     the same volume as the project? A cross-drive link is the bundling breaker; a
 *     same-volume link is only reported, because that is what a disk-space relocation
 *     looks like and Metro is happy with it.
 *   · project path casing — the path this run used against the on-disk spelling.
 *     Context keys are compared as strings, so `c:\…` against `C:\…` unmounts routes
 *     the same way a cross-volume link does.
 *
 * Contract: read-only, offline, takes no arguments, writes nothing. It is a command,
 * not a gate: it exits 1 to flag what it found, and that exit is never a release
 * failure, because one laptop's disk layout is not a defect in the code. The gate that
 * owns the failure is `web-render`, which names this command in its output.
 *
 * Used by: npm run check:env, and quoted by scripts/check-web-render-smoke.cjs when
 *   its bundle mounts no routes.
 */
'use strict';
/* global require, process, __dirname, console */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const NODE_MODULES = path.join(ROOT, 'node_modules');

const strip = (value) => String(value).replace(/[\\/]+$/, '');
/** Volume root on Windows (`c:\`), `/` on POSIX. */
const volumeOf = (absolute) => String(path.parse(path.resolve(absolute)).root).toLowerCase();

/** The on-disk path behind any links, or null when the target is not there. */
function realPath(target) {
  try {
    const resolved = fs.realpathSync.native ? fs.realpathSync.native(target) : fs.realpathSync(target);
    return strip(resolved);
  } catch {
    return null;
  }
}

const rootReal = realPath(ROOT);

function nodeModulesFinding() {
  const label = 'node_modules volume';
  if (!rootReal) return { label, warning: true, detail: `the project root does not resolve (${ROOT})` };

  const nmReal = realPath(NODE_MODULES);
  if (!nmReal) return { label, warning: true, detail: `${NODE_MODULES} does not resolve — run npm ci before the gates.` };

  if (volumeOf(nmReal) !== volumeOf(rootReal)) {
    return {
      label,
      warning: true,
      detail:
        `resolves to ${nmReal} on ${volumeOf(nmReal)} while the project is on ${volumeOf(rootReal)} — Metro ` +
        'resolves through the link, so Expo Router matches its src/app context keys against a root the bundle ' +
        'never sees, 0 routes mount, and the web export renders the Expo starter screen. Fix: keep node_modules ' +
        'on the project volume (a real folder, or a junction to the same drive).',
    };
  }

  const linked = nmReal !== path.join(rootReal, 'node_modules');
  return { label, warning: false, detail: `${nmReal}${linked ? ' (reached through a link on the same volume — Metro is happy)' : ''}` };
}

function casingFinding() {
  const label = 'project path casing';
  if (!rootReal) return { label, warning: false, detail: 'skipped: the project root did not resolve' };

  const asRun = strip(path.resolve(ROOT));
  if (process.platform === 'win32' && asRun.toLowerCase() === rootReal.toLowerCase() && asRun !== rootReal) {
    return {
      label,
      warning: true,
      detail: `this run used ${asRun} but the folder is ${rootReal} — context keys are compared as strings, so start the tooling from the on-disk spelling.`,
    };
  }
  return { label, warning: false, detail: rootReal };
}

const findings = [nodeModulesFinding(), casingFinding()];
for (const { label, warning, detail } of findings) {
  console.log(`[${warning ? 'warn' : 'ok'}] ${label} — ${detail}`);
}

if (findings.some((finding) => finding.warning)) {
  console.log(
    '\n[warn] not a gate: this flags the machine, not the code. Run `npm run check:web-render` to see whether the bundle already lost its routes.'
  );
  process.exitCode = 1;
} else {
  console.log('\n[ok] the machine can resolve its own bundle (diagnostic command, never a gate).');
}
