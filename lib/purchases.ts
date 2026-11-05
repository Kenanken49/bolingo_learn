import { Platform } from 'react-native';
import { supabase } from './supabase';
import { mpesaPaidThrough, mpesaPremiumLive } from './mpesa';
import { latestPaidThrough, type PaidThrough } from './edgeAI/premiumLease';

/** Entitlement id in RevenueCat dashboard — one entitlement gates everything. */
export const PREMIUM_ENTITLEMENT = 'premium';
/** Store product ids (must match Play Console + App Store Connect exactly). */
export const PREMIUM_PRODUCT_IDS = {
  android: 'bolingo_premium_monthly',
  ios: 'bolingo_premium_monthly',
} as const;
/** Offering identifier in the RevenueCat dashboard. */
export const PREMIUM_OFFERING_ID = 'default';
/** KSh 770/mo reference price shown before offerings load. */
export const PREMIUM_PRICE_LABEL = 'KSh 770/mo';

let configured = false;
const native = Platform.OS === 'android' || Platform.OS === 'ios';

/** Debug backdoor for device testing without real charges. Enabled only with __DEV__. */
export const DEBUG_PREMIUM_UNLOCK = __DEV__ && process.env.EXPO_PUBLIC_DEBUG_PREMIUM === '1';

// --- Safe native-module loader -------------------------------------------
// `react-native-purchases` ships native code: a static import crashes Expo Go
// / web / LD-player images without Play Store (TurboModule missing). Lazy
// require keeps the paywall renderable everywhere; every helper below
// degrades to a clear error instead of a red screen.
let NativePurchases: any = null;
let nativeLoadTried = false;

function nativePurchasesOrNull(): any | null {
  if (!native) return null;
  if (!nativeLoadTried) {
    nativeLoadTried = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('react-native-purchases');
      NativePurchases = mod?.default ?? mod;
    } catch (e) {
      console.warn('react-native-purchases native module unavailable (Expo Go / no store?):', e);
      NativePurchases = null;
    }
  }
  return NativePurchases;
}

export function purchasesAvailable(): boolean {
  return nativePurchasesOrNull() != null;
}

export function configurePurchases(): void {
  if (configured) return;
  const P = nativePurchasesOrNull();
  if (!P) return; // paywall shows the exact reason instead of crashing
  const key =
    Platform.OS === 'android'
      ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  if (!key) {
    console.warn('RevenueCat key missing — paywall runs in debug/test mode.');
    return;
  }
  try {
    P.configure({ apiKey: key });
    configured = true;
  } catch (e) {
    console.warn('RevenueCat configure failed:', e);
  }
}

async function getCustomerEntitled(): Promise<{ ok: boolean; entitled: boolean }> {
  const P = nativePurchasesOrNull();
  if (!P) return { ok: false, entitled: false };
  try {
    const info = await P.getCustomerInfo();
    return { ok: true, entitled: info?.entitlements?.active?.[PREMIUM_ENTITLEMENT] != null };
  } catch (e) {
    console.warn('RevenueCat customer info failed:', e);
    return { ok: false, entitled: false };
  }
}

/**
 * Is the signed-in user entitled to premium? Syncs the flag to profiles —
 * RevenueCat can grant access, and only a store answer PLUS an expired M-Pesa
 * ledger can revoke it. On store errors (no network, Expo Go, misconfigured
 * keys) the existing profile flag is kept, so a transient failure can never
 * demote a paying user.
 */
export async function refreshPremiumStatus(userId: string): Promise<boolean> {
  if (DEBUG_PREMIUM_UNLOCK && (await debugUnlocked())) {
    try {
      await supabase.from('profiles').update({ is_premium: true }).eq('id', userId);
    } catch {
      // best-effort
    }
    return true;
  }
  const { ok, entitled } = await getCustomerEntitled();
  if (!ok) {
    try {
      const { data } = await supabase.from('profiles').select('is_premium').eq('id', userId).single();
      return (data as { is_premium?: boolean } | null)?.is_premium === true;
    } catch {
      return false;
    }
  }
  // The store is authoritative for "yes", never for "not anymore": an M-Pesa
  // subscriber has no RevenueCat record, so an unentitled answer must not
  // erase a payment period that is still running.
  const live = entitled || (await mpesaPremiumLive());
  try {
    await supabase.from('profiles').update({ is_premium: live }).eq('id', userId);
  } catch {
    // profile sync is best-effort
  }
  return live;
}

/**
 * When does the learner's current paid period end, across both rails?
 * Used to bound how long an on-device model keeps working offline
 * (`lib/edgeAI/premiumLease.ts`). Rails that can't answer are skipped; if
 * none can, the caller falls back to the fixed offline cap.
 */
export async function premiumPaidThrough(): Promise<PaidThrough> {
  const store = async (): Promise<PaidThrough | null> => {
    const P = nativePurchasesOrNull();
    configurePurchases();
    if (!P || !configured) return null;
    try {
      const info = await P.getCustomerInfo();
      const ent = info?.entitlements?.active?.[PREMIUM_ENTITLEMENT];
      if (!ent) return null;
      const ms = typeof ent.expirationDateMillis === 'number' ? ent.expirationDateMillis : ent.expirationDate ? Date.parse(ent.expirationDate) : null;
      return { until: ms != null && Number.isFinite(ms) ? ms : null, willRenew: ent.willRenew === true };
    } catch {
      return null;
    }
  };
  const [s, m] = await Promise.all([store(), mpesaPaidThrough()]);
  return latestPaidThrough([s, m]);
}

export async function getOfferingsSafe(): Promise<{ offering: any | null; error: string | null }> {
  const P = nativePurchasesOrNull();
  if (!P) return { offering: null, error: 'Store billing is not available in this build (Expo Go / web / emulator without Play Store). Use a dev build or the debug unlock below.' };
  try {
    configurePurchases();
    const offerings = await P.getOfferings();
    const offering = offerings?.all?.[PREMIUM_OFFERING_ID] ?? offerings?.current ?? null;
    if (!offering) return { offering: null, error: 'No RevenueCat offering found — check the dashboard (offering `default` + monthly package).' };
    return { offering, error: null };
  } catch (e) {
    return { offering: null, error: String((e as Error)?.message ?? e) };
  }
}

export async function purchasePackageSafe(pkg: any): Promise<{ entitled: boolean; cancelled: boolean; error: string | null }> {
  const P = nativePurchasesOrNull();
  if (!P) return { entitled: false, cancelled: false, error: 'Store billing is not available in this build.' };
  try {
    const { customerInfo } = await P.purchasePackage(pkg);
    return { entitled: customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT] != null, cancelled: false, error: null };
  } catch (e: unknown) {
    if ((e as { userCancelled?: boolean })?.userCancelled) return { entitled: false, cancelled: true, error: null };
    return { entitled: false, cancelled: false, error: String((e as Error)?.message ?? e) };
  }
}

export async function restorePurchasesSafe(): Promise<{ entitled: boolean | null; error: string | null }> {
  const P = nativePurchasesOrNull();
  if (!P) return { entitled: null, error: 'Store billing is not available in this build (Expo Go / web).' };
  try {
    await P.restorePurchases();
    const { ok, entitled } = await getCustomerEntitled();
    if (!ok) return { entitled: null, error: 'Restore ran but customer info could not be read — check connection and try again.' };
    return { entitled, error: null };
  } catch (e) {
    return { entitled: null, error: String((e as Error)?.message ?? e) };
  }
}

// --- Debug toggle (device testing, __DEV__ only) ---
let debugFlag = false;
export async function debugUnlocked(): Promise<boolean> {
  return debugFlag;
}
export function setDebugPremium(v: boolean): void {
  if (__DEV__) debugFlag = v;
}
