/**
 * Offline-first sync queue — the "Smart Sync" of the blueprint.
 *
 * Progress earned without a connection is written to the device first and
 * replayed to the cloud database once the device is back online. This file
 * is the pure half (queue rules, back-off, network-error detection) so the
 * check script can test it; `syncStore.ts` persists and flushes it.
 */

export type SyncKind = 'lesson_complete';

export interface LessonCompletePayload {
  userId: string;
  lessonId: string;
  xp: number;
}

export interface SyncItem {
  /** Dedupe key: the same lesson finished twice offline on one day syncs once. */
  id: string;
  kind: SyncKind;
  payload: LessonCompletePayload;
  createdAt: number;
  attempts: number;
  /** Earliest time the next attempt may run (ms epoch). */
  nextAttemptAt: number;
}

export const MAX_QUEUE = 200;
export const MAX_ATTEMPTS = 8;

export function lessonSyncId(p: LessonCompletePayload, at: number): string {
  const d = new Date(at);
  return `lesson:${p.userId}:${p.lessonId}:${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

/** Add an item; a duplicate id keeps the higher XP instead of double-counting. */
export function enqueue(queue: SyncItem[], payload: LessonCompletePayload, now: number): SyncItem[] {
  const id = lessonSyncId(payload, now);
  const existing = queue.find((item) => item.id === id);
  if (existing) {
    return queue.map((item) =>
      item.id === id
        ? { ...item, payload: { ...item.payload, xp: Math.max(item.payload.xp, payload.xp) } }
        : item
    );
  }
  const next: SyncItem = {
    id,
    kind: 'lesson_complete',
    payload: { ...payload, xp: Math.max(0, Math.floor(payload.xp)) },
    createdAt: now,
    attempts: 0,
    nextAttemptAt: now,
  };
  // Oldest items drop first if a device stays offline for a very long time.
  return [...queue, next].slice(-MAX_QUEUE);
}

/** Exponential back-off: 5s, 10s, 20s … capped at 30 minutes. */
export function backoffMs(attempts: number): number {
  const n = Math.max(1, Math.floor(Number.isFinite(attempts) ? attempts : 1));
  return Math.min(30 * 60 * 1000, 5000 * 2 ** (n - 1));
}

export function dueItems(queue: SyncItem[], now: number): SyncItem[] {
  return queue.filter((item) => item.nextAttemptAt <= now);
}

/** Record a failed attempt; items past MAX_ATTEMPTS are dropped. */
export function markFailed(queue: SyncItem[], id: string, now: number): SyncItem[] {
  return queue
    .map((item) =>
      item.id === id
        ? { ...item, attempts: item.attempts + 1, nextAttemptAt: now + backoffMs(item.attempts + 1) }
        : item
    )
    .filter((item) => item.attempts < MAX_ATTEMPTS);
}

export function markDone(queue: SyncItem[], id: string): SyncItem[] {
  return queue.filter((item) => item.id !== id);
}

/**
 * True when an error means "the request never reached the server", which
 * is the only case where queueing for later is safe (no double XP).
 */
export function isNetworkError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error ?? '');
  return /network request failed|failed to fetch|failed to send a request|networkerror|load failed|fetch failed|timed? ?out|offline|ENOTFOUND|ECONNREFUSED/i.test(msg);
}
