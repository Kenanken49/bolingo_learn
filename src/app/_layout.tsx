import '../../global.css';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { setAudioModeAsync } from 'expo-audio';
import {
  useFonts,
  Roboto_400Regular,
  Roboto_600SemiBold,
  Roboto_700Bold,
  Roboto_800ExtraBold,
} from '@expo-google-fonts/roboto';
import { useColorScheme } from 'nativewind';
import { initTheme, useTheme } from '../../lib/theme';
import { configureReminderHandler, ensureReminderScheduled } from '../../lib/reminders';
import { themeForPath } from '../../lib/jungle';
import ExpeditionBackdrop from '../../components/jungle/ExpeditionBackdrop';

// Hold the splash until Roboto is ready — no FOUT swap from the OS face.
SplashScreen.preventAutoHideAsync().catch(() => {});

/** Pushes the persisted appearance (light/dark) into NativeWind's class
 *  strategy, so every `dark:` variant flips the instant Settings changes. */
function ThemeSync() {
  const [theme] = useTheme();
  const { setColorScheme } = useColorScheme();
  useEffect(() => {
    initTheme().catch(() => {});
  }, []);
  useEffect(() => {
    try {
      setColorScheme(theme);
    } catch {}
  }, [theme, setColorScheme]);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_600SemiBold,
    Roboto_700Bold,
    Roboto_800ExtraBold,
  });
  const pathname = usePathname();
  const habitat = themeForPath(pathname);
  // Paint the QD-OLED canvas on the very first frame, before the class sync
  // effect runs, so there is no white flash on launch.
  const [theme] = useTheme();
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);
  // Ambient bed and audiobook both need to survive the iOS silent switch.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);
  // Local reminders: foreground banner contract + one-time reconciliation so
  // an opted-in daily nudge survives restarts and OS schedule clears.
  useEffect(() => {
    configureReminderHandler();
    void ensureReminderScheduled();
  }, []);
  if (!fontsLoaded) return null;
  return (
    <View
      className="flex-1 bg-[#F4F5FA] dark:bg-black"
      style={{ backgroundColor: theme === 'dark' ? '#010603' : '#F3F7EE' }}
    >
      <ThemeSync />
      {/* The expedition is one continuous place: every route swaps the bird,
          accents and canopy layout behind the content. */}
      <ExpeditionBackdrop screen={habitat.key} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="quiz/[lessonId]" />
      <Stack.Screen name="refill" options={{ presentation: 'modal' }} />
      <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
      <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
      <Stack.Screen name="uploads" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="results" />
      <Stack.Screen name="leaderboard" />
      <Stack.Screen name="curriculum/[unitId]" />
      <Stack.Screen name="project/[lessonId]" />
      <Stack.Screen name="certifications" />
      <Stack.Screen name="design" />
      <Stack.Screen name="roleplay" />
    </Stack>
    </View>
  );
}
