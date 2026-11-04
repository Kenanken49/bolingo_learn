// Supabase Edge Function: mpesa-push
//
// Starts an M-Pesa STK Push for a signed-in learner and reports its state.
//
// POST { action?: 'start' | 'status' | 'query', phone?, plan?, checkoutRequestId? }
//   start → sends the push to the learner's phone, returns CheckoutRequestID
//   query → asks Daraja what happened to a push the callback may have missed
//   status→ (default) settles expiry and returns premium state + last checkout
//
// The learner may only choose a phone number and a plan key. Amount, paid-through
// window and the premium flag are computed here and in _shared/mpesa.ts.
//
// Deploy: supabase functions deploy mpesa-push --no-verify-jwt=false
// (verify_jwt stays ON — every path needs the caller's own session.)
// Secrets: DARAJA_CONSUMER_KEY, DARAJA_CONSUMER_SECRET, DARAJA_SHORTCODE,
// DARAJA_PASSKEY, MPESA_CALLBACK_URL, optional MPESA_PREMIUM_KES,
// MPESA_PENDING_TTL_MINUTES.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  admin,
  baseUrl,
  darajaConfig,
  darajaToken,
  nairobiStamp,
  normalizePhone,
  plans,
  settleCheckout,
  settlePremium,
} from '../_shared/mpesa.ts';

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

const MAX_PENDING_PER_WINDOW = 3;
const PENDING_WINDOW_MINUTES = 10;

function pendingTtlMinutes(): number {
  const raw = Number(Deno.env.get('MPESA_PENDING_TTL_MINUTES') ?? '');
  return Number.isFinite(raw) && raw >= 1 && raw <= 60 ? raw : 5;
}

/** A checkout the callback never settled stops being queryable after this long. */
async function expireStale(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - pendingTtlMinutes() * 60_000).toISOString();
  await admin()
    .from('mpesa_checkouts')
    .update({ status: 'expired', settled_at: new Date().toISOString(), result_desc: 'No callback within the window.' })
    .eq('user_id', userId)
    .eq('status', 'pending')
    .lt('requested_at', cutoff);
}

async function callerId(req: Request): Promise<string | null> {
  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return null;
  const client = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '',
    { global: { headers: { Authorization: authorization } } }
  );
  const {
    data: { user },
  } = await client.auth.getUser();
  return user?.id ?? null;
}

async function startPush(userId: string, phone: string, planKey: string) {
  const config = darajaConfig();
  if ('error' in config) return json({ error: config.error }, 500);

  const catalog = plans();
  const plan = catalog[planKey];
  if (!plan) return json({ error: `Unknown plan '${planKey}'.` }, 400);

  const db = admin();
  const windowStart = new Date(Date.now() - PENDING_WINDOW_MINUTES * 60_000).toISOString();
  const { count } = await db
    .from('mpesa_checkouts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('requested_at', windowStart);
  if ((count ?? 0) >= MAX_PENDING_PER_WINDOW) {
    return json({ error: `Too many prompts. Try again in ${PENDING_WINDOW_MINUTES} minutes.` }, 429);
  }

  const auth = await darajaToken();
  if ('error' in auth) return json({ error: auth.error }, auth.status);

  const timestamp = nairobiStamp();
  const password = btoa(`${config.shortcode}${config.passkey}${timestamp}`);
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: Number(config.shortcode),
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: plan.amountKes,
        PartyA: phone,
        PartyB: Number(config.shortcode),
        PhoneNumber: phone,
        CallBackURL: config.callbackUrl,
        AccountReference: 'BolingoLearn',
        TransactionDesc: plan.label,
      }),
    });
  } catch (e) {
    return json({ error: `Could not reach Daraja: ${String(e)}` }, 502);
  }

  const pushed = (await res.json().catch(() => ({}))) as {
    ResponseCode?: string;
    ResponseDescription?: string;
    CheckoutRequestID?: string;
    RequestID?: string;
  };
  if (!res.ok || pushed.ResponseCode !== '0' || !pushed.CheckoutRequestID) {
    return json(
      { error: pushed.ResponseDescription || 'Daraja refused the push. Check the number and try again.' },
      502
    );
  }

  const { error: insertError } = await db.from('mpesa_checkouts').insert({
    user_id: userId,
    phone,
    plan: planKey,
    amount_kes: plan.amountKes,
    period_days: plan.periodDays,
    checkout_request_id: pushed.CheckoutRequestID,
    merchant_request_id: pushed.RequestID ?? null,
    status: 'pending',
  });
  if (insertError) return json({ error: `Saved the push but could not record it: ${insertError.message}` }, 500);

  return json({
    checkoutRequestId: pushed.CheckoutRequestID,
    amountKes: plan.amountKes,
    plan: planKey,
    status: 'pending',
    hint: 'Enter your M-Pesa PIN on your phone to complete the purchase.',
  });
}

/** Ask Daraja directly, for the case where the callback never arrived. */
async function queryPush(userId: string, checkoutRequestId: string) {
  const config = darajaConfig();
  if ('error' in config) return json({ error: config.error }, 500);
  const db = admin();
  const { data: row } = await db
    .from('mpesa_checkouts')
    .select('user_id, status, checkout_request_id')
    .eq('checkout_request_id', checkoutRequestId)
    .maybeSingle();
  if (!row) return json({ error: 'Unknown checkout.' }, 404);
  if ((row as { user_id: string }).user_id !== userId) return json({ error: 'Not your checkout.' }, 403);

  const auth = await darajaToken();
  if ('error' in auth) return json({ error: auth.error }, auth.status);
  const timestamp = nairobiStamp();
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: Number(config.shortcode),
        Password: btoa(`${config.shortcode}${config.passkey}${timestamp}`),
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    });
  } catch {
    return json({ error: 'Could not reach Daraja for the query.' }, 502);
  }
  const q = (await res.json().catch(() => ({}))) as {
    ResponseCode?: string;
    ResponseDescription?: string;
    ResultCode?: string | number;
    ResultDesc?: string;
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
  };
  const resultCode = q.ResultCode !== undefined ? String(q.ResultCode) : null;
  if (resultCode !== null) {
    await settleCheckout(checkoutRequestId, {
      resultCode,
      resultDesc: q.ResultDesc ?? '',
      merchantRequestId: q.MerchantRequestID,
    });
  }
  // A query that has no verdict yet must leave the row pending: answering
  // 'failed' here would cancel a payment the learner is still finishing.
  return json({ status: resultCode === null ? 'pending' : resultCode === '0' ? 'confirmed' : 'failed', detail: q.ResponseDescription ?? q.ResultDesc ?? '' });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method === 'GET') {
    return json({ ok: true, usage: 'POST { action: start | query | status } with a signed-in session.' });
  }
  try {
    const userId = await callerId(req);
    if (!userId) return json({ error: 'Sign in to pay with M-Pesa.' }, 401);

    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      phone?: string;
      plan?: string;
      checkoutRequestId?: string;
    };
    const action = body.action ?? 'status';

    if (action === 'start') {
      const phone = normalizePhone(body.phone ?? '');
      if (!phone) return json({ error: 'Enter a Kenyan number, e.g. 0712 345 678.' }, 400);
      return await startPush(userId, phone, body.plan ?? 'premium_monthly');
    }

    await expireStale(userId);

    if (action === 'query') {
      if (!body.checkoutRequestId) return json({ error: 'Missing checkoutRequestId.' }, 400);
      return await queryPush(userId, body.checkoutRequestId);
    }

    const db = admin();
    const [settled, latest] = await Promise.all([
      settlePremium(userId),
      db
        .from('mpesa_checkouts')
        .select('id, status, plan, amount_kes, checkout_request_id, period_ends, requested_at')
        .eq('user_id', userId)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return json({ isPremium: settled.isPremium, periodEnds: settled.periodEnds, lastCheckout: latest.data ?? null });
  } catch (e) {
    console.error('mpesa-push failed:', e);
    return json({ error: String(e) }, 500);
  }
});
