import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { getProfile } from '../progress';
import { supabase } from '../supabase';
import { activateEdgeEngine } from './modelStore';

/**
 * Boots the on-device model at app start so the tutor's "on-device model"
 * route can be taken.
 *
 * Premium is needed to use a downloaded model, but the profile read that
 * says so needs the network, which is exactly what an offline learner lacks.
 * So the last plan seen online is remembered on the device and used when the
 * profile can't load. It is re-checked on start, on sign-in or sign-out, and
 * when the app returns to the foreground (at most every 5 minutes), so a
 * lapsed or new subscription takes effect the next time the device is online.
 *
 * Activation is cheap: it registers the engine; the model file itself is
 * only loaded into memory on the first offline question.
 */
const K_LAST_PREMIUM = 'bolingo.edgeBoot.lastPremium';
const RECHECK_MS = 5 * 60 * 1000;
const PROFILE_TIMEOUT_MS = 4000;

let lastCheck = 0;
let running: Promise<boolean> | null = null;
let started = false;

async function rememberedPremium(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(K_LAST_PREMIUM)) === '1';
  } catch {
    return false;
  }
}

async function remember(isPremium: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(K_LAST_PREMIUM, isPremium ? '1' : '0');
  } catch {}
}

/** Resolve the plan: live profile when reachable, else the last one seen online. */
async function resolvePremium(): Promise<boolean> {
  const live = await Promise.race([
    getProfile()
      .then((p) => (p ? { signedIn: true, premium: p.is_premium === true } : { signedIn: false, premium: false }))
      .catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), PROFILE_TIMEOUT_MS)),
  ]);
  if (live) {
    await remember(live.premium);
    return live.premium;
  }
  return rememberedPremium();
}

/** The learner's plan: live when reachable, otherwise the last one seen online. */
export function currentPremium(): Promise<boolean> {
  return resolvePremium();
}

/** Re-resolve the plan and (re)register the edge engine. Safe to call any time. */
export function refreshEdgeEngine(knownPremium?: boolean): Promise<boolean> {
  if (running) return running;
  running = (async () => {
    lastCheck = Date.now();
    const premium = knownPremium ?? (await resolvePremium());
    if (knownPremium !== undefined) await remember(knownPremium);
    return activateEdgeEngine(premium);
  })()
    .catch(() => false)
    .finally(() => {
      running = null;
    });
  return running;
}

/** Call once from the root layout. Returns a cleanup function. */
export function startEdgeEngine(): () => void {
  if (started) return () => {};
  started = true;
  void refreshEdgeEngine();
  const appSub = AppState.addEventListener('change', (state) => {
    if (state === 'active' && Date.now() - lastCheck > RECHECK_MS) void refreshEdgeEngine();
  });
  const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      void remember(false).then(() => refreshEdgeEngine(false));
    } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
      void refreshEdgeEngine();
    }
  });
  return () => {
    started = false;
    appSub.remove();
    authSub.subscription.unsubscribe();
  };
}
