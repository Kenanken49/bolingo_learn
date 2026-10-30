/**
 * Pure data-shaping for the remote language catalog.
 *
 * Kept separate from lib/languageCatalog.ts (which owns Supabase, timeouts and
 * caching) so the validation can be exercised directly by
 * scripts/check-language-catalog.cjs against every seeded row. No React, no
 * network, no AsyncStorage — just untrusted JSON in, a validated lesson out.
 */
import { validateBank, type CourseLesson, type CourseQuestion } from './quizBank';

/** The columns the loader selects; theory/questions arrive as parsed JSON. */
export interface RemoteLessonRow {
  id: string;
  title: string;
  theory: unknown;
  questions: unknown;
}

export function isCourseQuestion(value: unknown): value is CourseQuestion {
  if (!value || typeof value !== 'object') return false;
  const question = value as Partial<CourseQuestion>;
  return (
    typeof question.prompt === 'string' &&
    Array.isArray(question.correctChain) &&
    question.correctChain.every((token) => typeof token === 'string') &&
    Array.isArray(question.scrambledTokens) &&
    question.scrambledTokens.every((token) => typeof token === 'string') &&
    typeof question.explain === 'string'
  );
}

/**
 * A row is accepted only if it would pass the same validation that runs at
 * import time. An editor's half-finished row must degrade to the bundled
 * lesson, not break every learner's quiz.
 */
export function toCourseLesson(row: RemoteLessonRow): CourseLesson | null {
  if (typeof row.id !== 'string' || typeof row.title !== 'string' || !row.title.trim()) return null;
  if (!Array.isArray(row.theory) || row.theory.length === 0) return null;
  if (!row.theory.every((line) => typeof line === 'string')) return null;
  if (!Array.isArray(row.questions) || row.questions.length === 0) return null;
  if (!row.questions.every(isCourseQuestion)) return null;

  const lesson: CourseLesson = {
    id: row.id,
    title: row.title.trim(),
    theory: row.theory as string[],
    questions: row.questions,
  };
  try {
    validateBank(lesson);
  } catch {
    return null;
  }
  return lesson;
}

/**
 * Remote rows win by id; everything else keeps the bundled lesson. A lesson
 * unpublished in Supabase is simply absent from `remote`, so the bundle shows
 * through for that id.
 */
export function mergeLessonCatalogs(
  base: Record<string, CourseLesson>,
  remote: Record<string, CourseLesson>
): Record<string, CourseLesson> {
  return { ...base, ...remote };
}
