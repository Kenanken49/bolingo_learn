/**
 * Web/desktop stub — the AdMob SDK is native-only, so there is nothing to boot
 * and no consent to gather. Reward flows fall back to the wait timer and
 * Premium, which both work everywhere.
 */
export type AdsState = 'ready' | 'denied' | 'unavailable';

export function startAds(): Promise<AdsState> {
  return Promise.resolve('unavailable');
}

/** No ad SDK on web, so there is no ad consent to review. */
export function showAdPrivacyOptions(): Promise<boolean> {
  return Promise.resolve(false);
}
