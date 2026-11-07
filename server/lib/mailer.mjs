/**
 * Owner notifications for the public API.
 *
 * Provider-neutral on purpose: the quality-operations runbook already standardised
 * on "any HTTPS relay that accepts { to, subject, text, kind }", with Resend as a
 * reference adapter. Nothing here is required for a message to be kept — the
 * feedback row is written before delivery is attempted, so an unconfigured
 * deployment still never loses a learner's message.
 */

/** Where owner-facing mail goes. Overridable without a code change. */
export const OWNER_INBOX = process.env.NOTIFY_EMAIL_TO || 'bolingolearn@pm.me';

const FROM =
  process.env.NOTIFY_EMAIL_FROM || 'Bolingo Learn <notifications@bolingo.co.ke>';

function asText(entry) {
  return [
    `From: ${entry.name || 'A learner'} <${entry.email}>`,
    entry.phone ? `Phone: ${entry.phone}` : null,
    `Topic: ${entry.topic}`,
    entry.page ? `Page: ${entry.page}` : null,
    `Feedback id: ${entry.id}`,
    '',
    entry.message,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Send one owner notification.
 * @returns {'sent'|'failed'|'stored'} sent when a provider accepted it, stored
 *   when no provider is configured (the row is still in Postgres).
 */
export async function deliverToOwner(entry) {
  const subject = `[Bolingo ${entry.topic}] feedback #${entry.id}`;
  const text = asText(entry);

  const hook = (process.env.NOTIFY_EMAIL_WEBHOOK_URL || '').trim();
  if (hook) {
    const token = (process.env.NOTIFY_EMAIL_WEBHOOK_TOKEN || '').trim();
    try {
      const res = await fetch(hook, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ to: OWNER_INBOX, subject, text, kind: 'feedback' }),
      });
      if (!res.ok) console.error('[mail] webhook responded', res.status);
      return res.ok ? 'sent' : 'failed';
    } catch (error) {
      console.error('[mail] webhook failed:', error.message);
      return 'failed';
    }
  }

  const resend = (process.env.RESEND_API_KEY || '').trim();
  if (resend) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${resend}` },
        body: JSON.stringify({ from: FROM, to: OWNER_INBOX, subject, text }),
      });
      if (!res.ok) console.error('[mail] resend responded', res.status);
      return res.ok ? 'sent' : 'failed';
    } catch (error) {
      console.error('[mail] resend failed:', error.message);
      return 'failed';
    }
  }

  return 'stored';
}
