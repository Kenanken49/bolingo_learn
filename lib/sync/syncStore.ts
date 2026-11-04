import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { completeLesson } from '../progress';
import { supabase } from '../supabase';
import { isOnline } from '../network';
import { hydrateCourseUpdates, refreshCourseUpdates } from './courseUpdates';
import {
  dueItems,
  enqueue,
  isNetworkError,
  markDone,
  markFailed,
  type LessonCompletePayload,
  type SyncItem,
} from './syncQueue';

/**
 * Persistent half of the offline-first sync. Lesson results earned offline
 * are saved here, and `flushSyncQueue` replays them through the normal
 * `completeLesson` path (streaks, XP events, completions) once a connection
 * is back. `startAutoSync` runs a flush on app start, when the app returns
 * to the foreground, when the browser fires `online`, and once a minute.
 */
const K_QUEUE = 'bolingo.syncQueue.v1';
const INTERVAL_MS = 60_000;
/** Course materials change rarely; refresh them at most this often. */
const COURSE_REFRESH_MS = 6 * 3600 * 1000;
let lastCourseRefresh = 0;

type Listener = (count: number) => void;
const listeners = new Set<Listener>();
let flushing: Promise<SyncResult> | null = null;
let started = false;

export interface SyncResult {
  synced: number;
  pending: number;
  offline: boolean;
  /** Lessons in the downloaded course-update pack, when refreshed this run. */
  courseLessons?: number;
}

async function maybeRefreshCourses(force: boolean): Promise<number | undefined> {
  if (!force && Date.now() - lastCourseRefresh < COURSE_REFRESH_MS) return undefined;
  lastCourseRefresh = Date.now();
  try {
    return (await refreshCourseUpdates())?.lessons;
  } catch {
    return undefined;
  }
}

async function load(): Promise<SyncItem[]> {
  try {
    const raw = await AsyncStorage.getItem(K_QUEUE);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SyncItem[]) : [];
  } catch {
    return [];
  }
}

async function save(queue: SyncItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(K_QUEUE, JSON.stringify(queue));
  } catch {}
  listeners.forEach((fn) => fn(queue.length));
}

export async function pendingSyncCount(): Promise<number> {
  return (await load()).length;
}

/**
 * The signed-in learner's id from the session saved on the device. Works
 * offline, when `getProfile()` (a network read) cannot.
 */
export async function offlineUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function queueLessonCompletion(payload: LessonCompletePayload): Promise<void> {
  await save(enqueue(await load(), payload, Date.now()));
}

/**
 * Save progress online, or queue it on the device if the network is down.
 * Returns `queued: true` when the result will sync later.
 */
export async function completeLessonOfflineFirst(
  payload: LessonCompletePayload
): Promise<{ queued: false; profile: Awaited<ReturnType<typeof completeLesson>> } | { queued: true }> {
  try {
    const profile = await completeLesson(payload.userId, payload.xp, payload.lessonId);
    return { queued: false, profile };
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    await queueLessonCompletion(payload);
    return { queued: true };
  }
}

/**
 * Push queued progress up, then pull course updates down. `force` skips the
 * course-refresh throttle (the "Sync now" button).
 */
export function flushSyncQueue(force = false): Promise<SyncResult> {
  if (flushing) return flushing;
  flushing = (async () => {
    let queue = await load();
    const coursesDue = force || Date.now() - lastCourseRefresh >= COURSE_REFRESH_MS;
    // Nothing to push or pull: skip the network probe entirely.
    if (queue.length === 0 && !coursesDue) return { synced: 0, pending: 0, offline: false };
    if (!(await isOnline(true))) return { synced: 0, pending: queue.length, offline: true };
    let synced = 0;
    for (const item of dueItems(queue, Date.now())) {
      try {
        await completeLesson(item.payload.userId, item.payload.xp, item.payload.lessonId);
        queue = markDone(queue, item.id);
        synced++;
      } catch (e) {
        queue = markFailed(queue, item.id, Date.now());
        if (isNetworkError(e)) break; // connection dropped mid-flush — retry later
      }
    }
    if (synced > 0 || queue.length > 0) await save(queue);
    const courseLessons = await maybeRefreshCourses(force);
    return { synced, pending: queue.length, offline: false, courseLessons };
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Call once from the root layout. Safe to call again. */
export function startAutoSync(): () => void {
  if (started) return () => {};
  started = true;
  const run = () => void flushSyncQueue().catch(() => {});
  void hydrateCourseUpdates().finally(run);
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') run();
  });
  const timer = setInterval(run, INTERVAL_MS);
  const onWebOnline = () => run();
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('online', onWebOnline);
  return () => {
    started = false;
    sub.remove();
    clearInterval(timer);
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('online', onWebOnline);
  };
}

export function usePendingSyncCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    void pendingSyncCount().then((n) => alive && setCount(n));
    const fn: Listener = (n) => setCount(n);
    listeners.add(fn);
    return () => {
      alive = false;
      listeners.delete(fn);
    };
  }, []);
  return count;
}
