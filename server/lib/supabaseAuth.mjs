/**
 * Server-side helpers for the public API: verify the learner's Supabase
 * session and read their own rows with their own token, so Supabase row-level
 * security still applies. No service-role key is used or needed.
 */
const url = () => (process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const anon = () => process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

export function json(body, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

export async function requireUser(req) {
  const header = req.headers.get('authorization') ?? '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!token) return json({ error: 'Sign in first.' }, 401);
  if (!url() || !anon()) return json({ error: 'Server is missing its Supabase configuration.' }, 500);
  const res = await fetch(`${url()}/auth/v1/user`, { headers: { apikey: anon(), Authorization: `Bearer ${token}` } });
  if (!res.ok) return json({ error: 'Your session has expired. Sign in again.' }, 401);
  const user = await res.json();
  if (!user.id) return json({ error: 'Your session has expired. Sign in again.' }, 401);
  return { id: user.id, token };
}

/** GET a PostgREST path as the learner (RLS applies). */
export async function rest(user, path) {
  const res = await fetch(`${url()}/rest/v1/${path}`, {
    headers: { apikey: anon(), Authorization: `Bearer ${user?.token ?? anon()}` },
  });
  if (!res.ok) throw new Error(`Supabase read failed (${res.status}).`);
  return res.json();
}

export async function isAdmin(user) {
  const rows = await rest(user, `profiles?id=eq.${user.id}&select=is_admin`).catch(() => []);
  return rows[0]?.is_admin === true;
}

/** Wrap a handler so unexpected failures are logged server-side, never leaked as stack traces. */
export function safe(handler) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error(error);
      return json({ error: 'Something went wrong on our side. Please try again in a moment.' }, 500);
    }
  };
}
