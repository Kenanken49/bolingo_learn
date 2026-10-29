import type { LessonResult } from './quizResults';

/**
 * Pass/fail decision for the results screen — one source of truth for the
 * banner and for whether the five-second celebration mounts.
 *
 * The threshold is freeCodeCamp's 80%, compared on the *unrounded* score so a
 * 79.6% run can never round its way into a pass (a 4/5 run at exactly 80%
 * still passes). A level-up celebrates even after a failed run: reaching a new
 * level is the reward, not the quiz percentage. Everything else — a plain miss,
 * an empty result, no result at all — stays silent.
 */
export const PASS_PCT = 80;

/** 0–100. A result with no questions scores 0 instead of dividing by zero. */
export function resultsScore(result: Pick<LessonResult, 'correctCount' | 'total'>): number {
  if (!(result.total > 0)) return 0;
  return (result.correctCount / result.total) * 100;
}

export type CelebrationResult = Pick<LessonResult, 'correctCount' | 'total' | 'leveledUp'>;

/** True only for a pass or a level-up, never for an ordinary failed run. */
export function shouldCelebrate(result: CelebrationResult | null | undefined): boolean {
  if (!result) return false;
  return resultsScore(result) >= PASS_PCT || result.leveledUp === true;
}
