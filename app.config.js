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
    backgroundColor: '#000000',
    resizeMode: 'contain',
  },
  runtimeVersion: { policy: 'appVersion' },
  updates: {
    url: 'https://u.expo.dev/7ceeed84-5e6b-4157-b515-b7adfba83ddb',
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
    backgroundColor: '#000000',
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
        microphonePermission: 'Bolingo uses the microphone so you can practise speaking a phrase.',
        speechRecognitionPermission: 'Bolingo uses speech recognition to check the words you said.',
        androidSpeechServicePackages: ['com.google.android.googlequicksearchbox'],
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: process.env.ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713',
        iosAppId: process.env.ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511',
      },
    ],
  ],
});
