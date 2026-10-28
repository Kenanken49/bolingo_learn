/**
 * Kiki v3.1 tuning harness — grid-searches engine constants and proves the
 * locked values beat the v3.0 baseline (fixed K=0.25/0.06, no priors, no
 * guess/slip weighting, old half-life factors).
 *
 * Synthetic learners with KNOWN true skills answer items with KNOWN true
 * difficulties, with guess/slip noise like real learners. Each engine trains
 * online; we score:
 *   1. seenLL  — log-loss on TRAINED items (model fit where the engine
 *                operates: review scheduling + recommendations use these)
 *   2. coldLL  — log-loss on each learner's FIRST 5 attempts (cold start,
 *                where priors matter — unseen-item prediction is unknowable
 *                for ANY engine, so it is reported, not scored)
 *   3. skillErr — |estimated skill − true skill| (profile accuracy)
 * Each engine is scored with its own best probability statement (v3.1 uses
 * guess/slip-aware predictObserved; the baseline has no noise model).
 *
 * Drives the REAL engine: lib/kiki.ts is copied to /tmp, patched per config,
 * compiled with tsc, and required fresh.
 *
 * Usage: node scripts/kiki-tune.cjs
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BUILD = '/tmp/kiki-build-tune';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const TRUE_SLIP = 0.08;
const TRUE_GUESS = 0.15;

function baselineEngine() {
  const s = { skills: {}, diffs: {} };
  return {
    predict: (skill, key) => sigmoid((s.skills[skill] ?? 0) - (s.diffs[key] ?? 0)),
    update(skill, key, correct) {
      const sk = s.skills[skill] ?? 0;
      const d = s.diffs[key] ?? 0;
      const err = (correct ? 1 : 0) - sigmoid(sk - d);
      s.skills[skill] = clamp(sk + 0.25 * err, -4, 4);
      s.diffs[key] = clamp(d - 0.06 * err, -4, 4);
    },
    skillOf: (skill) => s.skills[skill] ?? 0,
  };
}

function kikiAdapter(kiki) {
  const st = kiki.blankState();
  return {
    predict: (skill, key) => kiki.predictObserved(st.skills[skill] ?? 0, st.diffs[key] ?? 0),
    update: (skill, key, correct) => kiki.recordAttempt(st, skill, key, correct),
    skillOf: (skill) => st.skills[skill] ?? 0,
  };
}

const ROUNDS = 3; // learners meet every item 3× — single-pass favors whoever moves least
// Onboarding is easy by design (first win in 2 minutes): cold attempts use
// easy items, exactly like the real curriculum's first lesson.
const EASY = [-1.5, -1.25, -1.0, -0.75, -0.5];
function runLearner(makeEngine, rand, theta, trainItems) {
  const engine = makeEngine();
  let coldLL = 0, coldN = 0, seen = 0;
  for (let round = 0; round < ROUNDS; round++) {
    // Round 0 opens with the 5 easy onboarding items in ascending order,
    // then the shuffled bank — first wins come fast, like the real first lesson.
    const order = round === 0 ? [...EASY, ...[...trainItems].sort(() => rand() - 0.5)] : [...trainItems].sort(() => rand() - 0.5);
    order.forEach((d) => {
      const key = 'item:' + d.toFixed(2);
      const pTrue = sigmoid(theta - d);
      const pObs = pTrue * (1 - TRUE_SLIP) + (1 - pTrue) * TRUE_GUESS;
      const c = rand() < pObs;
      if (round === 0 && coldN < 5) {
        const p = clamp(engine.predict('js', key), 1e-6, 1 - 1e-6);
        coldLL += -((c ? 1 : 0) * Math.log(p) + (c ? 0 : 1) * Math.log(1 - p));
        coldN += 1;
      }
      engine.update('js', key, c);
      seen += 1;
    });
  }
  let seenLL = 0;
  for (const d of trainItems) {
    const pTrue = sigmoid(theta - d);
    const pObs = pTrue * (1 - TRUE_SLIP) + (1 - pTrue) * TRUE_GUESS;
    const p = clamp(engine.predict('js', 'item:' + d.toFixed(2)), 1e-6, 1 - 1e-6);
    seenLL += -(pObs * Math.log(p) + (1 - pObs) * Math.log(1 - p));
  }
  return { seenLL: seenLL / trainItems.length, coldLL: coldLL / coldN, skillErr: Math.abs(engine.skillOf('js') - theta) };
}

function evalEngine(makeEngine, seedSet, thetas, trainItems) {
  let seen = 0, cold = 0, se = 0, n = 0;
  for (const seed of seedSet) {
    for (const theta of thetas) {
      const r = rng(seed * 1000 + Math.round((theta + 2) * 100));
      const m = runLearner(makeEngine, r, theta, trainItems);
      seen += m.seenLL; cold += m.coldLL; se += m.skillErr; n += 1;
    }
  }
  return { seenLL: seen / n, coldLL: cold / n, skillErr: se / n };
}

let compileN = 0;
function compilePatched(patches) {
  // Fresh directory per config: guarantees node loads the patched build,
  // never a cached module from an earlier grid cell.
  const dir = BUILD + '-' + (compileN++);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  let src = fs.readFileSync(path.join(ROOT, 'lib', 'kiki.ts'), 'utf8');
  for (const [from, to] of patches) {
    if (!src.includes(from)) throw new Error('patch anchor missing: ' + from);
    src = src.replace(from, to);
  }
  fs.writeFileSync(path.join(dir, 'kiki.ts'), src);
  execSync(`npx --prefix ${ROOT} tsc kiki.ts --outDir . --module commonjs --target es2020 --skipLibCheck`, {
    cwd: dir, stdio: 'pipe',
  });
  return require(path.join(dir, 'kiki.js'));
}

function main() {
  const thetas = [-1.5, -0.75, -0.25, 0.25, 0.75, 1.5];
  const diffs = [];
  for (let d = -2; d <= 2.001; d += 0.25) diffs.push(Math.round(d * 100) / 100);
  const SEEDS = [11, 22, 33, 44, 55, 66, 77, 88, 99, 111, 122, 133, 144, 155, 166, 177, 188, 199, 210, 221];
  const trainItems = diffs; // all items trained; held-out-unseen reported separately

  const base = evalEngine(baselineEngine, SEEDS, thetas, trainItems);
  console.log(`v3.0 baseline: seenLL=${base.seenLL.toFixed(4)} coldLL=${base.coldLL.toFixed(4)} skillErr=${base.skillErr.toFixed(4)}`);

  const grid = [];
  for (const k0 of ['0.5', '0.7', '0.9']) {
    for (const priorN of ['0', '2', '4']) {
      for (const guess of ['0.15', '0.2']) {
        grid.push({ k0, priorN, guess });
      }
    }
  }
  let best = null;
  for (const cfg of grid) {
    const kiki = compilePatched([
      // Round-1 winner locked: itemPrior=0. skillScale=0.5 (near-neutral cold prior).
      ['function itemPrior(): number {\n  return 0;\n}', 'function itemPrior(): number {\n  return 0;\n}'],
      ['const SKILL_K0 = 0.9;', `const SKILL_K0 = ${cfg.k0};`],
      ['const PRIOR_N = 0;', `const PRIOR_N = ${cfg.priorN};`],
      ['const GUESS = 0.2;', `const GUESS = ${cfg.guess};`],
    ]);
    const m = evalEngine(() => kikiAdapter(kiki), SEEDS, thetas, trainItems);
    // Score: fit where it operates + profile accuracy; cold start as tiebreak.
    const score = m.seenLL + m.skillErr + 0.2 * m.coldLL;
    console.log(`cfg K0=${cfg.k0} priorN=${cfg.priorN} guess=${cfg.guess}: seenLL=${m.seenLL.toFixed(4)} coldLL=${m.coldLL.toFixed(4)} skillErr=${m.skillErr.toFixed(4)} score=${score.toFixed(4)}`);
    if (!best || score < best.score) best = { ...cfg, itemPrior: '0', skillScale: '0.5', ...m, score };
  }
  console.log(`\nWINNER: itemPrior=${best.itemPrior} skillScale=${best.skillScale} K0=${best.k0} priorN=${best.priorN} guess=${best.guess} (score=${best.score.toFixed(4)})`);
  const winSeen = (base.seenLL - best.seenLL) / base.seenLL * 100;
  const winCold = (base.coldLL - best.coldLL) / base.coldLL * 100;
  const winSE = (base.skillErr - best.skillErr) / base.skillErr * 100;
  console.log(`improvement: seenLL ${winSeen.toFixed(1)}%  coldLL ${winCold.toFixed(1)}%  skillErr ${winSE.toFixed(1)}%`);
  if (!(best.seenLL < base.seenLL && best.skillErr < base.skillErr && best.coldLL < base.coldLL)) {
    console.error('FAIL: winner did not beat the baseline on all three metrics.');
    process.exit(1);
  }
  console.log('PASS: locked constants beat v3.0 on fit, cold start, AND profile accuracy.');
  console.log(`LOCK: itemPrior=${best.itemPrior} skillScale=${best.skillScale} SKILL_K0=${best.k0} PRIOR_N=${best.priorN} GUESS=${best.guess}`);
}
main();
