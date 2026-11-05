import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Client for the website's API (/api/*, server/index.mjs on Coolify): public
 * credential links and the job marketplace. On the web the API is same-origin;
 * the native apps call the production site. Requests carry the learner's
 * Supabase access token, which the server verifies with Supabase.
 */
export const PUBLIC_SITE = (process.env.EXPO_PUBLIC_SITE_URL || 'https://bolingo.co.ke').replace(/\/$/, '');
const API_BASE = Platform.OS === 'web' ? '' : PUBLIC_SITE;

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function token(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  if (init.auth) {
    const t = await token();
    if (!t) throw new ApiError('Sign in first.', 401);
    headers.authorization = `Bearer ${t}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach Bolingo right now. Check your connection.", 0);
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status}).`, res.status);
  // A 200 that isn't JSON (e.g. an HTML fallback page) is not a valid answer.
  if (data === null) throw new ApiError("Bolingo's server sent an unexpected response. Please try again.", res.status);
  return data as T;
}

/** Public, shareable URL for a credential code. */
export function credentialUrl(code: string): string {
  return `${PUBLIC_SITE}/verify/${code}`;
}
