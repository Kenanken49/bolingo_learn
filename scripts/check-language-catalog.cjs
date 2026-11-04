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
 *   - a published transcript lesson has no valid offline snapshot, so its path
 *     node cannot open without a catalog read;
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
const { normalizeAnswer } = require('../lib/quizBank.ts');
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
    if (typeof question.explain !== 'string' || question.explain.trim().length === 0) {
      fail(`${at}: missing explain.`);
    }
    // Free-response rows are graded by accepted answers, not by a token bank.
    if (question.kind === 'text') {
      const answers = question.text?.answers;
      if (!Array.isArray(answers) || answers.length === 0 || answers.some((a) => typeof a !== 'string' || !a.trim())) {
        fail(`${at}: text exercise needs non-empty accepted answers.`);
        return;
      }
      const accepted = answers.map(normalizeAnswer);
      if (new Set(accepted).size !== accepted.length) fail(`${at}: duplicate accepted answer.`);
      if (normalizeAnswer(question.correctChain[0]) !== accepted[0]) {
        fail(`${at}: correctChain[0] must match the first accepted answer.`);
      }
      return;
    }
    if (question.kind === 'code') {
      if (!question.code?.starter || !Array.isArray(question.code?.tests) || question.code.tests.length === 0) {
        fail(`${at}: code exercise needs a starter and at least one test.`);
      }
      return;
    }
    if (question.kind === 'match') {
      const pairs = question.match?.pairs;
      if (!Array.isArray(pairs) || pairs.length < 4 || pairs.length > 6) {
        fail(`${at}: match needs 4-6 pairs, found ${Array.isArray(pairs) ? pairs.length : 'none'}.`);
        return;
      }
      return;
    }
    if (question.kind === 'listen') {
      const spec = question.listen;
      if (!spec?.phrase?.trim()) fail(`${at}: listen exercise needs a phrase to speak.`);
      if (!spec || !Array.isArray(spec.answers) || spec.answers.length === 0) {
        fail(`${at}: listen exercise needs at least one accepted transcription.`);
        return;
      }
      if (normalizeAnswer(question.correctChain[0]) !== normalizeAnswer(spec.answers[0])) {
        fail(`${at}: correctChain[0] must match the first accepted answer.`);
      }
      return;
    }
    if (question.kind === 'speak') {
      const spec = question.speak;
      if (!spec?.phrase?.trim()) fail(`${at}: speak exercise needs a phrase to say.`);
      const pass = spec?.passScore ?? 75;
      if (!(pass >= 50 && pass <= 100)) fail(`${at}: speak passScore must sit between 50 and 100.`);
      return;
    }
    if (!Array.isArray(question.scrambledTokens)) {
      fail(`${at}: scrambledTokens missing.`);
      return;
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

/* ---- Offline snapshot: published transcript lessons open without a read ---- */
const offlineSnapshotPath = path.join(root, 'content', 'published', 'language-lessons.offline.json');
let offlineManifest = { lessons: [] };
const offlineById = new Map();
if (!fs.existsSync(offlineSnapshotPath)) {
  fail('content/published/language-lessons.offline.json is missing — published transcript lessons cannot open offline.');
} else {
  try {
    offlineManifest = JSON.parse(fs.readFileSync(offlineSnapshotPath, 'utf8'));
  } catch (error) {
    fail(`language-lessons.offline.json is not valid JSON: ${error.message}`);
  }
  if (offlineManifest.kind !== 'published-language-lessons-offline') {
    fail('language-lessons.offline.json has an unexpected kind.');
  }
  for (const entry of offlineManifest.lessons ?? []) {
    const label = entry.id ?? '(missing id)';
    if (typeof entry.id !== 'string' || typeof entry.courseId !== 'string') {
      fail(`${label}: offline snapshot needs id and courseId.`);
      continue;
    }
    if (!entry.id.startsWith(`${entry.courseId}-`)) {
      fail(`${label}: offline snapshot id does not start with its course prefix.`);
    }
    if (lessonIds.has(entry.id)) {
      fail(`${label}: offline snapshot shadows a built-in seed row.`);
    }
    if (!publishedIds.has(entry.id)) {
      fail(`${label}: offline snapshot is not registered in content/published/language-lessons.json.`);
    }
    if (offlineById.has(entry.id)) fail(`${label}: appears twice in the offline snapshot.`);
    const lesson = toCourseLesson(entry);
    if (!lesson) {
      fail(`${label}: offline snapshot is rejected by toCourseLesson().`);
    } else {
      offlineById.set(entry.id, lesson);
    }
    const registered = (publishedManifest.lessons ?? []).find((candidate) => candidate.id === entry.id);
    if (registered) {
      if (entry.title !== registered.title) {
        fail(`${label}: offline snapshot title does not match the published manifest.`);
      }
      if (registered.position !== undefined && entry.position !== registered.position) {
        fail(`${label}: offline snapshot position does not match the published manifest.`);
      }
    }
  }
}

for (const entry of publishedManifest.lessons ?? []) {
  if (!offlineById.has(entry.id)) {
    fail(
      `${entry.id}: published transcript lesson has no bundled offline snapshot` +
        (entry.onPath ? ' — its path node cannot open without a catalog read.' : '.')
    );
  }
}
for (const id of offlineById.keys()) {
  if (!publishedIds.has(id)) fail(`${id}: stale offline snapshot; remove it or register it as published.`);
}

// Exercise the module the quiz loader imports, not a re-implementation.
let offlineLessons = null;
try {
  offlineLessons = require(path.join(root, 'lib', 'publishedTranscriptLessons.ts'));
} catch (error) {
  fail(`the offline transcript module cannot load: ${error.message}`);
}
if (offlineLessons) {
  for (const id of publishedIds) {
    if (!offlineLessons.getPublishedTranscriptLesson(id)) {
      fail(`${id}: not resolvable from the bundled offline transcript snapshot.`);
    }
  }
  for (const id of pathLessonIds) {
    if (publishedIds.has(id) && !offlineLessons.getPublishedTranscriptLesson(id)) {
      fail(`${id}: path node has no offline lesson content.`);
    }
  }
  const shippedOfflineIds = new Set(offlineLessons.PUBLISHED_TRANSCRIPT_LESSON_IDS);
  for (const id of shippedOfflineIds) {
    if (!publishedIds.has(id)) fail(`${id}: stale offline snapshot in lib/publishedTranscriptLessons.ts.`);
  }
}

const catalogLoader = fs.readFileSync(path.join(root, 'lib', 'languageCatalog.ts'), 'utf8');
if (!catalogLoader.includes("from './publishedTranscriptLessons'")) {
  fail('languageCatalog.ts does not import the bundled published transcript snapshot.');
}
if (!catalogLoader.includes('mergeLessonCatalogs(LANGUAGE_COURSES, PUBLISHED_TRANSCRIPT_LESSONS)')) {
  fail('the builtin catalog does not merge the offline published transcript snapshot.');
}

/* ---- Offline resolution: the real loader opens the path lesson ---- */
async function checkOfflineCatalog() {
  const Module = require('node:module');
  // Make the loader believe Supabase is configured, then answer the query the
  // way an offline device does: an error result, not a rejected promise.
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://offline.invalid';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'offline-anon-key';
  let remoteResult = { data: null, error: new Error('network unavailable') };
  const offlineQuery = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    order() {
      return Promise.resolve(remoteResult);
    },
  };

  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    if (
      request === './supabase' &&
      String(parent && parent.filename).endsWith('languageCatalog.ts')
    ) {
      return { supabase: { from: () => offlineQuery } };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const catalog = require(path.join(root, 'lib', 'languageCatalog.ts'));
    const snapshot = await catalog.loadLanguageCatalog({ force: true });
    if (snapshot.source !== 'builtin') {
      fail('an unreadable catalog did not fall back to the bundled catalog.');
    }
    if (!snapshot.lessons['swahili-fsi-01']) {
      fail('the bundled catalog is missing the published transcript snapshot.');
    }
    const lesson = await catalog.getLanguageLessonAsync('swahili-fsi-01');
    if (!lesson) {
      fail('swahili-fsi-01: path node cannot resolve without a catalog read.');
    } else {
      if (lesson.title !== 'FSI 1 · Morning greetings') {
        fail('swahili-fsi-01: offline lesson title does not match the path block.');
      }
      if (lesson.questions.length !== 5) {
        fail('swahili-fsi-01: offline lesson no longer has its five reviewed questions.');
      }
    }

    // A successful remote read stays authoritative: if the transcript row is
    // unpublished (absent from the response), the offline snapshot must not
    // resurrect it online.
    const bundled = snapshot.lessons['swahili-basics'];
    if (!bundled) {
      fail('the bundled catalog is missing swahili-basics for the online comparison.');
      return;
    }
    remoteResult = {
      data: [
        {
          id: bundled.id,
          title: bundled.title,
          theory: bundled.theory,
          questions: bundled.questions,
        },
      ],
      error: null,
    };
    catalog.resetLanguageCatalogCache();
    const online = await catalog.loadLanguageCatalog({ force: true });
    if (online.source !== 'remote') {
      fail('a successful remote read was not treated as remote.');
    }
    if (await catalog.getLanguageLessonAsync('swahili-fsi-01')) {
      fail('an unpublished transcript lesson reappeared online from the offline snapshot.');
    }
  } finally {
    Module._load = originalLoad;
  }
}

/* ---- Security: public read, no public write ---- */
for (const required of [
  'alter table public.language_courses enable row level security',
  'alter table public.language_lessons enable row level security',
  'grant select on public.language_courses, public.language_lessons to anon, authenticated',
  'create policy "Anyone can read published language lessons"',
]) {
  if (!sql.includes(required)) fail(`Migration is missing: ${required}`);
}

// The seed must update existing rows. With DO NOTHING, a lesson seeded before
// the repo gained richer content (question kinds, listen/speak/match items)
// shadowed the bundle forever: the app reads the remote row first, so every
// language lesson silently degraded to plain tap-to-choose items.
if (!/on conflict \(id\) do update set[\s\S]{0,200}questions = excluded\.questions/.test(sql)) {
  fail('Migration never updates an existing lesson: publishing new content cannot reach learners.');
}
if (/grant\s+(insert|update|delete)[^;]*\bto\s+(anon|authenticated)\b/i.test(sql)) {
  fail('Migration grants write access to anon/authenticated — edits must go through the dashboard or service role.');
}

(async () => {
  try {
    await checkOfflineCatalog();
  } catch (error) {
    fail(`offline catalog resolution crashed: ${error.message}`);
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
    console.log(`Published transcript lessons outside the seed: ${[...publishedIds].join(' · ')} (offline snapshot bundled).`);
  }
})();
