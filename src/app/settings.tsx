import { useCallback, useRef, useState } from 'react';
import { View, Pressable, ScrollView, Switch, Alert, Platform } from 'react-native';
import Text from '../../components/ui/Text';
import { router, useFocusEffect } from 'expo-router';
import BrandMark from '../../components/BrandMark';
import AppIcon, { type AppIconName } from '../../components/AppIcon';
import { StatusBar } from 'expo-status-bar';
import { getProfile, getTodayCompletionCount, grantHearts, MAX_HEARTS, type Profile } from '../../lib/progress';
import { PREMIUM_PRICE_LABEL } from '../../lib/tiers';
import {
  areRemindersOn,
  configureReminderHandler,
  ensureReminderScheduled,
  remindersSupported,
  sendTestReminder,
  setRemindersOn,
} from '../../lib/reminders';
import { useTheme } from '../../lib/theme';
import { playCelebration, playQuizCorrect, playWrong, stopRewardCues } from '../../lib/sfx';
import Mascot from '../../components/AfricanMascots';
import { stopSpeaking, type Mentor } from '../../lib/pronunciation';
import { VOICE_CAST, auditionVoice } from '../../lib/voiceCast';
import {
  getSoundOn,
  setSoundOn as persistSoundOn,
  getRewardVolume,
  setRewardVolume as persistRewardVolume,
  REWARD_VOLUME_OPTIONS,
  getAmbientOn,
  setAmbientOn as persistAmbientOn,
  getHapticsOn,
  setHapticsOn as persistHapticsOn,
  getDailyMinutes,
  setDailyMinutes,
  DAILY_MINUTES_OPTIONS,
  outcomeForMinutes,
  getWeeklyDays,
  setWeeklyDays,
  WEEKLY_DAYS_OPTIONS,
} from '../../lib/preferences';

export default function Settings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [rewardVolume, setRewardVolume] = useState(1);
  const [ambientOn, setAmbientOn] = useState(true);
  const [hapticsOn, setHapticsOn] = useState(true);
  // Platform appearance: light / dark, persisted, flips instantly everywhere.
  const [theme, setTheme] = useTheme();
  const [remindersOn, setReminders] = useState(false);
  const [testingReminder, setTestingReminder] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [minutes, setMinutes] = useState(10);
  const [weeklyDays, setWeekly] = useState(5);
  // Which character is talking right now (null = silent), plus a token so a
  // stopped audition can't clear the state of the one that replaced it.
  const [auditioning, setAuditioning] = useState<Mentor | null>(null);
  const auditionToken = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
      if (p) setTodayCount(await getTodayCompletionCount(p.id).catch(() => 0));
      setMinutes(await getDailyMinutes().catch(() => 10));
      setWeekly(await getWeeklyDays().catch(() => 5));
      setReminders(await areRemindersOn());
      setSoundOn(await getSoundOn());
      setRewardVolume(await getRewardVolume());
      setAmbientOn(await getAmbientOn());
      setHapticsOn(await getHapticsOn());
    } catch {
      setProfile(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      configureReminderHandler();
      // Reconcile a resumed/updated app before painting the switch.
      ensureReminderScheduled().then(refresh).catch(() => refresh());
      // Leaving Settings must not leave a character mid-sentence on the path.
      return () => {
        auditionToken.current += 1;
        void stopSpeaking();
      };
    }, [refresh])
  );

  const toggleReminders = async (v: boolean) => {
    const ok = await setRemindersOn(v);
    setReminders(ok);
    if (v && !ok) {
      Alert.alert(
        Platform.OS === 'web' ? 'Native app only' : 'Notifications blocked',
        Platform.OS === 'web'
          ? 'Lesson reminders are scheduled by the phone itself. Use the iOS or Android app to enable them.'
          : 'Enable notifications for Bolingo Learn in system settings, then try again.'
      );
    }
  };

  const testReminder = async () => {
    if (testingReminder) return;
    setTestingReminder(true);
    const ok = await sendTestReminder();
    setTestingReminder(false);
    Alert.alert(
      ok ? 'Reminder scheduled' : 'Could not schedule',
      ok
        ? 'It will arrive in about 5 seconds. Lock the app to see it the way a real nudge appears.'
        : 'Enable notifications for Bolingo Learn in system settings, then try again.'
    );
  };

  const toggleSound = async (v: boolean) => {
    setSoundOn(v);
    await persistSoundOn(v);
  };

  const chooseRewardVolume = async (v: number) => {
    setRewardVolume(v);
    await persistRewardVolume(v);
  };

  const auditionCast = async (character: Mentor) => {
    const token = auditionToken.current + 1;
    auditionToken.current = token;
    // Tapping the character who is already speaking hangs up; tapping another
    // stops her first, so two voices never overlap.
    if (auditioning === character) {
      await stopSpeaking();
      setAuditioning(null);
      return;
    }
    await stopRewardCues();
    setAuditioning(character);
    try {
      const result = await auditionVoice(character);
      if (token !== auditionToken.current || result.spoken) return;
      Alert.alert(
        'No voice installed',
        Platform.OS === 'web'
          ? 'This browser has no speech voice for English. Try Chrome or Edge, or use the iOS/Android app.'
          : 'Add an English text-to-speech voice in your device settings, then audition again.'
      );
    } catch {
      if (token === auditionToken.current) {
        Alert.alert('Could not play', 'The device voice failed to start. Try again in a moment.');
      }
    } finally {
      if (token === auditionToken.current) setAuditioning(null);
    }
  };

  const previewCue = async (kind: 'correct' | 'celebration' | 'wrong') => {
    // One at a time: the celebration is 5s, so a second tap must not stack.
    await stopRewardCues();
    if (kind === 'correct') await playQuizCorrect();
    else if (kind === 'celebration') await playCelebration();
    else await playWrong();
  };

  const toggleAmbient = async (v: boolean) => {
    setAmbientOn(v);
    await persistAmbientOn(v);
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

  const row = (icon: AppIconName, title: string, sub: string, onPress?: () => void, right?: React.ReactNode) => (
    <Pressable
      onPress={onPress}
      className="w-full max-w-sm flex-row items-center rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <AppIcon name={icon} size={20} color="#475569" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-base font-bold text-slate-800 dark:text-slate-200">{title}</Text>
        <Text className="text-sm text-slate-500 dark:text-slate-400">{sub}</Text>
      </View>
      {right ?? (onPress ? <AppIcon name="chevRight" size={20} color="#CBD5E1" /> : null)}
    </Pressable>
  );

  return (
    <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-md flex-grow items-center self-center px-4 py-8" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Settings</Text>
      <Text className="text-base text-slate-500 dark:text-slate-400">
        {profile ? (profile.is_premium ? 'Premium' : 'Free tier') : 'Playing as guest'}
      </Text>

      <View className="mt-6 w-full max-w-sm rounded-2xl border-2 border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950 p-4">
        <View className="flex-row items-center gap-1.5">
          <AppIcon name="target" size={20} color="#0F172A" />
          <Text className="text-base font-extrabold text-slate-800 dark:text-slate-200">Daily Quest</Text>
        </View>
        <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {profile
            ? todayCount >= 1
              ? 'Quest complete! Streak protected.'
              : 'Complete 1 lesson today to keep your streak alive.'
            : 'Sign in to track your daily quest.'}
        </Text>
        {profile ? (
            <View className="mt-2 h-2.5 overflow-hidden rounded-full bg-white dark:bg-slate-900">
              <View
                className={`h-full rounded-full ${todayCount >= 1 ? 'bg-green-500' : 'bg-amber-400'}`}
                style={{ width: `${Math.min(100, todayCount * 100)}%` }}
              />
            </View>
          ) : null}
          <Text className="mt-3 text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Daily commitment</Text>
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
                className={`flex-1 items-center rounded-xl border-2 py-1.5 ${minutes === m ? 'border-amber-500 bg-amber-100 dark:bg-amber-950' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
              >
                <Text className={`text-xs font-extrabold ${minutes === m ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}>{m}m</Text>
              </Pressable>
            ))}
          </View>
          <View className="mt-1 flex-row items-center gap-1">
            <AppIcon name="target" size={12} color="#B45309" />
            <Text className="text-xs text-amber-700 dark:text-amber-300">{outcomeForMinutes(minutes)}</Text>
          </View>
          <Text className="mt-3 text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Weekly target</Text>
          <View className="mt-1 flex-row gap-2">
            {WEEKLY_DAYS_OPTIONS.map((d) => (
              <Pressable
                key={d}
                onPress={() => {
                  setWeekly(d);
                  void setWeeklyDays(d);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${d} days per week`}
                className={`flex-1 items-center rounded-xl border-2 py-1.5 ${weeklyDays === d ? 'border-amber-500 bg-amber-100 dark:bg-amber-950' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
              >
                <Text className={`text-xs font-extrabold ${weeklyDays === d ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}>{d}d/wk</Text>
              </Pressable>
            ))}
          </View>
          <Text className="mt-1 text-xs text-amber-700 dark:text-amber-300">Practice {weeklyDays} days a week — missing one day never resets you.</Text>
      </View>

      {profile ? (
        <View className="mt-4 w-full max-w-sm rounded-2xl border-2 border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950">
          <View className="flex-row items-center gap-1.5">
            <AppIcon name="gift" size={20} color="#7C3AED" />
            <Text className="text-base font-extrabold text-slate-800 dark:text-slate-100">Chest rewards</Text>
          </View>
          <View className="mt-3 flex-row gap-2">
            <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2 dark:border-violet-900 dark:bg-slate-900">
              <AppIcon name="gem" size={16} color="#7C3AED" />
              <View>
                <Text className="text-base font-extrabold text-slate-900 dark:text-slate-100">{profile.gems ?? 0}</Text>
                <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">gems</Text>
              </View>
            </View>
            <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2 dark:border-violet-900 dark:bg-slate-900">
              <AppIcon name="shield" size={16} color="#0284C7" />
              <View>
                <Text className="text-base font-extrabold text-slate-900 dark:text-slate-100">{profile.streak_freezes ?? 0}</Text>
                <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">freezes</Text>
              </View>
            </View>
          </View>
          <Text className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Unit chests pay bonus XP, gems, or a streak freeze that covers one missed day.
          </Text>
        </View>
      ) : null}

      {/* Appearance: QD-OLED is the product default (true black + quantum
          colour); Light stays available for bright environments. */}
      <View className="mt-6 w-full max-w-sm rounded-2xl border-2 border-cyan-200 bg-white p-4 dark:border-[#1E1E2C] dark:bg-[#06060A]">
        <View className="flex-row items-center gap-1.5">
          <AppIcon name="sparkles" size={20} color={theme === 'dark' ? '#00E5FF' : '#0089A8'} />
          <Text className="text-base font-extrabold text-slate-800 dark:text-slate-100">Display</Text>
          <View className="rounded-full border border-cyan-300 px-2 py-0.5 dark:border-cyan-800">
            <Text className="text-[9px] font-extrabold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">QD-OLED</Text>
          </View>
        </View>
        <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {theme === 'dark' ? 'True black, quantum-dot colour. Pixels off where it counts.' : 'Quantum light — the same palette on a bright canvas.'}
        </Text>
        <View className="mt-3 flex-row gap-2">
          {(['dark', 'light'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setTheme(m)}
              accessibilityRole="button"
              accessibilityLabel={m === 'dark' ? 'Use QD-OLED display' : 'Use light display'}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border-2 py-2 ${theme === m ? 'border-cyan-400 bg-cyan-50 dark:bg-[#00232E]' : 'border-slate-200 bg-white dark:border-[#1E1E2C] dark:bg-[#0E0E16]'}`}
            >
              <AppIcon name={m === 'light' ? 'sunny' : 'sparkles'} size={16} color={theme === m ? (m === 'dark' ? '#00E5FF' : '#0089A8') : '#64748B'} />
              <Text className={`text-sm font-extrabold ${theme === m ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-500 dark:text-slate-400'}`}>{m === 'light' ? 'Light' : 'QD-OLED'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="mt-6 w-full max-w-sm gap-3">
        {row('user', 'Account', profile ? 'Manage sign-in & session' : 'Sign in to sync progress', () => router.push('/auth'))}
        {row(
          'crown',
          'Go Premium',
          `PDF/audio uploads, elite voices (${PREMIUM_PRICE_LABEL})`,
          () => router.push('/paywall')
        )}
        {row('trophy', 'Leaderboard', 'Weekly leagues of 30', () => router.push('/leaderboard'))}
        {row('doc', 'My uploads', 'History, statuses & retries', () => router.push('/uploads'))}
        {row('heart', 'Refill hearts', 'Ad, 4-hour regen, or premium', () => router.push('/refill'))}
        {row(
          'bell',
          'Lesson reminders',
          !remindersSupported()
            ? 'Native app only'
            : remindersOn
              ? 'Daily 7:00 PM · scheduled'
              : 'Daily 7:00 PM streak nudge',
          undefined,
          <Switch value={remindersOn} onValueChange={toggleReminders} disabled={!remindersSupported()} />
        )}
        {remindersOn ? (
          <Pressable
            onPress={testReminder}
            disabled={testingReminder}
            accessibilityRole="button"
            accessibilityLabel="Send a test reminder"
            className="w-full max-w-sm flex-row items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 py-3 active:bg-amber-100 dark:border-amber-800 dark:bg-amber-950"
          >
            <AppIcon name="bell" size={18} color="#B45309" />
            <Text className="text-sm font-extrabold text-amber-700 dark:text-amber-300">
              {testingReminder ? 'Scheduling…' : 'Send a test reminder'}
            </Text>
          </Pressable>
        ) : null}
        {row('music', 'Sound effects', soundOn ? 'Chimes ON' : 'Chimes OFF', undefined, (
          <Switch value={soundOn} onValueChange={toggleSound} />
        ))}
        {soundOn ? (
          <View className="w-full max-w-sm rounded-2xl border-2 border-cyan-200 bg-white p-4 dark:border-[#1E1E2C] dark:bg-[#06060A]">
            <View className="flex-row items-center gap-1.5">
              <AppIcon name="volume" size={20} color="#0089A8" />
              <Text className="text-base font-extrabold text-slate-800 dark:text-slate-100">Reward volume</Text>
            </View>
            <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              How loud the correct, celebration and try-again cues play.
            </Text>
            <View className="mt-3 flex-row gap-2">
              {REWARD_VOLUME_OPTIONS.map((option) => (
                <Pressable
                  key={option.label}
                  onPress={() => void chooseRewardVolume(option.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.label} reward volume`}
                  className={`flex-1 items-center rounded-xl border-2 py-2 ${
                    rewardVolume === option.value
                      ? 'border-cyan-400 bg-cyan-50 dark:bg-[#00232E]'
                      : 'border-slate-200 bg-white dark:border-[#1E1E2C] dark:bg-[#0E0E16]'
                  }`}
                >
                  <Text
                    className={`text-sm font-extrabold ${
                      rewardVolume === option.value
                        ? 'text-cyan-700 dark:text-cyan-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text className="mt-3 text-xs font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
              Audition
            </Text>
            <View className="mt-1 flex-row gap-2">
              {([
                { key: 'correct', label: 'Correct', icon: 'party' },
                { key: 'celebration', label: 'Celebration', icon: 'trophy' },
                { key: 'wrong', label: 'Try again', icon: 'sparkles' },
              ] as const).map((cue) => (
                <Pressable
                  key={cue.key}
                  onPress={() => void previewCue(cue.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Preview the ${cue.label.toLowerCase()} cue`}
                  className="flex-1 flex-row items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 py-2 active:bg-slate-100 dark:border-[#1E1E2C] dark:bg-[#0E0E16]"
                >
                  <AppIcon name={cue.icon} size={14} color="#64748B" />
                  <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">{cue.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        {/* Voice cast: hear each teaching voice through the same engine a
            lesson uses, so nobody meets Zora for the first time mid-exercise. */}
        <View className="w-full max-w-sm rounded-2xl border-2 border-emerald-200 bg-white p-4 dark:border-emerald-900 dark:bg-[#06060A]">
          <View className="flex-row items-center gap-1.5">
            <AppIcon name="mic" size={20} color="#059669" />
            <Text className="text-base font-extrabold text-slate-800 dark:text-slate-100">Voice cast</Text>
          </View>
          <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Tap a character to hear a sample line — the same voice your lessons use.
          </Text>
          <View className="mt-3 gap-2">
            {VOICE_CAST.map((member) => {
              const active = auditioning === member.id;
              return (
                <Pressable
                  key={member.id}
                  onPress={() => void auditionCast(member.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${active ? 'Stop' : 'Play'} ${member.name}'s sample line`}
                  className={`flex-row items-center gap-2.5 rounded-xl border-2 p-2.5 ${
                    active
                      ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-[#00251C]'
                      : 'border-slate-200 bg-white dark:border-[#1E1E2C] dark:bg-[#0E0E16]'
                  }`}
                >
                  <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-emerald-50 dark:bg-[#00251C]">
                    <Mascot character={member.id} size={38} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-baseline gap-1.5">
                      <Text className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{member.name}</Text>
                      <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        {member.role}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={2}
                      className={`text-xs ${active ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                      {active ? 'Speaking…' : member.blurb}
                    </Text>
                  </View>
                  <View
                    className={`h-9 w-9 items-center justify-center rounded-full ${
                      active ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-[#1E1E2C]'
                    }`}
                  >
                    <AppIcon name={active ? 'pause' : 'play'} size={16} color={active ? '#FFFFFF' : '#64748B'} />
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Text className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
            Voices come from your device: Livia and Zora are cast feminine, Bingo masculine.
          </Text>
        </View>

        {row('volume', 'Ambient tune', ambientOn ? 'Grove loop · soft focus' : 'Ambient tune OFF', undefined, (
          <Switch value={ambientOn} onValueChange={toggleAmbient} />
        ))}
        {row('zap', 'Haptics', hapticsOn ? 'Vibration ON' : 'Vibration OFF', undefined, (
          <Switch value={hapticsOn} onValueChange={toggleHaptics} />
        ))}
        {__DEV__ && row('heart', 'Debug: refill', 'Dev builds only — remove before release', refillHearts)}
      </View>

      <View className="mt-6 items-center">
        <BrandMark />
        <Text className="mt-1 text-xs text-slate-400 dark:text-slate-500">v1.0.0 | Made for learners</Text>
      </View>
      <Pressable onPress={() => router.replace('/')} className="mt-2 items-center">
        <Text className="font-bold text-slate-400 dark:text-slate-500">Back to Path</Text>
      </Pressable>
      <StatusBar style="auto" />
    </ScrollView>
  );
}
