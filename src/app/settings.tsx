import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch, Alert } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getProfile, getTodayCompletionCount, grantHearts, MAX_HEARTS, type Profile } from '../../lib/progress';
import { PREMIUM_PRICE_LABEL } from '../../lib/tiers';
import { areRemindersOn, configureReminderHandler, setRemindersOn } from '../../lib/reminders';
import {
  getSoundOn,
  setSoundOn as persistSoundOn,
  getHapticsOn,
  setHapticsOn as persistHapticsOn,
  getDailyMinutes,
  setDailyMinutes,
  DAILY_MINUTES_OPTIONS,
  outcomeForMinutes,
} from '../../lib/preferences';

export default function Settings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [hapticsOn, setHapticsOn] = useState(true);
  const [remindersOn, setReminders] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [minutes, setMinutes] = useState(10);

  const refresh = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
      if (p) setTodayCount(await getTodayCompletionCount(p.id).catch(() => 0));
      setMinutes(await getDailyMinutes().catch(() => 10));
      setReminders(await areRemindersOn());
      setSoundOn(await getSoundOn());
      setHapticsOn(await getHapticsOn());
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

  const toggleSound = async (v: boolean) => {
    setSoundOn(v);
    await persistSoundOn(v);
  };

  const toggleHaptics = async (v: boolean) => {
    setHapticsOn(v);
    await persistHapticsOn(v);
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
      <Text className="text-2xl font-extrabold text-slate-900">Settings</Text>
      <Text className="text-base text-slate-500">
        {profile ? (profile.is_premium ? 'Premium' : 'Free tier') : 'Playing as guest'}
      </Text>

      <View className="mt-6 w-full max-w-sm rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
        <Text className="text-base font-extrabold text-slate-800">🎯 Daily Quest</Text>
        <Text className="mt-1 text-sm text-slate-500">
          {profile
            ? todayCount >= 1
              ? 'Quest complete! Streak protected. 🎉'
              : 'Complete 1 lesson today to keep your streak alive.'
            : 'Sign in to track your daily quest.'}
        </Text>          {profile ? (
            <View className="mt-2 h-2.5 overflow-hidden rounded-full bg-white">
              <View
                className={`h-full rounded-full ${todayCount >= 1 ? 'bg-green-500' : 'bg-amber-400'}`}
                style={{ width: `${Math.min(100, todayCount * 100)}%` }}
              />
            </View>
          ) : null}
          <Text className="mt-3 text-xs font-bold uppercase tracking-widest text-amber-600">Daily commitment</Text>
          <View className="mt-1 flex-row gap-2">
            {DAILY_MINUTES_OPTIONS.map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  setMinutes(m);
                  void setDailyMinutes(m);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${m} minutes per day`}
                className={`flex-1 items-center rounded-xl border-2 py-1.5 ${minutes === m ? 'border-amber-500 bg-amber-100' : 'border-slate-200 bg-white'}`}
              >
                <Text className={`text-xs font-extrabold ${minutes === m ? 'text-amber-700' : 'text-slate-500'}`}>{m}m</Text>
              </Pressable>
            ))}
          </View>
          <Text className="mt-1 text-xs text-amber-700">🎯 {outcomeForMinutes(minutes)}</Text>
      </View>

      <View className="mt-6 w-full max-w-sm gap-3">
        {row('\u{1F464}', 'Account', profile ? 'Manage sign-in & session' : 'Sign in to sync progress', () => router.push('/auth'))}
        {row(
          '\u{1F451}',
          'Go Premium',
          `PDF/audio uploads, elite voices (${PREMIUM_PRICE_LABEL})`,
          () => router.push('/paywall')
        )}
        {row('\u{1F3C6}', 'Leaderboard', 'Weekly leagues of 30', () => router.push('/leaderboard'))}
        {row('\u{1F4DA}', 'My uploads', 'History, statuses & retries', () => router.push('/uploads'))}
        {row('\u2764\uFE0F', 'Refill hearts', 'Ad, 4-hour regen, or premium', () => router.push('/refill'))}
        {row('\u{1F514}', 'Lesson reminders', 'Daily 7pm streak nudge', undefined, (
          <Switch value={remindersOn} onValueChange={toggleReminders} />
        ))}
        {row('\u{1F3B5}', 'Sound effects', soundOn ? 'Chimes ON' : 'Chimes OFF', undefined, (
          <Switch value={soundOn} onValueChange={toggleSound} />
        ))}
        {row('\u{1F4F3}', 'Haptics', hapticsOn ? 'Vibration ON' : 'Vibration OFF', undefined, (
          <Switch value={hapticsOn} onValueChange={toggleHaptics} />
        ))}
        {__DEV__ && row('\u{1F494}', 'Debug: refill', 'Dev builds only — remove before release', refillHearts)}
      </View>

      <Text className="mt-6 text-xs text-slate-400">Bolingo Learn v1.0.0 | Made for learners</Text>
      <Pressable onPress={() => router.replace('/')} className="mt-2 items-center">
        <Text className="font-bold text-slate-400">Back to Path</Text>
      </Pressable>
      <StatusBar style="auto" />
    </ScrollView>
  );
}
