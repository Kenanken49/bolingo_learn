#!/usr/bin/env node
/**
 * Exercise solution gate.
 *
 * A runnable exercise is only fair if its own reference solution passes its
 * tests and its starter does not — otherwise a learner can be stuck in front
 * of an impossible or already-finished task. This runs every JavaScript
 * exercise's solution inside a timeout-guarded V8 context, then every test in
 * a second context with the starter code, and finally syntax-checks every
 * capstone live `check` expression so a typo can never ship as a broken story.
 *
 * Runs inside `npm test`.
 */

'use strict';

const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  // certifications.ts pulls in Supabase, which reaches for the React Native
  // fetch polyfill — the bank data never needs it on Node.
  if (filename.split(/[\\/]/).join('/').endsWith('lib/supabase.ts')) {
    module.exports = { supabase: {} };
    return;
  }
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const { COURSES } = require('../lib/courses.ts');
const { CERTIFICATIONS } = require('../lib/certifications.ts');

const RUN_TIMEOUT_MS = 1000;
const failures = [];
const fail = (message) => failures.push(message);

/**
 * Just enough browser to run DOM exercises honestly: create elements, set ids,
 * append them, and query by id/tag/class. Mirrors what the iframe harness
 * gives a real learner, so a solution that only works in Node is caught here.
 */
function createDom() {
  const nodes = [];
  const matches = (node, sel) => {
    if (sel.startsWith('#')) return node.id === sel.slice(1);
    if (sel.startsWith('.')) return String(node.className || '').split(/\s+/).includes(sel.slice(1));
    return node.tagName === sel.toUpperCase();
  };
  const walk = (list, out) => {
    for (const node of list) {
      out.push(node);
      walk(node.children, out);
    }
    return out;
  };
  const queryAll = (sel, root) => walk([root], []).filter((node) => matches(node, sel));
  const makeNode = (tag) => {
    const node = {
      tagName: String(tag).toUpperCase(),
      id: '',
      className: '',
      textContent: '',
      children: [],
      style: {},
      dataset: {},
      attributes: {},
      classList: {
        add() {},
        remove() {},
        toggle() {},
        contains: () => false,
      },
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      append(...items) {
        this.children.push(...items);
      },
      removeChild(child) {
        this.children = this.children.filter((c) => c !== child);
        return child;
      },
      remove() {},
      setAttribute(name, value) {
        this.attributes[name] = String(value);
        if (name === 'id') this.id = String(value);
        if (name === 'class') this.className = String(value);
      },
      getAttribute(name) {
        return name in this.attributes ? this.attributes[name] : null;
      },
      addEventListener() {},
      removeEventListener() {},
      querySelectorAll(sel) {
        return queryAll(sel, this);
      },
      querySelector(sel) {
        return queryAll(sel, this)[0] ?? null;
      },
    };
    nodes.push(node);
    return node;
  };
  const body = makeNode('body');
  const document = {
    body,
    documentElement: makeNode('html'),
    createElement: (tag) => makeNode(tag),
    createTextNode: (text) => ({ nodeType: 3, textContent: String(text) }),
    getElementById: (id) => nodes.find((node) => node.id === String(id)) ?? null,
    querySelectorAll: (sel) => queryAll(sel, body),
    querySelector: (sel) => queryAll(sel, body)[0] ?? null,
    addEventListener() {},
    removeEventListener() {},
  };
  return { document };
}

function freshContext() {
  const logs = [];
  const sandbox = { console: { log: (...a) => logs.push(a.join(' ')) }, logs, ...createDom() };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  return vm.createContext(sandbox);
}

function runAll(question, ctx) {
  const tests = question.code.tests;
  const outcomes = [];
  for (const test of tests) {
    try {
      outcomes.push({ id: test.id, pass: !!vm.runInContext(`(${test.run})`, ctx, { timeout: RUN_TIMEOUT_MS }) });
    } catch (e) {
      outcomes.push({ id: test.id, pass: false, error: e.message });
    }
  }
  return outcomes;
}

let exercised = 0;
let checks = 0;

for (const lesson of Object.values(COURSES)) {
  lesson.questions.forEach((question, index) => {
    if (question.kind !== 'code') return;
    const spec = question.code;
    if (!spec || spec.language !== 'js') return;
    const at = `${lesson.id} Q${index + 1}`;
    exercised += 1;

    const solution = question.correctChain[0];
    const solutionCtx = freshContext();
    try {
      vm.runInContext(solution, solutionCtx, { timeout: RUN_TIMEOUT_MS });
    } catch (e) {
      fail(`${at}: reference solution throws (${e.message}).`);
      return;
    }
    for (const outcome of runAll(question, solutionCtx)) {
      if (!outcome.pass) fail(`${at}: reference solution fails its own test ${outcome.id}${outcome.error ? ` (${outcome.error})` : ''}.`);
    }

    const starterCtx = freshContext();
    try {
      vm.runInContext(spec.starter, starterCtx, { timeout: RUN_TIMEOUT_MS });
    } catch {
      // A starter that only throws is fine; it cannot pass.
    }
    const starter = runAll(question, starterCtx);
    if (starter.every((outcome) => outcome.pass)) {
      fail(`${at}: the starter already passes every test — nothing left to learn.`);
    }
  });
}

for (const certification of CERTIFICATIONS) {
  for (const project of certification.projects ?? []) {
    project.stories.forEach((story, index) => {
      if (!story.check) return;
      checks += 1;
      try {
        // Compile only: live checks touch the DOM, which only exists in a browser.
        new Function(`return (${story.check})`);
      } catch (e) {
        fail(`${project.id} story ${index + 1}: live check does not compile (${e.message}).`);
      }
    });
  }
}

if (failures.length > 0) {
  console.error('Exercise solution gate failed:');
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}

console.log(
  `PASS: ${exercised} runnable exercises have passing solutions and unsolved starters; ${checks} live capstone checks compile.`
);
