import { useCallback, useEffect, useRef, useState } from 'react';
import { useRewardedAd } from 'react-native-google-mobile-ads';
import { REWARDED_AD_UNIT_ID, adsSupported, isTestAd } from '../ads';
import { MAX_LOAD_RETRIES, retryDelayMs } from '../adPolicy';
import { startAds } from '../adsRuntime';
import type { RewardHook, RewardStatus } from './types';

/**
 * Rewarded video → one heart.
 *
 * Three rules this hook exists to enforce:
 *
 * 1. **No ad before consent.** The unit id stays `null` until `startAds()` has
 *    gathered UMP consent, so the SDK never creates an instance early.
 * 2. **The reward is granted once per viewed ad.** `earnedReward` flips true on
 *    Google's `onUserEarnedReward`; a ref makes the grant idempotent across
 *    re-renders, and it resets when the next ad loads.
 * 3. **Failures are expected.** No fill and offline are normal for rewarded
 *    inventory, so a failed load retries three times with backoff and then
 *    leaves the UI to the free 4-hour regen.
 */
export function useRewardedHeart(onEarn: () => void): RewardHook {
  const [ready, setReady] = useState(false);

  // Latest callback without re-creating the ad on every parent render.
  const earnRef = useRef(onEarn);
  earnRef.current = onEarn;
  const grantedRef = useRef(false);
  const retriesRef = useRef(0);

  useEffect(() => {
    let alive = true;
    startAds()
      .then((state) => {
        if (alive) setReady(state === 'ready');
      })
      .catch(() => {
        if (alive) setReady(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const {
    status,
    error,
    earnedReward,
    show: showAd,
    load,
  } = useRewardedAd({
    adUnitId: ready && adsSupported ? REWARDED_AD_UNIT_ID : null,
    autoLoad: ready && adsSupported,
  });

  // Grant exactly once, when Google says the video completed.
  useEffect(() => {
    if (earnedReward && !grantedRef.current) {
      grantedRef.current = true;
      earnRef.current();
    } else if (!earnedReward && grantedRef.current) {
      // A fresh ad has loaded — arm the next grant.
      grantedRef.current = false;
    }
  }, [earnedReward]);

  // Warm the next ad as soon as one closes, so the next tap is instant.
  useEffect(() => {
    if (status === 'closed') load();
  }, [status, load]);

  // Bounded backoff for no-fill / network errors. Google never retries on its
  // own, and an unbounded loop would be a request storm against the account.
  useEffect(() => {
    if (status !== 'error' && status !== 'no-fill') return;
    if (retriesRef.current >= MAX_LOAD_RETRIES) return;
    const attempt = retriesRef.current + 1;
    const timer = setTimeout(() => {
      retriesRef.current = attempt;
      load();
    }, retryDelayMs(attempt));
    return () => clearTimeout(timer);
  }, [status, load]);

  useEffect(() => {
    if (status === 'loaded') retriesRef.current = 0;
  }, [status]);

  const show = useCallback(async () => {
    if (!adsSupported || status !== 'loaded') {
      if (__DEV__) console.log('[Ads] show refused', { adsSupported, status });
      return false;
    }
    if (__DEV__) console.log('[Ads] show()', { status, unit: REWARDED_AD_UNIT_ID, test: isTestAd });
    showAd();
    return true;
  }, [status, showAd]);

  // Dev-only lifecycle trace: ad failures are invisible in the UI by design, so
  // the terminal is the only place to see why a video did not play.
  useEffect(() => {
    if (__DEV__) console.log('[Ads] status', status, error?.message ?? '');
  }, [status, error]);

  return {
    loaded: status === 'loaded',
    showing: status === 'showing',
    available: adsSupported,
    status: status as RewardStatus,
    error: error?.message ?? null,
    testAd: isTestAd,
    show,
  };
}
