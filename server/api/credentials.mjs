import { CORS, json, requireUser, rest, safe } from '../lib/supabaseAuth.mjs';
import { query } from '../lib/db.mjs';

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

/** Columns every read returns, matching the client's Credential shape. */
const COLUMNS =
  'code, user_id, track_id, track_title, holder_name, projects_passed, issued_at, revoked_at';

function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  return `${chars.slice(0, 3)}-${chars.slice(3, 6)}-${chars.slice(6, 9)}`;
}

function publicView(row) {
  return {
    code: row.code,
    trackId: row.track_id,
    trackTitle: row.track_title,
    holderName: row.holder_name,
    projectsPassed: row.projects_passed,
    issuedAt: row.issued_at,
    revoked: row.revoked_at != null,
  };
}

async function findOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0];
}

export default safe(async (req, params = {}) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const code = params.code ? String(params.code).toUpperCase() : '';

  if (req.method === 'GET' && code) {
    if (!/^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(code)) return json({ error: 'Not a valid credential code.' }, 400);
    const row = await findOne(`SELECT ${COLUMNS} FROM credentials WHERE code = $1 LIMIT 1`, [code]);
    if (!row) return json({ error: 'No credential with this code.' }, 404);
    return json(publicView(row));
  }

  const user = await requireUser(req);
  if (user instanceof Response) return user;

  if (req.method === 'GET') {
    const rows = await query(`SELECT ${COLUMNS} FROM credentials WHERE user_id = $1`, [user.id]);
    return json(rows.map(publicView));
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const trackId = typeof body.trackId === 'string' ? body.trackId.trim() : '';
    if (!/^[a-z0-9-]{1,40}$/.test(trackId)) return json({ error: 'Unknown certification.' }, 400);

    const existing = await findOne(
      `SELECT ${COLUMNS} FROM credentials WHERE user_id = $1 AND track_id = $2 AND revoked_at IS NULL LIMIT 1`,
      [user.id, trackId]
    );
    if (existing) return json(publicView(existing));

    const [tracks, projects] = await Promise.all([
      rest(null, `certification_tracks?id=eq.${trackId}&select=id,title`),
      rest(null, `certification_projects?track_id=eq.${trackId}&select=id`),
    ]);
    if (!tracks[0] || projects.length === 0) return json({ error: 'This certification is not in the catalog yet.' }, 404);
    const ids = projects.map((p) => p.id);
    const done = await rest(
      user,
      `lesson_completions?user_id=eq.${user.id}&lesson_id=in.(${ids.map(encodeURIComponent).join(',')})&select=lesson_id`
    );
    const passed = new Set(done.map((d) => d.lesson_id));
    if (!ids.every((id) => passed.has(id))) {
      return json({ error: `Pass all ${ids.length} projects first (${passed.size} of ${ids.length} done).` }, 403);
    }
    const profile = await rest(user, `profiles?id=eq.${user.id}&select=username`).catch(() => []);
    const holderName = profile[0]?.username?.trim() || 'Bolingo learner';

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const row = await findOne(
          `INSERT INTO credentials (code, user_id, track_id, track_title, holder_name, projects_passed) VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLUMNS}`,
          [newCode(), user.id, trackId, tracks[0].title, holderName, ids.length]
        );
        return json(publicView(row), 201);
      } catch (error) {
        // A code collision retries; a duplicate (user, track) means a parallel request won.
        const raced = await findOne(`SELECT ${COLUMNS} FROM credentials WHERE user_id = $1 AND track_id = $2 LIMIT 1`, [
          user.id,
          trackId,
        ]);
        if (raced) return json(publicView(raced));
        if (attempt === 2) throw error;
      }
    }
  }

  return json({ error: 'Method not allowed.' }, 405);
});
