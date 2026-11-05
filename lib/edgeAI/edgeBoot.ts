import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { getProfile } from '../progress';
import { premiumPaidThrough } from '../purchases';
import { supabase } from '../supabase';
import { activateEdgeEngine, setOfflineLeaseUntil } from './modelStore';
import { leaseFromCheck, leaseValid, parseLease, touchLease, type PremiumLease } from './premiumLease';

/**
 * Boots the on-device model at app start so the tutor's "on-device model"
 * route can be taken.
 *
 * Premium is needed to use a downloaded model, but the profile read that
 * says so needs the network, which is exactly what an offline learner lacks.
 * So each online "yes, Premium" writes a time-limited lease
 * (`premiumLease.ts`): it ends at the paid-through date, and never more than
 * 7 days after the check. Offline, the model runs only while the lease holds;
 * a subscription that lapses while the device stays offline stops the model
 * at the lease end, without waiting for the next online check.
 *
 * The plan is re-checked on start, on sign-in or sign-out, when the app
 * returns to the foreground (at most every 5 minutes, or at once if the lease
 * ran out), and by a timer at the lease end. The engine also checks the
 * deadline before each answer, since timers don't run while suspended.
 *
 * Activation is cheap: it registers the engine; the model file itself is
 * only loaded into memory on the first offline question. The model file is
 * kept on the device when the lease ends, so renewing doesn't mean another
 * 1 GB download.
 */
const K_LEASE = 'bolingo.edgeBoot.premiumLease.v1';
/** Pre-lease builds stored an open-ended flag here; it must not grant anything. */
const K_LEGACY_LAST_PREMIUM = 'bolingo.edgeBoot.lastPremium';
const RECHECK_MS = 5 * 60 * 1000;
const PROFILE_TIMEOUT_MS = 4000;
const PAID_THROUGH_TIMEOUT_MS = 4000;
/** setTimeout overflows past ~24.8 days; leases are capped well below that. */
const MAX_TIMER_MS = 2_000_000_000;

let lastCheck = 0;
let running: Promise<boolean> | null = null;
let started = false;
let leaseTimer: ReturnType<typeof setTimeout> | null = null;
let currentLeaseUntil: number | null = null;

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p.catch(() => fallback), new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

async function readLease(): Promise<PremiumLease | null> {
  try {
    return parseLease(await AsyncStorage.getItem(K_LEASE));
  } catch {
    return null;
  }
}

async function writeLease(lease: PremiumLease | null): Promise<void> {
  try {
    if (lease) await AsyncStorage.setItem(K_LEASE, JSON.stringify(lease));
    else await AsyncStorage.removeItem(K_LEASE);
    await AsyncStorage.removeItem(K_LEGACY_LAST_PREMIUM);
  } catch {}
}

/** Store the result of an online plan check. */
async function recordOnlineCheck(isPremium: boolean): Promise<PremiumLease | null> {
  if (!isPremium) {
    await writeLease(null);
    return null;
  }
  const paid = await withTimeout(premiumPaidThrough(), PAID_THROUGH_TIMEOUT_MS, { until: null, willRenew: false });
  const lease = leaseFromCheck(Date.now(), paid);
  await writeLease(lease);
  return lease;
}

/** Offline: Premium only while the stored lease is still in force. */
async function offlineLease(): Promise<PremiumLease | null> {
  const stored = await readLease();
  const now = Date.now();
  if (!leaseValid(stored, now)) return null;
  const touched = touchLease(stored as PremiumLease, now);
  if (touched !== stored) await writeLease(touched);
  return touched;
}

interface Resolved {
  premium: boolean;
  lease: PremiumLease | null;
}

/** Resolve the plan: live profile when reachable, else the offline lease. */
async function resolvePremium(): Promise<Resolved> {
  const live = await withTimeout(
    getProfile().then((p) => ({ premium: p?.is_premium === true })),
    PROFILE_TIMEOUT_MS,
    null as { premium: boolean } | null
  );
  if (live) {
    const lease = await recordOnlineCheck(live.premium);
    return { premium: live.premium, lease };
  }
  const lease = await offlineLease();
  return { premium: lease != null, lease };
}

function scheduleLeaseEnd(lease: PremiumLease | null): void {
  if (leaseTimer) clearTimeout(leaseTimer);
  leaseTimer = null;
  currentLeaseUntil = lease?.validUntil ?? null;
  setOfflineLeaseUntil(currentLeaseUntil);
  if (!lease) return;
  const wait = Math.min(MAX_TIMER_MS, Math.max(0, lease.validUntil - Date.now()) + 1000);
  leaseTimer = setTimeout(() => void refreshEdgeEngine(), wait);
}

/** The learner's plan: live when reachable, otherwise the offline lease. */
export async function currentPremium(): Promise<boolean> {
  const resolved = await resolvePremium();
  scheduleLeaseEnd(resolved.lease);
  return resolved.premium;
}

/** When the on-device model stops working without an online check (epoch ms), if Premium. */
export function offlineLeaseUntil(): number | null {
  return currentLeaseUntil;
}

/** Re-resolve the plan and (re)register the edge engine. Safe to call any time. */
export function refreshEdgeEngine(knownPremium?: boolean): Promise<boolean> {
  if (running) return running;
  running = (async () => {
    lastCheck = Date.now();
    const resolved: Resolved =
      knownPremium === undefined
        ? await resolvePremium()
        : { premium: knownPremium, lease: await recordOnlineCheck(knownPremium) };
    scheduleLeaseEnd(resolved.lease);
    return activateEdgeEngine(resolved.premium);
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
    if (state !== 'active') return;
    const leaseOver = currentLeaseUntil != null && Date.now() >= currentLeaseUntil;
    if (leaseOver || Date.now() - lastCheck > RECHECK_MS) void refreshEdgeEngine();
  });
  const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      void refreshEdgeEngine(false);
    } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
      void refreshEdgeEngine();
    }
  });
  return () => {
    started = false;
    if (leaseTimer) clearTimeout(leaseTimer);
    leaseTimer = null;
    appSub.remove();
    authSub.subscription.unsubscribe();
  };
}
