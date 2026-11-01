// Supabase Edge Function: mpesa-callback
//
// Daraja posts the STK Push result here. The call comes from Safaricom, so it
// cannot carry a learner JWT — this function is deployed with --no-verify-jwt
// and authenticates the caller with a secret baked into MPESA_CALLBACK_URL:
//
//   https://<project>.supabase.co/functions/v1/mpesa-callback?t=<MPESA_CALLBACK_TOKEN>
//
// What it may do is narrow: match the CheckoutRequestID to a row THIS server
// created, and settle that row. An unguessable token plus an unknown-id reject
// means a random POST cannot grant premium to anyone.
//
// Deploy: supabase functions deploy mpesa-callback --no-verify-jwt
// Secrets: MPESA_CALLBACK_TOKEN (plus the service-role pair, already present).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { settleCheckout, safeEqual } from '../_shared/mpesa.ts';

const ACK = (ok: boolean) =>
  new Response(JSON.stringify({ ResultCode: ok ? 0 : 1, ResultDesc: ok ? 'Success' : 'Rejected' }), {
    status: ok ? 200 : 401,
    headers: { 'Content-Type': 'application/json' },
  });

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok');
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ ok: true, usage: 'Daraja posts STK Push results here.' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const expected = Deno.env.get('MPESA_CALLBACK_TOKEN') ?? '';
    if (!expected) {
      console.error('mpesa-callback: MPESA_CALLBACK_TOKEN is not set; refusing all callbacks.');
      return new Response(JSON.stringify({ error: 'Callback token not configured.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const supplied = new URL(req.url).searchParams.get('t') ?? '';
    if (!safeEqual(supplied, expected)) {
      console.warn('mpesa-callback: rejected a callback with a bad token.');
      return ACK(false);
    }

    const payload = (await req.json().catch(() => null)) as {
      Body?: {
        stkCallback?: {
          ResultCode?: string | number;
          ResultDesc?: string;
          CheckoutRequestID?: string;
          MerchantRequestID?: string;
          BillRefNumber?: string;
          Amount?: string | number | { value?: string };
        };
      };
    } | null;
    const callback = payload?.Body?.stkCallback;
    if (!callback?.CheckoutRequestID || callback.ResultCode === undefined) return ACK(false);

    const rawAmount = callback.Amount;
    const paidAmount = typeof rawAmount === 'object' && rawAmount !== null ? rawAmount.value : rawAmount;

    const outcome = await settleCheckout(callback.CheckoutRequestID, {
      resultCode: String(callback.ResultCode),
      resultDesc: callback.ResultDesc ?? '',
      merchantRequestId: callback.MerchantRequestID,
      paidAmountKes: paidAmount,
    });
    if (!outcome.ok) console.warn('mpesa-callback:', outcome.reason, callback.CheckoutRequestID);
    return ACK(true);
  } catch (e) {
    console.error('mpesa-callback failed:', e);
    return ACK(false);
  }
});
