// Supabase Edge Function: revenuecat-webhook
//
// Server-side Premium truth. Configure in RevenueCat dashboard:
// Integrations → Webhooks → add this function's URL, Authorization header
// = the REVENUECAT_WEBHOOK_SECRET you set in Supabase secrets.
//
// Events handled:
//   - INITIAL_PURCHASE / RENEWAL / UNCANCELLATION / SUBSCRIPTION_EXTENDED
//       → profiles.is_premium = true
//   - EXPIRATION / CANCELLATION / BILLING_ISSUE (with expired entitlement)
//       → profiles.is_premium = false (only when `premium` entitlement lapsed)
// Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, REVENUECAT_WEBHOOK_SECRET.
// Deploy with: supabase functions deploy revenuecat-webhook

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const GRANT = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'SUBSCRIPTION_EXTENDED', 'NON_RENEWING_PURCHASE']);
const REVOKE = new Set(['EXPIRATION', 'CANCELLATION', 'BILLING_ISSUE']);

serve(async (req: Request) => {
  if (req.method === 'GET') return json({ ok: true, usage: 'POST RevenueCat events here.' });
  if (req.method === 'OPTIONS') return new Response('ok');
  try {
    const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? '';
    if (!secret) return json({ error: 'Webhook secret not configured.' }, 500);
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}` && auth !== secret) {
      return json({ error: 'Unauthorized.' }, 401);
    }
    const event = (await req.json()) as {
      event?: { type?: string; app_user_id?: string; entitlement_ids?: string[] | null };
    };
    const type = event?.event?.type ?? '';
    const appUserId = event?.event?.app_user_id ?? '';
    const entitlements = event?.event?.entitlement_ids ?? [];
    if (!type || !appUserId) return json({ error: 'Missing event type / app_user_id.' }, 400);
    if (!entitlements.includes('premium') && (GRANT.has(type) || REVOKE.has(type))) {
      // Event for a different entitlement — acknowledge, change nothing.
      return json({ ok: true, ignored: true });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    if (GRANT.has(type)) {
      const { error } = await supabase.from('profiles').update({ is_premium: true }).eq('id', appUserId);
      if (error) throw error;
      return json({ ok: true, is_premium: true });
    }
    if (REVOKE.has(type)) {
      // Only demote when the premium entitlement actually lapsed — a
      // BILLING_ISSUE during grace period still carries the entitlement.
      if (entitlements.includes('premium')) return json({ ok: true, kept: true });
      const { error } = await supabase.from('profiles').update({ is_premium: false }).eq('id', appUserId);
      if (error) throw error;
      return json({ ok: true, is_premium: false });
    }
    return json({ ok: true, ignored: true });
  } catch (e) {
    console.error('revenuecat-webhook failed:', e);
    return json({ error: String(e) }, 500);
  }
});
