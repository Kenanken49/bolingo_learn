// Shared Daraja (Safaricom M-Pesa) client for the mpesa-push / mpesa-callback
// Edge Functions.
//
// Everything that decides MONEY lives here, on the server: the plan price, the
// paid-through window, and the transition to premium. The client app may only
// ever supply a phone number and a plan key.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface MpesaPlan {
  /** Kenya shillings charged by STK Push. */
  amountKes: number;
  /** How long a confirmed payment keeps premium on. */
  periodDays: number;
  label: string;
}

/**
 * Server price authority. `MPESA_PREMIUM_KES` overrides the monthly price so the
 * operator can localize without a redeploy; an override of 0 or a non-number
 * falls back to the shipped default rather than charging nothing.
 */
export function plans(): Record<string, MpesaPlan> {
  const fromEnv = Number(Deno.env.get('MPESA_PREMIUM_KES') ?? '');
  const amountKes = Number.isFinite(fromEnv) && fromEnv > 0 ? Math.round(fromEnv) : 770;
  return {
    premium_monthly: { amountKes, periodDays: 30, label: 'Bolingo Premium, monthly' },
  };
}

export function baseUrl(): string {
  return (Deno.env.get('DARAJA_BASE_URL') ?? 'https://sandbox.safaricom.co.ke').replace(/\/+$/, '');
}

/** Constant-time compare so a callback token cannot be probed byte by byte. */
export function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

/** Daraja wants yyyyMMddHHmmss in East Africa Time, not UTC. */
export function nairobiStamp(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}${get('month')}${get('day')}${hour}${get('minute')}${get('second')}`;
}

/** Accepts 07XX…, +2547…, 2547… and returns the 2547… form Daraja expects. */
export function normalizePhone(raw: string): string | null {
  const digits = (raw ?? '').replace(/[^0-9]/g, '');
  if (/^2547\d{8}$/.test(digits) || /^2541\d{8}$/.test(digits)) return digits;
  if (/^0(7|1)\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^7\d{8}$/.test(digits) || /^1\d{8}$/.test(digits)) return `254${digits}`;
  return null;
}

function requiredEnv(name: string): string | null {
  const value = Deno.env.get(name);
  return value && value.trim() ? value.trim() : null;
}

export function darajaConfig(): {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  callbackUrl: string;
} | { error: string } {
  const consumerKey = requiredEnv('DARAJA_CONSUMER_KEY');
  const consumerSecret = requiredEnv('DARAJA_CONSUMER_SECRET');
  const shortcode = requiredEnv('DARAJA_SHORTCODE');
  const passkey = requiredEnv('DARAJA_PASSKEY');
  const callbackUrl = requiredEnv('MPESA_CALLBACK_URL');
  const missing = [
    [consumerKey, 'DARAJA_CONSUMER_KEY'],
    [consumerSecret, 'DARAJA_CONSUMER_SECRET'],
    [shortcode, 'DARAJA_SHORTCODE'],
    [passkey, 'DARAJA_PASSKEY'],
    [callbackUrl, 'MPESA_CALLBACK_URL'],
  ]
    .filter(([value]) => !value)
    .map(([, name]) => name);
  if (missing.length) return { error: `Missing Daraja secrets: ${missing.join(', ')}.` };
  return {
    consumerKey: consumerKey as string,
    consumerSecret: consumerSecret as string,
    shortcode: shortcode as string,
    passkey: passkey as string,
    callbackUrl: callbackUrl as string,
  };
}

// --- OAuth ---------------------------------------------------------------

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function darajaToken(): Promise<{ token: string } | { error: string; status: number }> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 15_000) return { token: cachedToken.value };
  const config = darajaConfig();
  if ('error' in config) return { error: config.error, status: 500 };
  const basic = btoa(`${config.consumerKey}:${config.consumerSecret}`);
  let res: Response;
  try {      // NOTE: OAuth intentionally has NO /mpesa prefix (unlike STK Push and
      // STK Query): /oauth/v1/generate on both sandbox and production.
      res = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${basic}` },
    });
  } catch (e) {
    return { error: `Daraja is unreachable: ${String(e)}`, status: 502 };
  }
  const body = await res.json().catch(() => ({})) as { access_token?: string; expires_in?: string | number };
  if (!res.ok || !body.access_token) {
    return { error: 'Daraja rejected the credentials. Check the consumer key and secret.', status: 502 };
  }
  const seconds = Number(body.expires_in ?? 3600) || 3600;
  cachedToken = { value: body.access_token, expiresAt: Date.now() + seconds * 1000 };
  return { token: body.access_token };
}

// --- Supabase ------------------------------------------------------------

export function admin() {
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
}

export interface CheckoutRow {
  id: string;
  user_id: string;
  phone: string;
  plan: string;
  amount_kes: number;
  period_days: number;
  checkout_request_id: string | null;
  status: string;
  period_ends: string | null;
}

/**
 * Grant or lapse premium from the checkout ledger alone.
 *
 * Premium is on when the user holds a confirmed row that is still in date.
 * Because M-Pesa is a one-shot payment rather than a store subscription, there
 * is no renewal webhook to turn it off — so every call that touches this
 * function also settles the user's own expiry. Without that, a single paid
 * month would keep premium forever.
 */
export async function settlePremium(userId: string): Promise<{ isPremium: boolean; periodEnds: string | null }> {
  const db = admin();
  const { data } = await db
    .from('mpesa_checkouts')
    .select('period_ends, status')
    .eq('user_id', userId)
    .eq('status', 'confirmed')
    .order('period_ends', { ascending: false })
    .limit(1)
    .maybeSingle();
  const periodEnds = (data as { period_ends?: string } | null)?.period_ends ?? null;
  const live = Boolean(periodEnds && new Date(periodEnds).getTime() > Date.now());
  await db.from('profiles').update({ is_premium: live }).eq('id', userId);
  return { isPremium: live, periodEnds };
}

/**
 * Turn a Daraja callback/query body into a settled ledger row.
 * Idempotent: a repeat callback for an already-settled checkout changes nothing.
 *
 * `paidAmountKes` is checked against the amount this server asked for. A payment
 * of 1 KES against a 770 KES order is not premium, whatever the callback says.
 */
export async function settleCheckout(
  checkoutRequestId: string,
  outcome: {
    resultCode: string;
    resultDesc: string;
    merchantRequestId?: string;
    paidAmountKes?: string | number;
  }
): Promise<{ ok: boolean; reason?: string; userId?: string }> {
  const db = admin();
  const { data: row } = await db
    .from('mpesa_checkouts')
    .select('id, user_id, status, plan, period_days, amount_kes, checkout_request_id')
    .eq('checkout_request_id', checkoutRequestId)
    .maybeSingle();
  if (!row) return { ok: false, reason: 'Unknown CheckoutRequestID.' };
  const existing = row as {
    id: string;
    user_id: string;
    status: string;
    plan: string;
    period_days: number;
    amount_kes: number;
    checkout_request_id: string | null;
  };
  if (existing.status === 'confirmed' || existing.status === 'failed') {
    return { ok: true, reason: 'already-settled', userId: existing.user_id };
  }

  let paid = outcome.resultCode === '0';
  let resultDesc = outcome.resultDesc;
  if (paid && outcome.paidAmountKes !== undefined) {
    const given = Number(outcome.paidAmountKes);
    if (!Number.isFinite(given) || Math.round(given) !== existing.amount_kes) {
      paid = false;
      resultDesc = `Amount mismatch: paid ${outcome.paidAmountKes}, expected ${existing.amount_kes}.`;
      console.error('mpesa: settled a checkout with the wrong amount —', checkoutRequestId, resultDesc);
    }
  }
  const patch: Record<string, unknown> = {
    status: paid ? 'confirmed' : 'failed',
    result_code: outcome.resultCode,
    result_desc: resultDesc,
    merchant_request_id: outcome.merchantRequestId ?? null,
    settled_at: new Date().toISOString(),
  };
  if (paid) {
    const days = existing.period_days > 0 ? existing.period_days : 30;
    patch.period_ends = new Date(Date.now() + days * 86_400_000).toISOString();
  }
  // 'expired' is still settleable: the local TTL only means the callback was
  // slow, and a learner who really paid must not be kept out of premium — or
  // left holding a taken payment — because our own timeout fired first.
  const { error } = await db
    .from('mpesa_checkouts')
    .update(patch)
    .eq('id', existing.id)
    .in('status', ['pending', 'expired']);
  if (error) return { ok: false, reason: error.message };
  await settlePremium(existing.user_id);
  return { ok: true, userId: existing.user_id };
}
