import { CORS, isAdmin, json, requireUser, safe } from '../lib/supabaseAuth.mjs';
import { query } from '../lib/db.mjs';

/**
 * Job marketplace.
 *   GET    /api/jobs      → open listings (public)
 *   POST   /api/jobs      → admin posts a listing
 *   DELETE /api/jobs/:id  → admin removes a listing
 *
 * Matching happens in the app against the learner's own certifications; the
 * server never receives or stores who matched what.
 */
const MODES = new Set(['onsite', 'hybrid', 'remote']);
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const COLUMNS =
  'id, title, employer, location, work_mode, salary_label, description, required_tracks, apply_url, posted_by, posted_at, closes_at';

/** Database row → the client's JobListing shape (camelCase, tracks split). */
function publicView(row) {
  return {
    id: row.id,
    title: row.title,
    employer: row.employer,
    location: row.location,
    workMode: row.work_mode,
    salaryLabel: row.salary_label,
    description: row.description,
    requiredTracks: String(row.required_tracks || '')
      .split(',')
      .filter(Boolean),
    applyUrl: row.apply_url,
    postedAt: row.posted_at,
    closesAt: row.closes_at,
  };
}

export default safe(async (req, params = {}) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  if (req.method === 'GET') {
    const rows = await query(
      `SELECT ${COLUMNS} FROM job_listings WHERE closes_at IS NULL OR closes_at > now() ORDER BY posted_at DESC LIMIT 100`
    );
    return json(rows.map(publicView));
  }

  const user = await requireUser(req);
  if (user instanceof Response) return user;
  if (!(await isAdmin(user))) return json({ error: 'Only admins can manage job listings.' }, 403);

  if (req.method === 'POST') {
    const b = await req.json().catch(() => ({}));
    const listing = {
      title: str(b.title, 120),
      employer: str(b.employer, 120),
      location: str(b.location, 120),
      workMode: str(b.workMode, 10),
      salaryLabel: str(b.salaryLabel, 60) || null,
      description: str(b.description, 2000),
      requiredTracks: (Array.isArray(b.requiredTracks) ? b.requiredTracks : [])
        .map((t) => str(t, 40))
        .filter((t) => /^[a-z0-9-]+$/.test(t))
        .join(','),
      applyUrl: str(b.applyUrl, 500),
      postedBy: user.id,
      closesAt: typeof b.closesAt === 'string' && !Number.isNaN(Date.parse(b.closesAt)) ? new Date(b.closesAt) : null,
    };
    const missing = ['title', 'employer', 'location', 'description', 'applyUrl'].filter((k) => !listing[k]);
    if (missing.length) return json({ error: `Missing: ${missing.join(', ')}.` }, 400);
    if (!MODES.has(listing.workMode)) return json({ error: 'Work mode must be onsite, hybrid or remote.' }, 400);
    if (!/^https:\/\/[^\s]+$/.test(listing.applyUrl)) return json({ error: 'The apply link must start with https://.' }, 400);
    if (!listing.requiredTracks) return json({ error: 'Pick at least one required certification.' }, 400);
    const rows = await query(
      `INSERT INTO job_listings (title, employer, location, work_mode, salary_label, description, required_tracks, apply_url, posted_by, closes_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING ${COLUMNS}`,
      [
        listing.title,
        listing.employer,
        listing.location,
        listing.workMode,
        listing.salaryLabel,
        listing.description,
        listing.requiredTracks,
        listing.applyUrl,
        listing.postedBy,
        listing.closesAt,
      ]
    );
    return json(publicView(rows[0]), 201);
  }

  if (req.method === 'DELETE') {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) return json({ error: 'Unknown listing.' }, 400);
    await query('DELETE FROM job_listings WHERE id = $1', [id]);
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed.' }, 405);
});
