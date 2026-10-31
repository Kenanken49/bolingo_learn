import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';
import { supabase } from './supabase';
import { getTelemetryOn } from './preferences';
import { sanitizeErrorMessage, sanitizeTelemetryProps } from './qualityMath';

/**
 * Anonymous platform telemetry.
 *
 * Design constraints:
 * - No learner content. Event names are a closed vocabulary and properties
 *   are scrubbed by sanitizeTelemetryProps (emails, phone-length numbers,
 *   URLs, prompts, answers and transcripts never leave the device).
 * - No blocking. Callers fire and forget; a failed upload stays in a bounded
 *   AsyncStorage buffer and retries later.
 * - No surprises. Settings exposes the opt-out; turning it off clears the
 *   queue. Aggregates power the owner dashboard and the engineer agent.
 */
const BUFFER_KEY = 'bolingo.telemetry.buffer.v1';
const MAX_BUFFER = 200;
const BATCH_SIZE = 40;
const FLUSH_DELAY_MS = 15_000;
const RETRY_AFTER_MS = 60_000;
const DISABLED = process.env.EXPO_PUBLIC_TELEMETRY_DISABLED === '1';

interface QueuedEvent {
  event: string;
  properties: Record<string, unknown>;
  occurredAt: string;
  sessionId: string;
}

let sessionId = makeId('s');
let queue: QueuedEvent[] = [];
let initialized = false;
let consent: boolean | null = null;
let userId: string | null = null;
let appVersion = '1.0.0';
let flushing = false;
let retryAfter = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastScreen = '';
let errorsInstalled = false;

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function persistQueue(): Promise<void> {
  try {
    if (queue.length === 0) await AsyncStorage.removeItem(BUFFER_KEY);
    else await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(queue));
  } catch {}
}

function scheduleFlush(delay = FLUSH_DELAY_MS): void {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flushTelemetry();
  }, delay);
}

function installErrorHandlers(): void {
  if (errorsInstalled) return;
  errorsInstalled = true;
  const globalScope = globalThis as unknown as {
    ErrorUtils?: {
      getGlobalHandler?: () => (error: unknown, fatal?: boolean) => void;
      setGlobalHandler?: (handler: (error: unknown, fatal?: boolean) => void) => void;
    };
  };
  const errorUtils = globalScope.ErrorUtils;
  if (errorUtils?.setGlobalHandler) {
    const previous = errorUtils.getGlobalHandler?.();
    errorUtils.setGlobalHandler((error, fatal) => {
      captureError(error, fatal ? 'uncaught_fatal' : 'uncaught', fatal === true);
      if (previous) previous(error, fatal);
    });
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('error', (event) => captureError(event.error ?? event.message, 'window_error'));
    window.addEventListener('unhandledrejection', (event) => captureError(event.reason, 'unhandled_rejection'));
  }
}

/** Call once from the root layout. Safe to call repeatedly. */
export async function initTelemetry(): Promise<void> {
  if (initialized) return;
  initialized = true;
  appVersion = Constants.expoConfig?.version ?? '1.0.0';
  try {
    consent = DISABLED ? false : await getTelemetryOn();
  } catch {
    consent = !DISABLED;
  }
  try {
    const stored = await AsyncStorage.getItem(BUFFER_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    if (Array.isArray(parsed)) {
      queue = parsed
        .filter(
          (row): row is QueuedEvent =>
            Boolean(row) &&
            typeof row.event === 'string' &&
            typeof row.occurredAt === 'string' &&
            typeof row.sessionId === 'string'
        )
        .slice(-MAX_BUFFER)
        .map((row) => ({ ...row, properties: sanitizeTelemetryProps(row.properties) }));
    }
  } catch {
    queue = [];
  }
  if (consent === false) {
    queue = [];
    await persistQueue();
    return;
  }
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }
  installErrorHandlers();
  track('session_start', { platform: Platform.OS, version: appVersion });
  scheduleFlush(3_000);
  AppState.addEventListener('change', (state) => {
    if (state === 'background' || state === 'inactive') void flushTelemetry(true);
  });
}

export function track(event: string, properties: Record<string, unknown> = {}): void {
  if (DISABLED || consent === false) return;
  if (!event || typeof event !== 'string') return;
  const clean = sanitizeTelemetryProps(properties);
  queue.push({
    event: event.slice(0, 80),
    properties: clean,
    occurredAt: new Date().toISOString(),
    sessionId,
  });
  if (queue.length > MAX_BUFFER) queue = queue.slice(-MAX_BUFFER);
  if (consent === true) void persistQueue();
  scheduleFlush();
}

/** Measure an interaction the learner can feel (quiz submit, path open). */
export function trackTiming(event: string, durationMs: number, properties: Record<string, unknown> = {}): void {
  if (!Number.isFinite(durationMs) || durationMs < 0) return;
  track(event, { ...properties, durationMs: Math.round(durationMs) });
}

/**
 * Errors are operational signals, never learner data. URLs (which can carry
 * signed tokens) are stripped before the message enters the queue.
 */
export function captureError(error: unknown, context = 'app', fatal = false): void {
  let message: string;
  if (error instanceof Error) message = error.message;
  else if (typeof error === 'string') message = error;
  else {
    try {
      message = JSON.stringify(error ?? {});
    } catch {
      message = 'Unknown error';
    }
  }
  track('error', {
    message: sanitizeErrorMessage(message),
    context: String(context).slice(0, 60),
    fatal: fatal || /fatal/i.test(context),
  });
}

/** Route names only; ids are normalised away so screens aggregate cleanly. */
export function trackScreen(pathname: string): void {
  if (!pathname) return;
  const screen =
    pathname
      .replace(/\/[0-9a-f]{8}-[0-9a-f-]{20,}/gi, '/:id')
      .replace(/\/\d+/g, '/:id')
      .replace(/\/+/g, '/') || '/';
  if (screen === lastScreen) return;
  lastScreen = screen;
  track('screen_view', { screen });
}

export async function flushTelemetry(force = false): Promise<void> {
  if (DISABLED || consent !== true || flushing || queue.length === 0) return;
  if (!force && Date.now() < retryAfter) return;
  flushing = true;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const batch = queue.slice(0, BATCH_SIZE);
  try {
    const rows = batch.map((entry) => ({
      occurred_at: entry.occurredAt,
      session_id: entry.sessionId,
      user_id: userId,
      event: entry.event,
      properties: entry.properties,
      app_version: appVersion,
      platform: Platform.OS,
      duration_ms:
        typeof entry.properties.durationMs === 'number' ? Math.round(entry.properties.durationMs) : null,
      ok: entry.properties.ok === false ? false : true,
    }));
    const { error } = await supabase.from('telemetry_events').insert(rows);
    if (error) throw error;
    queue = queue.filter((entry) => !batch.includes(entry));
    retryAfter = 0;
    await persistQueue();
  } catch {
    // Keep the batch for the next attempt, but do not hammer a missing table.
    retryAfter = Date.now() + RETRY_AFTER_MS;
  } finally {
    flushing = false;
    if (queue.length > 0) scheduleFlush(RETRY_AFTER_MS);
  }
}

/** Settings opt-out. Off clears everything immediately; on starts a new session. */
export async function setTelemetryConsent(enabled: boolean): Promise<void> {
  consent = enabled && !DISABLED;
  if (!enabled) {
    queue = [];
    await persistQueue();
    return;
  }
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {}
  track('session_start', { platform: Platform.OS, version: appVersion, resumed: true });
  scheduleFlush(1_000);
}

export function isTelemetryEnabled(): boolean {
  return consent === true && !DISABLED;
}
