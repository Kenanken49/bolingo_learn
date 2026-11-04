import type { Config, Context } from '@netlify/functions';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/index';
import { credentials } from '../../db/schema';
import { CORS, json, requireUser, rest, safe } from '../lib/supabaseAuth';

/**
 * Public credential links.
 *   POST /api/credentials        { trackId } → issue (or return) the learner's credential
 *   GET  /api/credentials        → the signed-in learner's credentials
 *   GET  /api/credentials/:code  → public verification (no sign-in)
 *
 * Issuing re-checks the learner's own Supabase record: every project of the
 * track must be in their lesson completions. The client is never trusted to
 * say "I'm certified".
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  return `${chars.slice(0, 3)}-${chars.slice(3, 6)}-${chars.slice(6, 9)}`;
}

function publicView(row: typeof credentials.$inferSelect) {
  return {
    code: row.code,
    trackId: row.trackId,
    trackTitle: row.trackTitle,
    holderName: row.holderName,
    projectsPassed: row.projectsPassed,
    issuedAt: row.issuedAt,
    revoked: row.revokedAt != null,
  };
}

export default safe(async (req: Request, context: Context): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const code = context.params?.code?.toUpperCase();

  if (req.method === 'GET' && code) {
    if (!/^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(code)) return json({ error: 'Not a valid credential code.' }, 400);
    const [row] = await db.select().from(credentials).where(eq(credentials.code, code)).limit(1);
    if (!row) return json({ error: 'No credential with this code.' }, 404);
    return json(publicView(row));
  }

  const user = await requireUser(req);
  if (user instanceof Response) return user;

  if (req.method === 'GET') {
    const rows = await db.select().from(credentials).where(eq(credentials.userId, user.id));
    return json(rows.map(publicView));
  }

  if (req.method === 'POST') {
    const body = (await req.json().catch(() => ({}))) as { trackId?: unknown };
    const trackId = typeof body.trackId === 'string' ? body.trackId.trim() : '';
    if (!/^[a-z0-9-]{1,40}$/.test(trackId)) return json({ error: 'Unknown certification.' }, 400);

    const [existing] = await db
      .select()
      .from(credentials)
      .where(and(eq(credentials.userId, user.id), eq(credentials.trackId, trackId), isNull(credentials.revokedAt)))
      .limit(1);
    if (existing) return json(publicView(existing));

    const [tracks, projects] = await Promise.all([
      rest<{ id: string; title: string }[]>(null, `certification_tracks?id=eq.${trackId}&select=id,title`),
      rest<{ id: string }[]>(null, `certification_projects?track_id=eq.${trackId}&select=id`),
    ]);
    if (!tracks[0] || projects.length === 0) return json({ error: 'This certification is not in the catalog yet.' }, 404);
    const ids = projects.map((p) => p.id);
    const done = await rest<{ lesson_id: string }[]>(
      user,
      `lesson_completions?user_id=eq.${user.id}&lesson_id=in.(${ids.map(encodeURIComponent).join(',')})&select=lesson_id`
    );
    const passed = new Set(done.map((d) => d.lesson_id));
    if (!ids.every((id) => passed.has(id))) {
      return json({ error: `Pass all ${ids.length} projects first (${passed.size} of ${ids.length} done).` }, 403);
    }
    const profile = await rest<{ username?: string | null }[]>(user, `profiles?id=eq.${user.id}&select=username`).catch(() => []);
    const holderName = profile[0]?.username?.trim() || 'Bolingo learner';

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const [row] = await db
          .insert(credentials)
          .values({ code: newCode(), userId: user.id, trackId, trackTitle: tracks[0].title, holderName, projectsPassed: ids.length })
          .returning();
        return json(publicView(row), 201);
      } catch (e) {
        // A code collision retries; a duplicate (user, track) means a parallel request won.
        const [raced] = await db
          .select()
          .from(credentials)
          .where(and(eq(credentials.userId, user.id), eq(credentials.trackId, trackId)))
          .limit(1);
        if (raced) return json(publicView(raced));
        if (attempt === 2) throw e;
      }
    }
  }

  return json({ error: 'Method not allowed.' }, 405);
});

export const config: Config = {
  path: ['/api/credentials', '/api/credentials/:code'],
};
