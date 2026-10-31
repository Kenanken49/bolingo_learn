/**
 * Bundled release snapshot of published transcript lessons.
 *
 * Transcript drafts are reviewed and published in Supabase, so they are not in
 * the generated `lib/*-plus.ts` banks. That used to mean a path node pointing
 * at one of them needed a successful catalog read to open at all. This module
 * carries the reviewed snapshot that ships with the app, so an offline learner
 * can still open `swahili-fsi-01` from the path.
 *
 * Supabase remains authoritative whenever it answers: the catalog loader only
 * merges this snapshot into the *builtin* result (catalog not configured,
 * timed out, failed, or an empty table). A successful remote read that omits a
 * transcript lesson — because it was unpublished — keeps it hidden online,
 * while the released offline copy remains available without a network.
 *
 * The rows are validated with the same `toCourseLesson()` path as remote rows,
 * so a malformed snapshot is skipped rather than breaking a session.
 */
import { toCourseLesson, type RemoteLessonRow } from './languageCatalogRows';
import type { CourseLesson } from './quizBank';

interface OfflineTranscriptRow extends RemoteLessonRow {
  courseId?: string;
  sourceId?: string;
  reviewedAt?: string;
}

interface OfflineTranscriptBundle {
  lessons?: OfflineTranscriptRow[];
}

// JSON import through require keeps Metro and the Node guards on the same path
// without depending on resolveJsonModule in the Expo tsconfig.
const bundle = require('../content/published/language-lessons.offline.json') as OfflineTranscriptBundle;

function buildLessons(): Record<string, CourseLesson> {
  const lessons: Record<string, CourseLesson> = {};
  for (const row of bundle.lessons ?? []) {
    const lesson = toCourseLesson(row);
    if (!lesson) {
      console.warn(
        `[publishedTranscriptLessons] skipped invalid offline lesson "${row?.id ?? 'unknown'}". ` +
          'Run npm run check:catalog.'
      );
      continue;
    }
    lessons[lesson.id] = lesson;
  }
  return lessons;
}

export const PUBLISHED_TRANSCRIPT_LESSONS: Readonly<Record<string, CourseLesson>> = buildLessons();

export const PUBLISHED_TRANSCRIPT_LESSON_IDS: readonly string[] = Object.keys(
  PUBLISHED_TRANSCRIPT_LESSONS
);

/** Resolve a published transcript lesson from the shipped offline snapshot. */
export function getPublishedTranscriptLesson(id: string): CourseLesson | undefined {
  return PUBLISHED_TRANSCRIPT_LESSONS[id];
}
