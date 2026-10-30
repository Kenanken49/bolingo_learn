#!/usr/bin/env node
/**
 * Guards the dev-only celebration benchmark.
 *
 * It executes the real percentile/summary module against known frame windows,
 * then proves the route measures the actual five-second Celebration, is gated
 * by __DEV__, and is reachable from a __DEV__-only Settings row.
 *
 * Runs inside `npm test`, and directly:
 *   npm run check:benchmark
 */
'use strict';

/* global __dirname -- Node provides this to CommonJS scripts. */

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const benchmark = require(path.join(ROOT, 'lib', 'celebrationBenchmark.ts'));

const failures = [];
const fail = (message) => failures.push(message);
const check = (condition, message) => {
  if (!condition) fail(message);
};
const near = (actual, expected, epsilon = 0.0001) =>
  Number.isFinite(actual) && Math.abs(actual - expected) <= epsilon;

/* ---- Percentiles ---- */
const odd = benchmark.summarizeFrameTimes([10, 20, 30, 40, 50]);
check(odd !== null, 'odd sample set returned null.');
if (odd) {
  check(odd.samples === 5, `odd sample count is ${odd.samples}, expected 5.`);
  check(near(odd.p50, 30), `p50 is ${odd.p50}, expected 30.`);
  check(near(odd.p95, 48), `p95 is ${odd.p95}, expected 48.`);
  check(near(odd.mean, 30), `mean is ${odd.mean}, expected 30.`);
  check(near(odd.max, 50), `max is ${odd.max}, expected 50.`);
  check(near(odd.fps, 1000 / 30), `fps is ${odd.fps}, expected ${1000 / 30}.`);
}

const even = benchmark.summarizeFrameTimes([10, 20, 30, 40]);
check(even !== null, 'even sample set returned null.');
if (even) {
  check(near(even.p50, 25), `even p50 is ${even.p50}, expected 25.`);
  check(near(even.p95, 38.5), `even p95 is ${even.p95}, expected 38.5.`);
}

const one = benchmark.summarizeFrameTimes([16.7]);
check(one !== null, 'single sample returned null.');
if (one) {
  check(near(one.p50, 16.7) && near(one.p95, 16.7), 'single sample percentiles are wrong.');
  check(near(one.fps, 1000 / 16.7), 'single sample fps is wrong.');
}

check(benchmark.summarizeFrameTimes([]) === null, 'empty window did not return null.');
check(
  benchmark.summarizeFrameTimes([0, -1, Number.NaN, Infinity]) === null,
  'invalid window did not return null.'
);

const filtered = benchmark.summarizeFrameTimes([0, -2, Number.NaN, Infinity, 300, 10, 20]);
check(filtered !== null, 'filtered window returned null.');
if (filtered) {
  check(filtered.samples === 2, `filtered window has ${filtered.samples} samples, expected 2.`);
  check(near(filtered.p50, 15), `filtered p50 is ${filtered.p50}, expected 15.`);
  check(near(filtered.max, 20), `filtered max is ${filtered.max}, expected 20.`);
}

const customStall = benchmark.summarizeFrameTimes([10, 49, 50], { stallMs: 50 });
check(customStall !== null && customStall.samples === 2, 'custom stall filter kept the wrong frames.');

const shuffled = benchmark.summarizeFrameTimes([40, 10, 50, 20, 30]);
check(
  odd !== null && shuffled !== null && near(shuffled.p95, odd.p95),
  'percentiles depend on sample order.'
);

/* ---- Real-component wiring ---- */
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const screenPath = 'src/app/dev/celebration-benchmark.tsx';
const screen = read(screenPath);
const celebration = read('components/Celebration.tsx');
const settings = read('src/app/settings.tsx');
const layout = read('src/app/_layout.tsx');
const pkg = JSON.parse(read('package.json'));

check(screen.includes("from '../../../components/Celebration'"), 'benchmark does not import Celebration.');
check(
  screen.includes('<Celebration duration={FULL_CELEBRATION_MS} onDone={finish} />'),
  'benchmark does not mount the real full-duration celebration.'
);
check(screen.includes('globalThis.requestAnimationFrame'), 'benchmark does not sample rAF frames.');
check(screen.includes('summarizeFrameTimes(samples.current)'), 'benchmark does not use the shared summary.');
check(screen.includes('stats.p50.toFixed(1)'), 'benchmark does not display p50.');
check(screen.includes('stats.p95.toFixed(1)'), 'benchmark does not display p95.');
check(/p50 FRAME/.test(screen) && /p95 FRAME/.test(screen), 'benchmark lacks p50/p95 labels.');
check(
  screen.includes('if (!__DEV__) return <Redirect href="/" />;'),
  'benchmark route is not gated to development builds.'
);
check(screen.includes('BENCHMARK_SETTLE_MS'), 'benchmark does not surface the settle window.');
check(screen.includes('BENCHMARK_STALL_MS'), 'benchmark does not surface the stall filter.');

check(
  layout.includes('__DEV__ ? <Stack.Screen name="dev/celebration-benchmark" /> : null'),
  'root layout does not register the benchmark only in development.'
);
check(
  settings.includes('Celebration benchmark') &&
    settings.includes("router.push('/dev/celebration-benchmark')"),
  'Settings lacks the dev-only benchmark link.'
);
check(
  /__DEV__\s*&&\s*\n\s*row\(/.test(settings),
  'Settings benchmark link is not behind __DEV__.'
);

// The benchmark's settle/stall windows must stay aligned with the celebration's
// own adaptive quality sampler; otherwise p50/p95 and the ribbon cuts describe
// different windows.
check(
  celebration.includes('const SETTLE_MS = 700;'),
  'Celebration settle window changed; update the benchmark constant and this guard.'
);
check(
  celebration.includes('const STALL_MS = 200;'),
  'Celebration stall window changed; update the benchmark constant and this guard.'
);
check(benchmark.BENCHMARK_SETTLE_MS === 700, 'benchmark settle constant is not 700ms.');
check(benchmark.BENCHMARK_STALL_MS === 200, 'benchmark stall constant is not 200ms.');

check(
  pkg.scripts['check:benchmark'] === 'node scripts/check-celebration-benchmark.cjs',
  'package.json does not expose check:benchmark.'
);
check(
  pkg.scripts.test.includes('check-celebration-benchmark.cjs'),
  'check:benchmark is not included in npm test.'
);

if (failures.length > 0) {
  console.error('Celebration benchmark check failed:');
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log(
  'Celebration benchmark OK — p50/p95 summary, real five-second storm, dev-only route and Settings entry verified.'
);
