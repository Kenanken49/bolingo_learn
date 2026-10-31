// Supabase Edge Function: review-approval
//
// POST { approvalId, decision: "approve" | "reject", note?: string }
// Auth: signed-in owner JWT (profiles.is_admin).
//
// Approving a configuration action applies it immediately through the
// allowlist in _shared/actions.ts. Code changes remain proposals for a human
// to implement and deploy through CI. Every decision is audited and emailed.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { applyAction, sanitizeAction } from '../_shared/actions.ts';
import { sendOwnerEmail, DEFAULT_NOTIFY_EMAIL } from '../_shared/notify.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function authenticateOwner(req: Request): Promise<{ userId: string } | { status: number; error: string }> {
  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return { status: 401, error: 'Sign in to review approvals.' };
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey =
    Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';
  if (!url || !anonKey) return { status: 500, error: 'Supabase is not configured.' };
  const client = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { status: 401, error: 'Session expired. Sign in again.' };
  const { data: profile } = await client
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) return { status: 403, error: 'Owner access required.' };
  return { userId: user.id };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only.' }, 405);

  try {
    const owner = await authenticateOwner(req);
    if ('status' in owner) return json({ error: owner.error }, owner.status);

    const body = (await req.json()) as {
      approvalId?: unknown;
      decision?: unknown;
      note?: unknown;
    };
    const approvalId = typeof body.approvalId === 'string' ? body.approvalId : '';
    const decision = body.decision === 'approve' ? 'approve' : body.decision === 'reject' ? 'reject' : '';
    const note = typeof body.note === 'string' ? body.note.slice(0, 600) : '';
    if (!approvalId || !decision) return json({ error: 'approvalId and a valid decision are required.' }, 400);

    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY') ?? '';
    if (!url || !serviceKey) return json({ error: 'Server credentials are missing.' }, 500);
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: approval, error } = await admin
      .from('engineering_approvals')
      .select('*')
      .eq('id', approvalId)
      .maybeSingle();
    if (error || !approval) return json({ error: 'Unknown approval.' }, 404);
    if (approval.status !== 'pending') {
      return json({ error: `This approval is already ${approval.status}.` }, 409);
    }

    let status = decision === 'approve' ? 'approved' : 'rejected';
    let applyResult: Record<string, unknown> | null = null;

    if (decision === 'approve' && approval.action) {
      const { data: flags } = await admin.from('feature_flags').select('key');
      const flagKeys = Array.isArray(flags) ? flags.map((flag) => String(flag.key)) : [];
      const action = sanitizeAction(approval.action, flagKeys);
      if (!action) {
        applyResult = {
          applied: false,
          detail: 'The stored action failed validation; apply the written proposal manually.',
        };
      } else {
        const result = await applyAction(admin, action, owner.userId);
        applyResult = { ...result, action };
        status = result.applied ? 'applied' : 'failed';
      }
    }

    const { data: updated, error: updateError } = await admin
      .from('engineering_approvals')
      .update({
        status,
        decided_by: owner.userId,
        decided_at: new Date().toISOString(),
        decision_note: note || null,
        apply_result: applyResult,
        updated_at: new Date().toISOString(),
      })
      .eq('id', approvalId)
      .select('*')
      .single();
    if (updateError || !updated) {
      return json({ error: 'Could not record the decision.' }, 500);
    }

    const { data: settings } = await admin
      .from('quality_settings')
      .select('notify_email')
      .eq('id', 'default')
      .maybeSingle();
    const recipient = settings?.notify_email || DEFAULT_NOTIFY_EMAIL;
    const actionLine = applyResult
      ? `\nApplied: ${applyResult.applied ? 'yes' : 'no'} — ${String(applyResult.detail ?? '')}`
      : '\nThis is a source-code or content proposal; implement it through CI.';
    const delivery = await sendOwnerEmail(admin, {
      kind: 'approval_decision',
      to: recipient,
      subject: `[Bolingo Learn] Approval ${status}: ${approval.title}`,
      text: [
        `Decision: ${decision}`,
        `Approval: ${approval.title}`,
        `Severity: ${approval.severity}`,
        `Rationale: ${approval.rationale}`,
        `Proposed change: ${approval.proposed_change}`,
        actionLine,
        note ? `\nOwner note: ${note}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      reportId: approval.report_id,
      approvalId: approval.id,
    });
    await admin
      .from('engineering_approvals')
      .update({ email_status: delivery.status })
      .eq('id', approvalId);

    return json({
      ok: true,
      approval: { ...updated, status },
      applied: applyResult?.applied === true,
      detail: applyResult?.detail ?? 'Recorded for manual implementation.',
      email: delivery.status,
    });
  } catch (error) {
    console.error('review-approval failed:', error instanceof Error ? error.message : String(error));
    return json({ error: 'The decision could not be recorded.' }, 500);
  }
});
