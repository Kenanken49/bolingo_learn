#!/usr/bin/env node
/**
 * Curriculum quality gate.
 *
 * The lesson banks were generated over time, so this guard locks in the
 * standards that every course, quiz, lab, and workshop must keep:
 *   - every curriculum block resolves to real content;
 *   - every lesson teaches before it tests and every question has a reason;
 *   - multiple-choice options are unique and every chain is solvable;
 *   - code/text performance tasks declare runnable or gradable answers;
 *   - quizzes/checkpoints/finals have enough items and every language final
 *     includes at least one typed production task;
 *   - the session model still distinguishes guided practice, independent labs,
 *     and mastery assessments.
 *
 * Runs inside `npm test`. It transpiles the pure TypeScript banks in place,
 * the same approach used by the language-catalog guard, so it checks the real
 * content instead of a duplicated fixture.
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
const { CURRICULUM, COURSES_META, ALL_BLOCKS } = require('../lib/curriculum.ts');
const {
  MASTERY_PCT,
  SESSION_STANDARDS,
  isMastery,
  masteryNeeded,
  sessionStandard,
} = require('../lib/learningStandards.ts');
const { normalizeAnswer } = require('../lib/quizBank.ts');

const failures = [];
const fail = (message) => failures.push(message);

// Transcript lessons are published in Supabase and bundled separately; they
// are still real path content and must pass the same quality bar.
const ALL_LESSONS = { ...COURSES, ...PUBLISHED_TRANSCRIPT_LESSONS };
const lessonIds = new Set(Object.keys(ALL_LESSONS));
const blockIds = new Set();

/* ---- Session standards ---- */
if (MASTERY_PCT !== 80) fail(`Mastery must stay at 80%, found ${MASTERY_PCT}%.`);
if (!isMastery(4, 5)) fail('4/5 must clear mastery.');
if (isMastery(3, 5)) fail('3/5 must not clear mastery.');
if (masteryNeeded(5) !== 4) fail(`5 items need 4 correct, computed ${masteryNeeded(5)}.`);
if (masteryNeeded(8) !== 7) fail(`8 items need 7 correct, computed ${masteryNeeded(8)}.`);

for (const kind of ['lesson', 'workshop', 'lab', 'quiz', 'review', 'project']) {
  const standard = SESSION_STANDARDS[kind];
  if (!standard) {
    fail(`No session standard for ${kind}.`);
    continue;
  }
  if (standard.masteryPct !== MASTERY_PCT) fail(`${kind}: mastery must be ${MASTERY_PCT}%.`);
  if (kind === 'lesson' || kind === 'workshop') {
    if (!standard.scaffolds) fail(`${kind}: guided practice must show scaffolds.`);
    if (standard.firstAttemptCounts) fail(`${kind}: retries must count as practice, not mastery.`);
  }
  if (kind === 'lab' || kind === 'quiz' || kind === 'review') {
    if (standard.scaffolds) fail(`${kind}: independent work must hide the live checklist.`);
    if (!standard.firstAttemptCounts) fail(`${kind}: mastery must be based on the first attempt.`);
  }
}

/* ---- Every lesson teaches, tests, and explains ---- */
let questionCount = 0;
let codeTasks = 0;
let textTasks = 0;
const languageFinals = [];
const LANGUAGE_FINAL_PREFIXES = ['spanish-', 'french-', 'german-', 'swahili-', 'english-', 'chess-'];

for (const lesson of Object.values(ALL_LESSONS)) {
  const label = lesson.id || '(missing id)';
  if (!lesson.title || !lesson.title.trim()) fail(`${label}: empty title.`);
  const theory = Array.isArray(lesson.theory) ? lesson.theory.join(' ').trim() : '';
  if (theory.length < 40) fail(`${label}: theory is too thin (${theory.length} chars).`);
  if (!Array.isArray(lesson.questions) || lesson.questions.length < 3) {
    fail(`${label}: needs at least 3 questions.`);
    continue;
  }
  questionCount += lesson.questions.length;
  if (LANGUAGE_FINAL_PREFIXES.some((prefix) => lesson.id.startsWith(prefix)) && lesson.id.endsWith('-final')) {
    languageFinals.push(lesson);
  }

  const prompts = new Set();
  lesson.questions.forEach((question, index) => {
    const at = `${label} Q${index + 1}`;
    if (!question || typeof question.prompt !== 'string' || !question.prompt.trim()) {
      fail(`${at}: empty prompt.`);
      return;
    }
    const promptKey = question.prompt.trim().toLowerCase();
    if (prompts.has(promptKey)) fail(`${at}: duplicate prompt in the same lesson.`);
    prompts.add(promptKey);
    if (typeof question.explain !== 'string' || !question.explain.trim()) {
      fail(`${at}: missing explanation.`);
    }
    if (!Array.isArray(question.correctChain) || question.correctChain.length === 0) {
      fail(`${at}: empty correctChain.`);
      return;
    }
    if (question.kind === 'code') {
      codeTasks += 1;
      const spec = question.code;
      if (!spec || !['js', 'html', 'css'].includes(spec.language)) {
        fail(`${at}: code exercise must be JavaScript, HTML, or CSS.`);
      }
      if (!spec || typeof spec.starter !== 'string') fail(`${at}: code exercise needs a starter.`);
      if (!spec || !Array.isArray(spec.tests) || spec.tests.length === 0) {
        fail(`${at}: code exercise needs at least one test.`);
      } else {
        const testIds = new Set();
        for (const test of spec.tests) {
          if (!test.id || testIds.has(test.id)) fail(`${at}: code test ids must be unique.`);
          testIds.add(test.id);
          if (!test.label?.trim() || !test.run?.trim()) fail(`${at}: every code test needs label and run.`);
          if (spec.language !== 'js' && !test.pattern?.trim()) {
            fail(`${at}: web test ${test.id || '(empty)'} needs an offline pattern fallback.`);
          }
        }
      }
      if (spec?.language === 'css' && !spec.fixture?.html) {
        fail(`${at}: a CSS exercise needs fixture HTML to style.`);
      }
      return;
    }
    if (question.kind === 'text') {
      textTasks += 1;
      const spec = question.text;
      if (!spec || !Array.isArray(spec.answers) || spec.answers.length === 0) {
        fail(`${at}: text exercise needs accepted answers.`);
        return;
      }
      const accepted = spec.answers.map(normalizeAnswer);
      if (new Set(accepted).size !== accepted.length) fail(`${at}: duplicate accepted answer.`);
      if (accepted.some((answer) => !answer)) fail(`${at}: blank accepted answer.`);
      if (normalizeAnswer(question.correctChain[0]) !== accepted[0]) {
        fail(`${at}: correctChain[0] must match the first accepted answer.`);
      }
      return;
    }
    if (!Array.isArray(question.scrambledTokens) || question.scrambledTokens.length < 2) {
      fail(`${at}: token exercise needs at least two options.`);
      return;
    }
    if (question.correctChain.length === 1 && new Set(question.scrambledTokens).size !== question.scrambledTokens.length) {
      fail(`${at}: single-answer options contain a duplicate.`);
    }
    const bank = [...question.scrambledTokens];
    for (const token of question.correctChain) {
      const at2 = bank.indexOf(token);
      if (at2 === -1) {
        fail(`${at}: token "${token}" is not in the option bank — unsolvable.`);
        break;
      }
      bank.splice(at2, 1);
    }
  });
}

if (questionCount < 1000) fail(`The catalog looks truncated: only ${questionCount} questions.`);
if (codeTasks < 1) fail('The catalog has no runnable code exercise.');
if (textTasks < 1) fail('The catalog has no free-response exercise.');

/* ---- Every assessment proves transfer, not just recognition ---- */
const assessmentBlocks = ALL_BLOCKS.filter(
  (block) => block.kind === 'quiz' || block.lessonId.endsWith('-final') || block.lessonId.endsWith('-checkpoint')
);
for (const block of assessmentBlocks) {
  if (block.lessonId.startsWith('srs-review')) continue;
  const lesson = ALL_LESSONS[block.lessonId];
  if (!lesson) continue; // the block resolver below reports the missing bank
  const hasPerformance = lesson.questions.some(
    (question) => question.kind === 'code' || question.kind === 'text'
  );
  if (!hasPerformance) {
    fail(`${block.id}: assessment needs at least one runnable or typed production task.`);
  }
}

/* A course with no mastery endpoint is a reading list, not a course. */
for (const meta of COURSES_META) {
  const units = CURRICULUM.filter((unit) => unit.course === meta.id);
  for (const unit of units) {
    const hasAssessment = unit.blocks.some((block) => block.kind === 'quiz');
    if (!hasAssessment) fail(`Course ${meta.name} · ${unit.title}: unit has no mastery assessment.`);
  }
}

/* ---- Every block resolves to real content ---- */
for (const block of ALL_BLOCKS) {
  const at = block.id || '(missing block id)';
  if (blockIds.has(block.id)) fail(`${at}: duplicate curriculum block id.`);
  blockIds.add(block.id);
  if (!SESSION_STANDARDS[block.kind]) fail(`${at}: unknown block kind "${block.kind}".`);
  if (!block.title?.trim() || !block.lessonTitle?.trim() || !block.blurb?.trim()) {
    fail(`${at}: title, lessonTitle, and blurb are required.`);
  }
  if (!(block.minutes > 0)) fail(`${at}: minutes must be positive.`);
  if (!(block.xp > 0)) fail(`${at}: xp must be positive.`);

  if (block.kind === 'project') {
    if (!block.lessonId) fail(`${at}: project is missing its lessonId.`);
    continue;
  }
  if (block.lessonId.startsWith('srs-review')) continue;

  const lesson = ALL_LESSONS[block.lessonId];
  if (!lessonIds.has(block.lessonId) || !lesson) {
    fail(`${at}: lesson ${block.lessonId} does not exist in the course banks.`);
    continue;
  }
  const minimum = block.kind === 'quiz' ? 5 : 3;
  if (lesson.questions.length < minimum) {
    fail(`${at}: ${block.kind} ${block.lessonId} needs ${minimum}+ questions, has ${lesson.questions.length}.`);
  }
}

/* ---- Every course card has a real path, and capstones where expected ---- */
for (const meta of COURSES_META) {
  const units = CURRICULUM.filter((unit) => unit.course === meta.id);
  if (units.length === 0) fail(`Course ${meta.name} has no curriculum units.`);
  if (['html', 'rwd', 'design', 'certs'].includes(meta.id)) {
    const capstones = units.flatMap((unit) => unit.blocks).filter((block) => block.kind === 'project');
    if (capstones.length === 0) fail(`Course ${meta.name} has no capstone project.`);
  }
}

/* ---- Every language final is a production assessment ---- */
for (const lesson of languageFinals) {
  const hasProduction = lesson.questions.some((question) => question.kind === 'text');
  if (!hasProduction) {
    fail(`${lesson.id}: language final needs at least one typed production task.`);
  }
  if (lesson.questions.length < 6) {
    fail(`${lesson.id}: language final needs at least 6 questions, has ${lesson.questions.length}.`);
  }
}

/* ---- The HTML course endpoint must be real ---- */
if (!COURSES['html-final']) fail('Complete HTML has no final exam bank.');
if (!PROJECTS['html-project']) fail('Complete HTML has no recipe-card capstone project.');
if (!ALL_BLOCKS.some((block) => block.kind === 'project' && block.lessonId === 'html-project')) {
  fail('The HTML capstone is not on the learning path.');
}

if (failures.length > 0) {
  console.error('Curriculum quality check failed:');
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

const counts = Object.values(ALL_LESSONS).reduce(
  (acc, lesson) => {
    for (const question of lesson.questions) {
      const kind = question.kind || 'tokens';
      acc[kind] = (acc[kind] || 0) + 1;
    }
    return acc;
  },
  {}
);
const labs = ALL_BLOCKS.filter((block) => block.kind === 'lab').length;
const workshops = ALL_BLOCKS.filter((block) => block.kind === 'workshop').length;
const quizzes = ALL_BLOCKS.filter((block) => block.kind === 'quiz').length;

console.log(
  `Curriculum quality OK — ${Object.keys(ALL_LESSONS).length} lessons, ${questionCount} questions, ` +
    `${ALL_BLOCKS.length} path blocks.`
);
console.log(
  `Question mix: ${Object.entries(counts)
    .map(([kind, count]) => `${count} ${kind}`)
    .join(' · ')}.`
);
console.log(
  `Practice modes: ${workshops} workshops · ${labs} labs · ${quizzes} quizzes/checkpoints/finals. ` +
    `Mastery ${sessionStandard('quiz').masteryPct}% first-try.`
);
