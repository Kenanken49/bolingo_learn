#!/usr/bin/env node
/**
 * Guided-lab coverage and health gate.
 *
 * Every LabEx lab must be learnable in this build:
 *   - Git labs either run in the offline VM (scripts/check-vm.cjs proves the
 *     scenario is solvable) or ship a guided walkthrough;
 *   - every other lab ships a guided walkthrough built from its licensed
 *     source steps and reference files.
 *
 * The gate also scores each walkthrough (steps, prose, code, reference,
 * attribution) and fails below the quality floor, so a generated-but-empty
 * lab can never reach learners. Runs inside `npm test` and `npm run gate`.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const GUIDED = path.join(ROOT, 'lib', 'labex', 'guided');
const MIN_HEALTH = 70;

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

const { LABEX_META, LABEX_CATEGORIES } = require(path.join(ROOT, 'lib', 'labex', 'index.ts'));
const { GIT_SCENARIOS } = require(path.join(ROOT, 'lib', 'labex', 'gitScenarios.ts'));

const failures = [];
const fail = (message) => failures.push(message);

// Markup labs legitimately mention element names (`<div>`); only real HTML
// wrappers/badges from the source site are a leak.
const HTML = /<(div|span|a|p|br)\b[^>]*(class|href|src|style)=|<img\b[^>]*(src|class)=|<iframe\b[^>]*src=|<script\b[^>]*>/i;
const VM_COPY = /\b(go live|web 8080|vm startup|virtual machine|jupyter notebook)\b/i;

/* ---- load every generated chunk ---- */
const guided = new Map();
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.startsWith('chunk-') && entry.name.endsWith('.ts')) {
      const module = require(full);
      for (const [id, lab] of Object.entries(module.GUIDED || {})) {
        if (guided.has(id)) fail(`${id}: guided walkthrough appears in two chunks.`);
        guided.set(id, lab);
      }
    }
  }
}
walk(GUIDED);

/* ---- per-lab validation ---- */
const byCategory = {};
const health = [];
const noReference = [];
const noCode = [];

function healthOf(lab) {
  let score = 0;
  const steps = Array.isArray(lab.steps) ? lab.steps : [];
  if (steps.length >= 1) score += 30;
  if (steps.some((step) => (step.body || []).length > 0)) score += 20;
  if (Array.isArray(lab.reference) && lab.reference.length > 0) score += 20;
  const hasCode = steps.some((step) => (step.code || []).length > 0) || (lab.commands || []).length > 0;
  if (hasCode) score += 15;
  if (/license|CC-BY|MIT|BSD|Apache/i.test(String(lab.source || ''))) score += 15;
  return score;
}

for (const [id, lab] of guided.entries()) {
  const meta = LABEX_META[id];
  if (!meta) {
    fail(`${id}: guided walkthrough has no registry entry.`);
    continue;
  }
  byCategory[meta.category] = (byCategory[meta.category] || 0) + 1;
  if (typeof lab.intro !== 'string' || lab.intro.trim().length < 15) fail(`${id}: intro is too thin.`);
  if (!Array.isArray(lab.steps) || lab.steps.length === 0) {
    fail(`${id}: no steps.`);
    continue;
  }
  if (lab.steps.length > 8) fail(`${id}: ${lab.steps.length} steps exceeds the 8-step cap.`);
  if (!Array.isArray(lab.reference) || lab.reference.length === 0) noReference.push(id);
  const hasCode = lab.steps.some((step) => (step.code || []).length > 0) || (lab.commands || []).length > 0;
  if (!hasCode) noCode.push(id);
  if (!/license|CC-BY|MIT|BSD|Apache/i.test(String(lab.source || ''))) {
    fail(`${id}: missing license attribution.`);
  }
  for (const [i, step] of lab.steps.entries()) {
    if (!step || typeof step.title !== 'string' || step.title.trim().length === 0) {
      fail(`${id}: step ${i + 1} has no title.`);
      continue;
    }
    const body = Array.isArray(step.body) ? step.body : [];
    const code = Array.isArray(step.code) ? step.code : [];
    if (body.length === 0 && code.length === 0) fail(`${id}: step ${i + 1} is empty.`);
    for (const paragraph of body) {
      if (typeof paragraph !== 'string' || paragraph.trim().length === 0) fail(`${id}: step ${i + 1} has an empty paragraph.`);
      if (paragraph.length > 720) fail(`${id}: step ${i + 1} paragraph exceeds 720 chars.`);
      if (HTML.test(paragraph)) fail(`${id}: step ${i + 1} leaks raw HTML.`);
      if (VM_COPY.test(paragraph)) fail(`${id}: step ${i + 1} leaks LabEx VM copy.`);
    }
    for (const snippet of code) {
      if (!snippet || typeof snippet.text !== 'string' || snippet.text.trim().length === 0) {
        fail(`${id}: step ${i + 1} has an empty code snippet.`);
      } else if (snippet.text.length > 2600) {
        fail(`${id}: step ${i + 1} code snippet exceeds 2600 chars.`);
      }
    }
  }
  if (!Array.isArray(lab.commands) || lab.commands.length > 12) fail(`${id}: invalid command list.`);
  if (!Array.isArray(lab.reference) || lab.reference.length > 3) fail(`${id}: more than 3 reference files.`);
  for (const file of lab.reference || []) {
    if (!file || typeof file.path !== 'string' || !file.path.trim()) fail(`${id}: reference file has no name.`);
    if (typeof file.text !== 'string' || file.text.trim().length < 10) fail(`${id}: reference file ${file.path} is empty.`);
    if (file.text.length > 4300) fail(`${id}: reference file ${file.path} exceeds 4300 chars.`);
  }
  const score = healthOf(lab);
  health.push({ id, score });
  if (score < MIN_HEALTH) fail(`${id}: health ${score}/100 is below the ${MIN_HEALTH} floor.`);
}

/* ---- coverage: every registered lab is runnable or guided ---- */
let vm = 0;
let guidedOnly = 0;
let missing = 0;
for (const id of Object.keys(LABEX_META)) {
  if (Object.prototype.hasOwnProperty.call(GIT_SCENARIOS, id)) {
    vm += 1;
    continue;
  }
  if (guided.has(id)) {
    guidedOnly += 1;
    continue;
  }
  missing += 1;
  fail(`${id}: no VM scenario and no guided walkthrough.`);
}

/* ---- orphan checks ---- */
for (const id of Object.keys(GIT_SCENARIOS)) {
  if (!LABEX_META[id]) fail(`${id}: VM scenario is not a registered lab.`);
}
for (const category of LABEX_CATEGORIES) {
  const expected = Object.values(LABEX_META).filter((meta) => meta.category === category.id).length;
  const actual = byCategory[category.id] || 0;
  // Git labs covered by the VM intentionally have no guided copy unless the
  // runtime cannot express them.
  if (category.id !== 'git' && actual !== expected) {
    fail(`${category.id}: ${actual} guided walkthroughs for ${expected} labs.`);
  }
  if (category.id === 'git' && actual + Object.keys(GIT_SCENARIOS).length < expected) {
    fail(`git: ${actual} guided + ${Object.keys(GIT_SCENARIOS).length} VM for ${expected} labs.`);
  }
}

const avg = health.length ? health.reduce((sum, item) => sum + item.score, 0) / health.length : 0;
const lowest = [...health].sort((a, b) => a.score - b.score).slice(0, 5);

if (failures.length > 0) {
  console.error('Guided lab check failed:');
  for (const failure of failures.slice(0, 40)) console.error(`  ✗ ${failure}`);
  if (failures.length > 40) console.error(`  … ${failures.length - 40} more`);
  process.exit(1);
}

console.log(
  `Guided labs OK — ${guided.size} walkthroughs, ${vm} Git labs runnable in the VM, ` +
    `${guidedOnly} guided-only labs, health ${avg.toFixed(1)}/100.`
);
if (noReference.length) {
  console.log(`  · ${noReference.length} lab(s) ship no reference file (prose-only): ${noReference.slice(0, 5).join(', ')}`);
}
if (noCode.length) {
  console.log(`  · ${noCode.length} lab(s) ship no code or command (prose-only): ${noCode.slice(0, 5).join(', ')}`);
}
console.log(
  `  · lowest health: ${lowest.map((item) => `${item.id} ${item.score}`).join(' | ')}`
);
