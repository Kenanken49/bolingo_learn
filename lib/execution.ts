/**
 * Whether a build block actually executes anything in this build, in one place.
 *
 * "Runs" means the app performs what the learner did and grades the resulting
 * state. There are four engines: the offline Git VM (`terminal` items and the
 * labex lessons built on it), the code sandbox (`code` items whose tests carry
 * a `run`), on-device speech recognition (`speak`), and a capstone story with a
 * live `check` that runs inside the preview frame. Token chains, `match`,
 * `text` and `listen` grade strings the learner typed or tapped, and the static
 * regex behind a project story grades source it never opens — none of those run
 * anything, however hands-on the copy sounds. A `guided` walkthrough is
 * labelled NO EXECUTION by design.
 *
 * Two readers, deliberately: scripts/score-courses.cjs grades this, and
 * src/app/curriculum/[unitId].tsx with src/app/quiz/[lessonId].tsx show it.
 * They must not own separate copies, because a badge the scorer cannot see —
 * or a passing floor on a screen that tells the learner nothing — is exactly the
 * gap between what the app claims and what it does.
 */

import { COURSES, PROJECTS } from './courses';
import { CERT_PROJECTS } from './certifications';
import { PUBLISHED_TRANSCRIPT_LESSONS } from './publishedTranscriptLessons';
import { GIT_SCENARIOS } from './labex/gitScenarios';
import type { CourseLesson } from './quizBank';

/** Anything a learner submits and this app checks is a build block. */
export const BUILD_KINDS = ['workshop', 'lab', 'project'] as const;

/** The fields runnability is judged from; a CurriculumBlock always has them. */
export interface BlockCopy {
  kind: string;
  lessonId: string;
  title: string;
  blurb: string;
}

const ALL_LESSONS: Record<string, CourseLesson> = { ...COURSES, ...PUBLISHED_TRANSCRIPT_LESSONS };
const VM_LESSON_IDS = new Set(Object.keys(GIT_SCENARIOS));
const hasText = (text: unknown): boolean => typeof text === 'string' && text.trim().length > 0;

export const isBuildBlock = (block: { kind: string }): boolean =>
  (BUILD_KINDS as readonly string[]).includes(block.kind);

/**
 * Names the engine that runs this block, or null when nothing here executes it.
 *
 * Certification capstones live in CERT_PROJECTS (lib/certifications.ts), not in
 * PROJECTS, and the project screen runs their `check` predicates inside the
 * preview frame exactly like a course project's stories. Reading only PROJECTS
 * called fifteen running capstones paper — the false direction, and the one a
 * badge cannot take back once a learner believes it.
 */
export function executionEngine(block: { lessonId: string }): string | null {
  const project = PROJECTS[block.lessonId] ?? CERT_PROJECTS[block.lessonId];
  if (project) {
    const live = (project.stories || []).filter((story) => hasText(story.check));
    return live.length > 0 ? `${live.length} live project check(s)` : null;
  }
  const lesson = ALL_LESSONS[block.lessonId];
  if (!lesson) return null;
  if (VM_LESSON_IDS.has(lesson.id)) return 'the Git VM';
  for (const question of lesson.questions || []) {
    if (question.kind === 'code' && (question.code?.tests || []).some((test) => hasText(test.run))) {
      return 'the code sandbox';
    }
    if (question.kind === 'terminal' && VM_LESSON_IDS.has(question.terminal?.scenarioId ?? '')) {
      return 'the Git VM';
    }
    if (question.kind === 'speak') return 'on-device speech recognition';
  }
  return null;
}

/**
 * The other half of the standard: when nothing runs, the block has to say so in
 * the words a learner reads — in its title *and* its blurb, not just one. Every
 * phrase here states that nothing executes; phrasings about how much work the
 * learner does ("by hand", "worksheet") are not honesty about execution and are
 * deliberately not on this list.
 */
export const PAPER_PHRASE =
  /(paper exercise|paper workshop|paper lab|paper drill|on paper|nothing runs|does not run|no execution|unplugged)/i;

export const saysPaper = (block: { title: string; blurb: string }): boolean =>
  PAPER_PHRASE.test(block.title) && PAPER_PHRASE.test(block.blurb);

/**
 * The badge condition, and the runs floor's: a build block that runs nothing and
 * has not told the learner so. There is no allowance for it any more — this is
 * true of a block or it is not, and the screen shows it.
 */
export function defersExecution(block: BlockCopy): boolean {
  return isBuildBlock(block) && !executionEngine(block) && !saysPaper(block);
}
