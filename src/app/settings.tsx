import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch, Alert } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getProfile, grantHearts, MAX_HEARTS, type Profile } from '../../lib/progress';
import { PREMIUM_PRICE_LABEL } from '../../lib/tiers';
import { areRemindersOn, configureReminderHandler, setRemindersOn } from '../../lib/reminders';

export default function Settings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [hapticsOn, setHapticsOn] = useState(true);
  const [remindersOn, setReminders] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setProfile(await getProfile());
      setReminders(await areRemindersOn());
    } catch {
      setProfile(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      configureReminderHandler();
      refresh();
    }, [refresh])
  );

  const toggleReminders = async (v: boolean) => {
    const ok = await setRemindersOn(v);
    setReminders(ok);
    if (v && !ok) {
      Alert.alert('Notifications blocked', 'Enable notifications for Bolingo Learn in system settings, then try again.');
    }
  };

  const refillHearts = async () => {
    if (!profile) {
      Alert.alert('Guests', 'Sign in first — guest hearts reset every session.');
      return;
    }
    try {
      setProfile(await grantHearts(profile.id, MAX_HEARTS));
      Alert.alert('Refilled', 'Hearts restored (debug helper — remove before release).');
    } catch (e) {
      Alert.alert('Failed', String(e instanceof Error ? e.message : e));
    }
  };

  const row = (icon: string, title: string, sub: string, onPress?: () => void, right?: React.ReactNode) => (
    <Pressable
      onPress={onPress}
      className="w-full max-w-sm flex-row items-center rounded-2xl border-2 border-slate-200 bg-white p-4"
    >
      <Text className="text-2xl">{icon}</Text>
      <View className="ml-3 flex-1">
        <Text className="text-base font-bold text-slate-800">{title}</Text>
        <Text className="text-sm text-slate-500">{sub}</Text>
      </View>
      {right ?? (onPress ? <Text className="text-slate-300">›</Text> : null)}
    </Pressable>
  );

  return (
    <ScrollView contentContainerClassName="flex-grow items-center bg-white px-6 py-12">
      <Text className="text-2xl font-extrabold text-slate-900">⚙️ Settings</Text>
      <Text className="text-base text-slate-500">
        {profile ? (profile.is_premium ? '👑 Premium' : 'Free tier') : 'Playing as guest'}
      </Text>

      <View className="mt-6 w-full max-w-sm gap-3">
        {row('👤', 'Account', profile ? 'Manage sign-in & session' : 'Sign in to sync progress', () => router.push('/auth'))}
        {row(
          '👑',
          'Go Premium',
          `PDF/audio uploads, elite voices (${PREMIUM_PRICE_LABEL})`,
          () => router.push('/paywall')
        )}
        {row('📚', 'My uploads', 'History, statuses & retries', () => router.push('/uploads'))}
        {row('❤️', 'Refill hearts', 'Ad, wait timer, or premium', () => router.push('/refill'))}
        {row('🔔', 'Lesson reminders', 'Daily 7pm streak nudge', undefined, (
          <Switch value={remindersOn} onValueChange={toggleReminders} />
        ))}
        {row('🎵', 'Sound effects', 'Quiz chimes on/off', undefined, (
          <Switch value={soundOn} onValueChange={setSoundOn} />
        ))}
        {row('📳', 'Haptics', 'Vibration on mistakes (coming soon)', undefined, (
          <Switch value={hapticsOn} onValueChange={setHapticsOn} />
        ))}
        {__DEV__ && row('💔', 'Debug: refill hearts', 'Dev builds only — remove before release', refillHearts)}
      </View>

      <Text className="mt-6 text-xs text-slate-400">Bolingo Learn v1.0.0 • Made for learners</Text>
      <Pressable onPress={() => router.back()} className="mt-2 items-center">
        <Text className="font-bold text-slate-400">Back to Path</Text>
      </Pressable>
      <StatusBar style="auto" />
    </ScrollView>
  );
}
