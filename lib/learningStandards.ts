/**
 * Learning standards for every quiz-shaped session.
 *
 * One source of truth for how a lesson, workshop, lab, review, or exam behaves:
 * whether scaffolding is visible, whether the first attempt is what counts,
 * and what score unlocks the next path node. The engine reads this file; the
 * content quality guard checks that every curriculum block can resolve one.
 */
import type { BlockKind } from './curriculum';

/** Passing standard used by results, completion, and every course final. */
export const MASTERY_PCT = 80;

export interface SessionStandard {
  kind: BlockKind;
  /** Short label shown in the question chrome. */
  badge: string;
  mode: 'guided' | 'independent' | 'assessment' | 'retrieval' | 'capstone';
  /** Live test checklist and step hints are visible before checking. */
  scaffolds: boolean;
  /** Only the first response per item counts toward mastery. */
  firstAttemptCounts: boolean;
  /** Question order is randomized for this session type. */
  shuffleQuestions: boolean;
  /** Percentage of counted items required to unlock the path node. */
  masteryPct: number;
  /** XP awarded per mastered item. Zero-XP failures are deliberate. */
  xpPerCorrect: number;
}

export const SESSION_STANDARDS: Record<BlockKind, SessionStandard> = {
  lesson: {
    kind: 'lesson',
    badge: 'Guided lesson',
    mode: 'guided',
    scaffolds: true,
    firstAttemptCounts: false,
    shuffleQuestions: false,
    masteryPct: MASTERY_PCT,
    xpPerCorrect: 10,
  },
  workshop: {
    kind: 'workshop',
    badge: 'Guided workshop',
    mode: 'guided',
    scaffolds: true,
    firstAttemptCounts: false,
    shuffleQuestions: false,
    masteryPct: MASTERY_PCT,
    xpPerCorrect: 10,
  },
  lab: {
    kind: 'lab',
    badge: 'Independent lab',
    mode: 'independent',
    scaffolds: false,
    firstAttemptCounts: true,
    shuffleQuestions: true,
    masteryPct: MASTERY_PCT,
    xpPerCorrect: 10,
  },
  quiz: {
    kind: 'quiz',
    badge: 'Mastery check',
    mode: 'assessment',
    scaffolds: false,
    firstAttemptCounts: true,
    shuffleQuestions: true,
    masteryPct: MASTERY_PCT,
    xpPerCorrect: 10,
  },
  review: {
    kind: 'review',
    badge: 'Retrieval review',
    mode: 'retrieval',
    scaffolds: false,
    firstAttemptCounts: true,
    shuffleQuestions: true,
    masteryPct: MASTERY_PCT,
    xpPerCorrect: 10,
  },
  project: {
    kind: 'project',
    badge: 'Capstone project',
    mode: 'capstone',
    scaffolds: false,
    firstAttemptCounts: true,
    shuffleQuestions: false,
    masteryPct: MASTERY_PCT,
    xpPerCorrect: 0,
  },
};

export function sessionStandard(kind?: BlockKind | null): SessionStandard {
  return (kind && SESSION_STANDARDS[kind]) || SESSION_STANDARDS.lesson;
}

/** How many items must be counted correct to reach the standard. */
export function masteryNeeded(total: number, pct = MASTERY_PCT): number {
  if (!(total > 0)) return 0;
  return Math.ceil((total * pct) / 100);
}

/** True when the counted score clears this session's pass mark. */
export function isMastery(correct: number, total: number, kind?: BlockKind | null): boolean {
  if (!(total > 0)) return false;
  return (correct / total) * 100 >= sessionStandard(kind).masteryPct;
}

/** Plain-language instruction shown above every exercise. */
export function sessionInstruction(kind?: BlockKind | null): string {
  const standard = sessionStandard(kind);
  switch (standard.mode) {
    case 'guided':
      return 'Learn with the live checklist and full explanations. Retry until every step is solid.';
    case 'independent':
      return 'Independent lab: no live checklist. Commit to an answer first, then use the feedback to revise.';
    case 'assessment':
      return `Mastery check: no live checklist. Your first answer on each item counts toward the ${standard.masteryPct}% pass mark.`;
    case 'retrieval':
      return 'Retrieval review: answer from memory. The first attempt decides when this card comes back.';
    case 'capstone':
      return 'Capstone: build against the user stories. The tests grade the real output, not the wording.';
  }
}

/** Results copy, shared by the banner and the path gate. */
export function masteryMessage(correct: number, total: number, kind?: BlockKind | null): string {
  const standard = sessionStandard(kind);
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  if (isMastery(correct, total, kind)) {
    return `Mastered — ${pct}% clears the ${standard.masteryPct}% standard.`;
  }
  return `${standard.masteryPct}% needed — ${masteryNeeded(total, standard.masteryPct)} of ${total} counted items. You scored ${pct}%.`;
}
