#!/usr/bin/env node
/* global process, require, module, __dirname, console, Buffer */
/**
 * Build the Flask guided walkthroughs from the reverse-engineered course.
 *
 *   node scripts/build-flask-course.cjs
 *
 * Source of truth: lab-local/flask-web-apps (tools/course.json + lab_content/*.md),
 * the locally rebuilt LabEx "Flask Web Applications" lab — 17 modules, 84 steps,
 * 138 graded checks. Every module becomes one guided lab in lib/labex/guided/flask,
 * so the app and the web build show the *whole* course instead of the thin scraped
 * summary the original corpus import produced.
 *
 * The output file keeps the shape scripts/import-labex.cjs writes (a single JSON
 * chunk plus the resolver index) so nothing downstream has to change. Re-run this
 * after any change to the course spec, then `npm run check:guided`.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const COURSE_DIR = path.join(ROOT, 'lab-local', 'flask-web-apps');
const COURSE_JSON = path.join(COURSE_DIR, 'tools', 'course.json');
const CONTENT_DIR = path.join(COURSE_DIR, 'lab_content');
const OUT_DIR = path.join(ROOT, 'lib', 'labex', 'guided', 'flask');
const CHUNK_NAME = 'chunk-01.ts';

/** LabEx corpus lab id per module slug (the ids registered in lib/labex/index.ts). */
const LAB_ID = {
  'quickstart-web-app': 'labex-flask-getting-started-with-flask-web-framework',
  'jinja2-templates': 'labex-flask-flask-jinja2-templates',
  'dev-server-workflow': 'labex-flask-develop-flask-app-with-development-server',
  'flask-cli': 'labex-flask-flask-command-line-interface',
  'flaskr-factory': 'labex-flask-building-a-flask-application',
  'flaskr-sqlite': 'labex-flask-python-flask-sqlite-database-setup',
  'flaskr-auth': 'labex-flask-modular-flask-application-with-authenticatio',
  'flaskr-styling': 'labex-flask-styling-flask-application',
  'flaskr-blog': 'labex-flask-flask-blog-application',
  'configuration-management': 'labex-flask-flask-configuration-management',
  signals: 'labex-flask-signals-in-flask-for-application-lifecycle',
  'working-with-the-shell': 'labex-flask-working-with-the-shell',
  'testing-basics': 'labex-flask-testing-flask-applications',
  'pytest-and-coverage': 'labex-flask-flask-unit-testing-with-pytest-and-coverage',
  'secure-development': 'labex-flask-secure-flask-web-application-development',
  'async-views': 'labex-flask-using-async-and-await-in-flask',
  deployment: 'labex-flask-deploy-flask-application',
};

const SOURCE = 'pallets/flask · BSD 3-Clause';

/* limits enforced by scripts/check-guided.cjs — respect them at build time */
const MAX_PARAGRAPH = 700;
const MAX_SNIPPET = 2500;
const MAX_REFERENCE = 4200;
const MAX_COMMANDS = 12;

/* ------------------------------------------------------------------ helpers */

function cleanText(line) {
  return String(line)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // in-app images point at corpus asset paths
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/~~([^~]*)~~/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/** Long prose becomes several paragraphs instead of one clipped block. */
function splitParagraph(paragraph) {
  if (paragraph.length <= MAX_PARAGRAPH) return [paragraph];
  const parts = paragraph.split(/(?<=[.!?])\s+/);
  const out = [];
  let current = '';
  for (const part of parts) {
    if (current && `${current} ${part}`.length > MAX_PARAGRAPH) {
      out.push(current);
      current = part;
    } else {
      current = current ? `${current} ${part}` : part;
    }
  }
  if (current) out.push(current);
  return out.filter((item) => item.length > 0);
}

/** Code blocks are shown verbatim; oversized ones break at line boundaries. */
function splitCode(text) {
  const chunks = [];
  let current = '';
  for (const line of String(text).split(/\r?\n/)) {
    if (current && `${current}\n${line}`.length > MAX_SNIPPET) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current.trim()) chunks.push(current);
  return chunks.filter((chunk) => chunk.trim().length > 0);
}

function section(md, heading) {
  const pattern = new RegExp(`^## ${heading}\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm');
  const match = pattern.exec(md);
  return match ? match[1].trim() : '';
}

function fencedBlocks(text) {
  const out = [];
  const pattern = /^```([a-zA-Z0-9+#._-]*)\n([\s\S]*?)^```/gm;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    out.push({ lang: (match[1] || 'text').trim(), code: match[2].replace(/\n$/, '') });
  }
  return out;
}

function proseOnly(text) {
  const withoutFences = text.replace(/^```[a-zA-Z0-9+#._-]*\n[\s\S]*?^```/gm, '');
  const lines = [];
  let paragraph = [];
  for (const raw of withoutFences.split(/\r?\n/)) {
    const line = cleanText(raw);
    if (!line) {
      if (paragraph.length) {
        lines.push(paragraph.join(' '));
        paragraph = [];
      }
      continue;
    }
    if (/^(What this step checks|Stuck\?)/i.test(line)) continue;
    paragraph.push(line.replace(/^-/, '•'));
    if (paragraph.length >= 2 || /[.!?]$/.test(line)) {
      lines.push(paragraph.join(' '));
      paragraph = [];
    }
  }
  if (paragraph.length) lines.push(paragraph.join(' '));
  return lines.flatMap(splitParagraph).filter((line) => line.length > 0);
}

/* -------------------------------------------------------------- step parsing */

function parseStep(n) {
  const file = path.join(CONTENT_DIR, `step${n}.md`);
  const md = fs.readFileSync(file, 'utf8');
  const titleLine = md.split(/\r?\n/).find((line) => line.startsWith('# ')) || `# Step ${n}`;
  const title = cleanText(titleLine.replace(/^#\s*Step\s*\d+\s*·\s*/, '')) || `Step ${n}`;
  const goal = cleanText((section(md, 'Instructions') && (md.match(/\*\*Goal:\*\*\s*(.+)/) || [])[1]) || '');
  const instructions = section(md, 'Instructions');
  const checks = section(md, 'Verify')
    .split(/\r?\n/)
    .filter((line) => line.startsWith('- '))
    .map((line) => formatCheck(cleanText(line)));
  const verify = fencedBlocks(section(md, 'Verify')).flatMap((block) =>
    block.code.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith('./lab'))
  );
  const tree = fencedBlocks(section(md, 'Expected filesystem state afterwards'))
    .map((block) => block.code)
    .join('\n');
  return { n, title, goal, instructions, checks, verify, tree };
}

/** "`ast` on `blog.py` — Python AST of blog.py — defines update" -> "ast blog.py: defines update". */
function formatCheck(line) {
  const stripped = line.replace(/^-\s*/, '');
  const parts = stripped.split(/\s+—\s+/);
  if (parts.length < 2) return stripped;
  const head = parts[0].replace(/^on\s+/, '');
  const detail = (parts.length > 2 ? parts[parts.length - 1] : parts[1]).trim();
  return `${head}: ${detail}`;
}

function buildGuidedStep(step, moduleDir) {
  const blocks = fencedBlocks(step.instructions);
  const body = [];
  if (step.goal) body.push(`Goal: ${step.goal}`);
  body.push(...proseOnly(step.instructions));
  if (step.checks.length > 0) {
    body.push(`This step is graded on ${step.checks.length} check${step.checks.length === 1 ? '' : 's'}:`);
    for (const check of step.checks) body.push(`• ${check}`);
  } else {
    body.push('This step is a reading step — nothing to grade; follow it before the next one.');
  }
  body.push(`Verify with ./lab check ${step.n} inside ${moduleDir}. Exit code 0 means the step passed; the grader inspects the real files, imports the real code and talks to the real server.`);
  return {
    title: `Step ${step.n} · ${step.title}`,
    body: body.flatMap(splitParagraph).filter((line) => line.length > 0),
    code: blocks.flatMap((block) =>
      splitCode(block.code).map((text) => ({ lang: block.lang === 'shell-session' ? 'bash' : block.lang, text }))
    ),
  };
}

/* ------------------------------------------------------------------- module */

function buildLab(module, stepsById) {
  const id = LAB_ID[module.slug];
  if (!id) throw new Error(`No LabEx flask lab id mapped for module slug "${module.slug}".`);
  const numbers = [];
  for (let n = module.step_from; n <= module.step_to; n += 1) numbers.push(n);
  const parsed = numbers.map((n) => stepsById.get(n));
  if (parsed.length === 0) throw new Error(`Module ${module.n} has no steps.`);
  if (parsed.length > 8) throw new Error(`Module ${module.n} has ${parsed.length} steps; the guided gate caps a lab at 8.`);

  const commands = [];
  const pushCommand = (command) => {
    const value = String(command).replace(/^\$\s*/, '').trim();
    if (!value || value.startsWith('#') || value.length > 120) return;
    if (commands.includes(value) || commands.length >= MAX_COMMANDS) return;
    commands.push(value);
  };
  pushCommand(`cd ${module.dir}`);
  for (const step of parsed) {
    for (const block of fencedBlocks(step.instructions)) {
      if (!/^(bash|shell|sh|text|console)$/.test(block.lang)) continue;
      for (const line of block.code.split(/\r?\n/)) pushCommand(line);
    }
  }
  for (const step of parsed) for (const line of step.verify) pushCommand(line);

  const checklist = parsed
    .map((step) => {
      const checks = step.checks.length > 0 ? step.checks.join('; ') : 'no graded checks — read and follow';
      return `step ${step.n} · ${step.title}\n  goal: ${step.goal || '(see instructions)'}\n  graded: ${checks}\n  verify: ./lab check ${step.n}`;
    })
    .join('\n\n');

  const trees = parsed
    .filter((step) => step.tree)
    .map((step) => `# after step ${step.n} — ${step.title}\n${step.tree}`)
    .join('\n\n');

  const reference = [
    { path: `${module.dir}/graded-checklist.txt`, text: trimText(checklist) },
    { path: `${module.dir}/expected-state.txt`, text: trimText(trees || `No files change in this module; it is a walkthrough of ${module.title.toLowerCase()}.`) },
  ].filter((file) => file.text.length >= 10);

  const checkCount = parsed.reduce(
    (total, step) => total + (stepsById.get(step.n).checkCount || 0),
    0
  );

  return {
    id,
    lab: {
      intro: `${module.summary} This is the full reverse-engineered course: ${parsed.length} steps and ${checkCount} graded checks, rebuilt as a self-contained Docker lab (lab-local/flask-web-apps) with a step-by-step grader. Read-only here — the walkthrough shows the real instructions, code and what every step is graded on.`,
      steps: parsed.map((step) => buildGuidedStep(step, module.dir)),
      commands,
      reference,
      source: SOURCE,
    },
  };
}

function trimText(text) {
  const value = String(text).replace(/\r\n/g, '\n').trim();
  if (value.length <= MAX_REFERENCE) return value;
  return `${value.slice(0, MAX_REFERENCE - 40)}\n… (truncated: see lab_content/stepN.md)`;
}

/* ---------------------------------------------------------------------- main */

function main() {
  if (!fs.existsSync(COURSE_JSON)) {
    console.error(`Missing course spec: ${path.relative(ROOT, COURSE_JSON)}`);
    console.error('This generator needs lab-local/flask-web-apps (the rebuilt Flask course).');
    process.exit(1);
  }
  const course = JSON.parse(fs.readFileSync(COURSE_JSON, 'utf8'));
  const stepsById = new Map();
  for (const step of course.steps) {
    const parsed = parseStep(step.n);
    parsed.checkCount = (step.checks || []).length;
    stepsById.set(step.n, parsed);
  }

  const entries = {};
  const where = {};
  let totalSteps = 0;
  for (const module of course.modules) {
    const { id, lab } = buildLab(module, stepsById);
    entries[id] = lab;
    where[id] = 1;
    totalSteps += lab.steps.length;
  }
  const gradedChecks = course.steps.reduce((total, step) => total + (step.checks || []).length, 0);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const chunk = `/**
 * Guided walkthroughs · Flask · chunk 1.
 * Generated by scripts/build-flask-course.cjs from lab-local/flask-web-apps
 * (tools/course.json + lab_content) — the reverse-engineered 84-step course.
 * Read-only: these labs need a Python/Flask runtime this build does not ship.
 * Do not edit by hand; edit the course spec and re-run the generator.
 */

import type { GuidedLab } from '../../../quizBank';

export const GUIDED: Record<string, GuidedLab> = ${JSON.stringify(entries, null, 0)};
`;
  fs.writeFileSync(path.join(OUT_DIR, CHUNK_NAME), chunk, 'utf8');

  const resolver = `/**
 * Guided walkthrough resolver · Flask.
 * Generated by scripts/build-flask-course.cjs — do not edit by hand.
 */

import type { GuidedLab } from '../../../quizBank';

type Chunk = Record<string, GuidedLab>;

const CHUNKS: Record<number, () => Promise<Chunk>> = {
  1: () => import('./chunk-01').then((m) => m.GUIDED),
};

const WHERE: Record<string, number> = {
${Object.keys(where)
  .map((id) => `  '${id}': 1,`)
  .join('\n')}
};

export async function loadGuidedLab(id: string): Promise<GuidedLab | undefined> {
  const chunk = WHERE[id];
  if (!chunk) return undefined;
  return (await CHUNKS[chunk]())[id];
}
`;
  fs.writeFileSync(path.join(OUT_DIR, 'index.ts'), resolver, 'utf8');

  console.log(
    `wrote lib/labex/guided/flask — ${Object.keys(entries).length} labs, ${totalSteps} steps, ${gradedChecks} graded checks from the rebuilt course`
  );
  const sizes = fs.statSync(path.join(OUT_DIR, CHUNK_NAME)).size;
  console.log(`chunk-01.ts ${(sizes / 1024).toFixed(1)} KB`);
}

main();
