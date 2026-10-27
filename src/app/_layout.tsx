import '../../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';

// Hold the splash until the rounded brand font is ready — no FOUT swap.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold });
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);
  if (!fontsLoaded) return null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
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
    </Stack>
  );
}
