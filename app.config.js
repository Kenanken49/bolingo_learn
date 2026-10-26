/**
 * Dynamic Expo config — same values as the former app.json, plus:
 * - AdMob app ids + rewarded unit ids overridable via EAS env / .env
 * - RevenueCat keys exposed for reference (read at runtime via EXPO_PUBLIC_*)
 * - EAS project id placeholder (fill in after `eas init`)
 */
module.exports = ({ config }) => ({
  ...config,
  name: 'bolingo_learn',
  slug: 'bolingo_learn',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'bolingo-learn',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  runtimeVersion: { policy: 'appVersion' },
  updates: {
    url: 'https://u.expo.dev/your-eas-project-id', // replace after `eas init`
  },
  extra: {
    ...(config.extra ?? {}),
    eas: {
      ...((config.extra ?? {}).eas ?? {}),
      // projectId: 'your-eas-project-id', // uncomment after `eas init`
    },
  },
  ios: {
    supportsTablet: true,
  },
  android: {
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
  },
  plugins: [
    'expo-router',
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: process.env.ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713',
        iosAppId: process.env.ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511',
      },
    ],
  ],
});
