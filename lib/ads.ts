/**
 * Rewarded video unit for "+1 diamond".
 *
 * The unit id is per platform: an Android id sent to iOS (or the other way
 * round) fails to fill forever, so the build supplies one env var each:
 *
 *   EXPO_PUBLIC_ADMOB_REWARDED_ANDROID
 *   EXPO_PUBLIC_ADMOB_REWARDED_IOS
 *
 * With no env var the Google sample unit is used — it always fills and never
 * bills, which is what every development, emulator and store-review build must
 * run on until the owner's AdMob account exists.
 */
import { Platform } from 'react-native';
import { adPlatform, isTestUnit, rewardedUnitFor, type AdPlatform } from './adPolicy';

export const AD_PLATFORM: AdPlatform = adPlatform(Platform.OS);

/** False on web/desktop: the native SDK is not there, so no ad instance exists. */
export const adsSupported = AD_PLATFORM === 'android' || AD_PLATFORM === 'ios';

export const REWARDED_AD_UNIT_ID: string | null = rewardedUnitFor(AD_PLATFORM, {
  android: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID,
  ios: process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS,
});

/** Surfaced in the UI so a test build can never be mistaken for a live one. */
export const isTestAd = isTestUnit(REWARDED_AD_UNIT_ID);
