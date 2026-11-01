import type { QuestionKind } from './quizBank';

/**
 * Session assembly — one owner for "what a learner actually sees".
 *
 * A lesson bank is deeper than a session: it carries the recognition items,
 * the sentence builds, and the production reps (hear it, say it, pair it) so
 * the same lesson can drill a different skill each time it is replayed. The
 * session itself stays bite-sized at SESSION_MAX items (2–5 minutes), which is
 * the promise the quiz screen makes to learners.
 */

/** Questions per session: long enough to grade, short enough to finish. */
export const SESSION_MAX = 6;

/**
 * Skills that must never be squeezed out of a session by a crowd of
 * tap-to-choose items: they are the ones that produce or run something.
 */
const PERFORMANCE_KINDS: QuestionKind[] = ['code', 'terminal', 'guided', 'text', 'listen', 'speak', 'match'];

function isPerformance(question: { kind?: QuestionKind }): boolean {
  return !!question.kind && PERFORMANCE_KINDS.includes(question.kind);
}

/**
 * Fit a bank into one session.
 *
 * Every performance item is kept — a session that drops the speaking or
 * listening rep would silently become a multiple-choice quiz. The remaining
 * slots are filled from the recognition items, sampled when the bank is deeper
 * than the cap so replays vary, then put back in teaching order.
 */
export function selectSession<T extends { kind?: QuestionKind }>(questions: T[], max = SESSION_MAX): T[] {
  if (questions.length <= max) return questions;
  const keep = questions.filter(isPerformance);
  const rest = questions.filter((question) => !isPerformance(question));
  const room = Math.max(0, max - keep.length);
  const sampled = room >= rest.length ? [...rest] : shuffled(rest).slice(0, room);
  const chosen = new Set<T>([...keep, ...sampled]);
  // Original bank order decides how the session teaches: theory first, then
  // the harder production reps.
  return questions.filter((question) => chosen.has(question));
}

function shuffled<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
