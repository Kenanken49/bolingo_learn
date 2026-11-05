import { Platform } from 'react-native';
import { supabaseUrl } from './supabase';

/**
 * Connectivity probe for the offline-first stack. No extra native module:
 * the web uses `navigator.onLine` plus a probe; native devices make a short
 * HEAD request to the backend. The result is cached briefly so a burst of
 * tutor questions doesn't make a burst of probes.
 */
const PROBE_TIMEOUT_MS = 3500;
const CACHE_MS = 15_000;

let last: { at: number; online: boolean } | null = null;

export function markOffline(): void {
  last = { at: Date.now(), online: false };
}

export async function isOnline(force = false): Promise<boolean> {
  if (!force && last && Date.now() - last.at < CACHE_MS) return last.online;
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.onLine === false) {
    last = { at: Date.now(), online: false };
    return false;
  }
  if (!supabaseUrl) {
    last = { at: Date.now(), online: false };
    return false;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  let online = false;
  try {
    // Any HTTP response (even 401/404) proves the network path works.
    await fetch(`${supabaseUrl}/auth/v1/health`, { method: 'HEAD', signal: controller.signal });
    online = true;
  } catch {
    online = false;
  } finally {
    clearTimeout(timer);
  }
  last = { at: Date.now(), online };
  return online;
}
