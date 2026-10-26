import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { supabase } from './supabase';

/** Entitlement id in RevenueCat dashboard — one entitlement gates everything. */
export const PREMIUM_ENTITLEMENT = 'premium';
/** $7.70/mo reference price shown before offerings load. */
export const PREMIUM_PRICE_LABEL = '$7.70/mo';

let configured = false;
const native = Platform.OS === 'android' || Platform.OS === 'ios';

/** Debug backdoor for device testing without real charges. Enabled only with __DEV__. */
export const DEBUG_PREMIUM_UNLOCK = __DEV__ && process.env.EXPO_PUBLIC_DEBUG_PREMIUM === '1';

export function configurePurchases(): void {
  if (configured || !native) return;
  const key =
    Platform.OS === 'android'
      ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  if (!key) {
    console.warn('RevenueCat key missing — paywall runs in debug/test mode.');
    return;
  }
  Purchases.configure({ apiKey: key });
  configured = true;
}

/** Is the signed-in user entitled to premium? Syncs the flag to profiles. */
export async function refreshPremiumStatus(userId: string): Promise<boolean> {
  let entitled = false;
  if (native) {
    try {
      const info = await Purchases.getCustomerInfo();
      entitled = info.entitlements.active[PREMIUM_ENTITLEMENT] != null;
    } catch (e) {
      console.warn('RevenueCat customer info failed:', e);
    }
  }
  if (DEBUG_PREMIUM_UNLOCK && (await debugUnlocked())) entitled = true;
  try {
    await supabase.from('profiles').update({ is_premium: entitled }).eq('id', userId);
  } catch {
    // profile sync is best-effort
  }
  return entitled;
}

// --- Debug toggle (device testing, __DEV__ only) ---
let debugFlag = false;
export async function debugUnlocked(): Promise<boolean> {
  return debugFlag;
}
export function setDebugPremium(v: boolean): void {
  if (__DEV__) debugFlag = v;
}
