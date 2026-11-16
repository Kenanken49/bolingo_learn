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
 * is the floor that keeps a *build* block honest about what the app actually
 * executes, so that a workshop whose tokens happen to spell `git status` is not
 * counted as having run git. Pre-existing blocks that neither run nor say so are
 * listed by id in content/quality/paper-debt.json and excluded from the floor's
 * total; that ledger is a ratchet — it may only shrink, and a new build block
 * that is not on it must run or be labelled.
 *
 * What these floors still cannot see, and should not be trusted to: a question
 * repeated from an earlier lesson counts as new material (the AI/ML tier finals
 * are built that way on purpose), `match` is closer to recognition than
 * production, and a 20-character explanation can be one appended sentence. Those
 * are content reviews, not rubric edits.
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
const { GIT_SCENARIOS } = require('../lib/labex/gitScenarios.ts');

const DEBT_FILE = 'content/quality/paper-debt.json';
const PAPER_DEBT = JSON.parse(fs.readFileSync(path.join(__dirname, '..', DEBT_FILE), 'utf8')).blocks;

const ALL_LESSONS = { ...COURSES, ...PUBLISHED_TRANSCRIPT_LESSONS };

const MIN_THEORY_WORDS = 25;
const MIN_THEORY_LINES = 2;
const MIN_EXPLAIN_CHARS = 20;
const MIN_CHAIN_TOKENS = 2;
const MIN_PRODUCTION_PER_ASSESSMENT = 2;

const BUILD_KINDS = ['workshop', 'lab', 'project'];

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

/* "Runs" means the app executes what the learner did and grades the resulting
 * state — the same line the quiz screen draws when it decides whether a lesson
 * needs a guided walkthrough (src/app/quiz/[lessonId].tsx: `runsHere`). The four
 * engines: the offline Git VM (`terminal` items and the labex lessons built on
 * it), the code sandbox (`code` items whose tests carry a `run`), on-device
 * speech recognition (`speak`), and a capstone story with a live `check` that
 * runs inside the preview frame. `match`, `tokens`, `text` and `listen` grade
 * strings the learner typed or tapped, so they do not count however hands-on the
 * copy sounds, and a `guided` walkthrough is labelled NO EXECUTION by design. */
const VM_LESSON_IDS = new Set(Object.keys(GIT_SCENARIOS));
const hasText = (text) => typeof text === 'string' && text.trim().length > 0;

function executionEngine(block) {
  const project = PROJECTS[block.lessonId];
  if (project) {
    const live = (project.stories || []).filter((story) => hasText(story.check));
    return live.length > 0 ? `${live.length} live project check(s)` : null;
  }
  const lesson = ALL_LESSONS[block.lessonId];
  if (!lesson) return null;
  if (VM_LESSON_IDS.has(lesson.id)) return 'the Git VM';
  for (const question of lesson.questions || []) {
    if (question.kind === 'code' && (question.code?.tests || []).some((test) => hasText(test.run))) return 'the code sandbox';
    if (question.kind === 'terminal' && VM_LESSON_IDS.has(question.terminal?.scenarioId)) return 'the Git VM';
    if (question.kind === 'speak') return 'on-device speech recognition';
  }
  return null;
}

/* The other half of the standard: if nothing runs, the block has to say so in
 * the words a learner reads — in its title *and* its blurb, not one of them. */
const PAPER_PHRASE = /(paper exercise|paper workshop|paper lab|paper drill|on paper|nothing runs|does not run|no execution|unplugged|worksheet|by hand)/i;
const saysPaper = (block) => PAPER_PHRASE.test(block.title) && PAPER_PHRASE.test(block.blurb);

function runsFloor(course, buildBlocks) {
  const ledger = PAPER_DEBT[course.id] || [];
  const owed = new Set(ledger);
  const shortfalls = [];
  const notes = [];
  let met = 0;
  let deferred = 0;
  let complying = 0;

  for (const block of buildBlocks) {
    const engine = executionEngine(block);
    const honest = !!engine || saysPaper(block);
    if (owed.has(block.lessonId)) {
      if (honest) complying += 1;
      else deferred += 1;
    }
    if (honest) met += 1;
    else if (!owed.has(block.lessonId)) {
      shortfalls.push(
        `${course.id}: ${block.lessonId} is a ${block.kind} block that runs nothing and its copy does not say it is paper — make one item execute or say plainly that it is a paper exercise. "${block.title}" / "${block.blurb}"`
      );
    }
  }
  const listed = new Set(buildBlocks.map((block) => block.lessonId));
  let stale = 0;
  for (const id of ledger) {
    if (!listed.has(id)) {
      stale += 1;
      shortfalls.push(`${course.id}: ${id} is on the paper-debt ledger but is no longer a build block of this course — delete the entry from ${DEBT_FILE}.`);
    }
  }
  if (deferred > 0) {
    notes.push(`${course.id}: ${deferred} build block(s) grade matched text without saying so and sit on the ledger (${DEBT_FILE}). The number may only fall.`);
  }
  if (complying > 0) {
    notes.push(`${course.id}: ${complying} ledger block(s) now run or say they are paper — remove them from ${DEBT_FILE}.`);
  }
  /* Ledger blocks count towards neither side of the ratio: the cell shows what
   * the floor actually enforces today, the notes above show what is deferred. A
   * ledger entry that matches no build block is the ledger lying, so it lands on
   * the wrong side of the ratio instead. */
  return { id: 'runs', met, total: buildBlocks.length - deferred + stale, shortfalls, notes };
}

function floor(id, items, test, note) {
  const shortfalls = [];
  let met = 0;
  for (const item of items) {
    if (test(item)) met += 1;
    else shortfalls.push(note(item));
  }
  return { id, met, total: items.length, shortfalls };
}

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
  const buildBlocks = blocks.filter((block) => BUILD_KINDS.includes(block.kind) && !isReview(block));
  const runsCheck = runsFloor(course, buildBlocks);
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
    runsCheck,
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
        unit.blocks.some((block) => BUILD_KINDS.includes(block.kind)) &&
        unit.blocks.some(isGraded),
      (unit) =>
        `${course.id}: unit ${unit.id} needs a build block and a graded quiz block (found build=${unit.blocks.some(
          (block) => BUILD_KINDS.includes(block.kind)
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
  notes.push(...runsCheck.notes);

  return {
    passed: unresolved === 0 && checks.every((check) => check.met === check.total),
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
    const check = report.checks.find((c) => c.id === id) || { met: 0, total: 0 };
    console.log(`  ${id.padEnd(9)} ${String(check.met).padStart(3)}/${String(check.total).padEnd(3)} ${check.met === check.total ? 'ok' : '✗'}`);
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
      const check = report.checks.find((c) => c.id === id) || { met: 0, total: 0 };
      return `${check.met}/${check.total}`.padStart(8);
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
    const short = report.checks.filter((c) => c.met !== c.total).map((c) => `${c.id} ${c.met}/${c.total}`);
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
const ledgerSize = Object.values(PAPER_DEBT).reduce((sum, ids) => sum + ids.length, 0);
console.log(
  `\nAll ${reports.length} courses clear all ${FLOOR_IDS.length} floors — ${totals.lessons} path lessons, ` +
    `${totals.questions} questions, standard: ${MIN_THEORY_LINES}+ lines/${MIN_THEORY_WORDS}+ words of theory, ` +
    `production in every lesson, every build block running or saying plainly that it is paper, ` +
    `an explanation on every answer, a build and a graded quiz in every unit, ` +
    `${SESSION_MAX}+ items with ${MIN_PRODUCTION_PER_ASSESSMENT}+ production in each of them, and a finisher closing the course.`
);
console.log(
  `  ${ledgerSize} pre-existing build block(s) are on the paper-debt ledger (${DEBT_FILE}) and are excluded from the runs floor above; that list shrinks, never grows.`
);
