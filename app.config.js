/**
 * Dynamic Expo config — same values as the former app.json, plus:
 * - AdMob app ids + rewarded unit ids overridable via EAS env / .env
 * - RevenueCat keys exposed for reference (read at runtime via EXPO_PUBLIC_*)
 * - EAS project id + OTA update URL
 *
 * `runtimeVersion` follows `version`, so bumping the app version strands every
 * previously published update group: an OTA release only reaches builds whose
 * runtime version matches.
 */
const TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

// A "production" build with Google's sample App IDs earns nothing and risks
// an invalid-traffic flag on the account once real units are mixed in. Fail
// the build loudly instead of shipping a silent zero-revenue release. Preview
// and development builds keep the sample ids on purpose (store review too).
if (process.env.EAS_BUILD_PROFILE === 'production' && process.env.ADMOB_ALLOW_TEST_IN_PRODUCTION !== '1') {
  const missing = [];
  if (!process.env.ADMOB_ANDROID_APP_ID) missing.push('ADMOB_ANDROID_APP_ID');
  if (!process.env.ADMOB_IOS_APP_ID) missing.push('ADMOB_IOS_APP_ID');
  if (!process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID) missing.push('EXPO_PUBLIC_ADMOB_REWARDED_ANDROID');
  if (!process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS) missing.push('EXPO_PUBLIC_ADMOB_REWARDED_IOS');
  if (missing.length > 0) {
    throw new Error(
      `[admob] production build needs real AdMob ids — missing: ${missing.join(', ')}. ` +
        'Create them in the AdMob console, add them as EAS secrets (eas secret:create), and rebuild. ' +
        'Only set ADMOB_ALLOW_TEST_IN_PRODUCTION=1 to ship a deliberately ad-free (sample-unit) release. ' +
        'See docs/admob.md.'
    );
  }
}

module.exports = ({ config }) => ({
  ...config,
  name: 'Bolingo Learn',
  slug: 'bolingo_learn',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'bolingo-learn',
  icon: './assets/icon.png',
  // QD-OLED is the default, but Light remains a supported appearance.
  userInterfaceStyle: 'automatic',
  splash: {
    backgroundColor: '#F8F9FC',
    resizeMode: 'contain',
  },
  runtimeVersion: { policy: 'appVersion' },
  updates: {
    url: 'https://u.expo.dev/7ceeed84-5e6b-4157-b515-b7adfba83ddb',
    // The update *channel* is a request header, not a native field. EAS builds
    // get it from the profile in eas.json; a local build (`expo prebuild` +
    // gradlew) has no profile, so without this header `Updates.channel` is ""
    // and every update check 404s. Set EXPO_UPDATES_CHANNEL for local release
    // builds only — leaving it unset keeps EAS in charge of the channel.
    ...(process.env.EXPO_UPDATES_CHANNEL
      ? { requestHeaders: { 'expo-channel-name': process.env.EXPO_UPDATES_CHANNEL } }
      : {}),
  },
  extra: {
    ...(config.extra ?? {}),
    eas: {
      ...((config.extra ?? {}).eas ?? {}),
      projectId: '7ceeed84-5e6b-4157-b515-b7adfba83ddb',
    },
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    package: 'com.bolingo.learn',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
    themeColor: '#000000',
    backgroundColor: '#F8F9FC',
  },
  plugins: [
    'expo-router',
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#22c55e',
      },
    ],
    [
      'expo-speech-recognition',
      {
        microphonePermission: 'Bolingo Learn uses the microphone so you can practise speaking a phrase.',
        speechRecognitionPermission: 'Bolingo Learn uses speech recognition to check the words you said.',
        androidSpeechServicePackages: ['com.google.android.googlequicksearchbox'],
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: process.env.ADMOB_ANDROID_APP_ID || TEST_ANDROID_APP_ID,
        iosAppId: process.env.ADMOB_IOS_APP_ID || TEST_IOS_APP_ID,
      },
    ],
    // On-device small language model runtime (llama.cpp). Native builds only.
    'llama.rn',
  ],
});
