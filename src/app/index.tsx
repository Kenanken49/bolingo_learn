import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Animated, Modal, ActivityIndicator, AccessibilityRole, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../lib/supabase';
import { getProfile, getCompletedLessonIds, getTodayCompletionCount, completeLesson, MAX_HEARTS, type Profile } from '../../lib/progress';
import { uploadRawFile, waitForUploadReady } from '../../lib/uploads';
import { FREE_WORD_LIMIT, PREMIUM_MONTHLY_WORD_CAP, PREMIUM_PRICE_LABEL } from '../../lib/tiers';
import { loadLatestAudiobook, type Audiobook } from '../../lib/audiobook';
import { CURRICULUM, COURSES_META, KIND_META, type CurriculumBlock, type CurriculumUnit } from '../../lib/curriculum';
import { GOALS, goalLabel, hasOnboarded, markOnboarded, nextUpBlock, getGoal, setGoal, type GoalId } from '../../lib/onboarding';
import { getDailyMinutes, setDailyMinutes, DAILY_MINUTES_OPTIONS, outcomeForMinutes, getSelectedCourse, setSelectedCourse } from '../../lib/preferences';
import { levelForXp } from '../../lib/levels';
import { getDueCount } from '../../lib/srs';

/** Variable reward: one-shot bonus for finishing every block in a unit. */
const CHEST_XP = 50;
import AudiobookPlayer from '../../components/AudiobookPlayer';
import DuoButton from '../../components/DuoButton';
import DuoOwl from '../../components/DuoOwl';
import Mascot from '../../components/AfricanMascots';
import { playCorrect } from '../../lib/sfx';

type NodeState = 'completed' | 'active' | 'locked' | 'processing' | 'failed';

/** Clamped offsets — the old ±56px clipped labels on wide tablets. */
const WIND = [0, -24, 24, -12, 12, 0];

function PathNode({
  state,
  icon,
  label,
  sub,
  color,
  onPress,
  offset,
  testID,
}: {
  state: NodeState;
  icon: string;
  label: string;
  sub?: string;
  color: string;
  onPress?: () => void;
  offset: number;
  testID?: string;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (state !== 'active') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [state, pulse]);

  const locked = state === 'locked';
  const bg =
    state === 'completed'
      ? 'bg-amber-400'
      : state === 'active'
        ? color
        : state === 'processing'
          ? 'bg-slate-200'
          : state === 'failed'
            ? 'bg-red-100'
            : 'bg-slate-300';
  const size = state === 'active' ? 'h-24 w-24' : 'h-20 w-20';
  const accessibilityLabel = `${label}: ${state}${sub ? `, ${sub}` : ''}`;
  const role: AccessibilityRole = onPress && !locked ? 'button' : 'text';

  // Duolingo signature: the next playable node wears a START bubble and a
  // bouncing ring; done nodes turn gold, locked nodes go grey with a lock.
  return (
    <View className="items-center" style={{ transform: [{ translateX: offset }] }}>
      {state === 'active' ? (
        <View className="mb-1 rounded-xl border-2 border-slate-200 bg-white px-4 py-1.5 shadow-sm">
          <Text className="font-duo text-sm font-black tracking-widest text-green-500">START</Text>
          <View className="absolute -bottom-1.5 left-1/2 h-3 w-3 rotate-45 border-b-2 border-r-2 border-slate-200 bg-white" />
        </View>
      ) : null}
      <Pressable
        disabled={locked || state === 'processing' || !onPress}
        onPress={onPress}
        accessibilityRole={role}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: locked }}
        testID={testID}
      >
        <Animated.View
          style={{ transform: [{ scale: pulse }] }}
          className={`${size} items-center justify-center rounded-full border-b-4 ${bg} ${
            locked ? 'border-slate-400 opacity-60' : 'border-black/20'
          } ${state === 'active' ? 'shadow-lg' : ''}`}
        >
          {state === 'processing' ? (
            <ActivityIndicator color="#64748b" />
          ) : (
            <Text className="text-3xl">{locked ? '\u{1F512}' : state === 'failed' ? '⚠️' : icon}</Text>
          )}
        </Animated.View>
      </Pressable>
      <Text className={`mt-1 max-w-28 text-center text-sm font-bold ${locked ? 'text-slate-400' : 'text-slate-800'}`}>
        {label}
      </Text>
      {sub ? (
        <Text className={`text-xs ${state === 'failed' ? 'text-red-500' : 'text-slate-400'}`} numberOfLines={2}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

/** Snake-UI guidance card: the single next block, so users never choose from a menu. */
function UpNextCard({ block, goal, onStart }: { block: CurriculumBlock; goal: GoalId | null; onStart: () => void }) {
  return (
    <Pressable
      onPress={onStart}
      accessibilityRole="button"
      accessibilityLabel={`Up next: ${block.title}`}
      className="mb-4 w-full max-w-sm flex-row items-center rounded-3xl border-2 border-green-200 bg-green-50 p-4"
    >
      <View className="h-12 w-12 items-center justify-center rounded-full bg-green-500">
        <Text className="text-2xl">{block.kind === 'project' ? '🏗️' : KIND_ICON[block.kind] ?? '⭐'}</Text>
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-xs font-extrabold uppercase tracking-widest text-green-600">
          ⬆️ Up next{goal ? ` · ${goalLabel(goal)}` : ''}
        </Text>
        <Text className="font-duo text-base font-extrabold text-slate-900" numberOfLines={1}>
          {block.title}
        </Text>
        <Text className="text-xs font-bold text-slate-500">
          {KIND_META[block.kind].label} · ⚡ {block.minutes} min bite-sized · +{block.xp} XP
        </Text>
      </View>
      <Text className="text-2xl font-extrabold text-green-500">›</Text>
    </Pressable>
  );
}

/** Duolingo-style unit banner: colored header, section eyebrow, goal, guidebook entry. */
function UnitHeader({ unit, doneCount, totalCount }: { unit: CurriculumUnit; doneCount: number; totalCount: number }) {
  return (
    <View className={`w-full max-w-sm overflow-hidden rounded-3xl ${unit.color}`}>
      <View className="px-5 pb-4 pt-4">
        <Text className="text-xs font-extrabold uppercase tracking-widest text-white/80">{unit.section}</Text>
        <View className="mt-1 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-xl font-extrabold text-white">
              {unit.icon} {unit.title}
            </Text>
            <Text className="mt-0.5 text-sm font-semibold text-white/85">{unit.goal}</Text>
          </View>
          <Pressable
            onPress={() => router.push({ pathname: '/curriculum/[unitId]', params: { unitId: unit.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${unit.title} guidebook`}
            className="ml-3 items-center rounded-2xl border-2 border-white/40 px-3 py-2"
          >
            <Text className="text-lg">📖</Text>
            <Text className="text-[10px] font-extrabold text-white">GUIDE</Text>
          </Pressable>
        </View>
        <View className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/20">
          <View className="h-full rounded-full bg-white" style={{ width: `${totalCount ? Math.round((doneCount / totalCount) * 100) : 0}%` }} />
        </View>
        <Text className="mt-1 text-xs font-bold text-white/80">
          {doneCount}/{totalCount} complete
        </Text>
      </View>
    </View>
  );
}

/** freeCodeCamp-style syllabus row: kind tag, title, minutes, status, chevron. */
function SyllabusRow({
  block,
  state,
  onOpen,
}: {
  block: CurriculumBlock;
  state: NodeState;
  onOpen: () => void;
}) {
  const meta = KIND_META[block.kind];
  const statusIcon = state === 'completed' ? '✅' : state === 'locked' ? '🔒' : state === 'processing' ? '⏳' : '⭕';
  return (
    <Pressable
      onPress={onOpen}
      disabled={state === 'locked' || state === 'processing'}
      accessibilityRole="button"
      accessibilityLabel={`${block.title}, ${block.kind}, ${state}`}
      className="flex-row items-center rounded-2xl border border-slate-200 bg-white p-3"
    >
      <Text className="text-2xl">{meta.icon}</Text>
      <View className="ml-3 flex-1">
        <View className="flex-row items-center">
          <Text className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${meta.color}`}>{meta.label}</Text>
          <Text className="text-xs font-bold text-slate-400">{block.minutes} min · +{block.xp} XP</Text>
        </View>
        <Text className={`mt-0.5 text-base font-bold ${state === 'locked' ? 'text-slate-400' : 'text-slate-800'}`}>
          {block.title}
        </Text>
      </View>
      <Text className="text-lg">{statusIcon}</Text>
    </Pressable>
  );
}

interface UploadRow {
  id: string;
  file_name: string;
  status: 'processing' | 'ready' | 'failed';
}

interface UserLesson {
  id: string;
  title: string;
  upload_source_id: string | null;
}

const KIND_ICON: Record<string, string> = {
  lesson: '⭐',
  workshop: '\u{1F6E0}\uFE0F',
  lab: '\u{1F9EA}',
  review: '\u{1F4DD}',
  quiz: '\u{1F3C6}',
  project: '\u{1F3D7}\uFE0F',
};

export default function PathMap() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [userLessons, setUserLessons] = useState<UserLesson[]>([]);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [picked, setPicked] = useState<{ uri: string; name: string; mime: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sandboxMsg, setSandboxMsg] = useState<string | null>(null);
  const [audiobook, setAudiobook] = useState<Audiobook | null>(null);
  const [listening, setListening] = useState(false);
  const [audioMsg, setAudioMsg] = useState<string | null>(null);
  const [freeListen, setFreeListen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Inverted onboarding: guests play before they ever see a signup form.
  const [onboarded, setOnboardedState] = useState(true); // true until proven first-run (avoids card flash)
  const [goal, setGoalState] = useState<GoalId | null>(null);
  // Duolingo onboarding: daily commitment (minutes/day) + projected outcome.
  const [minutes, setMinutesState] = useState(10);
  // SRS: how many memory cards are due (drives the Daily Review nudge).
  const [dueCount, setDueCount] = useState(0);
  // Daily Quest: lessons finished today (drives the quest progress bar).
  const [todayCount, setTodayCount] = useState(0);
  // Course picker (Duolingo style): null = all-courses grid, else one course path.
  const [courseId, setCourseIdState] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
      if (p) {
        setCompleted(await getCompletedLessonIds(p.id).catch(() => new Set<string>()));
        const { data: up } = await supabase
          .from('user_uploads')
          .select('id,file_name,status')
          .eq('user_id', p.id)
          .order('created_at', { ascending: false })
          .limit(10);
        setUploads((up as UploadRow[] | null) ?? []);
        const { data: lessons } = await supabase
          .from('lessons')
          .select('id,title,upload_source_id')
          .eq('user_id', p.id)
          .eq('is_user_generated', true)
          .order('created_at', { ascending: false })
          .limit(10);
        setUserLessons((lessons as UserLesson[] | null) ?? []);
      }
      // Onboarding state is device-local so first-run guests get the
      // play-first card even before any account exists.
      setOnboardedState(await hasOnboarded());
      setGoalState(await getGoal());
      setMinutesState(await getDailyMinutes().catch(() => 10));
      if (p) setDueCount(await getDueCount(p.id).catch(() => 0));
      if (p) setTodayCount(await getTodayCompletionCount(p.id).catch(() => 0));
      const saved = await getSelectedCourse().catch(() => null);
      setCourseIdState(saved && COURSES_META.some((c) => c.id === saved) ? saved : null);
    } catch (e) {
      console.warn('Path refresh failed:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const statusByUpload = new Map(uploads.map((u) => [u.id, u.status]));
  const lessonStatus = (l: UserLesson): 'ready' | 'processing' | 'failed' =>
    (l.upload_source_id ? statusByUpload.get(l.upload_source_id) : undefined) ?? 'ready';

  const isPremium = profile?.is_premium === true;

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        // Free tier: raw text only. Premium unlocks PDF + audio.
        type: isPremium ? ['application/pdf', 'text/*', 'audio/*'] : ['text/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const a = res.assets[0];
      setPicked({ uri: a.uri, name: a.name ?? 'upload', mime: a.mimeType ?? 'application/octet-stream' });
      setSandboxMsg(null);
    } catch (e) {
      setSandboxMsg(String(e instanceof Error ? e.message : e));
    }
  };

  const uploadPicked = async () => {
    if (!profile) {
      setSandboxMsg('Sign in first — uploads are tagged to your account.');
      return;
    }
    if (!picked) {
      setSandboxMsg('Pick a book, PDF, or audio file first.');
      return;
    }
    setUploading(true);
    setSandboxMsg(null);
    try {
      // expo-file-system has no web implementation — read blob: URIs with fetch instead.
      let bytes: Uint8Array;
      if (Platform.OS === 'web') {
        const buf = await (await fetch(picked.uri)).arrayBuffer();
        bytes = new Uint8Array(buf);
      } else {
        const b64 = await readAsStringAsync(picked.uri, { encoding: EncodingType.Base64 });
        bytes = new Uint8Array(decode(b64));
      }
      const upload = await uploadRawFile(bytes, picked.name, picked.mime);
      setPicked(null);
      setSandboxMsg('Uploaded! The AI is generating your custom path node…');
      refresh();
      // Wait for the pipeline, then surface the finished node.
      waitForUploadReady(upload.id)
        .then(() => {
          setSandboxMsg('✅ Your custom revision node is ready!');
          refresh();
        })
        .catch(() => setSandboxMsg('Generation hit an error — check the node status below.'));
    } catch (e) {
      setSandboxMsg(String(e instanceof Error ? e.message : e));
    } finally {
      setUploading(false);
    }
  };

  const openAudiobookMode = async () => {
    try {
      // Free tier: device-native voice over the lesson's question prompts ($0).
      if (!isPremium) {
        const { data: lesson } = await supabase
          .from('lessons')
          .select('id,title')
          .eq('user_id', profile?.id ?? '')
          .eq('is_user_generated', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!lesson) {
          setAudioMsg('No lesson yet — open the AI Sandbox and paste text first.');
          return;
        }
        const { data: qs } = await supabase.from('questions').select('id,prompt').eq('lesson_id', (lesson as { id: number }).id).order('created_at');
        const prompts = ((qs as Array<{ id: string; prompt: string }> | null) ?? []).map((r) => ({
          question_id: r.id,
          prompt: r.prompt,
          audio_path: '',
          url: '',
        }));
        if (prompts.length === 0) {
          setAudioMsg('Lesson has no questions yet — wait for generation to finish.');
          return;
        }
        setAudiobook({ lesson_id: (lesson as { id: number }).id, title: (lesson as { title: string }).title, full_audio_url: null, segments: prompts });
        setFreeListen(true);
        setListening(true);
        setAudioMsg(null);
        return;
      }
      setAudioMsg('Loading your audiobook…');
      const book = await loadLatestAudiobook();
      if (!book) {
        setAudioMsg('No audiobook yet — open the AI Sandbox and upload material first.');
        return;
      }
      setAudiobook(book);
      setFreeListen(false);
      setListening(true);
      setAudioMsg(null);
    } catch (e) {
      setAudioMsg(String(e instanceof Error ? e.message : e));
    }
  };

  const hearts = profile?.hearts ?? MAX_HEARTS;
  const xp = profile?.xp ?? 0;
  const streak = profile?.streak_count ?? 0;
  const used = profile?.ai_words_used ?? 0;

  let wind = 0;
  const nextOffset = () => {
    const o = WIND[wind % WIND.length];
    wind += 1;
    return o;
  };

  const [newestReady, ...olderLessons] = userLessons.filter((l) => lessonStatus(l) === 'ready');
  const pendingUploads = uploads.filter((u) => u.status === 'processing');
  const failedLessons = userLessons.filter((l) => lessonStatus(l) === 'failed');

  const lowHearts = hearts <= 1;

  // Loss-aversion trigger: the streak is alive but hasn't been fed today.
  // Yesterday => at risk; older => went cold (next lesson restarts it).
  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterdayKey = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const lastKey = profile?.last_activity_at ? new Date(profile.last_activity_at).toISOString().slice(0, 10) : null;
  const streakAtRisk = !!profile && profile.streak_count > 0 && lastKey !== todayKey;

  // Per-unit progress across curriculum blocks + demo parity.
  const isBlockDone = (b: CurriculumBlock) => completed.has(b.lessonId) || completed.has(b.id);
  // Units visible right now: everything, or just the picked course.
  const visibleUnits = () => (courseId ? CURRICULUM.filter((u) => u.course === courseId) : CURRICULUM);
  const selectCourse = async (id: string | null) => {
    setCourseIdState(id);
    await setSelectedCourse(id);
  };
  const unitState = (unit: CurriculumUnit, blockIdx: number): NodeState => {
    const b = unit.blocks[blockIdx];
    if (isBlockDone(b)) return 'completed';
    if (blockIdx === 0) return 'active';
    const prev = unit.blocks[blockIdx - 1];
    if (isBlockDone(prev)) return 'active';
    // Guests get the Duo treatment too: only the next uncompleted block is
    // tappable, everything past it stays locked until something is done.
    if (!profile) return 'locked';
    const prevUnitIdx = CURRICULUM.findIndex((u) => u.id === unit.id) - 1;
    if (blockIdx === 0 && prevUnitIdx >= 0) {
      const prevUnit = CURRICULUM[prevUnitIdx];
      if (prevUnit.blocks.every(isBlockDone)) return 'active';
    }
    return 'locked';
  };
  // Certification projects open the real code editor; everything else plays in the quiz engine.
  const openBlock = (b: CurriculumBlock) =>
    b.kind === 'project'
      ? router.push({ pathname: '/project/[lessonId]', params: { lessonId: b.lessonId, title: b.lessonTitle } })
      : router.push({ pathname: '/quiz/[lessonId]', params: { lessonId: b.lessonId, title: b.lessonTitle } });

  // Variable reward, one-shot per unit (tracked as a completion so it
  // survives reinstalls and syncs across devices like everything else).
  const claimChest = async (unit: CurriculumUnit) => {
    const id = `chest:${unit.id}`;
    if (!profile) {
      router.push('/auth');
      return;
    }
    if (!unit.blocks.every(isBlockDone) || completed.has(id)) return;
    try {
      await completeLesson(profile.id, CHEST_XP, id);
      void playCorrect();
      Alert.alert('🎁 Chest claimed!', `+${CHEST_XP} XP for finishing ${unit.title}!`);
      await refresh();
    } catch {
      Alert.alert('Claim failed', 'Check your connection and try again.');
    }
  };

  // Play-first entry: goal defaults to exploring; the funnel starts the
  // moment they tap through — the account prompt waits until results.
  const startFirstLesson = async () => {
    if (!goal) {
      setGoalState('explore');
      await setGoal('explore');
    }
    await markOnboarded();
    setOnboardedState(true);
    const first = nextUpBlock(completed);
    if (first) openBlock(first);
  };

  const sideNav = (
    <View className="w-56 gap-1 pr-4">
      {[
        { label: 'Learn', icon: '🏠', href: '/', active: true },
        { label: 'Leaderboard', icon: '🏆', href: '/leaderboard', active: false },
        { label: 'Quests', icon: '🎯', href: '/settings', active: false },
        { label: 'Shop', icon: '🛍️', href: '/paywall', active: false },
        { label: 'Profile', icon: '👤', href: '/auth', active: false },
      ].map((n) => (
        <Link key={n.label} href={n.href as never} asChild>
          <Pressable className={`flex-row items-center rounded-2xl px-4 py-3 ${n.active ? 'border-2 border-sky-200 bg-sky-50' : ''}`}>
            <Text className="text-xl">{n.icon}</Text>
            <Text className={`ml-3 text-sm font-extrabold tracking-wide ${n.active ? 'text-sky-600' : 'text-slate-500'}`}>
              {n.label.toUpperCase()}
            </Text>
          </Pressable>
        </Link>
      ))}
      <View className="mt-4 rounded-2xl border-2 border-slate-200 p-4">
        <Text className="text-sm font-extrabold text-slate-800">Daily Quest · {minutes} min/day {todayCount >= 1 ? '✅' : ''}</Text>
        <Text className="mt-1 text-sm text-slate-500">
          {profile
            ? todayCount >= 1
              ? 'Quest complete! Streak protected. 🎉'
              : 'Complete 1 lesson to keep your streak alive.'
            : 'Sign in to track your daily quest.'}
        </Text>
        {profile ? (
          <View className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <View
              className={`h-full rounded-full ${todayCount >= 1 ? 'bg-green-500' : 'bg-sky-500'}`}
              style={{ width: `${Math.min(100, todayCount * 100)}%` }}
            />
          </View>
        ) : null}
      </View>
    </View>
  );

  const rightPanel = (
    <View className="w-72 gap-4 pl-4">
      <View className="rounded-2xl border-2 border-slate-200 p-4">
        <Text className="text-sm font-extrabold text-slate-800">Stats</Text>
        <Text className="mt-2 text-base font-bold text-orange-500">🔥 Streak {streak}</Text>
        <Text className="text-base font-bold text-amber-500">⭐ {xp.toLocaleString()} XP</Text>
        <Text className="text-base font-bold text-red-500">❤️ {hearts}/{MAX_HEARTS}</Text>
      </View>
      <View className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-4">
        <Text className="text-sm font-extrabold text-purple-800">🧠 AI Sandbox</Text>
        <Text className="mt-1 text-sm text-purple-900/70">Turn your own material into path nodes.</Text>
        <Pressable
          onPress={() => {
            setSandboxOpen(true);
            setSandboxMsg(null);
          }}
          className="mt-3 items-center rounded-2xl bg-purple-600 py-2.5"
        >
          <Text className="font-extrabold text-white">Open Sandbox</Text>
        </Pressable>
      </View>
      {!isPremium ? (
        <Link href="/paywall" asChild>
          <Pressable className="items-center rounded-2xl bg-amber-500 px-4 py-3">
            <Text className="font-extrabold text-white">👑 Go Premium ({PREMIUM_PRICE_LABEL})</Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      {/* Duo-style HUD: course flag · streak · gems/XP · hearts · trophy · avatar */}
      <View className="border-b-2 border-slate-100 bg-white px-4 pb-3 pt-2">
        <View className="w-full max-w-5xl flex-row items-center justify-between self-center">
          <Pressable
            onPress={() => router.push('/curriculum/html-foundations')}
            accessibilityRole="button"
            accessibilityLabel="Current course: Web Basics"
            className="flex-row items-center rounded-full bg-slate-100 px-3 py-1.5"
          >
            <Text className="text-lg">🌐</Text>
            <Text className="ml-1 text-sm font-extrabold text-slate-600">WEB ▼</Text>
          </Pressable>
          <Text accessibilityLabel={`Streak ${streak} days`} className="font-duo text-lg font-extrabold text-orange-500">🔥 {streak}</Text>
          <Text accessibilityLabel={`${xp} experience points`} className="font-duo text-lg font-extrabold text-sky-500">💎 {xp.toLocaleString()}</Text>
            <View accessibilityLabel={`Level ${levelForXp(xp)}`} className="rounded-full bg-violet-100 px-3 py-1.5">
              <Text className="font-duo text-sm font-extrabold text-violet-700">Lv {levelForXp(xp)}</Text>
            </View>
          <Text accessibilityLabel={`${hearts} hearts remaining`} className={`font-duo text-lg font-extrabold ${lowHearts ? 'text-red-600' : 'text-red-500'}`}>
            ❤️ {hearts}{lowHearts ? '!' : ''}
          </Text>
          <Pressable
            onPress={() => router.push('/leaderboard')}
            accessibilityRole="button"
            accessibilityLabel="Weekly leagues leaderboard"
            className="hidden rounded-full bg-amber-100 px-3 py-1.5 md:flex"
          >
            <Text className="text-sm font-extrabold text-amber-700">{'🏆'}</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/auth')}
            accessibilityRole="button"
            accessibilityLabel={profile ? 'Account' : 'Sign in'}
            className={`rounded-full px-3 py-1.5 ${profile ? 'bg-green-100' : 'bg-slate-900'}`}
          >
            <Text className={`text-sm font-extrabold ${profile ? 'text-green-700' : 'text-white'}`}>
              {profile ? (profile.is_premium ? '👑' : '👤') : 'Sign in'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="flex-1 flex-row justify-center">
        {/* Desktop left rail (web, md+) */}
        {Platform.OS === 'web' ? <View className="hidden pt-6 md:flex">{sideNav}</View> : null}

        <ScrollView contentContainerClassName="items-center bg-white px-6 pb-32 pt-4 md:max-w-xl md:flex-1">
          {/* Hook trigger: Bingo guilt-trips when the streak needs feeding. */}
          {streakAtRisk ? (
            <View className="mb-4 w-full max-w-sm flex-row items-center rounded-3xl border-2 border-orange-200 bg-orange-50 p-4">
              <DuoOwl mood="sad" size={72} />
              <View className="ml-3 flex-1">
                <Text className="font-duo text-lg font-extrabold text-orange-800">
                  {lastKey === yesterdayKey ? 'Bingo missed you! 🦉' : 'Bingo is worried…'}
                </Text>
                <Text className="mt-1 text-sm leading-5 text-slate-600">
                  {lastKey === yesterdayKey
                    ? `One quick lesson today keeps your 🔥 ${profile?.streak_count ?? 0}-day streak alive. Don't let it hit zero!`
                    : `Your fire was at 🔥 ${profile?.streak_count ?? 0}. Bingo forgives you — one lesson restarts it.`}
                </Text>
                <View className="mt-3">
                  <DuoButton
                    color="amber"
                    onPress={() => {
                      const b = nextUpBlock(completed);
                      if (b) openBlock(b);
                    }}
                    label={lastKey === yesterdayKey ? 'Keep my streak' : 'Restart my streak'}
                    title={lastKey === yesterdayKey ? '▶ Keep my streak' : '▶ Restart my streak'}
                    small
                  />
                </View>
              </View>
            </View>
          ) : null}
          {/* SRS injection: due memory cards surface as a 2-minute review. */}
          {profile && dueCount > 0 ? (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/quiz/[lessonId]', params: { lessonId: 'srs-review', title: 'Daily Review' } })
              }
              accessibilityRole="button"
              accessibilityLabel={`Daily review, ${dueCount} cards due`}
              className="mb-4 w-full max-w-sm flex-row items-center rounded-3xl border-2 border-sky-200 bg-sky-50 p-4"
            >
              <View className="h-12 w-12 items-center justify-center rounded-full bg-sky-500">
                <Text className="text-2xl">🔁</Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-xs font-extrabold uppercase tracking-widest text-sky-600">
                  🧠 Daily Review · ~2 min
                </Text>
                <Text className="font-duo text-base font-extrabold text-slate-900" numberOfLines={1}>
                  {dueCount} card{dueCount === 1 ? '' : 's'} slipping — lock {dueCount === 1 ? 'it' : 'them'} in
                </Text>
                <Text className="text-xs font-bold text-slate-500">Spaced repetition · +10 XP per recall</Text>
              </View>
              <Text className="text-2xl font-extrabold text-sky-500">›</Text>
            </Pressable>
          ) : null}
          {/* AI tutors (Duolingo Max style): Roleplay chats live here; Explain My Answer appears inside every wrong answer. */}
          <Pressable
            onPress={() => router.push('/roleplay')}
            accessibilityRole="button"
            accessibilityLabel="AI tutors: roleplay and explain my answer"
            className="mb-4 w-full max-w-sm flex-row items-center rounded-3xl border-2 border-violet-200 bg-violet-50 p-4"
          >
            <View className="h-12 w-12 items-center justify-center rounded-full bg-violet-600">
              <Text className="text-2xl">🎭</Text>
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-xs font-extrabold uppercase tracking-widest text-violet-600">
                ✨ AI tutors {isPremium ? '' : '· Premium'} 
              </Text>
              <Text className="font-duo text-base font-extrabold text-slate-900" numberOfLines={1}>
                Roleplay scenarios + Explain My Answer
              </Text>
              <Text className="text-xs font-bold text-slate-500">Wrong answer? Tap ✨ in-lesson · Chat in Roleplay</Text>
            </View>
            <Text className="text-2xl font-extrabold text-violet-400">›</Text>
          </Pressable>
          {/* Offline Kamusi: no-network, no-AI dictionary for language learners. */}
          <Pressable
            onPress={() => router.push('/dictionary')}
            accessibilityRole="button"
            accessibilityLabel="Offline kamusi and dictionary, no AI needed"
            className="mb-4 w-full max-w-sm flex-row items-center rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-4"
          >
            <View className="h-12 w-12 items-center justify-center rounded-full bg-emerald-600">
              <Text className="text-2xl">📖</Text>
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-xs font-extrabold uppercase tracking-widest text-emerald-600">
                📖 Offline kamusi · no AI needed
              </Text>
              <Text className="font-duo text-base font-extrabold text-slate-900" numberOfLines={1}>
                Kiswahili ↔ English dictionary
              </Text>
              <Text className="text-xs font-bold text-slate-500">2,273 SW headwords · 12,000 EN words · works offline</Text>
            </View>
            <Text className="text-2xl font-extrabold text-emerald-400">›</Text>
          </Pressable>
          {/* Core Curriculum: 7 certification tracks × 5 mandatory projects. */}
          <Pressable
            onPress={() => router.push('/certifications')}
            accessibilityRole="button"
            accessibilityLabel="Core certifications: 7 tracks, 5 projects each"
            className="mb-4 w-full max-w-sm flex-row items-center rounded-3xl border-2 border-slate-900 bg-slate-900 p-4"
          >
            <View className="h-12 w-12 items-center justify-center rounded-full bg-amber-400">
              <Text className="text-2xl">🎓</Text>
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
                🎓 Core certifications
              </Text>
              <Text className="font-duo text-base font-extrabold text-white" numberOfLines={1}>
                7 tracks · 5 projects each
              </Text>
              <Text className="text-xs font-bold text-slate-400">Pass all 5 to earn the certificate</Text>
            </View>
            <Text className="text-2xl font-extrabold text-amber-400">›</Text>
          </Pressable>
          {/* UI/UX Design Ecosystem: native module + Figma masterclasses + guides hub. */}
          <Pressable
            onPress={() => router.push('/design')}
            accessibilityRole="button"
            accessibilityLabel="UI UX design ecosystem: lessons, videos, guides"
            className="mb-4 w-full max-w-sm flex-row items-center rounded-3xl border-2 border-pink-200 bg-pink-50 p-4"
          >
            <View className="h-12 w-12 items-center justify-center rounded-full bg-pink-500">
              <Text className="text-2xl">🎨</Text>
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-xs font-extrabold uppercase tracking-widest text-pink-600">
                🎨 UI/UX design ecosystem
              </Text>
              <Text className="font-duo text-base font-extrabold text-slate-900" numberOfLines={1}>
                Design module · Figma courses · Guides
              </Text>
              <Text className="text-xs font-bold text-slate-500">Hierarchy, Figma, wireframes, flows</Text>
            </View>
            <Text className="text-2xl font-extrabold text-pink-400">›</Text>
          </Pressable>
          {/* Inverted onboarding: play first, profile second. First-run guests
              pick a goal and drop straight into a 2-minute lesson — signup
              comes only after they've won XP (see results upsell). */}
          {!profile && !onboarded ? (
            <View className="mb-4 w-full max-w-sm rounded-3xl bg-slate-900 p-5 shadow-lg">
              <View className="items-center">
                <Mascot character="livia" mood="happy" size={84} />
              </View>
              <Text className="mt-2 text-center text-xs font-bold uppercase tracking-widest text-amber-300">Meet Livia ✋ your mentor</Text>
              <Text className="mt-1 text-xl font-duo font-extrabold text-white">Learn by doing</Text>
              <Text className="mt-1 text-sm leading-5 text-slate-300">
                Try a 2-minute lesson now — no account needed. Save your XP after you win it.
              </Text>
              <View className="mt-3 flex-row gap-2">
                {GOALS.map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() => {
                      setGoalState(g.id);
                      void setGoal(g.id);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Goal: ${g.label}`}
                    className={`flex-1 items-center rounded-2xl border-2 py-2 ${goal === g.id ? 'border-green-400 bg-green-500/20' : 'border-slate-700 bg-slate-800'}`}
                  >
                    <Text className="text-lg">{g.icon}</Text>
                    <Text className={`text-xs font-bold ${goal === g.id ? 'text-green-300' : 'text-slate-300'}`}>{g.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-400">How much per day?</Text>
              <View className="mt-1 flex-row gap-2">
                {DAILY_MINUTES_OPTIONS.map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => {
                      setMinutesState(m);
                      void setDailyMinutes(m);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${m} minutes per day`}
                    className={`flex-1 items-center rounded-2xl border-2 py-2 ${minutes === m ? 'border-green-400 bg-green-500/20' : 'border-slate-700 bg-slate-800'}`}
                  >
                    <Text className={`text-sm font-extrabold ${minutes === m ? 'text-green-300' : 'text-slate-300'}`}>{m} min</Text>
                  </Pressable>
                ))}
              </View>
              <Text className="mt-2 text-sm text-green-300">🎯 {outcomeForMinutes(minutes)}</Text>
              <View className="mt-3">
                <DuoButton
                  onPress={() => void startFirstLesson()}
                  label="Start my first lesson"
                  title="▶ Start my first lesson"
                />
              </View>
            </View>
          ) : nextUpBlock(completed) ? (
            /* Snake-UI guidance: one unambiguous next action, no menu decisions. */
            <UpNextCard block={nextUpBlock(completed)!} goal={goal} onStart={() => openBlock(nextUpBlock(completed)!)} />
          ) : null}
          {/* Course picker (Duolingo style): every course on one screen —
              open the one you care about and follow its path to completion. */}
          {courseId ? (
            <View className="mb-2 w-full max-w-sm flex-row items-center">
              <Pressable
                onPress={() => void selectCourse(null)}
                accessibilityRole="button"
                accessibilityLabel="Back to all courses"
                className="rounded-2xl border-2 border-slate-200 bg-white px-4 py-2"
              >
                <Text className="text-base font-extrabold text-sky-600">‹ All courses</Text>
              </Pressable>
            </View>
          ) : (
            <View className="mb-8 w-full max-w-sm">
              <Text className="font-duo text-xl font-extrabold text-slate-900">Your courses</Text>
              <Text className="mb-3 mt-0.5 text-sm font-semibold text-slate-500">Pick one and follow its path — no more endless scrolling.</Text>
              {COURSES_META.map((c) => {
                const units = CURRICULUM.filter((u) => u.course === c.id);
                const total = units.reduce((a, u) => a + u.blocks.length, 0);
                const done = units.reduce((a, u) => a + u.blocks.filter(isBlockDone).length, 0);
                const pct = total ? Math.round((done / total) * 100) : 0;
                const status = total > 0 && done >= total ? 'Course complete \u{1F389}' : done > 0 ? `Continue · ${done}/${total}` : `Start · ${total} steps`;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => void selectCourse(c.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.name}: ${status}`}
                    className="mb-3 w-full flex-row items-center rounded-3xl border-2 border-slate-200 bg-white p-4"
                  >
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-900">
                      <Text className="text-2xl">{c.icon}</Text>
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="font-duo text-base font-extrabold text-slate-900" numberOfLines={1}>
                        {c.name}
                      </Text>
                      <View className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <View className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                      </View>
                      <Text className="mt-1 text-xs font-bold text-slate-500">{status}</Text>
                    </View>
                    <Text className="text-2xl font-extrabold text-slate-300">›</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {/* Curriculum units: Duo banner + winding FCC-mapped nodes + chest milestone */}
          {courseId ? visibleUnits().map((unit, ui) => {
            const done = unit.blocks.filter(isBlockDone).length;
            const open = expanded[unit.id] ?? false;
            const courseChanged = ui === 0 || visibleUnits()[ui - 1]?.course !== unit.course;
            const courseMeta = COURSES_META.find((c) => c.id === unit.course);
            return (
              <View key={unit.id} className="mb-8 w-full max-w-sm items-center">
                {courseChanged && courseMeta ? (
                  <View className="mb-4 w-full rounded-3xl border-2 border-slate-900 bg-slate-900 p-4">
                    <Text className="text-lg font-extrabold text-white">
                      {courseMeta.icon} {courseMeta.name}
                    </Text>
                    <Text className="mt-0.5 text-sm text-slate-400">{courseMeta.blurb}</Text>
                  </View>
                ) : null}
                <UnitHeader unit={unit} doneCount={done} totalCount={unit.blocks.length} />

                <View className="relative mt-4 w-full items-center gap-5">
                  <View pointerEvents="none" className="absolute bottom-6 top-6 w-1.5 rounded-full bg-slate-100" />
                  {unit.blocks.map((b, i) => (
                    <PathNode
                      key={b.id}
                      state={unitState(unit, i)}
                      icon={isBlockDone(b) ? '🏆' : KIND_ICON[b.kind] ?? '⭐'}
                      label={b.title}
                      sub={`${KIND_META[b.kind].label} · ${b.minutes} min`}
                      color={unit.color}
                      offset={nextOffset()}
                      onPress={() => openBlock(b)}
                    />
                  ))}
                  {/* Variable-reward chest: one-shot +50 XP claim per finished unit. */}
                  {(() => {
                    const unitDone = unit.blocks.every(isBlockDone);
                    const claimed = completed.has(`chest:${unit.id}`);
                    return (
                      <PathNode
                        state={!unitDone ? 'locked' : claimed ? 'completed' : 'active'}
                        icon={claimed ? '🏆' : '🎁'}
                        label="Unit chest"
                        sub={!unitDone ? 'Finish the unit' : claimed ? `Claimed! +${CHEST_XP} XP` : `Tap to claim +${CHEST_XP} XP`}
                        color="bg-amber-400"
                        offset={nextOffset()}
                        onPress={() => void claimChest(unit)}
                      />
                    );
                  })()}
                </View>

                {/* FCC-style expandable syllabus (sibling buttons — no nested pressables) */}
                <View className="mt-4 w-full flex-row gap-2">
                  <Pressable
                    onPress={() => setExpanded((e) => ({ ...e, [unit.id]: !open }))}
                    accessibilityRole="button"
                    accessibilityLabel={`${open ? 'Hide' : 'View'} ${unit.title} syllabus`}
                    className="flex-1 items-center rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <Text className="font-extrabold text-slate-700">{open ? 'Hide syllabus ▲' : 'View syllabus ▼'}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push({ pathname: '/curriculum/[unitId]', params: { unitId: unit.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${unit.title} full syllabus page`}
                    className="items-center justify-center rounded-2xl bg-slate-900 px-4 py-3"
                  >
                    <Text className="text-xs font-extrabold text-white">FULL PAGE →</Text>
                  </Pressable>
                </View>
                {open ? (
                  <View className="mt-2 w-full gap-2">
                    {unit.blocks.map((b, i) => (
                      <SyllabusRow key={b.id} block={b} state={unitState(unit, i)} onOpen={() => openBlock(b)} />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          }) : null}

          {/* Special node: newest custom revision */}
          {newestReady && (
            <View className="mb-8 w-full max-w-sm items-center">
              <Text className="mb-3 text-sm font-bold uppercase tracking-widest text-purple-500">
                🧠 My Custom Revision
              </Text>
              <PathNode
                state={completed.has(newestReady.id) ? 'completed' : 'active'}
                icon="🧠"
                label="My Custom Revision"
                sub={newestReady.title}
                color="bg-purple-500"
                offset={nextOffset()}
                onPress={() =>
                  router.push({
                    pathname: '/quiz/[lessonId]',
                    params: { lessonId: newestReady.id, title: newestReady.title },
                  })
                }
              />
            </View>
          )}

          {/* Older custom nodes */}
          {olderLessons.length > 0 && (
            <View className="mb-8 w-full max-w-sm items-center gap-5">
              {olderLessons.map((l) => (
                <PathNode
                  key={l.id}
                  state={completed.has(l.id) ? 'completed' : 'active'}
                  icon={completed.has(l.id) ? '🏆' : '📄'}
                  label={l.title}
                  color="bg-purple-500"
                  offset={nextOffset()}
                  onPress={() =>
                    router.push({ pathname: '/quiz/[lessonId]', params: { lessonId: l.id, title: l.title } })
                  }
                />
              ))}
            </View>
          )}

          {/* Still-generating uploads */}
          {pendingUploads.length > 0 && (
            <View className="mb-8 w-full max-w-sm items-center gap-5">
              {pendingUploads.map((u) => (
                <PathNode
                  key={u.id}
                  state="processing"
                  icon="⏳"
                  label={u.file_name}
                  sub="AI is generating…"
                  color="bg-slate-200"
                  offset={nextOffset()}
                />
              ))}
            </View>
          )}
          {failedLessons.length > 0 && (
            <Pressable
              onPress={() => {
                setSandboxOpen(true);
                setSandboxMsg(null);
              }}
              accessibilityRole="button"
              accessibilityLabel="Re-upload failed lessons"
              className="mb-8 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3"
            >
              <Text className="text-center text-sm font-bold text-red-600">
                {failedLessons.length} upload{failedLessons.length > 1 ? 's' : ''} failed to generate — tap to try again.
              </Text>
            </Pressable>
          )}

          {!listening ? (
            <Pressable onPress={openAudiobookMode} className="mt-2 items-center rounded-2xl bg-purple-600 px-6 py-3">
              <Text className="text-lg font-extrabold text-white">🎧 Listen to Audiobook Mode</Text>
            </Pressable>
          ) : (
            audiobook && (
              <AudiobookPlayer
                title={audiobook.title}
                segments={audiobook.segments}
                fullUrl={audiobook.full_audio_url}
                freeMode={freeListen}
                onClose={() => setListening(false)}
              />
            )
          )}
          {audioMsg && !listening ? <Text className="mt-2 text-sm text-slate-500">{audioMsg}</Text> : null}

          {/* Tier badge */}
          <View className={`mt-4 rounded-full px-4 py-1.5 ${isPremium ? 'bg-amber-100' : 'bg-slate-100'}`}>
            <Text className={`text-sm font-bold ${isPremium ? 'text-amber-700' : 'text-slate-500'}`}>
              {isPremium
                ? `👑 Premium • ${(PREMIUM_MONTHLY_WORD_CAP - used).toLocaleString()} AI words left`
                : `Free tier • text ≤${FREE_WORD_LIMIT} words • device voice`}
            </Text>
          </View>
          {!isPremium && (
            <Link href="/paywall" asChild>
              <Pressable className="mt-2 items-center rounded-2xl bg-amber-500 px-6 py-3">
                <Text className="font-extrabold text-white">👑 Go Premium ({PREMIUM_PRICE_LABEL}) — PDF, audio, elite voices</Text>
              </Pressable>
            </Link>
          )}

          <View className="mt-4 flex-row items-center gap-4">
            <Link href="/refill" asChild>
              <Pressable>
                <Text className="text-sm text-slate-400">Hearts refill options →</Text>
              </Pressable>
            </Link>
            <Link href="/uploads" asChild>
              <Pressable>
                <Text className="text-sm text-slate-400">My uploads →</Text>
              </Pressable>
            </Link>
            <Link href="/roleplay" asChild>
              <Pressable>
                <Text className="text-sm text-slate-400">🎭 AI Roleplay →</Text>
              </Pressable>
            </Link>
            <Link href="/settings" asChild>
              <Pressable>
                <Text className="text-sm text-slate-400">⚙️ Settings</Text>
              </Pressable>
            </Link>
          </View>
          {/* spacer for mobile bottom nav */}
          <View className="h-16 md:hidden" />
        </ScrollView>

        {/* Desktop right panel (web, lg+) */}
        {Platform.OS === 'web' ? <View className="hidden pt-6 lg:flex">{rightPanel}</View> : null}
      </View>

      {/* Mobile bottom nav — Duo style (native + narrow web) */}
      <View className="border-t-2 border-slate-100 bg-white px-6 py-2 md:hidden">
        <View className="flex-row items-center justify-around">
          {[
            { label: 'LEARN', icon: '🏠', href: '/', active: true },
            { label: 'LEAGUES', icon: '🏆', href: '/leaderboard', active: false },
            { label: 'QUESTS', icon: '🎯', href: '/settings', active: false },
            { label: 'SHOP', icon: '🛍️', href: '/paywall', active: false },
          ].map((n) => (
            <Link key={n.label} href={n.href as never} asChild>
              <Pressable className={`items-center rounded-2xl px-3 py-1.5 ${n.active ? 'border-2 border-sky-200 bg-sky-50' : ''}`}>
                <Text className="text-xl">{n.icon}</Text>
                <Text className={`text-[10px] font-extrabold ${n.active ? 'text-sky-600' : 'text-slate-400'}`}>{n.label}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </View>

      {/* AI Sandbox FAB */}
      <Pressable
        onPress={() => {
          setSandboxOpen(true);
          setSandboxMsg(null);
        }}
        accessibilityRole="button"
        accessibilityLabel="Open AI Sandbox"
        className="absolute bottom-24 self-center rounded-full bg-slate-900 px-8 py-4 shadow-lg active:scale-95 md:bottom-8"
      >
        <Text className="text-lg font-extrabold text-white">🧠 AI Sandbox</Text>
      </Pressable>

      {/* AI Sandbox panel */}
      <Modal visible={sandboxOpen} animationType="slide" transparent onRequestClose={() => setSandboxOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-white p-6 pb-10">
            <Text className="text-2xl font-extrabold text-slate-900">🧠 AI Sandbox</Text>
            <Text className="mt-1 text-base text-slate-600">
              {isPremium
                ? 'Drop a book, PDF, or audio file — the AI builds a custom revision node on your map.'
                : `Free tier: paste-style text files up to ${FREE_WORD_LIMIT} words with the device voice. Premium (${PREMIUM_PRICE_LABEL}) unlocks PDF/audio, smart compilation, and elite voices.`}
            </Text>

            <Pressable onPress={pickFile} className="mt-4 items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5">
              <Text className="text-4xl">📥</Text>
              <Text className="mt-1 font-bold text-slate-700">Tap to pick a file</Text>
              <Text className="text-sm text-slate-400">{isPremium ? 'PDF · TXT · Markdown · Audio' : 'TXT · Markdown only (Free)'}</Text>
            </Pressable>

            {picked && (
              <View className="mt-3 rounded-2xl bg-green-50 p-3">
                <Text className="font-bold text-slate-800">📄 {picked.name}</Text>
                <Text className="text-sm text-slate-500">{picked.mime}</Text>
              </View>
            )}

            <Pressable
              onPress={uploadPicked}
              disabled={uploading}
              className={`mt-4 items-center rounded-2xl py-4 ${uploading ? 'bg-slate-300' : 'bg-purple-600'}`}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-lg font-extrabold text-white">Generate my node ✨</Text>
              )}
            </Pressable>
            {sandboxMsg ? <Text className="mt-2 text-center text-sm text-slate-600">{sandboxMsg}</Text> : null}

            {uploads.length > 0 && (
              <View className="mt-4">
                <Text className="font-bold text-slate-700">Recent uploads</Text>
                {uploads.slice(0, 5).map((u) => (
                  <View key={u.id} className="mt-1 flex-row items-center justify-between">
                    <Text className="flex-1 text-sm text-slate-600" numberOfLines={1}>
                      {u.file_name}
                    </Text>
                    <Text
                      className={`text-xs font-bold ${
                        u.status === 'ready' ? 'text-green-600' : u.status === 'failed' ? 'text-red-500' : 'text-amber-500'
                      }`}
                    >
                      {u.status === 'ready' ? '● ready' : u.status === 'failed' ? '● failed' : '● generating…'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <Pressable onPress={() => setSandboxOpen(false)} className="mt-4 items-center">
              <Text className="font-bold text-slate-400">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}
