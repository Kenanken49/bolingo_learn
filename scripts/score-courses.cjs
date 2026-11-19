#!/usr/bin/env node
/**
 * Course quality score — every course must clear every floor.
 *
 * `check-curriculum-quality.cjs` is a pass/fail floor for individual lessons.
 * This guard asks the questions a single lesson cannot answer: does each lesson
 * teach before it tests, does each one make the learner produce something, is
 * every answer explained, does every unit carry a build and a graded quiz, does
 * each graded quiz fill a whole session with real production, and does the
 * course end in something that closes it?
 *
 * Seven floors, each a count over the path (see docs/curriculum-standards.md):
 *
 *   teach     2+ theory lines and 25+ words in every lesson
 *   produce   1+ production item in every lesson — assembled tokens, or a kind
 *             from PRODUCTION_KINDS in lib/quizBank.ts
 *   runs      every build block executes something on the device, or its title
 *             and blurb say plainly that it is a paper exercise
 *   explain   20+ characters of explanation on every question
 *   units     a build block and a graded quiz block in every unit
 *   session   SESSION_MAX items and 2+ production items in every graded block
 *   finisher  the last unit's last block closes the course (project, final,
 *             checkpoint or capstone)
 *
 * There is deliberately no weighted average. The gate has always required every
 * dimension complete, so a 30/25/20/25 score only dressed up a pass/fail
 * verdict; the counts below say which floor is short instead.
 *
 * `produce` credits a lesson for asking the learner to assemble tokens; `runs`
 * is the floor that keeps a *build* block honest about what this app executes, so
 * that a workshop whose tokens happen to spell `git status` is not counted as
 * having run git. A build block is honest in exactly two ways: an engine named by
 * lib/execution.ts grades what the learner did, or the block's own title and blurb
 * say plainly that nothing runs. No ledger of deferred blocks and no per-course
 * cap: a block that is neither is debt the day it is written.
 *
 * What these floors still cannot see, and should not be trusted to: the engine
 * half of `runs` is not a string test — executionEngine reads live project
 * checks, VM scenario ids, sandbox `run`s and `speak` items — but the paper half
 * can only match words, so it proves the copy admits nothing runs, never that the
 * copy is good. A question repeated from an earlier lesson counts as new material
 * (the AI/ML tier finals are built that way on purpose), `match` is closer to
 * recognition than production, and a 20-character explanation can be one appended
 * sentence. Those are content reviews, not rubric edits.
 *
 * Usage:
 *   node scripts/score-courses.cjs            table + verdict
 *   node scripts/score-courses.cjs --json     machine-readable report
 *   node scripts/score-courses.cjs --why rwd  list every shortfall, one line each
 */

'use strict';

/* global __dirname -- Node provides this to CommonJS scripts. */

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  // lib/execution.ts reads the certification capstone registry, and that module
  // reaches for Supabase, which pulls the React Native fetch polyfill. The
  // registries are static data; nothing here needs a client. (Same stub as
  // scripts/check-exercise-solutions.cjs.)
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

const { COURSES, PROJECTS } = require('../lib/courses.ts');
const { PUBLISHED_TRANSCRIPT_LESSONS } = require('../lib/publishedTranscriptLessons.ts');
const { CURRICULUM, COURSES_META } = require('../lib/curriculum.ts');
const { PRODUCTION_KINDS } = require('../lib/quizBank.ts');
const { SESSION_MAX } = require('../lib/quizSession.ts');
const { isBuildBlock, defersExecution } = require('../lib/execution.ts');

const ALL_LESSONS = { ...COURSES, ...PUBLISHED_TRANSCRIPT_LESSONS };

const MIN_THEORY_WORDS = 25;
const MIN_THEORY_LINES = 2;
const MIN_EXPLAIN_CHARS = 20;
const MIN_CHAIN_TOKENS = 2;
const MIN_PRODUCTION_PER_ASSESSMENT = 2;


const words = (text) => String(text).trim().split(/\s+/).filter(Boolean).length;
/* Production = the learner assembles tokens or performs a gradeable skill, not
 * a tap on a pre-written option. Kind list lives with the question builders. */
const isProduction = (question) =>
  PRODUCTION_KINDS.includes(question.kind) ||
  (question.correctChain || []).length >= MIN_CHAIN_TOKENS;
/* Graded means a quiz block by shape, not a lesson named "-final" wearing some
 * other label: a lab cannot grade itself. */
const isGraded = (block) => block.kind === 'quiz';
const isFinisher = (block) =>
  /* Either a capstone the learner submits, or a graded quiz whose lesson id
   * says it closes the course. A lab named `git-final` is neither: it grades
   * nothing, so it cannot be the thing that finishes the course. */
  block.kind === 'project' || (isGraded(block) && /-(final|checkpoint|capstone)$/.test(block.lessonId));
const isReview = (block) => block.kind === 'review' || block.lessonId.startsWith('srs-review:');

/* The shortfall list is a floor's whole account: `met` is simply the items that
 * raised none. Deriving it in the same pass keeps the table cell and the lines
 * printed under it from ever disagreeing, and `cleared` needs only one test. */
function floor(id, items, test, note) {
  const shortfalls = items.filter((item) => !test(item)).map(note);
  return { id, met: items.length - shortfalls.length, total: items.length, shortfalls };
}

const cleared = (check) => check.shortfalls.length === 0;

/* Whether a block executes anything, and whether its own copy admits that it
 * does not, are judged by lib/execution.ts — the same helper the path card and
 * the lesson and project headers call to decide the NO EXECUTION badge. One
 * implementation on purpose: every block this floor counts is a block the app
 * labels out loud, and every block the app badges is a block this floor counts. */
const runsFloor = (course, buildBlocks) =>
  floor(
    'runs',
    buildBlocks,
    (block) => !defersExecution(block),
    (block) =>
      `${course.id}: ${block.lessonId} is a ${block.kind} block that runs nothing and its copy does not say it is paper — ` +
      `make one item execute or say plainly that it is a paper exercise. "${block.title}" / "${block.blurb}"`
  );

function scoreCourse(course) {
  const units = CURRICULUM.filter((unit) => unit.course === course.id);
  const notes = [];

  if (units.length === 0) {
    return {
      passed: false,
      checks: [],
      notes: [`${course.id}: the course card has no curriculum units at all.`],
      lessons: 0,
      questions: 0,
      units: 0,
    };
  }

  /* One entry per distinct lesson the path actually plays. Blocks that do not
   * resolve are a hard failure: the score must never reward missing content. */
  const blocks = units.flatMap((unit) => unit.blocks);
  const seen = new Set();
  const lessons = [];
  let unresolved = 0;
  for (const block of blocks) {
    if (isReview(block)) continue;
    if (block.kind === 'project') {
      if (!PROJECTS[block.lessonId] && !ALL_LESSONS[block.lessonId]) unresolved += 1;
      continue;
    }
    const lesson = ALL_LESSONS[block.lessonId];
    if (!lesson) {
      unresolved += 1;
      continue;
    }
    if (seen.has(lesson.id)) continue;
    seen.add(lesson.id);
    lessons.push(lesson);
  }
  if (unresolved > 0) {
    notes.push(`${course.id}: ${unresolved} block(s) point at lesson content that does not exist.`);
  }

  const questions = lessons.flatMap((lesson) => lesson.questions);
  const gradedBlocks = blocks.filter(isGraded);
  const buildBlocks = blocks.filter(isBuildBlock);
  const tailBlock = units[units.length - 1].blocks.filter((block) => !isReview(block)).pop();

  const checks = [
    floor(
      'teach',
      lessons,
      (lesson) =>
        lesson.theory.length >= MIN_THEORY_LINES &&
        lesson.theory.reduce((sum, line) => sum + words(line), 0) >= MIN_THEORY_WORDS,
      (lesson) =>
        `${course.id}: ${lesson.id} teaches with ${lesson.theory.length} line(s), ${words(
          lesson.theory.join(' ')
        )} words — needs ${MIN_THEORY_LINES}+ lines and ${MIN_THEORY_WORDS}+ words.`
    ),
    floor(
      'produce',
      lessons,
      (lesson) => lesson.questions.some(isProduction),
      (lesson) => `${course.id}: ${lesson.id} is recall-only — no build or production item.`
    ),
    runsFloor(course, buildBlocks),
    floor(
      'explain',
      questions,
      (question) => (question.explain || '').length >= MIN_EXPLAIN_CHARS,
      (question) =>
        `${course.id}: thin feedback on "${String(question.prompt).slice(0, 48)}" — ${
          (question.explain || '').length
        } characters, needs ${MIN_EXPLAIN_CHARS}+.`
    ),
    floor(
      'units',
      units,
      (unit) =>
        unit.blocks.some((block) => isBuildBlock(block)) &&
        unit.blocks.some(isGraded),
      (unit) =>
        `${course.id}: unit ${unit.id} needs a build block and a graded quiz block (found build=${unit.blocks.some(
          (block) => isBuildBlock(block)
        ) ? 'y' : 'n'}, graded=${unit.blocks.filter(isGraded).length}).`
    ),
    floor(
      'session',
      gradedBlocks,
      (block) => {
        const lesson = ALL_LESSONS[block.lessonId];
        return !!lesson && lesson.questions.length >= SESSION_MAX &&
          lesson.questions.filter(isProduction).length >= MIN_PRODUCTION_PER_ASSESSMENT;
      },
      (block) => {
        const lesson = ALL_LESSONS[block.lessonId];
        const prod = lesson ? lesson.questions.filter(isProduction).length : 0;
        return `${course.id}: ${block.lessonId} grades on ${lesson ? lesson.questions.length : 0} item(s) with ${prod} production — needs ${SESSION_MAX}+ items and ${MIN_PRODUCTION_PER_ASSESSMENT}+ production.`;
      }
    ),
    floor(
      'finisher',
      [tailBlock],
      (block) => !!block && isFinisher(block),
      () =>
        `${course.id}: the course does not end in a final, checkpoint or capstone (last block is ${
          tailBlock ? `${tailBlock.kind} ${tailBlock.lessonId}` : 'nothing'
        }).`
    ),
  ];

  for (const check of checks) notes.push(...check.shortfalls);

  return {
    passed: unresolved === 0 && checks.every(cleared),
    checks,
    notes: notes.slice().sort((a, b) => a.localeCompare(b)),
    lessons: lessons.length,
    questions: questions.length,
    units: units.length,
    unresolved,
  };
}

const reports = COURSES_META.map((course) => ({ course, report: scoreCourse(course) }));
const FLOOR_IDS = ['teach', 'produce', 'runs', 'explain', 'units', 'session', 'finisher'];
/* A course with no curriculum units has no floors to read; it fails on its note. */
const NO_CHECK = { met: 0, total: 0, shortfalls: [] };

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
  const { report } = match;
  console.log(`${only}: ${report.passed ? 'clears every floor' : 'BELOW STANDARD'}\n`);
  for (const id of FLOOR_IDS) {
    const check = report.checks.find((c) => c.id === id) || NO_CHECK;
    console.log(`  ${id.padEnd(9)} ${String(check.met).padStart(3)}/${String(check.total).padEnd(3)} ${cleared(check) ? 'ok' : '✗'}`);
  }
  for (const note of report.notes) console.log(`  · ${note}`);
  process.exit(report.passed ? 0 : 1);
}

if (process.argv.includes('--json')) {
  console.log(
    JSON.stringify(
      reports.map(({ course, report }) => ({ id: course.id, name: course.name, ...report })),
      null,
      2
    )
  );
} else {
  console.log('Course quality floors — every course must clear every one\n');
  const header =
    'course          units lessons questions' + FLOOR_IDS.map((id) => id.padStart(8)).join('') + '  verdict';
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const { course, report } of reports) {
    const cells = FLOOR_IDS.map((id) => {
      const check = report.checks.find((c) => c.id === id) || NO_CHECK;
      const cell = `${check.met}/${check.total}`;
      return (cleared(check) ? cell : `✗ ${cell}`).padStart(8);
    }).join('');
    const row =
      course.id.padEnd(15) +
      String(report.units).padStart(5) +
      String(report.lessons).padStart(7) +
      String(report.questions).padStart(9) +
      cells +
      `  ${report.passed ? 'ok' : `✗ ${report.notes.length} shortfall(s)`}`;
    console.log(row);
  }
}

const failing = reports.filter(({ report }) => !report.passed);
if (failing.length > 0) {
  console.error(`\n${failing.length} course(s) below the standard:`);
  for (const { course, report } of failing) {
    const short = report.checks.filter((check) => !cleared(check)).map((check) => `${check.id} ${check.met}/${check.total}`);
    console.error(
      `  ✗ ${course.id}: ${short.join(', ') || 'missing content'} — ${report.notes.length} shortfall(s); run \`node scripts/score-courses.cjs --why ${course.id}\``
    );
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
  `\nAll ${reports.length} courses clear all ${FLOOR_IDS.length} floors — ${totals.lessons} path lessons, ` +
    `${totals.questions} questions, standard: ${MIN_THEORY_LINES}+ lines/${MIN_THEORY_WORDS}+ words of theory, ` +
    `production in every lesson, every build block running or saying plainly that it is paper, ` +
    `an explanation on every answer, a build and a graded quiz in every unit, ` +
    `${SESSION_MAX}+ items with ${MIN_PRODUCTION_PER_ASSESSMENT}+ production in each of them, and a finisher closing the course.`
);
