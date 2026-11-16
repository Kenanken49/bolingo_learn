#!/usr/bin/env node
/**
 * Course quality score — every course must reach 100.
 *
 * `check-curriculum-quality.cjs` is a pass/fail floor for individual lessons.
 * This guard scores each course card on the Path, so "the courses are good" is
 * a number anyone can read instead of a feeling. A course scores 100 only when
 * all four dimensions are complete; anything below 100 fails the gate.
 *
 * The four dimensions (see docs/curriculum-standards.md):
 *
 *   1. Teaching   (30) — every lesson teaches before it tests: at least two
 *      theory lines and 25 words of prose, so a node is a mini-lecture and not
 *      a riddle.
 *   2. Production (25) — every lesson asks the learner to build or produce
 *      something: a performance item (code, terminal, guided, text, listen,
 *      speak, match) or a token chain of 2+ they assemble themselves. Recall
 *      taps alone never taught anyone to type a command.
 *   3. Feedback   (20) — every question explains the answer in at least 20
 *      characters, because a wrong tap must still teach.
 *   4. Assessment (25) — every unit has a build block and a graded block; every
 *      graded block fills a whole session (SESSION_MAX items) with at least two
 *      production items; and every course ends in a checkpoint, final, or
 *      capstone.
 *
 * Usage:
 *   node scripts/score-courses.cjs            table + verdict
 *   node scripts/score-courses.cjs --json     machine-readable report
 *   node scripts/score-courses.cjs --why rwd  list every deduction, one line each
 */

'use strict';

const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
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

const { COURSES, PROJECTS } = require('../lib/courses.ts');
const { PUBLISHED_TRANSCRIPT_LESSONS } = require('../lib/publishedTranscriptLessons.ts');
const { CURRICULUM, COURSES_META } = require('../lib/curriculum.ts');
const { SESSION_MAX } = require('../lib/quizSession.ts');

const ALL_LESSONS = { ...COURSES, ...PUBLISHED_TRANSCRIPT_LESSONS };

const MIN_THEORY_WORDS = 25;
const MIN_THEORY_LINES = 2;
const MIN_EXPLAIN_CHARS = 20;
const MIN_CHAIN_TOKENS = 2;
const MIN_PRODUCTION_PER_ASSESSMENT = 2;

const PERFORMANCE_KINDS = ['code', 'terminal', 'guided', 'text', 'listen', 'speak', 'match'];
const BUILD_KINDS = ['workshop', 'lab', 'project'];

const words = (text) => String(text).trim().split(/\s+/).filter(Boolean).length;
const isAssessed = (block) =>
  block.kind === 'quiz' || /-(final|checkpoint)$/.test(block.lessonId);
/* A question is production when the learner assembles tokens or performs a
 * skill the engine can grade, not when they tap a pre-written option. */
const isProduction = (question) =>
  PERFORMANCE_KINDS.includes(question.kind) || (question.correctChain || []).length >= MIN_CHAIN_TOKENS;

const share = (hits, total) => (total === 0 ? 1 : hits / total);

function scoreCourse(course) {
  const units = CURRICULUM.filter((unit) => unit.course === course.id);
  const blocks = units.flatMap((unit) => unit.blocks);
  const notes = [];

  if (units.length === 0) {
    return {
      score: 0,
      dimensions: { teaching: 0, production: 0, feedback: 0, assessment: 0 },
      notes: [`${course.id}: the course card has no curriculum units at all.`],
      lessons: 0,
      questions: 0,
      units: 0,
    };
  }

  /* One entry per distinct lesson the path actually plays. Blocks that do not
   * resolve are a hard failure: the score must never reward missing content. */
  const seen = new Set();
  const lessons = [];
  let unresolved = 0;
  const countUnresolved = (block) => {
    unresolved += 1;
    notes.push(`${course.id}: ${block.id} points at "${block.lessonId}" which has no content.`);
  };
  for (const block of blocks) {
    if (block.kind === 'project') {
      if (!PROJECTS[block.lessonId] && !ALL_LESSONS[block.lessonId]) countUnresolved(block);
      continue;
    }
    /* Daily review is built from the learner's due queue, not a fixed bank. */
    if (block.kind === 'review' || block.lessonId.startsWith('srs-review:')) continue;
    const lesson = ALL_LESSONS[block.lessonId];
    if (!lesson) {
      countUnresolved(block);
      continue;
    }
    if (seen.has(lesson.id)) continue;
    seen.add(lesson.id);
    lessons.push({ block, lesson });
  }

  /* 1 · Teaching */
  let taught = 0;
  for (const { lesson } of lessons) {
    const wc = lesson.theory.reduce((sum, line) => sum + words(line), 0);
    if (lesson.theory.length >= MIN_THEORY_LINES && wc >= MIN_THEORY_WORDS) taught += 1;
    else notes.push(`${course.id}: ${lesson.id} teaches with ${lesson.theory.length} line(s), ${wc} words — needs ${MIN_THEORY_LINES}+ lines and ${MIN_THEORY_WORDS}+ words.`);
  }
  const teaching = share(taught, lessons.length);

  /* 2 · Production */
  let producing = 0;
  for (const { lesson } of lessons) {
    if (lesson.questions.some(isProduction)) producing += 1;
    else notes.push(`${course.id}: ${lesson.id} is recall-only — no build or production item.`);
  }
  const production = share(producing, lessons.length);

  /* 3 · Feedback */
  let questionTotal = 0;
  let explained = 0;
  for (const { lesson } of lessons) {
    for (const question of lesson.questions) {
      questionTotal += 1;
      if ((question.explain || '').length >= MIN_EXPLAIN_CHARS) explained += 1;
      else notes.push(`${course.id}: ${lesson.id} — thin feedback on "${question.prompt.slice(0, 48)}".`);
    }
  }
  const feedback = share(explained, questionTotal);

  /* 4 · Assessment */
  let shapeGood = 0;
  for (const unit of units) {
    const hasBuild = unit.blocks.some((block) => BUILD_KINDS.includes(block.kind));
    const assessed = unit.blocks.filter(isAssessed);
    if (hasBuild && assessed.length > 0) shapeGood += 1;
    else notes.push(`${course.id}: unit ${unit.id} needs a build block and a graded block (found build=${hasBuild ? 'y' : 'n'}, graded=${assessed.length}).`);
  }
  let assessGood = 0;
  const assessedBlocks = blocks.filter(isAssessed);
  for (const block of assessedBlocks) {
    const lesson = ALL_LESSONS[block.lessonId];
    if (!lesson) continue;
    const prod = lesson.questions.filter(isProduction).length;
    if (lesson.questions.length >= SESSION_MAX && prod >= MIN_PRODUCTION_PER_ASSESSMENT) assessGood += 1;
    else notes.push(`${course.id}: ${block.lessonId} grades on ${lesson.questions.length} item(s) with ${prod} production — needs ${SESSION_MAX}+ items and ${MIN_PRODUCTION_PER_ASSESSMENT}+ production.`);
  }
  const hasFinish = blocks.some(
    (block) => block.kind === 'project' || /-(final|checkpoint|capstone)$/.test(block.lessonId)
  );
  if (!hasFinish) notes.push(`${course.id}: no capstone, final, or checkpoint closes the course.`);
  const assessment =
    (share(shapeGood, units.length) + share(assessGood, assessedBlocks.length) + (hasFinish ? 1 : 0)) / 3;

  const dimensions = { teaching, production, feedback, assessment };
  const score = Math.round(
    (dimensions.teaching * 30 + dimensions.production * 25 + dimensions.feedback * 20 + dimensions.assessment * 25) * 10
  ) / 10;

  return {
    score,
    perfect: Object.values(dimensions).every((value) => value === 1) && unresolved === 0,
    dimensions,
    notes: notes.slice().sort((a, b) => a.localeCompare(b)),
    lessons: lessons.length,
    questions: questionTotal,
    units: units.length,
    unresolved,
  };
}

const reports = COURSES_META.map((course) => ({ course, report: scoreCourse(course) }));
const only = (() => {
  const index = process.argv.indexOf('--why');
  return index === -1 ? null : process.argv[index + 1];
})();

if (only) {
  const match = reports.find(({ course }) => course.id === only);
  if (!match) {
    console.error(`No course "${only}". Known: ${reports.map((r) => r.course.id).join(', ')}`);
    process.exit(2);
  }
  console.log(`${only}: ${match.report.score}/100`);
  for (const note of match.report.notes) console.log(`  · ${note}`);
  process.exit(match.report.perfect ? 0 : 1);
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(reports.map(({ course, report }) => ({ id: course.id, name: course.name, ...report })), null, 2));
} else {
  console.log('Course quality score — every course must reach 100/100\n');
  const header = 'course          units lessons questions  teach produ feed  assess  score';
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const { course, report } of reports) {
    const d = report.dimensions;
    const row =
      course.id.padEnd(15) +
      String(report.units).padStart(5) +
      String(report.lessons).padStart(7) +
      String(report.questions).padStart(9) +
      `  ${(d.teaching * 30).toFixed(1).padStart(5)}` +
      `  ${(d.production * 25).toFixed(1).padStart(5)}` +
      `  ${(d.feedback * 20).toFixed(1).padStart(4)}` +
      `  ${(d.assessment * 25).toFixed(1).padStart(6)}` +
      `   ${report.perfect ? '100.0' : report.score.toFixed(1)}`;
    console.log(report.perfect ? row : `${row}  ✗ ${report.notes.length} finding(s)`);
  }
}

const failing = reports.filter(({ report }) => !report.perfect);
if (failing.length > 0) {
  console.error(`\n${failing.length} course(s) below the 100-point standard:`);
  for (const { course, report } of failing) {
    console.error(`  ✗ ${course.id}: ${report.score.toFixed(1)}/100 — ${report.notes.length} finding(s); run \`node scripts/score-courses.cjs --why ${course.id}\``);
  }
  process.exit(1);
}

const totals = reports.reduce(
  (acc, { report }) => {
    acc.lessons += report.lessons;
    acc.questions += report.questions;
    return acc;
  },
  { lessons: 0, questions: 0 }
);
console.log(
  `\nAll ${reports.length} courses score 100 — ${totals.lessons} path lessons, ${totals.questions} questions, ` +
    `standard: teach 2+ lines/25+ words, produce in every lesson, explain every answer, ` +
    `assess with ${SESSION_MAX}+ items per unit test and a finisher per course.`
);
