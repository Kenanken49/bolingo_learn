import { Platform } from 'react-native';
import { supabase } from './supabase';
import { isFlagOn } from './featureFlags';

/**
 * M-Pesa premium purchases via Safaricom Daraja.
 *
 * The app never chooses a price and never grants anything: it asks the
 * `mpesa-push` Edge Function to send an STK Push to a phone number, then polls
 * that function until the ledger says the payment landed. `profiles.is_premium`
 * is written server-side from the callback, so a tampered client has nothing to
 * flip.
 *
 * Android only. App Store rule 3.1.1 requires in-app purchase for digital
 * content on iOS, so the paywall must not offer M-Pesa there even if the flag
 * is on.
 */
export const MPESA_PLAN = 'premium_monthly' as const;
export const MPESA_PRICE_LABEL = 'KES 770/mo';

const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 120_000;

export type MpesaStatus = 'pending' | 'confirmed' | 'failed' | 'expired' | 'unknown';

export interface MpesaState {
  isPremium: boolean;
  periodEnds: string | null;
  lastCheckout: {
    id: string;
    status: MpesaStatus;
    plan: string;
    amount_kes: number;
    checkout_request_id: string | null;
    period_ends: string | null;
  } | null;
}

interface InvokeError {
  message: string;
}

function messageFrom(error: unknown, fallback: string): string {
  const raw = (error as InvokeError | null)?.message ?? '';
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw.replace(/^Invalid response \(.*?\):/, '')) as { error?: string };
    return parsed.error ?? raw;
  } catch {
    return raw;
  }
}

/** 07XX XXX XXX, +2547XXXXXXXX or 2547XXXXXXXX; Daraja only serves Kenya. */
export function normalizeMpesaPhone(raw: string): string | null {
  const digits = (raw ?? '').replace(/[^0-9]/g, '');
  if (/^254(7|1)\d{8}$/.test(digits)) return digits;
  if (/^0(7|1)\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^(7|1)\d{8}$/.test(digits)) return `254${digits}`;
  return null;
}

async function invoke(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke('mpesa-push', { body });
  if (error) throw new Error(messageFrom(error, 'M-Pesa is unavailable right now.'));
  const payload = data as { error?: string } & Record<string, unknown>;
  if (payload?.error) throw new Error(payload.error);
  return payload;
}

/** Offered on Android builds only, and only while the release flag is on. */
export async function mpesaAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  return isFlagOn('mpesa_premium', false);
}

/**
 * Does an M-Pesa payment still cover this learner right now?
 *
 * `refreshPremiumStatus` consults this before it may clear
 * `profiles.is_premium`: RevenueCat only knows store subscribers, so without
 * this check a Kenyan who paid by STK Push would be demoted the first time the
 * store answered "not entitled". Read-only — the grant itself only ever
 * happens server-side in the `mpesa-push` function.
 */
export async function mpesaPremiumLive(): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase
      .from('mpesa_checkouts')
      .select('period_ends')
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .gt('period_ends', new Date().toISOString())
      .limit(1);
    if (error) return false;
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

export async function fetchMpesaState(): Promise<MpesaState> {
  try {
    const payload = await invoke({ action: 'status' });
    return {
      isPremium: payload.isPremium === true,
      periodEnds: (payload.periodEnds as string | null) ?? null,
      lastCheckout: (payload.lastCheckout as MpesaState['lastCheckout']) ?? null,
    };
  } catch {
    return { isPremium: false, periodEnds: null, lastCheckout: null };
  }
}

/**
 * Sends the push and waits for the learner to enter their PIN.
 *
 * Returns the terminal status; 'pending' means the timeout elapsed while the
 * payment was still open, so the caller should keep the "check again" affordance
 * rather than showing a failure.
 */
export async function startMpesaCheckout(
  phone: string,
  onPending?: (checkoutRequestId: string) => void
): Promise<{ status: MpesaStatus; error: string | null }> {
  const normalized = normalizeMpesaPhone(phone);
  if (!normalized) return { status: 'unknown', error: 'Enter a Kenyan number, e.g. 0712 345 678.' };

  let checkoutRequestId = '';
  try {
    const started = await invoke({ action: 'start', phone: normalized, plan: MPESA_PLAN });
    checkoutRequestId = String(started.checkoutRequestId ?? '');
    if (!checkoutRequestId) return { status: 'unknown', error: 'M-Pesa did not return a request id.' };
    onPending?.(checkoutRequestId);
  } catch (e) {
    return { status: 'unknown', error: (e as Error).message };
  }

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    try {
      const settled = await invoke({ action: 'query', checkoutRequestId });
      const status = String(settled.status ?? 'pending') as MpesaStatus;
      if (status === 'confirmed' || status === 'failed') return { status, error: null };
    } catch {
      // A transient query failure is not a failed payment — keep polling.
    }
  }
  return { status: 'pending', error: null };
}
