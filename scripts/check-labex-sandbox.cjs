#!/usr/bin/env node
/**
 * LabEx sandbox regression gate.
 *
 * Every runnable exercise generated into lib/labex/lessons must actually work
 * in the learner's sandbox. Running the generated tests here — in the same
 * order and with the same semantics as lib/codeSandbox.ts — catches a lab
 * that would strand a learner with an unwinnable or already-won task.
 *
 *   - JS: the reference solution passes every assertion; the starter fails at
 *     least one; assertions are real expressions, not canned `true`.
 *   - CSS/HTML: every test has a compiling pattern that the reference matches,
 *     the starter does not match, and the DOM assertion reads real CSSOM.
 *   - fixtures never reach the network (no external images/scripts/hrefs).
 *
 * Runs inside `npm test` and `npm run gate`.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const LESSONS = path.join(ROOT, 'lib', 'labex', 'lessons');

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

const failures = [];
const fail = (message) => failures.push(message);

const EXEC_TIMEOUT_MS = 2000;
const NETWORK = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|importScripts|require\s*\()/;
const TRIVIAL = /^(true|1|"true"|'true'|\[\]|\{\}|!!?1|Boolean\(1\))$/;

function runJs(code, tests, tag) {
  const tail = [
    'var __results = [];',
    'var __record = function (id, thunk) {',
    '  try { __results.push({ id: id, pass: !!thunk(), error: null }); }',
    '  catch (e) { __results.push({ id: id, pass: false, error: String((e && e.message) || e) }); }',
    '};',
    ...tests.map((t) => `__record(${JSON.stringify(t.id)}, function () { return (${t.run}); });`),
    'return { outcomes: __results, error: null };',
  ].join('\n');
  const body = `"use strict";\ntry {\n${code}\n${tail}\n} catch (e) { return { outcomes: [], error: String((e && e.message) || e) }; }`;
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {}, info() {}, debug() {} },
  });
  let script;
  try {
    script = new vm.Script(`(function () {\n${body}\n})()`, { filename: `${tag}.js` });
  } catch (error) {
    return { outcomes: [], error: `SyntaxError: ${error.message}` };
  }
  try {
    return script.runInContext(context, { timeout: EXEC_TIMEOUT_MS });
  } catch (error) {
    return { outcomes: [], error: error && error.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' ? 'Timeout' : String((error && error.message) || error) };
  }
}

const passes = (outcome) => !!outcome && outcome.pass === true;
const allPass = (result, tests) =>
  !!result &&
  !result.error &&
  Array.isArray(result.outcomes) &&
  tests.every((t) => result.outcomes.some((o) => o.id === t.id && passes(o)));

function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function checkFixture(html, tag) {
  if (/<script\b/i.test(html)) fail(`${tag}: fixture contains a script.`);
  if (/<link\b/i.test(html)) fail(`${tag}: fixture contains an external link.`);
  if (/\bon[a-z]+\s*=/i.test(html)) fail(`${tag}: fixture contains inline event handlers.`);
  if (/\bstyle\s*=/i.test(html)) fail(`${tag}: fixture contains inline styles.`);
  if (/\b(?:src|href)\s*=\s*["'](?:https?:)?\/\//i.test(html)) {
    fail(`${tag}: fixture reaches the network.`);
  }
  if (/@import\b/i.test(html)) fail(`${tag}: fixture imports remote CSS.`);
}

let lessons = 0;
let exercises = 0;
let jsExercises = 0;
let cssExercises = 0;
let htmlExercises = 0;

for (const file of fs.readdirSync(LESSONS).filter((f) => f.endsWith('.ts'))) {
  const module = require(path.join(LESSONS, file));
  const bank = Object.values(module).find((value) => value && typeof value === 'object');
  if (!bank) continue;
  for (const [lessonId, lesson] of Object.entries(bank)) {
    lessons += 1;
    for (const [index, question] of lesson.questions.entries()) {
      if (question.kind !== 'code' || !question.code) continue;
      exercises += 1;
      const tag = `${lessonId} Q${index + 1}`;
      const exercise = question.code;
      const tests = Array.isArray(exercise.tests) ? exercise.tests : [];
      const reference = question.correctChain[0];

      if (!['js', 'html', 'css'].includes(exercise.language)) {
        fail(`${tag}: unsupported language ${JSON.stringify(exercise.language)}.`);
        continue;
      }
      if (typeof exercise.starter !== 'string' || !exercise.starter.trim()) fail(`${tag}: empty starter.`);
      if (tests.length < 2) fail(`${tag}: needs at least two tests (${tests.length}).`);
      if (!reference?.trim()) fail(`${tag}: missing reference solution.`);
      const ids = new Set();
      for (const test of tests) {
        if (!test.id || ids.has(test.id)) fail(`${tag}: duplicate test id ${JSON.stringify(test.id)}.`);
        ids.add(test.id);
        if (!test.label?.trim()) fail(`${tag}: test ${test.id} has no label.`);
        if (!test.run?.trim()) fail(`${tag}: test ${test.id} has no assertion.`);
        if (TRIVIAL.test((test.run || '').trim())) fail(`${tag}: test ${test.id} asserts a constant.`);
        try {
          new RegExp(test.run || '', 'i');
        } catch {
          // Expressions are not regexes; only patterns are compiled below.
        }
      }

      if (exercise.language === 'js') {
        jsExercises += 1;
        if (NETWORK.test(reference || '') || NETWORK.test(exercise.starter || '')) {
          fail(`${tag}: exercise uses the network.`);
        }
        if ((reference || '').replace(/\s+/g, '') === (exercise.starter || '').replace(/\s+/g, '')) {
          fail(`${tag}: starter is the reference solution.`);
        }
        const solved = runJs(reference, tests, `${tag}.reference`);
        if (!allPass(solved, tests)) {
          const detail = solved?.error || (solved?.outcomes || []).filter((o) => !passes(o)).map((o) => `${o.id}: ${o.error}`).join('; ');
          fail(`${tag}: reference solution fails its own tests (${detail || 'no outcomes'}).`);
        }
        const unsolved = runJs(exercise.starter, tests, `${tag}.starter`);
        if (allPass(unsolved, tests)) fail(`${tag}: starter already passes every test.`);
        continue;
      }

      if (!exercise.fixture?.html) fail(`${tag}: ${exercise.language} exercise has no fixture HTML.`);
      else checkFixture(exercise.fixture.html, tag);

      if (exercise.language === 'css') cssExercises += 1;
      else htmlExercises += 1;

      const source = exercise.language === 'css' ? reference || '' : `${exercise.fixture?.html ?? ''}\n${reference ?? ''}`;
      const starter = exercise.language === 'css' ? stripCssComments(exercise.starter || '') : exercise.starter || '';
      let verified = 0;
      for (const test of tests) {
        if (!test.pattern) {
          fail(`${tag}: test ${test.id} has no offline pattern fallback.`);
          continue;
        }
        let regex;
        try {
          regex = new RegExp(test.pattern, 'i');
        } catch (error) {
          fail(`${tag}: test ${test.id} pattern does not compile (${error.message}).`);
          continue;
        }
        if (!regex.test(source)) fail(`${tag}: test ${test.id} does not match the reference.`);
        if (regex.test(starter)) fail(`${tag}: starter already matches test ${test.id}.`);
        if (exercise.language === 'css') {
          if (!/getPropertyValue\s*\(/.test(test.run)) fail(`${tag}: test ${test.id} does not read the CSSOM.`);
          const property = (test.pattern.match(/^([a-z-]+)/i) || [])[1];
          if (property && !new RegExp(`\\b${property}\\b`, 'i').test(test.run)) {
            fail(`${tag}: test ${test.id} reads a different property than it asserts.`);
          }
        }
        verified += 1;
      }
      if (verified !== tests.length) fail(`${tag}: only ${verified}/${tests.length} tests are verifiable.`);
    }
  }
}

if (exercises === 0) fail('No sandbox exercises found — generation or import regressed.');

if (failures.length > 0) {
  console.error('LabEx sandbox check failed:');
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log(
  `LabEx sandbox OK — ${exercises} runnable exercises across ${lessons} labs (${jsExercises} JS, ${cssExercises} CSS, ${htmlExercises} HTML).`
);
