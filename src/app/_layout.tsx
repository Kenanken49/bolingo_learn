import '../../global.css';
import { useEffect } from 'react';
import { View } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { setAudioModeAsync } from 'expo-audio';
import * as Updates from 'expo-updates';
import {
  useFonts,
  Roboto_400Regular,
  Roboto_600SemiBold,
  Roboto_700Bold,
  Roboto_800ExtraBold,
} from '@expo-google-fonts/roboto';
import { Baloo2_400Regular, Baloo2_600SemiBold, Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import {
  SchibstedGrotesk_400Regular,
  SchibstedGrotesk_600SemiBold,
  SchibstedGrotesk_700Bold,
  SchibstedGrotesk_800ExtraBold,
} from '@expo-google-fonts/schibsted-grotesk';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { InstrumentSans_400Regular, InstrumentSans_600SemiBold, InstrumentSans_700Bold } from '@expo-google-fonts/instrument-sans';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { cssInterop, useColorScheme } from 'nativewind';
import Animated from 'react-native-reanimated';
import { initTheme, useTheme } from '../../lib/theme';
import { initLearningSpace } from '../../lib/learningSpace';
import { configureReminderHandler, ensureReminderScheduled } from '../../lib/reminders';
import { initTelemetry, trackScreen } from '../../lib/telemetry';
import { startAds } from '../../lib/adsRuntime';
import { startAutoSync } from '../../lib/sync/syncStore';
import { startEdgeEngine } from '../../lib/edgeAI/edgeBoot';
import { setStudioLinePlayer } from '../../lib/pronunciation';
import { playStudioLine, stopStudioLine } from '../../lib/studioVoices';

// Hold the splash until Roboto is ready — no FOUT swap from the OS face.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Livia, Bingo and Zora speak on ElevenLabs when the character-voice function
// answers, and on the device voice when it does not (offline, signed out,
// Swahili, provider outage). Registering here means every screen that already
// calls speakAs/speakSegments gets the studio voice with no per-screen change.
setStudioLinePlayer(playStudioLine, stopStudioLine);

// Reanimated's views skip NativeWind's automatic interop, which silently drops
// className backgrounds on every Animated.View (combo banner, quiz feedback,
// level-up card). Register the mapping once at startup.
cssInterop(Animated.View, { className: 'style' });

/** Pushes the persisted appearance (light/dark) into NativeWind's class
 *  strategy, so every `dark:` variant flips the instant Settings changes. */
function ThemeSync() {
  const [theme] = useTheme();
  const { setColorScheme } = useColorScheme();
  useEffect(() => {
    initTheme().catch(() => {});
    initLearningSpace().catch(() => {});
  }, []);
  useEffect(() => {
    try {
      setColorScheme(theme);
    } catch {}
  }, [theme, setColorScheme]);
  return null;
}

export default function RootLayout() {
  // Icon fonts load here at boot, not lazily on first glyph: a slow network
  // used to fetch FontAwesome mid-session and trip expo-font's 12s timeout
  // into an uncaught red screen. Failures land in fontError (never thrown),
  // so the splash still hides and the app stays usable with text fallbacks.
  const [fontsLoaded, fontError] = useFonts({
    Roboto_400Regular,
    Roboto_600SemiBold,
    Roboto_700Bold,
    Roboto_800ExtraBold,
    // Life-stage typefaces (lib/tierType.ts).
    Baloo2_400Regular,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    BricolageGrotesque_800ExtraBold,
    SchibstedGrotesk_400Regular,
    SchibstedGrotesk_600SemiBold,
    SchibstedGrotesk_700Bold,
    SchibstedGrotesk_800ExtraBold,
    Fraunces_600SemiBold,
    InstrumentSans_400Regular,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
  });
  const pathname = usePathname();
  // Paint the dashboard canvas on the very first frame, before the class
  // sync effect runs, so there is no dark flash on launch (light-first).
  const [theme] = useTheme();
  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);
  // Ambient bed and audiobook both need to survive the iOS silent switch.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);
  // OTA live: production/preview builds check EAS Update on launch and
  // apply JS-only updates instantly (native changes still need a rebuild).
  useEffect(() => {
    if (__DEV__) return;
    (async () => {
      try {
        if (!Updates.isEnabled) return;
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {}
    })();
  }, []);
  // Local reminders: foreground banner contract + one-time reconciliation so
  // an opted-in daily nudge survives restarts and OS schedule clears.
  useEffect(() => {
    configureReminderHandler();
    void ensureReminderScheduled();
  }, []);
  // Anonymous, privacy-bounded product diagnostics for the owner console.
  // The Settings opt-out clears the queue immediately (lib/telemetry.ts).
  useEffect(() => {
    void initTelemetry();
  }, []);
  // AdMob: UMP consent, then SDK init. Fire-and-forget — the rewarded hook
  // holds its ad instance back until this resolves, so nothing loads early.
  useEffect(() => {
    void startAds();
  }, []);
  // Smart Sync: upload lessons finished offline and pull course updates, on
  // start, on foreground, when the browser comes back online, and each minute.
  useEffect(() => startAutoSync(), []);
  // On-device AI: register the learner's downloaded model (Premium) so the
  // tutor can answer offline with it. The model loads on first use, not here.
  useEffect(() => startEdgeEngine(), []);
  useEffect(() => {
    trackScreen(pathname);
  }, [pathname]);
  if (!fontsLoaded && !fontError) return null;
  const dark = theme === 'dark';
  // Keep the scene container transparent so the dashboard canvas shows through.
  const navTheme = {
    ...(dark ? DarkTheme : DefaultTheme),
    dark,
    colors: {
      ...(dark ? DarkTheme : DefaultTheme).colors,
      background: 'transparent',
      card: dark ? '#131A29' : '#FFFFFF',
      text: dark ? '#F1F5F9' : '#0F172A',
      border: dark ? '#232D45' : '#E8EAF0',
      primary: dark ? '#22D3EE' : '#0284C7',
      notification: dark ? '#FF2DAA' : '#D6008A',
    },
  };
  return (
    <View
      className="flex-1 bg-dash-bg dark:bg-dash-dbg"
      style={{ backgroundColor: theme === 'dark' ? '#0B0F1A' : '#F8F9FC' }}
    >
      <ThemeSync />
    <ThemeProvider value={navTheme}>
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="explore" />
      <Stack.Screen name="mylearning" />
      <Stack.Screen name="aitutor" />
      <Stack.Screen name="library" />
      <Stack.Screen name="community" />
      <Stack.Screen name="quiz/[lessonId]" />
      <Stack.Screen name="revision/[uploadId]" />
      <Stack.Screen name="refill" options={{ presentation: 'modal' }} />
      <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
      <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
      <Stack.Screen name="uploads" />
      <Stack.Screen name="audiobooks" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="results" />
      <Stack.Screen name="leaderboard" />
      <Stack.Screen name="curriculum/[unitId]" />
      <Stack.Screen name="project/[lessonId]" />
      <Stack.Screen name="certifications" />
      <Stack.Screen name="design" />
      <Stack.Screen name="roleplay" />
      <Stack.Screen name="offline-ai" />
      <Stack.Screen name="study-rooms" />
      <Stack.Screen name="squad-cup" />
      <Stack.Screen name="avatar" />
      <Stack.Screen name="jobs" />
      <Stack.Screen name="verify/[code]" />
      {__DEV__ ? <Stack.Screen name="dev/celebration-benchmark" /> : null}
    </Stack>
    </ThemeProvider>
    </View>
  );
}
