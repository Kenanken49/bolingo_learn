#!/usr/bin/env node
/**
 * scripts/check-doc-commands.cjs
 *
 * Why: README.md's Setup section and the docs teach this project by command name —
 * `npm install`, `npm start`, `npm run android`, `npm run check:mpesa`. Those names
 * are a contract with package.json that nothing enforced. A renamed or deleted
 * script keeps being documented as if it still worked (this check caught
 * `npm run check:web-publish` in README.md and docs/contact-and-updates.md while the
 * real alias is `check:web`), and a script added without a document line stays
 * undiscoverable (that is how `course:flask` arrived). Both directions are the same
 * bug seen from either side, so both are checked here.
 *
 * What:
 *   A. No stale command. Every `npm run <name>` written in README.md or docs/*.md
 *      must resolve to a real package.json script.
 *   B. No stranded script. Every script in package.json must be reachable from a
 *      document: by its own name, or by the path its command runs (some operator
 *      steps are documented as the raw `node scripts/….cjs` line instead of the npm
 *      alias). There is no allowlist, because an allowlist is where drift comes to
 *      hide — a script nobody documents is a script nobody can find.
 *   C. Floors. The Setup section must keep naming the commands a newcomer actually
 *      runs (install, start, android, ios) and README must keep naming the release
 *      entry points (`npm run gate`, `npm run typecheck`, `npm run lint`,
 *      `npm test`), each resolving to a script — so a rename or a deleted section
 *      fails until the document tells the truth again.
 *
 * Contract: reads README.md, docs/*.md and package.json; takes no arguments; writes
 * nothing; exits 0 when all three hold, 1 with one line per drift naming the file,
 * the line number and the closest matching script name.
 *
 * Used by: npm run check:docs, and the `doc-commands` gate in
 *   content/quality/gates.json that `npm run gate` and CI run.
 */
'use strict';
/* global require, process, __dirname */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts || {};
const scriptNames = Object.keys(scripts);

/* ---- the documents that teach commands ---- */

const DOC_FILES = ['README.md']
  .concat(
    fs
      .readdirSync(path.join(ROOT, 'docs'))
      .filter((f) => f.endsWith('.md'))
      .sort()
      .map((f) => `docs/${f}`)
  )
  .filter((rel) => fs.existsSync(path.join(ROOT, rel)));

const readme = read('README.md');
const docsBlob = DOC_FILES.map(read).join('\n');

/* ---- what the documents must keep saying ---- */

/** The Setup section is what a new person follows first; these lines are it. */
const REQUIRED_IN_SETUP = ['npm install', 'npm start', 'npm run android', 'npm run ios'];
/** Release entry points, named where CI explains how to reproduce a run. */
const REQUIRED_IN_README = ['npm run gate', 'npm run typecheck', 'npm run lint', 'npm test'];

/** npm's own verbs, which no package.json script has to define. */
const LIFECYCLE = new Set([
  'install', 'i', 'ci', 'start', 'stop', 'restart', 'test', 'run', 'exec',
  'audit', 'link', 'pack', 'publish', 'ls', 'view', 'dedupe', 'update', 'prune',
]);

/* ---- helpers ---- */

let ok = true;

/** Runs `fn(report)`; prints one line per problem the reporter received. */
function check(name, fn) {
  const problems = [];
  fn((message) => problems.push(message));
  if (problems.length) {
    ok = false;
    console.log(`[FAIL] ${name}`);
    for (const p of problems) console.log(`     · ${p}`);
    return;
  }
  console.log(`[ok] ${name}`);
}

function escapeForRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True when `text` carries `name` as a whole token, not inside a longer one. */
function mentions(text, name) {
  return new RegExp(`(^|[^\\w:.-])${escapeForRegExp(name)}(?![\\w-])`).test(text);
}

/** README lines between `## heading` and the next `## ` heading, or null. */
function section(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

/** Up to two nearby script names, so a rename failure says what to write instead. */
function closest(name) {
  const target = name.toLowerCase();
  function distance(a, b) {
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const row = [i];
      for (let j = 1; j <= b.length; j++) {
        row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = row;
    }
    return prev[b.length];
  }
  const near = scriptNames
    .map((s) => ({ s, d: distance(target, s.toLowerCase()) }))
    .sort((x, y) => x.d - y.d)
    .slice(0, 2)
    .filter((x) => x.d <= Math.max(2, Math.floor(target.length / 3)));
  return near.length ? ` — closest scripts: ${near.map((x) => x.s).join(', ')}` : '';
}

/** The repo-relative file a script command runs, or null for external binaries. */
function commandFile(command) {
  const m = /(?:^|\s)(?:node|bun|tsx)\s+((?:scripts|server|tools|lab-local)\/[\w./-]+\.(?:cjs|mjs|js|ts))\b/.exec(command);
  return m ? m[1] : null;
}

/** `npm run <name>` occurrences, with the file and line they sit on. */
function documentedRunCommands() {
  const found = [];
  const runRe = /\bnpm\s+run\s+([A-Za-z][\w:.-]*)/g;
  for (const rel of DOC_FILES) {
    read(rel)
      .split(/\r?\n/)
      .forEach((line, i) => {
        runRe.lastIndex = 0;
        let m;
        while ((m = runRe.exec(line))) found.push({ rel, line: i + 1, name: m[1] });
      });
  }
  return found;
}

/* ---- A. every documented `npm run <name>` resolves ---- */

const runCommands = documentedRunCommands();

check('no document tells you to run a script that does not exist', (report) => {
  if (runCommands.length < 20) {
    report(`only ${runCommands.length} \`npm run\` commands found across ${DOC_FILES.length} documents — the docs are not the index this check expects, so look at the file list before trusting a pass.`);
  }
  for (const { rel, line, name } of runCommands) {
    if (!scripts[name]) {
      report(`${rel}:${line}: \`npm run ${name}\` — package.json has no script \`${name}\`${closest(name)}`);
    }
  }
});

/* ---- B. every script is reachable from a document ---- */

check('every package.json script is reachable from a document', (report) => {
  for (const name of scriptNames) {
    const command = scripts[name];
    if (mentions(docsBlob, name)) continue;
    const file = commandFile(command);
    if (file && docsBlob.includes(file)) continue;
    report(
      `nothing documents \`${name}\` (\`${command}\`)${file ? ` — neither the alias nor ${file} appears in README.md or docs/` : ''}`
    );
  }
});

/* ---- C. the sections people follow keep naming real commands ---- */

check('the Setup section still names the commands a newcomer runs', (report) => {
  const setup = section(readme, 'Setup');
  if (!setup) {
    report('README.md has no "## Setup" section, so nothing here is keeping it in step with package.json.');
    return;
  }
  for (const command of REQUIRED_IN_SETUP) {
    if (!setup.includes(command)) {
      report(`README.md's Setup section no longer tells you to run \`${command}\`.`);
      continue;
    }
    const name = command.replace(/^npm\s+(?:run\s+)?/, '');
    if (/^npm\s+run\s/.test(command)) {
      if (!scripts[name]) {
        report(`README.md's Setup section runs \`npm run ${name}\`, which package.json does not define${closest(name)}`);
      }
    } else if (!LIFECYCLE.has(name)) {
      report(`README.md's Setup section runs \`${command}\`, which is not an npm lifecycle command.`);
    }
  }
});

check('README still names the release entry points CI runs', (report) => {
  for (const command of REQUIRED_IN_README) {
    if (!readme.includes(command)) {
      report(`README.md no longer names \`${command}\`, the entry point CI documents.`);
      continue;
    }
    const name = command.replace(/^npm\s+(?:run\s+)?/, '');
    if (/^npm\s+run\s/.test(command) && !scripts[name]) {
      report(`README.md names \`npm run ${name}\`, which package.json does not define${closest(name)}`);
    }
  }
});

/* ---- report ---- */

console.log(`scanned ${DOC_FILES.length} documents, ${runCommands.length} documented commands, ${scriptNames.length} scripts`);
if (!ok) process.exit(1);
console.log('\n[ok] the documents and package.json agree.');
