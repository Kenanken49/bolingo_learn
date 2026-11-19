import { CORS, json, safe } from '../lib/supabaseAuth.mjs';
import { query } from '../lib/db.mjs';
import { deliverToOwner } from '../lib/mailer.mjs';

/**
 * Contact form.
 *   POST /api/feedback  { name?, email, phone?, topic?, message, page? }
 *
 * Public on purpose — a learner with a broken sign-in must still be able to
 * reach support. The row is stored first and the owner notification is
 * attempted afterwards, so a missing email provider degrades to "stored"
 * rather than losing the message. The response never echoes the message back
 * and never includes the owner inbox.
 */
const TOPICS = new Set(['account', 'learning', 'payment', 'bug', 'idea', 'other']);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+0-9 ()-]{7,20}$/;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default safe(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  // A body over the API cap is rejected by the server before reaching here.
  const body = await req.json().catch(() => ({}));
  const entry = {
    name: str(body.name, 80),
    email: str(body.email, 160).toLowerCase(),
    phone: str(body.phone, 24),
    topic: str(body.topic, 20) || 'other',
    message: str(body.message, 4000),
    page: str(body.page, 80),
  };

  if (entry.message.length < 10) {
    return json({ error: 'Please write at least 10 characters so we can help.' }, 400);
  }
  if (!EMAIL.test(entry.email)) {
    return json({ error: 'Add an email we can reply to.' }, 400);
  }
  if (entry.phone && !PHONE.test(entry.phone)) {
    return json({ error: 'That phone number does not look right.' }, 400);
  }
  if (!TOPICS.has(entry.topic)) entry.topic = 'other';

  const rows = await query(
    `INSERT INTO feedback (name, email, phone, topic, message, page)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
    [entry.name || null, entry.email, entry.phone || null, entry.topic, entry.message, entry.page || null]
  );
  const row = rows[0];

  const delivery = await deliverToOwner({ ...entry, id: row.id });
  await query('UPDATE feedback SET delivery = $2 WHERE id = $1', [row.id, delivery]);

  return json({ ok: true, id: row.id, receivedAt: row.created_at, delivery }, 201);
});
