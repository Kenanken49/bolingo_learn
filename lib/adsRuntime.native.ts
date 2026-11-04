/**
 * AdMob startup: consent first, then SDK initialisation.
 *
 * Order matters. Google's UMP SDK has to answer "may this device see an ad?"
 * before the first request, otherwise a learner in the EEA/UK is served a
 * personalised ad without consent. So `startAds()` gathers consent, and the
 * rewarded hook only creates an ad instance once this resolves to 'ready'.
 *
 * Never throws and never blocks the UI: a failure here means "no ads today",
 * which the heart loop already handles through the free 4-hour regen.
 */
import { AdsConsent, AdsConsentStatus, MaxAdContentRating, MobileAds } from 'react-native-google-mobile-ads';
import { adsSupported, isTestAd } from './ads';

export type AdsState = 'ready' | 'denied' | 'unavailable';

let started: Promise<AdsState> | null = null;

/** Idempotent: every caller shares the one boot promise. */
export function startAds(): Promise<AdsState> {
  if (!started) started = boot();
  return started;
}

/**
 * Re-open Google's consent form so a learner can change their mind.
 * Returns false when this device has no consent choice to make (no form, or
 * ads unavailable), which the Settings row reports instead of pretending.
 */
export async function showAdPrivacyOptions(): Promise<boolean> {
  if (!adsSupported) return false;
  try {
    const info = await AdsConsent.getConsentInfo();
    if (!info.isConsentFormAvailable) return false;
    await AdsConsent.showPrivacyOptionsForm();
    return true;
  } catch (error) {
    if (__DEV__) console.warn('[ads] privacy options failed', error);
    return false;
  }
}

async function boot(): Promise<AdsState> {
  if (!adsSupported) return 'unavailable';

  try {
    await MobileAds().setRequestConfiguration({
      // A language-learning app is not a kids' app, but PG keeps the inventory
      // appropriate for a 13+ classroom. Under-age flags stay false so the
      // owner's AdMob account is not silently switched into child mode.
      maxAdContentRating: MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      // Emulators never show a real ad; declaring them keeps development from
      // generating invalid traffic on the owner's account.
      testDeviceIdentifiers: ['EMULATOR'],
    });
  } catch (error) {
    if (__DEV__) console.warn('[ads] request configuration failed', error);
  }

  let consent = true;
  try {
    const info = await AdsConsent.gatherConsent();
    consent = info.canRequestAds ?? info.status !== AdsConsentStatus.REQUIRED;
  } catch (error) {
    // No UMP answer (offline, or a build without the consent form). The Google
    // sample unit is safe to request regardless; a live unit is not, so a live
    // build fails closed and simply offers the wait/Premium paths.
    consent = isTestAd;
    if (__DEV__) console.warn('[ads] consent unavailable — test unit only?', isTestAd, error);
  }

  if (!consent) return 'denied';

  try {
    await MobileAds().initialize();
  } catch (error) {
    // Initialisation failures surface again on the first load; the hook's
    // retry policy is the right place to absorb them.
    if (__DEV__) console.warn('[ads] initialize failed', error);
  }
  return 'ready';
}

