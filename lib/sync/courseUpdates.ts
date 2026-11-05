import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  lastRemoteCourseLessons,
  loadLanguageCatalog,
  setDownloadedCourseUpdates,
} from '../languageCatalog';
import { toCourseLesson, type RemoteLessonRow } from '../languageCatalogRows';
import type { CourseLesson } from '../quizBank';

/**
 * Smart Sync, download half: keep the latest published course edits on the
 * device so they still apply after an offline restart.
 *
 * Stored rows are untrusted on the way back in: every lesson is re-validated
 * with the same `toCourseLesson` check the online loader uses.
 */
const K_UPDATES = 'bolingo.courseUpdates.v1';

export interface CourseUpdateState {
  lessons: number;
  savedAt: number;
}

let hydrated = false;

export async function hydrateCourseUpdates(): Promise<CourseUpdateState> {
  try {
    const raw = await AsyncStorage.getItem(K_UPDATES);
    const parsed = raw ? (JSON.parse(raw) as { savedAt?: number; lessons?: Record<string, RemoteLessonRow> }) : null;
    const valid: Record<string, CourseLesson> = {};
    for (const row of Object.values(parsed?.lessons ?? {})) {
      const lesson = toCourseLesson(row);
      if (lesson) valid[lesson.id] = lesson;
    }
    setDownloadedCourseUpdates(valid);
    hydrated = true;
    return { lessons: Object.keys(valid).length, savedAt: parsed?.savedAt ?? 0 };
  } catch {
    hydrated = true;
    return { lessons: 0, savedAt: 0 };
  }
}

/** Pull the latest catalog and store it. Call only when online. */
export async function refreshCourseUpdates(): Promise<CourseUpdateState | null> {
  if (!hydrated) await hydrateCourseUpdates();
  const snapshot = await loadLanguageCatalog({ force: true });
  const remote = lastRemoteCourseLessons();
  if (snapshot.source !== 'remote' || !remote) return null;
  const savedAt = Date.now();
  try {
    await AsyncStorage.setItem(K_UPDATES, JSON.stringify({ savedAt, lessons: remote }));
  } catch {}
  setDownloadedCourseUpdates(remote);
  return { lessons: Object.keys(remote).length, savedAt };
}

export async function courseUpdateState(): Promise<CourseUpdateState> {
  try {
    const raw = await AsyncStorage.getItem(K_UPDATES);
    const parsed = raw ? (JSON.parse(raw) as { savedAt?: number; lessons?: Record<string, unknown> }) : null;
    return { lessons: Object.keys(parsed?.lessons ?? {}).length, savedAt: parsed?.savedAt ?? 0 };
  } catch {
    return { lessons: 0, savedAt: 0 };
  }
}
