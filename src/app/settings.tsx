import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Pressable, ScrollView, Switch, Alert, Platform } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import Text from '../../components/ui/Text';
import TextInput from '../../components/ui/TextInput';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import BrandMark from '../../components/BrandMark';
import AppIcon, { type AppIconName } from '../../components/AppIcon';
import TabBar from '../../components/nav/TabBar';
import { StatusBar } from 'expo-status-bar';
import {
  getProfile,
  getTodayCompletionCount,
  grantDiamonds,
  setNarratorVoice,
  setDisplayName,
  setUploadOutput,
  uploadOutputOf,
  UPLOAD_OUTPUT_OPTIONS,
  MAX_DIAMONDS,
  type Profile,
  type UploadOutput,
} from '../../lib/progress';
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
import { stopSpeaking, type Mentor, type PronounceResult } from '../../lib/pronunciation';
import { VOICE_CAST, auditionVoice, castMember, type CastLanguage } from '../../lib/voiceCast';
import { loadLatestAudiobook, type Audiobook } from '../../lib/audiobook';
import { PREMIUM_NARRATOR_SAMPLE } from '../../assets/narrator';
import PremiumNarratorSample from '../../components/PremiumNarratorSample';
import { narratorAuditRequested, useNarratorSampleProbe } from '../../lib/narratorSample';
import { AUDIOBOOK_VOICE_DEFAULTS, NARRATOR_VOICES, narratorName, narratorVoice } from '../../supabase/functions/_shared/audiobookVoice';
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
  getTelemetryOn,
  setTelemetryOn as persistTelemetryOn,
} from '../../lib/preferences';
import { setTelemetryConsent } from '../../lib/telemetry';
import { adsSupported } from '../../lib/ads';
import { SPACES, useLearningSpace } from '../../lib/learningSpace';
import { showAdPrivacyOptions } from '../../lib/adsRuntime';

interface CastCapture {
  character: Mentor;
  language: CastLanguage;
  result: PronounceResult;
}

type AudiobookPreviewTrack = 'full' | 'segment';

/** One pass over every teaching voice in both course languages. */
const CAST_STEPS = (['en', 'sw'] as const).flatMap((language) =>
  VOICE_CAST.map((member) => ({ character: member.id, language }))
);

export default function Settings() {
  // Dev-only device test hook; see lib/narratorSample.ts.
  const { narratorAudit } = useLocalSearchParams<{ narratorAudit?: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [rewardVolume, setRewardVolume] = useState(1);
  const [ambientOn, setAmbientOn] = useState(true);
  const [hapticsOn, setHapticsOn] = useState(true);
  const [telemetryOn, setTelemetryOnState] = useState(true);
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
  const [castLanguage, setCastLanguage] = useState<CastLanguage>('en');
  // What the platform actually chose on the last audition, so a device with a
  // missing Swahili voice is visible before a lesson exposes it.
  const [voiceCheck, setVoiceCheck] = useState<{
    character: Mentor;
    language: CastLanguage;
    locale: string;
    voiceName?: string;
    matched: boolean;
    approximate: boolean;
    /** True when the line came from the ElevenLabs studio voice, not the device. */
    studio?: boolean;
    /** False when the platform never reported a voice list at all. */
    hasVoiceList: boolean;
  } | null>(null);
  const auditionToken = useRef(0);
  // The six-sample device check: index while it runs, captures after each line.
  const [castStep, setCastStep] = useState<number | null>(null);
  const [castCaptures, setCastCaptures] = useState<CastCapture[]>([]);
  // Latest generated audiobook, loaded on focus so the audition uses the same
  // signed private-bucket URLs as Audiobook Mode.
  const [audiobook, setAudiobook] = useState<Audiobook | null>(null);
  const [audiobookLoading, setAudiobookLoading] = useState(true);
  const [audiobookNotice, setAudiobookNotice] = useState<string | null>(null);
  const [audiobookTrack, setAudiobookTrack] = useState<AudiobookPreviewTrack | null>(null);
  const audiobookLoadToken = useRef(0);
  // 1s status updates are enough for play/pause labels; 500ms re-renders the
  // whole Settings screen twice as often while a preview is playing.
  const audiobookPlayer = useAudioPlayer(null, { updateInterval: 1000 });
  const audiobookStatus = useAudioPlayerStatus(audiobookPlayer);
  // Bundled Premium narrator audition, available even before a learner has an
  // audiobook or a signed-in session. Replaying it never calls TTS.
  const narratorPlayer = useAudioPlayer(PREMIUM_NARRATOR_SAMPLE, { updateInterval: 250 });
  const narratorStatus = useAudioPlayerStatus(narratorPlayer);
  useNarratorSampleProbe('settings', narratorStatus);
  // Voice id being saved right now, so the picker can show progress and refuse
  // a second tap mid-write.
  const [savingNarrator, setSavingNarrator] = useState<string | null>(null);
  const [savingOutput, setSavingOutput] = useState<UploadOutput | null>(null);
  // Public display name: everyone on the weekly board was called "Learner"
  // because nothing in the app could set one.
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameNote, setNameNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
      setNameDraft((current) => (current.trim() ? current : p?.username ?? ''));
      if (p) setTodayCount(await getTodayCompletionCount(p.id).catch(() => 0));
      setMinutes(await getDailyMinutes().catch(() => 10));
      setWeekly(await getWeeklyDays().catch(() => 5));
      setReminders(await areRemindersOn());
      setSoundOn(await getSoundOn());
      setRewardVolume(await getRewardVolume());
      setAmbientOn(await getAmbientOn());
      setHapticsOn(await getHapticsOn());
      setTelemetryOnState(await getTelemetryOn());
    } catch {
      setProfile(null);
    }
  }, []);

  const loadAudiobookPreview = useCallback(async () => {
    const token = audiobookLoadToken.current + 1;
    audiobookLoadToken.current = token;
    setAudiobookLoading(true);
    audiobookPlayer.pause();
    narratorPlayer.pause();
    setAudiobookTrack(null);
    try {
      const book = await loadLatestAudiobook();
      if (token !== audiobookLoadToken.current) return;
      setAudiobook(book);
      setAudiobookNotice(
        book
          ? null
          : 'No generated audiobook yet. Premium uploads include the narrator, full mix and per-question clips.'
      );
    } catch (e) {
      if (token !== audiobookLoadToken.current) return;
      setAudiobook(null);
      setAudiobookNotice(
        e instanceof Error && /signed in/i.test(e.message)
          ? 'Sign in to preview generated audiobooks.'
          : 'Could not load the latest audiobook. Check your connection and try again.'
      );
    } finally {
      if (token === audiobookLoadToken.current) setAudiobookLoading(false);
    }
  }, [audiobookPlayer, narratorPlayer]);

  useFocusEffect(
    useCallback(() => {
      configureReminderHandler();
      // Reconcile a resumed/updated app before painting the switch.
      ensureReminderScheduled().then(refresh).catch(() => refresh());
      void loadAudiobookPreview();
      // Leaving Settings must not leave a character or audiobook playing.
      return () => {
        audiobookLoadToken.current += 1;
        audiobookPlayer.pause();
        narratorPlayer.pause();
        setAudiobookTrack(null);
        auditionToken.current += 1;
        setAuditioning(null);
        setVoiceCheck(null);
        setCastStep(null);
        void stopSpeaking();
      };
    }, [audiobookPlayer, narratorPlayer, loadAudiobookPreview, refresh])
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

  const castLanguageLabel = (language: CastLanguage) => (language === 'sw' ? 'Kiswahili' : 'English');

  const chooseCastLanguage = (language: CastLanguage) => {
    if (language === castLanguage) return;
    auditionToken.current += 1;
    setAuditioning(null);
    setVoiceCheck(null);
    setCastStep(null);
    setCastLanguage(language);
    void stopSpeaking();
  };

  const pauseAudiobookPreview = () => {
    audiobookPlayer.pause();
    narratorPlayer.pause();
  };

  const toggleNarratorSample = async () => {
    if (narratorStatus.playing) {
      narratorPlayer.pause();
      return;
    }
    pauseAudiobookPreview();
    // Only one voice path at a time: stop character speech and reward cues
    // before the narrator sample, exactly as the audiobook previews do.
    auditionToken.current += 1;
    setAuditioning(null);
    setVoiceCheck(null);
    setCastStep(null);
    await stopSpeaking();
    await stopRewardCues();
    if (narratorStatus.didJustFinish) await narratorPlayer.seekTo(0);
    narratorPlayer.play();
  };

  /**
   * Save the chosen narrator on the profile. `process-upload` reads it from the
   * row when it generates the next audiobook, so the pick applies to lessons
   * made from now on and never travels with a generation request.
   */
  /**
   * Save what an upload should produce. `process-upload` reads it from the row,
   * so the choice covers every device and cannot be changed per request.
   */
  const chooseOutput = async (output: UploadOutput) => {
    if (!profile?.id || savingOutput) return;
    setSavingOutput(output);
    try {
      setProfile(await setUploadOutput(profile.id, output));
    } catch (e) {
      Alert.alert('Could not save your upload preference', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSavingOutput(null);
    }
  };

  const chooseNarrator = async (voiceId: string) => {
    if (!profile?.id || savingNarrator) return;
    setSavingNarrator(voiceId);
    try {
      setProfile(await setNarratorVoice(profile.id, voiceId));
    } catch (e) {
      Alert.alert('Could not save your narrator', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSavingNarrator(null);
    }
  };

  // The on-device test asks the real screen to start the sample. This is the
  // same handler the Play button calls and is disabled outside development.
  useEffect(() => {
    if (!narratorAuditRequested(narratorAudit)) return;
    const timer = setTimeout(() => {
      void toggleNarratorSample();
    }, 900);
    return () => clearTimeout(timer);
    // Route params are fixed for the mounted screen; the timer needs the
    // current handler, not a stale copy from the first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narratorAudit]);

  const auditionCast = async (character: Mentor) => {
    pauseAudiobookPreview();
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
    setVoiceCheck(null);
    const language = castLanguage;
    try {
      const result = await auditionVoice(character, language);
      if (token !== auditionToken.current) return;
      setVoiceCheck({
        character,
        language,
        locale: result.locale,
        voiceName: result.voiceName,
        matched: result.matchedVoice,
        approximate: result.approximate,
        hasVoiceList: result.hasVoiceList,
        studio: result.studio === true,
      });
      if (result.spoken) return;
      Alert.alert(
        'No voice played',
        Platform.OS === 'web'
          ? result.hasVoiceList
            ? `This browser has no ${castLanguageLabel(language)} speech voice. Try Chrome or Edge, or use the iOS/Android app.`
            : 'The browser did not start speech. Check that this tab is not muted, then try again.'
          : `Add a ${castLanguageLabel(language)} text-to-speech voice in your device settings, then audition again.`
      );
    } catch {
      if (token === auditionToken.current) {
        Alert.alert('Could not play', 'The device voice failed to start. Try again in a moment.');
      }
    } finally {
      if (token === auditionToken.current) setAuditioning(null);
    }
  };

  /**
   * One tap, six lines: every character in English, then every character in
   * Kiswahili, through the same `speakAs()` a lesson uses. The report is built
   * from what the engine actually returned, not from what the device claims to
   * have, so "native", "approximate" and "not installed" are honest labels.
   */
  const runCastCheck = async () => {
    pauseAudiobookPreview();
    if (castStep !== null) {
      auditionToken.current += 1;
      setCastStep(null);
      setAuditioning(null);
      await stopSpeaking();
      return;
    }
    const token = auditionToken.current + 1;
    auditionToken.current = token;
    await stopRewardCues();
    setVoiceCheck(null);
    setCastCaptures([]);
    try {
      for (let i = 0; i < CAST_STEPS.length; i += 1) {
        if (token !== auditionToken.current) return;
        const step = CAST_STEPS[i]!;
        setCastStep(i);
        setAuditioning(step.character);
        const result = await auditionVoice(step.character, step.language);
        if (token !== auditionToken.current) return;
        setCastCaptures((current) => [...current, { ...step, result }]);
      }
    } catch {
      if (token === auditionToken.current) {
        Alert.alert(
          'Could not finish the check',
          'A device voice failed to start. Try again in a moment, or audition one character at a time.'
        );
      }
    } finally {
      if (token === auditionToken.current) {
        setAuditioning(null);
        setCastStep(null);
      }
    }
  };

  const castSummary = {
    studio: castCaptures.filter((capture) => capture.result.studio).length,
    // A studio line also has a device voice installed underneath it; counting
    // both would report six device voices for three lines. Each capture is one
    // bucket: studio, native, approximate or missing.
    native: castCaptures.filter((capture) => !capture.result.studio && capture.result.matchedVoice).length,
    approximate: castCaptures.filter(
      (capture) => !capture.result.studio && !capture.result.matchedVoice && capture.result.approximate
    ).length,
    missing: castCaptures.filter(
      (capture) => !capture.result.studio && !capture.result.matchedVoice && !capture.result.approximate
    ).length,
  };

  const castSummaryLine =
    castCaptures.length === CAST_STEPS.length
      ? castSummary.studio === CAST_STEPS.length
        ? 'Every character played its studio voice over the connection.'
        : castSummary.studio + castSummary.native === CAST_STEPS.length
          ? `${castSummary.studio} studio · ${castSummary.native} on this device`
        : [
            castSummary.studio > 0 ? `${castSummary.studio} studio` : '',
            `${castSummary.native}/${CAST_STEPS.length} native`,
            castSummary.approximate > 0 ? `${castSummary.approximate} approximate` : '',
            castSummary.missing > 0 ? `${castSummary.missing} missing` : '',
          ]
            .filter(Boolean)
            .join(' · ')
      : '';

  const previewCue = async (kind: 'correct' | 'celebration' | 'wrong') => {
    pauseAudiobookPreview();
    // One at a time: the celebration is 5s, so a second tap must not stack.
    await stopRewardCues();
    if (kind === 'correct') await playQuizCorrect();
    else if (kind === 'celebration') await playCelebration();
    else await playWrong();
  };

  const toggleAudiobookPreview = async (track: AudiobookPreviewTrack) => {
    const uri = track === 'full' ? audiobook?.full_audio_url : audiobook?.segments[0]?.url;
    if (!uri) return;
    if (audiobookTrack === track && audiobookStatus.playing) {
      audiobookPlayer.pause();
      return;
    }
    if (audiobookTrack && audiobookTrack !== track) audiobookPlayer.pause();
    // The audiobook and the character/reward auditions must never overlap.
    auditionToken.current += 1;
    setAuditioning(null);
    setVoiceCheck(null);
    setCastStep(null);
    await stopSpeaking();
    await stopRewardCues();
    if (
      audiobookTrack === track &&
      audiobookStatus.currentTime > 0 &&
      !audiobookStatus.didJustFinish
    ) {
      audiobookPlayer.play();
      return;
    }
    audiobookPlayer.replace({ uri });
    audiobookPlayer.play();
    setAudiobookTrack(track);
  };

  const toggleAmbient = async (v: boolean) => {
    setAmbientOn(v);
    await persistAmbientOn(v);
  };

  const toggleHaptics = async (v: boolean) => {
    setHapticsOn(v);
    await persistHapticsOn(v);
  };

  const toggleTelemetry = async (v: boolean) => {
    setTelemetryOnState(v);
    await persistTelemetryOn(v);
    await setTelemetryConsent(v);
  };

  const refillDiamonds = async () => {
    if (!profile) {
      Alert.alert('Guests', 'Sign in first — guest diamonds reset every session.');
      return;
    }
    try {
      setProfile(await grantDiamonds(profile.id, MAX_DIAMONDS));
      Alert.alert('Refilled', 'Diamonds restored (debug helper — remove before release).');
    } catch (e) {
      Alert.alert('Failed', String(e instanceof Error ? e.message : e));
    }
  };

  const isPremium = profile?.is_premium === true;
  const [space, setSpace] = useLearningSpace();
  /** Re-open Google's UMP form so the ad-consent choice can be changed. */
  const openAdPrivacy = async () => {
    const shown = await showAdPrivacyOptions();
    if (!shown) {
      Alert.alert('Ad privacy', 'There is no ad consent choice to make on this device right now.');
    }
  };
  // What the pipeline would actually use: the learner's stored choice when it is
  // on the allow-list, otherwise the narrator the shared config falls back to.
  const chosenNarratorId = narratorVoice(profile?.narrator_voice)?.id ?? AUDIOBOOK_VOICE_DEFAULTS.voiceId;
  const chosenOutput = uploadOutputOf(profile);
  const audiobookFullUrl = audiobook?.full_audio_url ?? null;
  const audiobookSegmentUrl = audiobook?.segments[0]?.url ?? null;
  const fullPreviewActive = audiobookTrack === 'full';
  const segmentPreviewActive = audiobookTrack === 'segment';
  const fullPreviewPlaying = fullPreviewActive && audiobookStatus.playing;
  const segmentPreviewPlaying = segmentPreviewActive && audiobookStatus.playing;
  const audiobookPlaybackText = audiobookStatus.error
    ? 'Could not play the preview. Try again.'
    : audiobookStatus.playing && audiobookTrack
      ? `Playing ${audiobookTrack === 'full' ? 'the full mix' : 'one segment'}…`
      : audiobookTrack
        ? audiobookStatus.didJustFinish
          ? 'Finished — tap a sample to replay.'
          : 'Paused — tap the same sample to resume.'
        : 'Tap a sample to hear it on this device.';

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
    <View style={{ flex: 1 }}>
    <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-md flex-grow items-center self-center px-4 py-8" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Settings</Text>
      <Text onPhoto className="text-base text-slate-600 dark:text-slate-200">
        {profile ? (profile.is_premium ? 'Premium' : 'Free tier') : 'Playing as guest'}
      </Text>

      {profile ? (
        <View className="mt-4 w-full max-w-sm rounded-2xl border-2 border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <Text className="text-base font-extrabold text-slate-800 dark:text-slate-200">Your name</Text>
          <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Shown on the weekly board, friends list and profile. 3–20 characters, unique.
          </Text>
          <TextInput
            value={nameDraft}
            onChangeText={(next: string) => {
              setNameDraft(next);
              setNameNote(null);
            }}
            placeholder="e.g. Amina K"
            accessibilityLabel="Your display name"
            className="mt-2 rounded-2xl border-2 border-slate-200 bg-slate-50 px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <Pressable
            onPress={() => {
              if (!profile?.id || savingName) return;
              setSavingName(true);
              setNameNote(null);
              setDisplayName(profile.id, nameDraft)
                .then((saved) => {
                  setProfile(saved);
                  setNameDraft(saved.username ?? '');
                  setNameNote('Saved — that is the name on your board.');
                })
                .catch((error: unknown) => {
                  setNameNote(error instanceof Error ? error.message : 'Could not save your name.');
                })
                .finally(() => setSavingName(false));
            }}
            disabled={savingName || nameDraft.trim() === (profile.username ?? '')}
            accessibilityRole="button"
            accessibilityLabel="Save display name"
            className={`mt-2 items-center rounded-2xl bg-green-500 px-4 py-2 ${
              savingName || nameDraft.trim() === (profile.username ?? '') ? 'opacity-50' : ''
            }`}
          >
            <Text className="font-bold text-[#03130A]">{savingName ? 'Saving…' : 'Save name'}</Text>
          </Pressable>
          {nameNote ? (
            <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">{nameNote}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Learning space: the dashboard hero tabs live here too. The choice
          reorders tracks and retargets the hero resume everywhere. */}
      <View className="mt-6 w-full max-w-sm rounded-2xl border-2 border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <View className="flex-row items-center gap-1.5">
          <AppIcon name="user" size={20} color="#0F172A" />
          <Text className="text-base font-extrabold text-slate-800 dark:text-slate-200">Your space</Text>
        </View>
        <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Bolingo adapts the home screen, track order and resume target to your space. Saved on this device only.
        </Text>
        <View className="mt-3 gap-2">
          {SPACES.map((s) => {
            const on = space === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => void setSpace(s.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${s.label}, ${s.ages}`}
                className={`flex-row items-center gap-2 rounded-xl border-2 p-2.5 ${
                  on ? 'border-sky-500 bg-sky-50 dark:bg-sky-950' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <View className="flex-1">
                  <Text className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                    {s.label} <Text className="text-xs font-bold text-slate-400 dark:text-slate-500">· {s.ages}</Text>
                  </Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={2}>
                    {s.blurb}
                  </Text>
                </View>
                {on ? <AppIcon name="checkCircle" size={18} color="#0284C7" /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/offline-ai')}
        accessibilityRole="button"
        accessibilityLabel="Open Offline AI and sync"
        className="mt-3 w-full max-w-sm flex-row items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <AppIcon name="download" size={20} color="#0284C7" />
        <View className="flex-1">
          <Text className="text-base font-extrabold text-slate-800 dark:text-slate-200">Offline AI & sync</Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400">On-device models, offline mode, and Sync now</Text>
        </View>
        <AppIcon name="chevRight" size={16} color="#94A3B8" />
      </Pressable>

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
        {profile && (profile.is_admin || isPremium || __DEV__)
          ? row(
              'shield',
              'Quality & Operations',
              profile.is_admin ? 'Owner console · gates, telemetry, experiments' : 'Owner console · verify access',
              () => router.push('/admin')
            )
          : null}
        {row(
          'crown',
          'Go Premium',
          `PDF & note-scan uploads, elite voices (${PREMIUM_PRICE_LABEL})`,
          () => router.push('/paywall')
        )}
        {row('trophy', 'Leaderboard', 'Weekly leagues of 30', () => router.push('/leaderboard'))}
        {row('doc', 'My uploads', 'History, statuses & retries', () => router.push('/uploads'))}
        {row('diamond', 'Refill diamonds', 'Ad, 4-hour regen, or premium', () => router.push('/refill'))}
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
            Tap a character to hear a sample line in English or Kiswahili — the same voices your lessons use.
          </Text>
          <Text className="mt-3 text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Sample language
          </Text>
          <View className="mt-1 flex-row gap-2">
            {(['en', 'sw'] as const).map((language) => {
              const selected = castLanguage === language;
              return (
                <Pressable
                  key={language}
                  onPress={() => chooseCastLanguage(language)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Audition the cast in ${castLanguageLabel(language)}`}
                  className={`flex-1 items-center rounded-xl border-2 py-2 ${
                    selected
                      ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-[#00251C]'
                      : 'border-slate-200 bg-white dark:border-[#1E1E2C] dark:bg-[#0E0E16]'
                  }`}
                >
                  <Text
                    className={`text-sm font-extrabold ${
                      selected ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {language === 'sw' ? 'Kiswahili' : 'English'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            Switch language, then tap a character to check that installed voice.
          </Text>
          <Pressable
            onPress={() => void runCastCheck()}
            accessibilityRole="button"
            accessibilityLabel={
              castStep !== null
                ? 'Stop the device voice check'
                : 'Play Livia, Bingo and Zora in English and Kiswahili'
            }
            className={`mt-2 w-full flex-row items-center justify-center gap-2 rounded-xl border-2 py-2.5 ${
              castStep !== null
                ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-[#00251C]'
                : 'border-dashed border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-[#001B15]'
            }`}
          >
            <AppIcon name={castStep !== null ? 'pause' : 'play'} size={15} color="#059669" />
            <Text className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
              {castStep !== null ? `Stop check · ${castStep + 1} of ${CAST_STEPS.length}` : 'Play all six · English + Kiswahili'}
            </Text>
          </Pressable>
          <View className="mt-3 gap-2">
            {VOICE_CAST.map((member) => {
              const active = auditioning === member.id;
              return (
                <Pressable
                  key={member.id}
                  onPress={() => void auditionCast(member.id)}
                  disabled={castStep !== null}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled: castStep !== null }}
                  accessibilityLabel={`${active ? 'Stop' : 'Play'} ${member.name}'s ${castLanguageLabel(castLanguage)} sample line`}
                  className={`flex-row items-center gap-2.5 rounded-xl border-2 p-2.5 ${
                    active
                      ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-[#00251C]'
                      : 'border-slate-200 bg-white dark:border-[#1E1E2C] dark:bg-[#0E0E16]'
                  } ${castStep !== null ? 'opacity-50' : ''}`}
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
          {castStep !== null || castCaptures.length > 0 ? (
            <View
              className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#1E1E2C] dark:bg-[#0E0E16]"
              accessibilityLiveRegion="polite"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Device check
                </Text>
                <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  {castStep !== null
                    ? `${castStep + 1} of ${CAST_STEPS.length}`
                    : castSummary.studio > 0
                      ? `${castSummary.studio} studio · ${castSummary.native} device`
                      : `${castSummary.native}/${CAST_STEPS.length} native`}
                </Text>
              </View>
              {castSummaryLine ? (
                <Text className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{castSummaryLine}</Text>
              ) : null}
              <View className="mt-2 gap-1.5">
                {CAST_STEPS.map((step, i) => {
                  const capture = castCaptures[i];
                  const playing = castStep === i;
                  const label = playing
                    ? 'Playing…'
                    : !capture
                      ? 'Queued'
                      : capture.result.studio
                        ? 'Studio voice'
                        : capture.result.matchedVoice
                          ? 'Native voice'
                          : capture.result.approximate
                          ? 'Approximate'
                          : capture.result.hasVoiceList
                            ? 'Not installed'
                            : 'Engine default';
                  const good = !!(capture?.result.studio || capture?.result.matchedVoice);
                  return (
                    <View key={`${step.character}-${step.language}`} className="flex-row items-center gap-2">
                      <AppIcon
                        name={playing ? 'volume' : good ? 'checkCircle' : capture ? 'alert' : 'mic'}
                        size={12}
                        color={playing ? '#059669' : good ? '#059669' : capture ? '#B45309' : '#94A3B8'}
                      />
                      <Text className="w-14 text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
                        {castMember(step.character).name}
                      </Text>
                      <Text className="w-16 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        {step.language === 'sw' ? 'Kiswahili' : 'English'}
                      </Text>
                      <Text
                        numberOfLines={1}
                        className={`flex-1 text-[11px] font-bold ${
                          good
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : capture
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {label}
                        {capture && !capture.result.studio ? ` · ${capture.result.locale}` : ''}
                        {capture?.result.voiceName ? ` · ${capture.result.voiceName}` : ''}
                        {capture && !capture.result.spoken ? ' · no sound' : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {castStep === null && castSummary.missing > 0 ? (
                <Text className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                  Missing voices still play through the closest engine match — install the language in your device settings for
                  accurate vowels.
                </Text>
              ) : null}
            </View>
          ) : null}
          {voiceCheck ? (
            <View
              className={`mt-2 rounded-xl border px-3 py-2 ${
                voiceCheck.studio || voiceCheck.matched
                  ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-[#00251C]'
                  : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-[#2A1B06]'
              }`}
              accessibilityLiveRegion="polite"
            >
              <View className="flex-row items-center gap-1.5">
                <AppIcon
                  name={voiceCheck.studio || voiceCheck.matched ? 'checkCircle' : 'alert'}
                  size={13}
                  color={voiceCheck.studio || voiceCheck.matched ? '#059669' : '#B45309'}
                />
                <Text
                  className={`text-[10px] font-extrabold uppercase tracking-widest ${
                    voiceCheck.studio || voiceCheck.matched
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {voiceCheck.studio
                    ? 'Studio voice'
                    : voiceCheck.matched
                      ? 'Native voice found'
                    : voiceCheck.approximate
                      ? 'Approximate voice'
                      : voiceCheck.hasVoiceList
                        ? 'No matching voice'
                        : 'Voice list unavailable'}
                </Text>
              </View>
              <Text
                className={`mt-1 text-xs font-bold ${
                  voiceCheck.studio || voiceCheck.matched
                    ? 'text-emerald-800 dark:text-emerald-200'
                    : 'text-amber-800 dark:text-amber-200'
                }`}
              >
                {castMember(voiceCheck.character).name} · {castLanguageLabel(voiceCheck.language)}
                {voiceCheck.studio ? ' · ElevenLabs' : ` · ${voiceCheck.locale}`}
                {voiceCheck.voiceName ? ` · ${voiceCheck.voiceName}` : ''}
              </Text>
              <Text className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {voiceCheck.matched
                  ? 'This is the exact voice this character uses in lessons.'
                  : voiceCheck.approximate
                    ? `No ${castLanguageLabel(voiceCheck.language)} voice is installed, so a related-language voice is standing in. Install one for accurate vowels.`
                    : voiceCheck.hasVoiceList
                      ? `Install a ${castLanguageLabel(voiceCheck.language)} voice in your device settings; the engine used this locale instead.`
                      : `This platform does not report its installed voices, so the sample went to the engine with the ${voiceCheck.locale} locale. The sound you just heard is what lessons will use.`}
              </Text>
            </View>
          ) : null}
          <Text className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
            Livia, Bingo and Zora speak in their own studio voices when you are online — Livia is the educator, Bingo the host, Zora the build coach. Offline, in Swahili, or if the studio voice is unavailable, your device voice takes over: Livia and Zora feminine, Bingo masculine.
          </Text>
        </View>

        {/* Audiobook narration is a separate voice path from the character
            cast above: Free stays on-device, Premium generates one narrator. */}
        <View className="w-full max-w-sm rounded-2xl border-2 border-amber-200 bg-white p-4 dark:border-amber-900 dark:bg-[#06060A]">
          <View className="flex-row items-center gap-1.5">
            <AppIcon name="headset" size={20} color="#B45309" />
            <Text className="text-base font-extrabold text-slate-800 dark:text-slate-100">Audiobook voice</Text>
            <View
              className={`ml-auto rounded-full px-2 py-0.5 ${
                isPremium ? 'bg-amber-100 dark:bg-amber-950' : 'bg-slate-100 dark:bg-slate-800'
              }`}
            >
              <Text
                className={`text-[9px] font-extrabold uppercase tracking-widest ${
                  isPremium ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {isPremium ? 'Premium' : 'Free'}
              </Text>
            </View>
          </View>
          <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            The narrator for your uploaded lessons depends on your plan.
          </Text>

          <View
            className={`mt-3 rounded-xl border p-3 ${
              isPremium
                ? 'border-slate-200 bg-slate-50 dark:border-[#1E1E2C] dark:bg-[#0E0E16]'
                : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950'
            }`}
          >
            <View className="flex-row items-center gap-1.5">
              <AppIcon name="phone" size={15} color={isPremium ? '#64748B' : '#B45309'} />
              <Text
                className={`text-xs font-extrabold uppercase tracking-wide ${
                  isPremium ? 'text-slate-500 dark:text-slate-400' : 'text-amber-800 dark:text-amber-200'
                }`}
              >
                Free · Device voice
              </Text>
              {!isPremium ? (
                <Text className="ml-auto text-[9px] font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                  Current
                </Text>
              ) : null}
            </View>
            <Text className="mt-1 text-xs leading-4 text-slate-500 dark:text-slate-400">
              Your phone reads the question prompts with a voice already installed on the device. No full audiobook or per-question clips are generated.
            </Text>
          </View>

          <View
            className={`mt-2 rounded-xl border p-3 ${
              isPremium
                ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950'
                : 'border-slate-200 bg-slate-50 dark:border-[#1E1E2C] dark:bg-[#0E0E16]'
            }`}
          >
            <View className="flex-row items-center gap-1.5">
              <AppIcon name="sparkles" size={15} color="#B45309" />
              <Text
                className={`text-xs font-extrabold uppercase tracking-wide ${
                  isPremium ? 'text-amber-800 dark:text-amber-200' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Premium · Audiobook narrator
              </Text>
              {isPremium ? (
                <Text className="ml-auto text-[9px] font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                  {narratorName(profile?.narrator_voice)}
                </Text>
              ) : null}
            </View>
            <Text className="mt-1 text-xs leading-4 text-slate-500 dark:text-slate-400">
              Your narrator reads a continuous full mix and a clip for every question. It is separate from the Livia, Bingo and Zora character voices above.
            </Text>
            <View className="mt-2 gap-2">
              {NARRATOR_VOICES.map((voice) => {
                const active = chosenNarratorId === voice.id;
                const busy = savingNarrator === voice.id;
                return (
                  <Pressable
                    key={voice.id}
                    onPress={() => void chooseNarrator(voice.id)}
                    disabled={!isPremium || savingNarrator !== null}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active, disabled: !isPremium }}
                    accessibilityLabel={
                      isPremium
                        ? `Choose ${voice.name} as your audiobook narrator`
                        : `${voice.name} is a Premium narrator`
                    }
                    className={`rounded-xl border-2 p-2.5 ${
                      active
                        ? 'border-amber-400 bg-amber-100 dark:border-amber-500 dark:bg-amber-950'
                        : 'border-slate-200 bg-white dark:border-[#1E1E2C] dark:bg-[#0E0E16]'
                    } ${!isPremium || busy ? 'opacity-50' : ''}`}
                  >
                    <View className="flex-row items-baseline gap-1.5">
                      <Text
                        className={`text-sm font-extrabold ${
                          active ? 'text-amber-800 dark:text-amber-200' : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {voice.name}
                      </Text>
                      <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        {busy ? 'Saving…' : active ? 'Selected' : isPremium ? 'Choose' : 'Premium'}
                      </Text>
                      {active ? (
                        <View className="ml-auto">
                          <AppIcon name="check" size={14} color="#B45309" />
                        </View>
                      ) : null}
                    </View>
                    <Text
                      numberOfLines={2}
                      className={`mt-0.5 text-xs ${
                        active ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {voice.tag} — {voice.blurb}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="mt-2 text-[11px] leading-4 text-slate-400 dark:text-slate-500">
              {isPremium
                ? 'Applies to lessons you add from now on — a book that already has audio keeps the narrator that made it.'
                : 'Free lessons are read by your device voice. Choosing a studio narrator is part of Premium.'}
            </Text>
          </View>

          <View
            className={`mt-3 rounded-2xl border-2 p-3 ${
              isPremium
                ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950'
                : 'border-slate-200 bg-slate-50 dark:border-[#1E1E2C] dark:bg-[#0E0E16]'
            }`}
          >
            <View className="flex-row items-center gap-1.5">
              <AppIcon name="upload" size={15} color="#B45309" />
              <Text className="text-xs font-extrabold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                Premium · Upload output
              </Text>
              <Text className="ml-auto text-[9px] font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                {UPLOAD_OUTPUT_OPTIONS.find((o) => o.id === chosenOutput)?.label ?? 'Audiobook + nodes'}
              </Text>
            </View>
            <Text className="mt-1 text-xs leading-4 text-slate-500 dark:text-slate-400">
              A book you upload is narrated in full, part by part — not just its questions. Quiz nodes are
              optional: pick what the pipeline should build.
            </Text>
            <View className="mt-2 gap-2">
              {UPLOAD_OUTPUT_OPTIONS.map((option) => {
                const active = chosenOutput === option.id;
                const busy = savingOutput === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => void chooseOutput(option.id)}
                    disabled={!profile?.id || savingOutput !== null || (!isPremium && option.id !== 'nodes')}
                    accessibilityRole="radio"
                    accessibilityState={{
                      selected: active,
                      disabled: !profile?.id || (!isPremium && option.id !== 'nodes'),
                    }}
                    accessibilityLabel={`Uploads produce ${option.label}`}
                    className={`rounded-xl border-2 p-2.5 ${
                      active
                        ? 'border-amber-400 bg-amber-100 dark:border-amber-500 dark:bg-amber-950'
                        : 'border-slate-200 bg-white dark:border-[#1E1E2C] dark:bg-[#0E0E16]'
                    } ${!profile?.id || busy || (!isPremium && option.id !== 'nodes') ? 'opacity-50' : ''}`}
                  >
                    <View className="flex-row items-baseline gap-1.5">
                      <Text
                        className={`text-sm font-extrabold ${
                          active ? 'text-amber-800 dark:text-amber-200' : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {option.label}
                      </Text>
                      <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        {busy ? 'Saving…' : active ? 'Selected' : 'Choose'}
                      </Text>
                      {active ? (
                        <View className="ml-auto">
                          <AppIcon name="check" size={14} color="#B45309" />
                        </View>
                      ) : null}
                    </View>
                    <Text
                      numberOfLines={2}
                      className={`mt-0.5 text-xs ${
                        active ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {option.blurb}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {!isPremium ? (
              <Text className="mt-2 text-[11px] leading-4 text-slate-400 dark:text-slate-500">
                Studio narration is Premium. Free uploads stay text-only and are read by your device voice.
              </Text>
            ) : null}
          </View>

          <PremiumNarratorSample
            playing={narratorStatus.playing}
            onToggle={toggleNarratorSample}
            className="mt-3"
          />

          <View className="mt-3 border-t border-amber-100 pt-3 dark:border-amber-900">
            <Text className="text-xs font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-300">
              Hear it on this device
            </Text>
            {audiobookLoading ? (
              <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Loading the latest audiobook…
              </Text>
            ) : audiobook ? (
              <>
                <Text numberOfLines={1} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Latest: {audiobook.title}
                  {audiobook.narrator_voice ? ` · ${narratorName(audiobook.narrator_voice)}` : ''}
                </Text>
                <View className="mt-2 flex-row gap-2">
                  <Pressable
                    onPress={() => void toggleAudiobookPreview('full')}
                    disabled={!audiobookFullUrl}
                    accessibilityRole="button"
                    accessibilityLabel="Play or pause the latest audiobook full mix"
                    accessibilityState={{ disabled: !audiobookFullUrl }}
                    className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border-2 py-2 ${
                      fullPreviewActive
                        ? 'border-amber-400 bg-amber-100 dark:border-amber-500 dark:bg-amber-950'
                        : 'border-slate-200 bg-white dark:border-[#1E1E2C] dark:bg-[#0E0E16]'
                    } ${!audiobookFullUrl ? 'opacity-40' : ''}`}
                  >
                    <AppIcon
                      name={fullPreviewPlaying ? 'pause' : 'play'}
                      size={14}
                      color={fullPreviewPlaying ? '#B45309' : '#64748B'}
                    />
                    <Text
                      className={`text-xs font-extrabold ${
                        fullPreviewActive ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Full mix
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void toggleAudiobookPreview('segment')}
                    disabled={!audiobookSegmentUrl}
                    accessibilityRole="button"
                    accessibilityLabel="Play or pause one segment from the latest audiobook"
                    accessibilityState={{ disabled: !audiobookSegmentUrl }}
                    className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border-2 py-2 ${
                      segmentPreviewActive
                        ? 'border-amber-400 bg-amber-100 dark:border-amber-500 dark:bg-amber-950'
                        : 'border-slate-200 bg-white dark:border-[#1E1E2C] dark:bg-[#0E0E16]'
                    } ${!audiobookSegmentUrl ? 'opacity-40' : ''}`}
                  >
                    <AppIcon
                      name={segmentPreviewPlaying ? 'pause' : 'play'}
                      size={14}
                      color={segmentPreviewPlaying ? '#B45309' : '#64748B'}
                    />
                    <Text
                      className={`text-xs font-extrabold ${
                        segmentPreviewActive ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      One segment
                    </Text>
                  </Pressable>
                </View>
                <Text className="mt-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                  {audiobookPlaybackText}
                </Text>
                {audiobook.segments.length > 1 ? (
                  <Text className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                    {audiobook.segments.length} question clips in this lesson.
                  </Text>
                ) : null}
              </>
            ) : (
              <Text className="mt-1 text-xs leading-4 text-slate-500 dark:text-slate-400">
                {audiobookNotice ?? 'No generated audiobook yet.'}
              </Text>
            )}
          </View>

          {!isPremium ? (
            <Pressable
              onPress={() => router.push('/paywall')}
              accessibilityRole="button"
              accessibilityLabel="Compare free and premium audiobook narration"
              className="mt-3 flex-row items-center justify-center gap-1 rounded-xl bg-amber-500 py-2.5"
            >
              <Text className="text-sm font-extrabold text-white">See what Premium changes</Text>
              <AppIcon name="chevRight" size={16} color="#FFFFFF" />
            </Pressable>
          ) : (
            <Text className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
              Premium narration is generated for new uploads. Character voices still come from your device.
            </Text>
          )}
        </View>

        {row('volume', 'Ambient tune', ambientOn ? 'Grove loop · soft focus' : 'Ambient tune OFF', undefined, (
          <Switch value={ambientOn} onValueChange={toggleAmbient} />
        ))}
        {row('zap', 'Haptics', hapticsOn ? 'Vibration ON' : 'Vibration OFF', undefined, (
          <Switch value={hapticsOn} onValueChange={toggleHaptics} />
        ))}
        {row(
          'shield',
          'Anonymous diagnostics',
          telemetryOn ? 'On · no learner content' : 'Off · nothing uploaded',
          undefined,
          <Switch value={telemetryOn} onValueChange={toggleTelemetry} />
        )}
        {adsSupported &&
          row('shield', 'Ad privacy options', 'Review or change your ad consent', () => void openAdPrivacy())}
        {__DEV__ && row('diamond', 'Debug: refill', 'Dev builds only — remove before release', refillDiamonds)}
        {__DEV__ &&
          row(
            'time',
            'Celebration benchmark',
            'Dev builds only · p50/p95 frame times',
            () => router.push('/dev/celebration-benchmark')
          )}
        {__DEV__ &&
          row(
            'volume',
            'Swahili voice audit',
            'Dev builds only · every new lesson phrase',
            () => router.push('/dev/swahili-voice-audit')
          )}
      </View>

      <View className="mt-6 items-center">
        <BrandMark />
        <Text className="mt-1 text-xs text-slate-400 dark:text-slate-500">v1.0.0 | Made for learners</Text>
      </View>
      <StatusBar style="auto" />
    </ScrollView>
    <TabBar />
    </View>
  );
}
