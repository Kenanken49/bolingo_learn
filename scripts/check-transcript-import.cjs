#!/usr/bin/env node
/**
 * Guards the transcript → draft pipeline.
 *
 * Fails when:
 *   - the committed draft JSON or SQL no longer matches the transcript
 *     (someone edited the transcript or generator and forgot to regenerate);
 *   - a generated row is rejected by the app's own `toCourseLesson()`;
 *   - a draft is accidentally published, or its id would shadow the bundle;
 *   - a question is unsolvable or lacks an explanation;
 *   - the source metadata loses its licence or attribution.
 *
 * Runs as part of `npm test`, and directly:
 *   npm run check:transcripts
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  DEFAULT_TRANSCRIPT,
  ROOT,
  readTranscript,
  buildDrafts,
  buildSql,
  outputPaths,
} = require('./import-language-transcripts.cjs');

const { toCourseLesson } = require(path.join(ROOT, 'lib', 'languageCatalogRows.ts'));

const failures = [];
const fail = (message) => failures.push(message);

const transcript = readTranscript(DEFAULT_TRANSCRIPT);
const drafts = buildDrafts(transcript);
const paths = outputPaths(transcript.source);

/* ---- Source provenance ---- */
if (!transcript.source.url) fail('source.url is missing.');
if (!transcript.source.attribution) fail('source.attribution is missing.');
if (!/public domain|cc0|cc by|creative commons/i.test(transcript.source.license)) {
  fail(`source.license is not open: "${transcript.source.license}".`);
}

/* ---- Generated files are current ---- */
const expectedJson = `${JSON.stringify(drafts, null, 2)}\n`;
let actualJson = '';
let actualSql = '';
try {
  actualJson = fs.readFileSync(paths.json, 'utf8');
} catch {
  fail(`${path.relative(ROOT, paths.json)} is missing — run the transcript importer.`);
}
try {
  actualSql = fs.readFileSync(paths.sql, 'utf8');
} catch {
  fail(`${path.relative(ROOT, paths.sql)} is missing — run the transcript importer.`);
}
if (actualJson && actualJson !== expectedJson) {
  fail(`${path.relative(ROOT, paths.json)} is stale — rerun the transcript importer.`);
}
const expectedSql = buildSql(drafts);
if (actualSql && actualSql !== expectedSql) {
  fail(`${path.relative(ROOT, paths.sql)} is stale — rerun the transcript importer.`);
}

/* ---- Every draft is unpublished and valid ---- */
if (drafts.lessons.length === 0) fail('No draft lessons were generated.');

for (const lesson of drafts.lessons) {
  const label = lesson.id || '(missing id)';
  if (lesson.published !== false) fail(`${label}: generated with published !== false.`);
  if (!lesson.id.startsWith(`${transcript.source.courseId}-`)) {
    fail(`${label}: id does not use the course prefix.`);
  }
  if (lesson.questions.length < 3) fail(`${label}: fewer than 3 questions.`);
  if (lesson.questions.length > 5) fail(`${label}: more than 5 questions.`);
  if (!toCourseLesson(lesson)) fail(`${label}: rejected by toCourseLesson().`);

  lesson.questions.forEach((question, index) => {
    const at = `${label} Q${index + 1}`;
    if (!question.prompt?.trim()) fail(`${at}: empty prompt.`);
    if (!question.explain?.trim()) fail(`${at}: missing explain.`);
    if (!Array.isArray(question.scrambledTokens) || question.scrambledTokens.length < 2) {
      fail(`${at}: needs at least two token options.`);
    }
    if (question.scrambledTokens.length <= question.correctChain.length) {
      fail(`${at}: has no distractor tokens.`);
    }
  });
}

/* ---- SQL keeps drafts unpublished and drifts with the generator ---- */
for (const required of [
  'insert into public.language_lessons',
  'select x.id, x.course_id, x.title, x.theory, x.questions, x.position, false',
  'where public.language_lessons.published = false',
]) {
  if (!actualSql.includes(required)) fail(`Generated SQL is missing: ${required}`);
}
for (const lesson of drafts.lessons) {
  if (!actualSql.includes(`"id":"${lesson.id}"`)) {
    fail(`${lesson.id}: missing from the generated SQL.`);
  }
}
const jsonBlock = actualSql.match(/\$drafts\$([\s\S]*?)\$drafts\$/);
if (!jsonBlock) {
  fail('Generated SQL has no $drafts$ JSON block.');
} else {
  try {
    const rows = JSON.parse(jsonBlock[1]);
    if (!Array.isArray(rows) || rows.length !== drafts.lessons.length) {
      fail('Generated SQL payload does not contain every draft.');
    }
  } catch (error) {
    fail(`Generated SQL contains invalid JSON: ${error.message}`);
  }
}

const sqlStatements = actualSql.replace(/--.*$/gm, '');
if (/published\s*,\s*true|published\s*=\s*true/i.test(sqlStatements)) {
  fail('Generated SQL would publish a draft.');
}

if (failures.length > 0) {
  console.error('Transcript import check failed:');
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

const questions = drafts.lessons.reduce((total, lesson) => total + lesson.questions.length, 0);
console.log(
  `Transcript import OK — ${drafts.lessons.length} draft lessons / ${questions} questions from ${transcript.source.title}.`
);
console.log(`Drafts: ${drafts.lessons.map((lesson) => lesson.id).join(' · ')}`);
