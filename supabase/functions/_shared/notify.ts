// Owner notifications for the engineer agent and approval decisions.
//
// No email provider is hard-wired into the client. Delivery uses whichever
// server-side channel is configured:
//   1. NOTIFY_EMAIL_WEBHOOK_URL — a generic HTTPS relay that accepts
//      { to, subject, text, html, kind } (works with any transactional mail
//      relay or an internal Worker).
//   2. RESEND_API_KEY — the reference adapter, POST /emails.
// If neither is set the message is recorded as `skipped` in
// notification_outbox, so approvals are never lost or silently claimed sent.
//
// The recipient defaults to bolingolearn@pm.me and can only be changed by an
// admin in quality_settings. The value is always validated as an email.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const DEFAULT_NOTIFY_EMAIL = 'bolingolearn@pm.me';
const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export interface OwnerEmail {
  kind: 'engineer_report' | 'approval_decision';
  subject: string;
  text: string;
  html?: string;
  to?: string | null;
  reportId?: string | null;
  approvalId?: string | null;
}

export interface DeliveryResult {
  status: 'sent' | 'skipped' | 'failed';
  provider: string;
  providerId?: string;
  error?: string;
  outboxId?: string;
}

function cleanError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  return raw
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted]')
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[redacted]')
    .slice(0, 300);
}

function resolveRecipient(candidate: string | null | undefined): string {
  // An explicit server secret wins (deployment-level override); otherwise the
  // admin setting, then the owner default.
  const configured = (Deno.env.get('NOTIFY_EMAIL_TO') ?? '').trim();
  const value = configured || (candidate ?? '').trim() || DEFAULT_NOTIFY_EMAIL;
  return EMAIL_PATTERN.test(value) ? value : DEFAULT_NOTIFY_EMAIL;
}

/** Insert-first audit trail: a notification is never marked sent before it is. */
export async function sendOwnerEmail(
  admin: SupabaseClient,
  message: OwnerEmail
): Promise<DeliveryResult> {
  const to = resolveRecipient(message.to);
  let outboxId: string | undefined;

  try {
    const { data } = await admin
      .from('notification_outbox')
      .insert({
        kind: message.kind,
        recipient: to,
        subject: message.subject.slice(0, 200),
        body: message.text.slice(0, 20_000),
        status: 'queued',
        report_id: message.reportId ?? null,
        approval_id: message.approvalId ?? null,
      })
      .select('id')
      .single();
    outboxId = (data as { id?: string } | null)?.id;
  } catch (error) {
    console.error('notification_outbox insert failed:', cleanError(error));
  }

  const webhookUrl = (Deno.env.get('NOTIFY_EMAIL_WEBHOOK_URL') ?? '').trim();
  const webhookToken = (Deno.env.get('NOTIFY_EMAIL_WEBHOOK_TOKEN') ?? '').trim();
  const resendKey = (Deno.env.get('RESEND_API_KEY') ?? '').trim();
  const from =
    (Deno.env.get('NOTIFY_EMAIL_FROM') ?? '').trim() || 'Bolingo Learn <onboarding@resend.dev>';

  let provider = 'none';
  const finish = async (result: DeliveryResult): Promise<DeliveryResult> => {
    if (outboxId) {
      try {
        await admin
          .from('notification_outbox')
          .update({
            status: result.status,
            provider: result.provider,
            provider_id: result.providerId ?? null,
            error: result.error ?? null,
            sent_at: result.status === 'sent' ? new Date().toISOString() : null,
          })
          .eq('id', outboxId);
      } catch (error) {
        console.error('notification_outbox update failed:', cleanError(error));
      }
    }
    return { ...result, outboxId };
  };

  if (!webhookUrl && !resendKey) {
    return finish({
      status: 'skipped',
      provider: 'none',
      error:
        'No email provider configured. Set NOTIFY_EMAIL_WEBHOOK_URL or RESEND_API_KEY in Supabase secrets.',
    });
  }

  try {
    if (webhookUrl) {
      provider = 'webhook';
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}),
        },
        body: JSON.stringify({
          to,
          subject: message.subject,
          text: message.text,
          html: message.html ?? null,
          kind: message.kind,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`Relay responded ${response.status}.`);
      let providerId: string | undefined;
      try {
        const data = await response.json();
        providerId = typeof data?.id === 'string' ? data.id : undefined;
      } catch {}
      return finish({ status: 'sent', provider, providerId });
    }

    provider = 'resend';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Resend responded ${response.status}.`);
    const data = await response.json();
    return finish({
      status: 'sent',
      provider,
      providerId: typeof data?.id === 'string' ? data.id : undefined,
    });
  } catch (error) {
    return finish({
      status: 'failed',
      provider,
      error: cleanError(error),
    });
  }
}
