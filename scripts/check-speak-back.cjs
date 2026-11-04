#!/usr/bin/env node
/**
 * Guard speak-back scoring, which is invisible until a learner is holding a
 * phone and talking. The check executes the real module from lib/speakBack.ts
 * (TypeScript compiled in memory) so it can't drift from the shipped matcher.
 *
 * Usage: node scripts/check-speak-back.cjs   (also runs from `npm test`)
 */

'use strict';

/* global __dirname -- Node provides this to CommonJS scripts. */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const MODULE = path.join(ROOT, 'lib', 'speakBack.ts');

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

const source = fs.readFileSync(MODULE, 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: MODULE,
});
const mod = { exports: {} };
new Function('exports', 'require', 'module', outputText)(mod.exports, require, mod);
const { bestSpeakBack, scoreSpeakBack, speakBackVerdict } = mod.exports;

const statuses = (result) => result.words.map((word) => `${word.word}:${word.status}`).join(' ');

check('an exact phrase scores 100', () => {
  const result = scoreSpeakBack('Yo como manzanas', 'Yo como manzanas');
  assert.equal(result.score, 100);
  assert.equal(statuses(result), 'Yo:hit como:hit manzanas:hit');
});

check('accents and punctuation fold, but are flagged close', () => {
  const result = scoreSpeakBack('¿Dónde está el baño?', 'donde esta el bano');
  assert.equal(result.score, 100);
  assert.equal(statuses(result), 'Dónde:close está:close el:hit baño:close');
});

check('one wrong word is a near miss, not a zero', () => {
  const result = scoreSpeakBack('Yo como manzanas', 'Yo como manzana');
  assert.equal(result.score, 83);
  assert.equal(statuses(result), 'Yo:hit como:hit manzanas:miss');
});

check('extra words cost a little and are shown after the target', () => {
  const result = scoreSpeakBack('manzanas', 'las manzanas');
  assert.equal(result.score, 75);
  assert.equal(statuses(result), 'manzanas:hit las:extra');
});

check('a different word is a miss even when the rhythm is right', () => {
  const result = scoreSpeakBack('la niña', 'el niño');
  assert.equal(result.score, 50);
  assert.equal(statuses(result), 'la:miss niña:miss');
});

check('no transcript scores zero and reports nothing heard', () => {
  const result = scoreSpeakBack('Yo como manzanas', '');
  assert.equal(result.score, 0);
  assert.equal(result.heard, '');
  assert.equal(result.words.every((word) => word.status === 'miss'), true);
});

check('an empty target cannot score', () => {
  assert.equal(scoreSpeakBack('', 'hola').score, 0);
});

check('the best recognizer alternative wins', () => {
  const best = bestSpeakBack('Yo como manzanas', ['Yo como manzana', 'yo como manzanas']);
  assert.equal(best.score, 100);
  assert.equal(best.heard, 'yo como manzanas');
});

check('verdict bands line up with the score', () => {
  assert.equal(speakBackVerdict(100), 'great');
  assert.equal(speakBackVerdict(90), 'great');
  assert.equal(speakBackVerdict(89), 'good');
  assert.equal(speakBackVerdict(75), 'good');
  assert.equal(speakBackVerdict(74), 'almost');
  assert.equal(speakBackVerdict(50), 'almost');
  assert.equal(speakBackVerdict(49), 'again');
});

check('a pile of extra words reads worse than a clean attempt', () => {
  const clean = scoreSpeakBack('hola', 'hola').score;
  const noisy = scoreSpeakBack('hola', 'hola hola hola hola').score;
  assert.equal(clean, 100);
  assert.ok(noisy < clean, `expected ${noisy} < ${clean}`);
  assert.ok(noisy >= 0);
});

/* ---- A device without a recogniser must not strand the session ---- */
const speakAnswer = fs.readFileSync(path.join(ROOT, 'components', 'SpeakAnswer.tsx'), 'utf8');

check('the speaking exercise offers a typed fallback', () => {
  assert.ok(
    speakAnswer.includes("accessibilityLabel=\"Type the phrase instead of speaking\""),
    'SpeakAnswer must expose a typed fallback; without it a denied or missing microphone leaves the item unpassable.'
  );
});

check('the typed fallback is graded by the same scorer', () => {
  assert.ok(
    /scoreSpeakBack\(phrase, typed\)/.test(speakAnswer),
    'typed answers must run through scoreSpeakBack, not a looser comparison.'
  );
  assert.ok(
    /grade\(scoreSpeakBack\(phrase, typed\), 'typed'\)/.test(speakAnswer),
    'the typed attempt must be marked as typed when it is graded.'
  );
});

check('a typed pass never claims pronunciation was scored', () => {
  assert.ok(
    speakAnswer.includes('pronunciation was not scored') && speakAnswer.includes('Typed'),
    'the result panel must say a typed answer was not scored for pronunciation.'
  );
});

if (failures > 0) {
  console.error(`\n${failures} speak-back check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('\n[ok] speak-back scores exact, accented and missing words correctly');
}
