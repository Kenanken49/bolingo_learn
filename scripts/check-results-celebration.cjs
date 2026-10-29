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
const CHEST_GATE = path.join(ROOT, 'lib', 'chestGate.ts');
const CHEST_REWARDS = path.join(ROOT, 'lib', 'chestRewards.ts');
const STREAK = path.join(ROOT, 'lib', 'streak.ts');
const SCREEN = path.join(ROOT, 'src', 'app', 'results.tsx');
const PATH_SCREEN = path.join(ROOT, 'src', 'app', 'index.tsx');
const CHEST_OPENING = path.join(ROOT, 'components', 'ChestOpening.tsx');

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
function loadGate(file = GATE) {
  const source = fs.readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  });
  const mod = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(mod.exports, require, mod);
  return mod.exports;
}

const gate = loadGate();
const chestGate = loadGate(CHEST_GATE);
const chestRewards = loadGate(CHEST_REWARDS);
const streak = loadGate(STREAK);

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

// A chest is claimable only when the whole unit is finished and the one-shot
// reward has not already been taken. The award bit is separate: eligibility
// alone must not start the storm if the database write failed.
check('chest eligibility requires a finished, unclaimed unit', () => {
  assert.equal(chestGate.canClaimChest({ unitComplete: true, alreadyClaimed: false }), true);
  assert.equal(chestGate.canClaimChest({ unitComplete: false, alreadyClaimed: false }), false);
  assert.equal(chestGate.canClaimChest({ unitComplete: true, alreadyClaimed: true }), false);
  assert.equal(chestGate.canClaimChest(null), false);
  assert.equal(chestGate.canClaimChest(undefined), false);
});

const chestCases = [
  ['awarded eligible claim celebrates', { unitComplete: true, alreadyClaimed: false, awarded: true }, true],
  ['incomplete claim stays off', { unitComplete: false, alreadyClaimed: false, awarded: true }, false],
  ['already-claimed chest stays off', { unitComplete: true, alreadyClaimed: true, awarded: true }, false],
  ['eligible but unawarded claim stays off', { unitComplete: true, alreadyClaimed: false, awarded: false }, false],
  ['no chest claim stays off', null, false],
  ['undefined chest claim stays off', undefined, false],
];

for (const [label, claim, expected] of chestCases) {
  check(label, () => {
    assert.equal(chestGate.shouldCelebrateChest(claim), expected);
  });
}

check('the chest table can pay XP, gems and a streak freeze', () => {
  assert.deepEqual(chestRewards.rollChestReward(() => 0), { kind: 'xp', amount: 30 });
  assert.deepEqual(chestRewards.rollChestReward(() => 0.2), { kind: 'xp', amount: 50 });
  assert.deepEqual(chestRewards.rollChestReward(() => 0.55), { kind: 'gems', amount: 5 });
  assert.deepEqual(chestRewards.rollChestReward(() => 0.8), { kind: 'gems', amount: 20 });
  assert.deepEqual(chestRewards.rollChestReward(() => 0.85), { kind: 'streak_freeze', amount: 1 });
  assert.deepEqual(chestRewards.rollChestReward(() => 0.999999), { kind: 'streak_freeze', amount: 1 });
});

check('chest labels describe the actual payout', () => {
  assert.equal(chestRewards.chestRewardLabel({ kind: 'xp', amount: 75 }), '+75 XP');
  assert.equal(chestRewards.chestRewardLabel({ kind: 'gems', amount: 10 }), '+10 gems');
  assert.equal(chestRewards.chestRewardLabel({ kind: 'streak_freeze', amount: 1 }), '+1 streak freeze');
});

check('a streak freeze covers one missed day and is consumed', () => {
  assert.deepEqual(
    streak.advanceStreak({ streak: 7, freezes: 1, lastDay: '2026-10-27', today: '2026-10-29' }),
    { streak: 8, freezes: 0, usedFreezes: 1 }
  );
});

check('a freeze does not cover a longer gap', () => {
  assert.deepEqual(
    streak.advanceStreak({ streak: 7, freezes: 1, lastDay: '2026-10-26', today: '2026-10-29' }),
    { streak: 1, freezes: 1, usedFreezes: 0 }
  );
});

check('consecutive days and same-day replays keep the streak', () => {
  assert.deepEqual(
    streak.advanceStreak({ streak: 7, freezes: 1, lastDay: '2026-10-28', today: '2026-10-29' }),
    { streak: 8, freezes: 1, usedFreezes: 0 }
  );
  assert.deepEqual(
    streak.advanceStreak({ streak: 7, freezes: 1, lastDay: '2026-10-29', today: '2026-10-29' }),
    { streak: 7, freezes: 1, usedFreezes: 0 }
  );
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

// --- chest hand-off wiring ----------------------------------------------

const pathScreen = fs.readFileSync(PATH_SCREEN, 'utf8').replace(/\r\n/g, '\n');
const chestWiring = [
  [
    'the path screen imports the shared chest gate',
    () =>
      assert.match(
        pathScreen,
        /import \{ canClaimChest, shouldCelebrateChest, type ChestClaim \} from '\.\.\/\.\.\/lib\/chestGate';/
      ),
  ],
  [
    'claim eligibility is checked before the database write',
    () => {
      assert.match(
        pathScreen,
        /const claim = \{\s*unitComplete: unit\.blocks\.every\(isBlockDone\),\s*alreadyClaimed: completed\.has\(id\),\s*\};/
      );
      assert.match(pathScreen, /if \(!canClaimChest\(claim\)\) return;/);
    },
  ],
  [
    'the rolled reward is persisted before the award is shown',
    () => {
      const rollAt = pathScreen.indexOf('const reward = rollChestReward();');
      const writeAt = pathScreen.indexOf(
        "await completeLesson(profile.id, reward.kind === 'xp' ? reward.amount : 0, id, {"
      );
      const awardAt = pathScreen.indexOf('setChestClaim({ ...claim, awarded: true });');
      assert.ok(rollAt >= 0, 'the claim must roll a reward');
      assert.ok(writeAt > rollAt, 'the roll must happen before the write');
      assert.ok(awardAt > writeAt, 'the award bit must follow the write, not precede it');
      assert.match(pathScreen, /gems: reward\.kind === 'gems' \? reward\.amount : 0,/);
      assert.match(pathScreen, /streakFreezes: reward\.kind === 'streak_freeze' \? reward\.amount : 0,/);
      assert.match(
        pathScreen,
        /catch \{\s*Alert\.alert\('Claim failed', 'Check your connection and try again\.'\);\s*\}/
      );
    },
  ],
  [
    'the ceremony reveals the rolled reward instead of fixed XP',
    () => {
      assert.match(pathScreen, /setChestReward\(reward\);/);
      assert.match(pathScreen, /const chestRewardText = chestReward \? chestRewardLabel\(chestReward\) : '';/);
      assert.match(pathScreen, /Chest claimed · \{chestRewardText\}/);
      assert.doesNotMatch(pathScreen, /CHEST_XP/);
    },
  ],
  [
    'the chest itself reveals the payout as the lid lifts',
    () => {
      const opening = fs.readFileSync(CHEST_OPENING, 'utf8').replace(/\r\n/g, '\n');
      assert.match(opening, /rewardLabel\?: string;/);
      assert.match(opening, /\{rewardLabel\}/);
      // Hidden until the lid is up, so the roll can't spoil the rattle.
      assert.match(opening, /\[LID_AT \+ 0\.02, 0\.8\]/);
      assert.match(pathScreen, /rewardLabel=\{chestRewardText\}/);
    },
  ],
  [
    'the chest opening and storm render only for an awarded claim',
    () => {
      assert.match(pathScreen, /\{chestWin && chestReward && shouldCelebrateChest\(chestClaim\) && chestPhase === 'opening' \? \(/);
      assert.match(pathScreen, /\{chestWin && chestReward && shouldCelebrateChest\(chestClaim\) && chestPhase === 'storm' \? \(/);
    },
  ],
  [
    'the onOpened hand-off re-checks the claim before starting the storm',
    () => {
      assert.match(
        pathScreen,
        /onOpened=\{\(\) => \{\s*if \(!shouldCelebrateChest\(chestClaim\)\) return;\s*setChestPhase\('storm'\);/
      );
      assert.equal(
        (pathScreen.match(/setChestPhase\('storm'\)/g) ?? []).length,
        1,
        'the storm phase should have one guarded transition'
      );
    },
  ],
  [
    'finishing the storm clears the reward, claim and title',
    () =>
      assert.match(
        pathScreen,
        /onDone=\{\(\) => \{\s*setChestWin\(null\);\s*setChestClaim\(null\);\s*setChestReward\(null\);\s*\}\}/
      ),
  ],
];

for (const [label, fn] of chestWiring) check(label, fn);

if (failures > 0) {
  console.error(`\n${failures} results-celebration check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('\n[ok] celebration mounts for passes and only for an awarded chest claim');
}
