#!/usr/bin/env node
/**
 * Guard the results screen's celebration: it must mount for a pass, and stay
 * off for an ordinary failed run.
 *
 * Two layers, because either alone can drift:
 *   1. Behaviour — the real `shouldCelebrate()` from lib/resultsGate.ts is
 *      compiled in memory and executed against a pass/fail matrix, so the check
 *      runs the code the screen ships rather than a copy of it.
 *   2. Wiring — the results screen must import that gate, seed its burst from
 *      it, and render <Celebration> only behind `burst && celebrates`.
 *
 * Usage: node scripts/check-results-celebration.cjs   (also runs from `npm test`)
 * Exits 1 on any mismatch.
 */

'use strict';

/* global __dirname -- Node provides this to CommonJS scripts. */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const GATE = path.join(ROOT, 'lib', 'resultsGate.ts');
const SCREEN = path.join(ROOT, 'src', 'app', 'results.tsx');

let failures = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`[ok] ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`[FAIL] ${name}\n       ${error.message.split('\n').join('\n       ')}`);
  }
}

/** Execute the TypeScript gate in-process. `import type` is erased by the
 *  compiler, so the module needs no loader, bundler or native ESM. */
function loadGate() {
  const source = fs.readFileSync(GATE, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: GATE,
  });
  const mod = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(mod.exports, require, mod);
  return mod.exports;
}

const gate = loadGate();

check('defaults are the documented 80% threshold', () => {
  assert.equal(gate.PASS_PCT, 80);
  assert.equal(gate.resultsScore({ correctCount: 4, total: 5 }), 80);
  assert.equal(gate.resultsScore({ correctCount: 0, total: 0 }), 0);
});

// [case, result, expected celebration]
const cases = [
  ['perfect run mounts', { correctCount: 6, total: 6 }, true],
  ['exactly 80% mounts (4/5)', { correctCount: 4, total: 5 }, true],
  ['83% mounts (5/6)', { correctCount: 5, total: 6 }, true],
  ['failed 60% stays off', { correctCount: 3, total: 5 }, false],
  ['failed 67% stays off', { correctCount: 2, total: 3 }, false],
  ['zero score stays off', { correctCount: 0, total: 5 }, false],
  ['79.6% does not round up to a pass', { correctCount: 199, total: 250 }, false],
  ['empty result stays off (no divide by zero)', { correctCount: 0, total: 0 }, false],
  ['level-up after a miss still mounts', { correctCount: 3, total: 5, leveledUp: true }, true],
  ['level-up on a pass mounts once', { correctCount: 5, total: 5, leveledUp: true }, true],
  ['explicit false level-up on a miss stays off', { correctCount: 3, total: 5, leveledUp: false }, false],
];

for (const [label, result, expected] of cases) {
  check(label, () => {
    assert.equal(gate.shouldCelebrate(result), expected);
  });
}

check('no result at all stays off', () => {
  assert.equal(gate.shouldCelebrate(null), false);
  assert.equal(gate.shouldCelebrate(undefined), false);
});

// --- screen wiring -------------------------------------------------------

const screen = fs.readFileSync(SCREEN, 'utf8').replace(/\r\n/g, '\n');
const wiring = [
  [
    'results imports the shared gate instead of a local threshold',
    () => {
      assert.match(screen, /import \{[^}]*\bPASS_PCT\b[^}]*\bshouldCelebrate\b[^}]*\} from '\.\.\/\.\.\/lib\/resultsGate';/);
      assert.doesNotMatch(screen, /\bconst PASS_PCT\s*=/, 'a second PASS_PCT would let the banner and the reward disagree');
    },
  ],
  [
    'the pass banner and the celebration share one score',
    () => {
      assert.match(screen, /const score = result \? resultsScore\(result\) : 0;/);
      assert.match(screen, /const passed = score >= PASS_PCT;/);
    },
  ],
  [
    'the celebration decision comes from the gate',
    () => assert.match(screen, /const celebrates = shouldCelebrate\(result\);/),
  ],
  [
    'the burst starts on for a pass and never turns itself on later',
    () => {
      assert.match(screen, /const \[burst, setBurst\] = useState\(celebrates\);/);
      assert.match(screen, /setBurst\(false\)/, 'the storm must switch off when it finishes');
      assert.doesNotMatch(screen, /setBurst\(true\)/, 'a failed run must not be able to start celebrating');
    },
  ],
  [
    '<Celebration> renders only behind burst && celebrates',
    () => assert.match(screen, /\{burst && celebrates \? \(\s*<Celebration\b/),
  ],
];

for (const [label, fn] of wiring) check(label, fn);

if (failures > 0) {
  console.error(`\n${failures} results-celebration check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('\n[ok] celebration mounts for passes, stays off for failed runs');
}
