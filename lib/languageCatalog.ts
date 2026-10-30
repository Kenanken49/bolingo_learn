/**
 * Language catalog: Supabase first, bundled lessons second.
 *
 * The lesson banks in lib/*-plus.ts are still the source of truth at build
 * time — they seed the database and they ARE the offline catalog. At runtime
 * this module prefers rows from `public.language_lessons`, so an editor can
 * fix a typo, rewrite a theory line or replace a question in the dashboard and
 * have it reach learners without an app release.
 *
 * Rules that keep this safe:
 *  - Remote rows are untrusted input. Every row is shape-checked and run
 *    through validateBank(); one malformed lesson is skipped and the bundled
 *    copy is used for that id, never a crash on the loading screen.
 *  - No Supabase config, a timeout, a network error or an empty table all fall
 *    back to the bundled catalog. A quiz must never be blocked by the network.
 *  - Results cache for CACHE_TTL_MS, failures for RETRY_MS, so an offline
 *    learner pays the timeout once rather than on every question.
 *
 * Path structure (which lesson appears in which unit, and in what order) is
 * still code in lib/curriculum.ts: this layer manages the catalog's content,
 * not the shape of the learning path.
 */
import { supabase } from './supabase';
import { LANGUAGE_COURSES } from './languages';
import type { CourseLesson } from './quizBank';
import { mergeLessonCatalogs, toCourseLesson, type RemoteLessonRow } from './languageCatalogRows';

/** Long enough to batch a session, short enough to see an edit on the next visit. */
const CACHE_TTL_MS = 5 * 60 * 1000;
/** A failed read should not be retried on every quiz open. */
const RETRY_MS = 30 * 1000;
/** Supabase normally answers this query in well under a second. */
const FETCH_TIMEOUT_MS = 2000;

export interface LanguageCatalogSnapshot {
  /** Bundled lessons with remote rows merged on top, keyed by lesson id. */
  lessons: Record<string, CourseLesson>;
  /** 'builtin' means the last read failed, timed out, or the table was empty. */
  source: 'remote' | 'builtin';
  /** Number of valid remote rows applied (0 when the bundle is in use). */
  remoteLessons: number;
  /** When the remote read succeeded; 0 for the pure bundle. */
  fetchedAt: number;
}

const configured = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Course prefixes come from the bundled ids, so a new language bank is
 * recognised without editing this file. Chess lives beside the languages and
 * follows the same shape.
 */
const LANGUAGE_COURSE_IDS = Array.from(
  new Set(Object.keys(LANGUAGE_COURSES).map((id) => id.split('-')[0] ?? id))
);

export function isLanguageLessonId(id: string): boolean {
  return LANGUAGE_COURSE_IDS.some((course) => id.startsWith(`${course}-`));
}

let cache: LanguageCatalogSnapshot | null = null;
let pending: Promise<LanguageCatalogSnapshot> | null = null;
let retryAt = 0;
let warnedTransport = false;
const warnedRows = new Set<string>();

function builtinSnapshot(): LanguageCatalogSnapshot {
  return { lessons: LANGUAGE_COURSES, source: 'builtin', remoteLessons: 0, fetchedAt: 0 };
}

function warnBadRow(id: string, reason: string): void {
  if (warnedRows.has(id)) return;
  warnedRows.add(id);
  console.warn(`[languageCatalog] skipped remote lesson "${id}": ${reason}. Using the bundled copy.`);
}

async function fetchRemoteLessons(): Promise<Record<string, CourseLesson> | null> {
  if (!configured) return null;

  const query = supabase
    .from('language_lessons')
    .select('id, title, theory, questions')
    .eq('published', true)
    .order('position', { ascending: true });

  const result = await Promise.race([
    query,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), FETCH_TIMEOUT_MS)),
  ]);

  if (!result) return null;
  if (result.error) {
    if (!warnedTransport) {
      warnedTransport = true;
      console.warn('[languageCatalog] Supabase read failed — using the bundled language catalog.');
    }
    return null;
  }

  warnedTransport = false;
  // PostgREST returns an array for a table read; anything else is a transport
  // shape we do not understand, and the bundle is the safe answer.
  if (!Array.isArray(result.data)) return null;
  const rows = result.data as RemoteLessonRow[];
  const lessons: Record<string, CourseLesson> = {};
  for (const row of rows) {
    const lesson = toCourseLesson(row);
    if (!lesson) {
      warnBadRow(String(row.id ?? 'unknown'), 'failed shape validation');
      continue;
    }
    lessons[lesson.id] = lesson;
  }
  return lessons;
}

async function fetchAndMerge(): Promise<LanguageCatalogSnapshot> {
  const remote = await fetchRemoteLessons();
  if (!remote) {
    // Keep a previously merged catalog if we have one: stale content beats
    // dropping a learner back to the bundle for a transient failure.
    retryAt = Date.now() + RETRY_MS;
    return cache ?? builtinSnapshot();
  }

  const count = Object.keys(remote).length;
  const snapshot: LanguageCatalogSnapshot = {
    // Empty table (migration not run yet) is not an error: the bundle plays.
    lessons: count > 0 ? mergeLessonCatalogs(LANGUAGE_COURSES, remote) : LANGUAGE_COURSES,
    source: count > 0 ? 'remote' : 'builtin',
    remoteLessons: count,
    fetchedAt: Date.now(),
  };
  cache = snapshot;
  retryAt = 0;
  return snapshot;
}

/**
 * Load the catalog, merging remote rows over the bundle. Callers get a lesson
 * map either way; failures never reject.
 */
export function loadLanguageCatalog({ force = false }: { force?: boolean } = {}): Promise<LanguageCatalogSnapshot> {
  const now = Date.now();
  if (!force) {
    if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return Promise.resolve(cache);
    if (now < retryAt) return Promise.resolve(cache ?? builtinSnapshot());
  }
  if (pending) return pending;
  pending = fetchAndMerge().finally(() => {
    pending = null;
  });
  return pending;
}

/** Resolve one language lesson, remote edits first. Undefined for code lessons. */
export async function getLanguageLessonAsync(id: string): Promise<CourseLesson | undefined> {
  if (!isLanguageLessonId(id)) return undefined;
  const { lessons } = await loadLanguageCatalog();
  return lessons[id] ?? LANGUAGE_COURSES[id];
}

/** Test/debug hook: forget caches so the next call reads Supabase again. */
export function resetLanguageCatalogCache(): void {
  cache = null;
  pending = null;
  retryAt = 0;
  warnedTransport = false;
  warnedRows.clear();
}
