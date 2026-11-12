// Shared Daraja (Safaricom M-Pesa) client for the mpesa-push / mpesa-callback
// Edge Functions.
//
// Everything that decides MONEY lives here, on the server: the plan price, the
// paid-through window, and the transition to premium. The client app may only
// ever supply a phone number and a plan key.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- environment ---------------------------------------------------------

/** The two hosts Daraja answers on. Nothing else may ever see these keys. */
export const SANDBOX_BASE_URL = 'https://sandbox.safaricom.co.ke';
export const PRODUCTION_BASE_URL = 'https://api.safaricom.co.ke';

/** Daraja's own sandbox paybill. A live deployment holding it is a mistake that
 * charges real customers against a test account, so it is refused by name. */
const SANDBOX_SHORTCODES = ['17439', '174390'];

export type DarajaEnvironment = 'sandbox' | 'production';

function hostnameOf(raw: string): string {
  const value = (raw ?? '').trim();
  if (!value) return '';
  try {
    return new URL(/^https?:\/\//.test(value) ? value : `https://${value}`).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function hostToEnvironment(host: string): DarajaEnvironment | null {
  if (host === 'sandbox.safaricom.co.ke') return 'sandbox';
  if (host === 'api.safaricom.co.ke') return 'production';
  return null;
}

/**
 * Which Daraja this deployment talks to.
 *
 * `MPESA_ENV` is the switch an operator sets once at go live. `DARAJA_BASE_URL`
 * still works, because every deployment written before this change selects its
 * endpoint with it — but it is only honoured when its host is one of the two
 * Safaricom hosts, so a typo or a injected value can never redirect a Basic
 * credential pair or a bearer token somewhere else.
 */
export function environment(): DarajaEnvironment {
  const wanted = (Deno.env.get('MPESA_ENV') ?? '').trim().toLowerCase();
  if (wanted === 'production' || wanted === 'live' || wanted === 'prod') return 'production';
  if (wanted === 'sandbox' || wanted === 'test') return 'sandbox';
  const fromUrl = hostToEnvironment(hostnameOf(Deno.env.get('DARAJA_BASE_URL') ?? ''));
  return fromUrl ?? 'sandbox';
}

export function baseUrl(): string {
  return environment() === 'production' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;
}

/**
 * The STK Push transaction type, matching the Daraja product Safaricom issued:
 * `CustomerPayBillOnline` for a paybill (the default, and what the sandbox
 * uses), `CustomerBuyGoodsOnline` for a buy-goods/till number.
 */
export function transactionType(): 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline' {
  const raw = (Deno.env.get('MPESA_TRANSACTION_TYPE') ?? '').trim();
  const flat = raw.replace(/[^a-z]/gi, '').toLowerCase();
  if (flat === 'customerbuygoodsonline' || flat === 'buygoodsonline' || flat === 'buygoods') {
    return 'CustomerBuyGoodsOnline';
  }
  return 'CustomerPayBillOnline';
}

/** The reference carried on the push and echoed back in the callback. */
export function accountReference(): string {
  const clean = (Deno.env.get('MPESA_ACCOUNT_REFERENCE') ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 12);
  return clean || 'BolingoLearn';
}

export interface MpesaPlan {
  /** Kenya shillings charged by STK Push. */
  amountKes: number;
  /** How long a confirmed payment keeps premium on. */
  periodDays: number;
  label: string;
}

/**
 * The figure the app shows on the paywall card (`MPESA_PRICE_LABEL` in
 * `lib/mpesa.ts`). One number on both sides of the network: the server charges
 * it unless `MPESA_PREMIUM_KES` deliberately localizes it, and the go-live audit
 * complains when the two disagree, because charging a learner something other
 * than the price they were just shown is a refund conversation, not a bug.
 */
export const ADVERTISED_AMOUNT_KES = 770;

/**
 * Server price authority. `MPESA_PREMIUM_KES` overrides the monthly price so the
 * operator can localize without a redeploy; an override of 0 or a non-number
 * falls back to the shipped default rather than charging nothing.
 */
export function plans(): Record<string, MpesaPlan> {
  const fromEnv = Number(Deno.env.get('MPESA_PREMIUM_KES') ?? '');
  const amountKes =
    Number.isFinite(fromEnv) && fromEnv > 0 ? Math.round(fromEnv) : ADVERTISED_AMOUNT_KES;
  return {
    premium_monthly: { amountKes, periodDays: 30, label: 'Bolingo Premium, monthly' },
  };
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

// --- go-live audit -------------------------------------------------------

export interface DarajaAudit {
  environment: DarajaEnvironment;
  baseUrl: string;
  transactionType: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline';
  amountKes: number;
  /** Names only. A finding must never be able to quote a secret. */
  secrets: Record<string, boolean>;
  problems: string[];
  warnings: string[];
  ready: boolean;
}

/**
 * Describe the Daraja configuration of this deployment without exposing it.
 *
 * This exists because going live is a configuration step, not a code step, and
 * every way it goes wrong costs money twice: a push a learner pays and never
 * gets premium for, or a test account charging a real customer. Each rule names
 * the variable that is wrong and never its value.
 */
export function audit(): DarajaAudit {
  const problems: string[] = [];
  const warnings: string[] = [];
  const env = environment();
  const base = Deno.env.get('DARAJA_BASE_URL') ?? '';
  const baseHost = hostnameOf(base);

  if (base.trim() && !hostToEnvironment(baseHost)) {
    problems.push(
      'DARAJA_BASE_URL is not a Daraja host (expected sandbox.safaricom.co.ke or api.safaricom.co.ke); it is ignored.'
    );
  } else if (base.trim()) {
    const fromUrl = hostToEnvironment(baseHost) as DarajaEnvironment;
    if (fromUrl !== env) {
      problems.push(
        `MPESA_ENV says '${env}' but DARAJA_BASE_URL points at '${fromUrl}'. Set both to the environment you mean.`
      );
    }
  }

  const config = darajaConfig();
  const secrets: Record<string, boolean> = {};
  for (const name of [
    'DARAJA_CONSUMER_KEY',
    'DARAJA_CONSUMER_SECRET',
    'DARAJA_SHORTCODE',
    'DARAJA_PASSKEY',
    'MPESA_CALLBACK_URL',
    'MPESA_CALLBACK_TOKEN',
  ]) {
    secrets[name] = Boolean(requiredEnv(name));
  }
  if ('error' in config) {
    problems.push(config.error);
  } else {
    const shortcode = config.shortcode;
    if (!/^\d{5,8}$/.test(shortcode)) {
      problems.push('DARAJA_SHORTCODE must be 5 to 8 digits — Daraja receives BusinessShortCode as a number.');
    }
    const looksSandbox = SANDBOX_SHORTCODES.includes(shortcode);
    if (env === 'production' && looksSandbox) {
      problems.push('DARAJA_SHORTCODE is the Daraja sandbox test paybill on the production endpoint — a live push would charge a real customer against a test account.');
    }
    if (env === 'sandbox' && !looksSandbox) {
      warnings.push(
        `DARAJA_SHORTCODE is not the sandbox number, but DARAJA_BASE_URL/MPESA_ENV still select sandbox.`
      );
    }
    const callback = config.callbackUrl;
    let parsed: URL | null = null;
    try {
      parsed = new URL(callback);
    } catch {
      problems.push('MPESA_CALLBACK_URL is not an absolute URL.');
    }
    if (parsed) {
      if (parsed.protocol !== 'https:') {
        problems.push('MPESA_CALLBACK_URL must be https — Daraja refuses plain-HTTP callbacks.');
      }
      if (!parsed.pathname.includes('/functions/v1/mpesa-callback')) {
        warnings.push('MPESA_CALLBACK_URL does not point at the mpesa-callback Edge Function path.');
      }
      const inUrl = parsed.searchParams.get('t') ?? '';
      const token = requiredEnv('MPESA_CALLBACK_TOKEN') ?? '';
      if (!token) {
        problems.push('MPESA_CALLBACK_TOKEN is not set — mpesa-callback will reject every result and paid learners stay free.');
      } else if (!inUrl) {
        problems.push('MPESA_CALLBACK_URL carries no ?t= token, so every callback arrives unauthenticated.');
      } else if (!safeEqual(inUrl, token)) {
        problems.push('The ?t= token in MPESA_CALLBACK_URL does not match MPESA_CALLBACK_TOKEN.');
      } else if (token.length < 16) {
        warnings.push('MPESA_CALLBACK_TOKEN is shorter than 16 characters.');
      }
    }
  }

  const wantedType = (Deno.env.get('MPESA_TRANSACTION_TYPE') ?? '').trim();
  if (wantedType && transactionType() === 'CustomerPayBillOnline' && !/paybill/i.test(wantedType)) {
    problems.push(
      `MPESA_TRANSACTION_TYPE='${wantedType}' is not understood; expected CustomerPayBillOnline (paybill) or CustomerBuyGoodsOnline (till).`
    );
  }
  if (env === 'production' && wantedType === 'CustomerPayBillOnline') {
    warnings.push('MPESA_TRANSACTION_TYPE is the paybill default — confirm Safaricom issued a paybill, not a till.');
  }

  const plan = plans().premium_monthly;
  if (env === 'production' && plan.amountKes !== ADVERTISED_AMOUNT_KES) {
    warnings.push(
      `MPESA_PREMIUM_KES charges ${plan.amountKes} KES while the app advertises KSh ${ADVERTISED_AMOUNT_KES}. Set MPESA_PRICE_LABEL in lib/mpesa.ts to match, then ship.`
    );
  }

  return {
    environment: env,
    baseUrl: baseUrl(),
    transactionType: transactionType(),
    amountKes: plan.amountKes,
    secrets,
    problems,
    warnings,
    ready: problems.length === 0,
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
