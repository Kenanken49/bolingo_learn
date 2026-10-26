/**
 * Rewarded video ad unit for "+1 heart". Google test ids are used in
 * development; set real ids via env before release (EAS: extra → env).
 *
 * Real ids go in:
 *   EXPO_PUBLIC_ADMOB_REWARDED_ANDROID / EXPO_PUBLIC_ADMOB_REWARDED_IOS
 */
export const REWARDED_AD_UNIT_ID =
  process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID ||
  process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS ||
  'ca-app-pub-3940256099942544/5224354917'; // Google rewarded test id

export const isTestAd = REWARDED_AD_UNIT_ID === 'ca-app-pub-3940256099942544/5224354917';
