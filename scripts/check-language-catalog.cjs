#!/usr/bin/env node
/**
 * Guards the generated language-catalog migration.
 *
 * The SQL is what Supabase runs, so a bad generation would ship a broken
 * catalog rather than fail a build. This check fails fast when:
 *   - the seed no longer matches the lesson banks (someone added a lesson and
 *     forgot `npm run catalog:sql`);
 *   - a question is unsolvable (a chain token missing from its token bank);
 *   - a path block points at a language lesson the migration never seeds;
 *   - the public-read policies/grants are missing.
 *
 * Runs as part of `npm test`. It parses the committed SQL instead of compiling
 * TypeScript, so it stays fast enough for the normal test loop.
 */

'use strict';

/* global __dirname -- Node provides this to CommonJS scripts. */

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.join(__dirname, '..');

// Compile the pure catalog-row module on demand, so the check exercises the
// same validation the app uses instead of a re-implementation. .ts is not a
// Node extension, and this only ever runs inside this script.
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

const { mergeLessonCatalogs, toCourseLesson } = require('../lib/languageCatalogRows.ts');
const sqlPath = path.join(root, 'supabase', 'migrations_language_catalog.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const failures = [];
const fail = (message) => failures.push(message);

function jsonBlock(tag) {
  const match = sql.match(new RegExp(`\\$${tag}\\$([\\s\\S]*?)\\$${tag}\\$`, 'm'));
  if (!match) {
    fail(`Missing $${tag}$ JSON block in ${path.relative(root, sqlPath)}.`);
    return [];
  }
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    fail(`$${tag}$ block is not valid JSON: ${error.message}`);
    return [];
  }
}

const courses = jsonBlock('catalog_courses');
const lessons = jsonBlock('catalog_lessons');
const courseIds = new Set(courses.map((course) => course.id));
const lessonIds = new Set(lessons.map((lesson) => lesson.id));

/* ---- Published transcript drafts (remote-only, not in the seed) ---- */
const draftDir = path.join(root, 'content', 'drafts');
const draftById = new Map();
if (fs.existsSync(draftDir)) {
  for (const file of fs.readdirSync(draftDir).filter((name) => name.endsWith('.json')).sort()) {
    const fullPath = path.join(draftDir, file);
    try {
      const payload = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      for (const lesson of payload.lessons ?? []) {
        if (draftById.has(lesson.id)) fail(`${lesson.id}: appears in more than one draft file.`);
        draftById.set(lesson.id, { lesson, file: path.relative(root, fullPath).split(path.sep).join('/') });
      }
    } catch (error) {
      fail(`${path.relative(root, fullPath)} is not valid draft JSON: ${error.message}`);
    }
  }
}

const publishedPath = path.join(root, 'content', 'published', 'language-lessons.json');
const publishedIds = new Set();
let publishedManifest = { lessons: [] };
if (!fs.existsSync(publishedPath)) {
  fail('content/published/language-lessons.json is missing — published drafts cannot be tracked.');
} else {
  let published = null;
  try {
    published = JSON.parse(fs.readFileSync(publishedPath, 'utf8'));
  } catch (error) {
    fail(`content/published/language-lessons.json is not valid JSON: ${error.message}`);
  }
  if (published && published.kind !== 'published-language-lessons') {
    fail('published language-lessons.json has an unexpected kind.');
  }
  if (published) publishedManifest = published;
  for (const entry of published?.lessons ?? []) {
    const label = entry.id ?? '(missing id)';
    if (entry.published !== true) fail(`${label}: published manifest entry is not marked published.`);
    if (typeof entry.id !== 'string' || typeof entry.courseId !== 'string') {
      fail(`${label}: id and courseId are required.`);
      continue;
    }
    if (!entry.id.startsWith(`${entry.courseId}-`)) {
      fail(`${label}: id does not start with its course prefix "${entry.courseId}-".`);
    }
    if (lessonIds.has(entry.id)) {
      fail(`${label}: published draft shadows a built-in seed row.`);
    }
    if (entry.position !== undefined && !Number.isInteger(entry.position)) {
      fail(`${label}: position must be an integer when present.`);
    }
    const draft = draftById.get(entry.id);
    if (!draft) {
      fail(`${label}: no matching lesson in content/drafts/.`);
    } else {
      if (entry.draftFile && entry.draftFile !== draft.file) {
        fail(`${label}: draftFile points at ${entry.draftFile}, but the lesson is in ${draft.file}.`);
      }
      if (entry.title && entry.title !== draft.lesson.title) {
        fail(`${label}: title does not match the draft.`);
      }
      if (!toCourseLesson(draft.lesson)) {
        fail(`${label}: draft is rejected by toCourseLesson().`);
      }
      if (draft.lesson.published !== false) {
        fail(`${label}: the generated draft artifact must stay published = false.`);
      }
    }
    publishedIds.add(entry.id);
  }
}

if (courses.length === 0) fail('Seed contains no courses.');
if (lessons.length === 0) fail('Seed contains no lessons.');
if (courseIds.size !== courses.length) fail('Seed contains duplicate course ids.');
if (lessonIds.size !== lessons.length) fail('Seed contains duplicate lesson ids.');

for (const course of courses) {
  for (const key of ['id', 'title', 'icon', 'blurb']) {
    if (typeof course[key] !== 'string' || course[key].length === 0) {
      fail(`Course ${course.id ?? '(unknown)'} has an empty ${key}.`);
    }
  }
  if (!Number.isInteger(course.position)) fail(`Course ${course.id} needs an integer position.`);
}

const perCourse = Object.fromEntries(courses.map((course) => [course.id, 0]));

for (const lesson of lessons) {
  const label = lesson.id ?? '(missing id)';
  if (!courseIds.has(lesson.course_id)) fail(`${label}: unknown course_id "${lesson.course_id}".`);
  else perCourse[lesson.course_id] += 1;
  if (!lesson.id.startsWith(`${lesson.course_id}-`)) {
    fail(`${label}: id does not start with its course prefix "${lesson.course_id}-".`);
  }
  if (typeof lesson.title !== 'string' || lesson.title.trim().length === 0) fail(`${label}: empty title.`);
  if (!Array.isArray(lesson.theory) || lesson.theory.length === 0) fail(`${label}: theory must be a non-empty array.`);
  if (!Number.isInteger(lesson.position)) fail(`${label}: position must be an integer.`);
  if (!Array.isArray(lesson.questions) || lesson.questions.length < 3) {
    fail(`${label}: needs at least 3 questions.`);
    continue;
  }

  lesson.questions.forEach((question, index) => {
    const at = `${label} Q${index + 1}`;
    if (!question || typeof question.prompt !== 'string' || question.prompt.trim().length === 0) {
      fail(`${at}: empty prompt.`);
      return;
    }
    if (!Array.isArray(question.correctChain) || question.correctChain.length === 0) {
      fail(`${at}: empty correctChain.`);
      return;
    }
    if (!Array.isArray(question.scrambledTokens)) {
      fail(`${at}: scrambledTokens missing.`);
      return;
    }
    if (typeof question.explain !== 'string' || question.explain.trim().length === 0) {
      fail(`${at}: missing explain.`);
    }
    const bank = [...question.scrambledTokens];
    for (const token of question.correctChain) {
      const at2 = bank.indexOf(token);
      if (at2 === -1) {
        fail(`${at}: token "${token}" is not in the token bank — unsolvable.`);
        break;
      }
      bank.splice(at2, 1);
    }
  });
}

if (lessons.length > 0 && lessons.length < 20) {
  fail(`Only ${lessons.length} lessons seeded — the catalog looks truncated.`);
}

/* ---- The app's own validator must accept every seeded row ---- */
const accepted = lessons.map((row) => toCourseLesson(row));
const rejected = lessons.filter((row, index) => !accepted[index]);
for (const row of rejected) {
  fail(`${row.id}: seeded row is rejected by toCourseLesson() — the app would fall back to the bundle for it.`);
}

/* ---- Bad rows degrade to the bundle instead of crashing ---- */
const goodQuestion = {
  prompt: 'Say hello',
  correctChain: ['Habari'],
  scrambledTokens: ['Habari', 'Asante'],
  explain: 'Habari is the greeting.',
};

const badRows = [
  ['empty title', { id: 'swahili-x', title: '  ', theory: ['t'], questions: [goodQuestion] }],
  ['missing explain', { id: 'swahili-x', title: 'X', theory: ['t'], questions: [{ ...goodQuestion, explain: '' }] }],
  [
    'unsolvable chain',
    { id: 'swahili-x', title: 'X', theory: ['t'], questions: [{ ...goodQuestion, correctChain: ['Hapana'] }] },
  ],
  ['empty theory', { id: 'swahili-x', title: 'X', theory: [], questions: [goodQuestion] }],
];
for (const [label, row] of badRows) {
  if (toCourseLesson(row) !== null) fail(`Validator accepted a row with ${label}.`);
}

/* ---- Merge: remote overrides by id, bundle fills the rest ---- */
const base = {
  'swahili-a': { id: 'swahili-a', title: 'Bundled A', theory: ['a'], questions: [goodQuestion] },
  'swahili-b': { id: 'swahili-b', title: 'Bundled B', theory: ['b'], questions: [goodQuestion] },
};
const merged = mergeLessonCatalogs(base, {
  'swahili-b': { id: 'swahili-b', title: 'Edited B', theory: ['b2'], questions: [goodQuestion] },
  'swahili-c': { id: 'swahili-c', title: 'New C', theory: ['c'], questions: [goodQuestion] },
});
if (Object.keys(merged).length !== 3) fail('Merge lost a lesson id.');
if (merged['swahili-a'].title !== 'Bundled A') fail('Merge dropped the bundled lesson that had no remote row.');
if (merged['swahili-b'].title !== 'Edited B') fail('Merge did not let the remote row override the bundle.');
if (base['swahili-b'].title !== 'Bundled B') fail('Merge mutated the bundled catalog.');

/* ---- Source drift: the SQL must contain every lesson the app defines ---- */
const BANK_FILES = [
  'lib/languages.ts',
  'lib/swahili-plus.ts',
  'lib/english-plus.ts',
  'lib/spanish-plus.ts',
  'lib/french-plus.ts',
  'lib/german-plus.ts',
  'lib/chess-plus.ts',
];

const sourceIds = new Set();
for (const file of BANK_FILES) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of source.matchAll(/^ {4}id: '([^']+)'/gm)) {
    sourceIds.add(match[1]);
  }
}

for (const id of sourceIds) {
  if (!lessonIds.has(id)) fail(`${id}: defined in the lesson banks but missing from the migration. Run npm run catalog:sql.`);
}
for (const id of lessonIds) {
  if (!sourceIds.has(id)) fail(`${id}: seeded but no longer defined in the lesson banks. Run npm run catalog:sql.`);
}

/* ---- Path drift: every language block must resolve after publishing ---- */
const curriculum = fs.readFileSync(path.join(root, 'lib', 'curriculum.ts'), 'utf8');
const pathLessonIds = new Set(
  [...curriculum.matchAll(/lessonId: '((?:swahili|english|spanish|french|german|chess)-[^']+)'/g)].map(
    (match) => match[1]
  )
);
for (const id of pathLessonIds) {
  if (!lessonIds.has(id) && !publishedIds.has(id)) {
    fail(`${id}: referenced by the learning path but neither seeded nor registered in content/published/language-lessons.json.`);
  }
}
for (const entry of publishedManifest.lessons ?? []) {
  if (entry.onPath && !pathLessonIds.has(entry.id)) {
    fail(`${entry.id}: marked onPath in the published manifest but missing from lib/curriculum.ts.`);
  }
}

/* ---- Security: public read, no public write ---- */
for (const required of [
  'alter table public.language_courses enable row level security',
  'alter table public.language_lessons enable row level security',
  'grant select on public.language_courses, public.language_lessons to anon, authenticated',
  'create policy "Anyone can read published language lessons"',
  'on conflict (id) do nothing',
]) {
  if (!sql.includes(required)) fail(`Migration is missing: ${required}`);
}
if (/grant\s+(insert|update|delete)[^;]*\bto\s+(anon|authenticated)\b/i.test(sql)) {
  fail('Migration grants write access to anon/authenticated — edits must go through the dashboard or service role.');
}

if (failures.length > 0) {
  console.error('Language catalog check failed:');
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

const summary = Object.entries(perCourse)
  .map(([course, count]) => `${course} ${count}`)
  .join(' · ');
console.log(`Language catalog OK — ${lessons.length} lessons across ${courses.length} courses (${summary}).`);
console.log(`Path blocks covered: ${pathLessonIds.size}.`);
if (publishedIds.size > 0) {
  console.log(`Published transcript lessons outside the seed: ${[...publishedIds].join(' · ')}.`);
}
