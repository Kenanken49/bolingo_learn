import type { Config, Context } from '@netlify/functions';
import { desc, eq, gt, isNull, or } from 'drizzle-orm';
import { db } from '../../db/index';
import { jobListings } from '../../db/schema';
import { CORS, isAdmin, json, requireUser, safe } from '../lib/supabaseAuth';

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
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default safe(async (req: Request, context: Context): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  if (req.method === 'GET') {
    const rows = await db
      .select()
      .from(jobListings)
      .where(or(isNull(jobListings.closesAt), gt(jobListings.closesAt, new Date())))
      .orderBy(desc(jobListings.postedAt))
      .limit(100);
    return json(
      rows.map((r) => ({ ...r, postedBy: undefined, requiredTracks: r.requiredTracks.split(',').filter(Boolean) }))
    );
  }

  const user = await requireUser(req);
  if (user instanceof Response) return user;
  if (!(await isAdmin(user))) return json({ error: 'Only admins can manage job listings.' }, 403);

  if (req.method === 'POST') {
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
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
    const missing = (['title', 'employer', 'location', 'description', 'applyUrl'] as const).filter((k) => !listing[k]);
    if (missing.length) return json({ error: `Missing: ${missing.join(', ')}.` }, 400);
    if (!MODES.has(listing.workMode)) return json({ error: 'Work mode must be onsite, hybrid or remote.' }, 400);
    if (!/^https:\/\/[^\s]+$/.test(listing.applyUrl)) return json({ error: 'The apply link must start with https://.' }, 400);
    if (!listing.requiredTracks) return json({ error: 'Pick at least one required certification.' }, 400);
    const [row] = await db.insert(jobListings).values(listing).returning();
    return json(row, 201);
  }

  if (req.method === 'DELETE') {
    const id = Number(context.params?.id);
    if (!Number.isInteger(id) || id <= 0) return json({ error: 'Unknown listing.' }, 400);
    await db.delete(jobListings).where(eq(jobListings.id, id));
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed.' }, 405);
});

export const config: Config = {
  path: ['/api/jobs', '/api/jobs/:id'],
};
