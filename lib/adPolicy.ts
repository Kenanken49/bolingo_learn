/**
 * AdMob policy with no React Native imports.
 *
 * Everything that decides *whether* an ad may be requested, *which* unit id is
 * used, and *how hard* a failed load is retried lives here so the quality gate
 * (`scripts/check-ads.cjs`) can require() it in plain Node and assert the rules
 * without a device.
 *
 * Unit ids come from the build environment. When they are absent the app falls
 * back to Google's sample rewarded unit, which always fills and never bills —
 * that is the only configuration a development build or a store review build
 * may use before the owner's AdMob account exists.
 */

export type AdPlatform = 'android' | 'ios' | 'web' | 'other';

/** Google's official sample units. Bill-free, always fill, safe in dev. */
export const ADMOB_TEST_REWARDED: Record<'android' | 'ios', string> = {
  android: 'ca-app-pub-3940256099942544/5224354917',
  ios: 'ca-app-pub-3940256099942544/1712485313',
};

/** Normalise `Platform.OS` (or a test string) to something we can branch on. */
export function adPlatform(os: string | undefined | null): AdPlatform {
  if (os === 'android') return 'android';
  if (os === 'ios') return 'ios';
  if (os === 'web') return 'web';
  return 'other';
}

/**
 * The rewarded unit for one platform: the owner's id when the build supplied
 * one, the Google sample otherwise. `null` means this platform cannot show a
 * rewarded ad at all (web, desktop), so callers must not even create an ad.
 */
export function rewardedUnitFor(
  platform: AdPlatform,
  env: { android?: string | null; ios?: string | null } = {}
): string | null {
  if (platform !== 'android' && platform !== 'ios') return null;
  const configured = env[platform]?.trim();
  return configured ? configured : ADMOB_TEST_REWARDED[platform];
}

/** True when this unit is one of Google's samples, i.e. no revenue and no risk. */
export function isTestUnit(unitId: string | null | undefined): boolean {
  if (!unitId) return false;
  return unitId === ADMOB_TEST_REWARDED.android || unitId === ADMOB_TEST_REWARDED.ios;
}

/**
 * Whether this learner may be asked to watch an ad for a diamond.
 *
 * Premium is the promise that makes the paid tier worth buying, so it is
 * checked first: a paying learner is never shown an ad, not even one they
 * tapped. Consent is next — without it we may not request a personalised ad in
 * the EEA/UK, and the rewarded flow is the wrong place to discover that.
 */
export function shouldOfferRewardedAd(input: {
  platform: AdPlatform;
  isPremium: boolean;
  consent: boolean;
}): boolean {
  if (input.platform !== 'android' && input.platform !== 'ios') return false;
  if (input.isPremium) return false;
  return input.consent;
}

/** A load failure is normal (no fill, offline). Retry a few times, then stop. */
export const MAX_LOAD_RETRIES = 3;

/** 2s, 4s, 8s … capped at 60s. Attempt is 1-based. */
export function retryDelayMs(attempt: number): number {
  const safe = Number.isFinite(attempt) ? Math.max(1, Math.floor(attempt)) : 1;
  return Math.min(60_000, 2_000 * 2 ** (safe - 1));
}

/** Reward granted per completed video. One diamond, same as a 4-hour regen tick. */
export const DIAMONDS_PER_REWARDED_AD = 1;
