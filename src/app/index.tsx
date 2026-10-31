import { useCallback, useState } from 'react';
import { View, Pressable, ScrollView, Modal, ActivityIndicator, Platform, Alert, useWindowDimensions } from 'react-native';
import Text from '../../components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../lib/supabase';
import { getProfile, getCompletedLessonIds, getTodayCompletionCount, completeLesson, MAX_HEARTS, type Profile } from '../../lib/progress';
import { uploadRawFile, waitForUploadReady } from '../../lib/uploads';
import {
  CONTENT_RIGHTS_ITEMS,
  CONTENT_RIGHTS_REQUIRED_MESSAGE,
  buildContentRightsAttestation,
  isMediaUpload,
  type ContentRightsChecks,
  type ContentRightsItemId,
} from '../../lib/contentRights';
import { FREE_WORD_LIMIT, PREMIUM_MONTHLY_WORD_CAP, PREMIUM_PRICE_LABEL } from '../../lib/tiers';
import { loadLatestAudiobook, type Audiobook } from '../../lib/audiobook';
import { CURRICULUM, COURSES_META, KIND_META, type CurriculumBlock, type CurriculumUnit } from '../../lib/curriculum';
import { LABEX_COUNT } from '../../lib/labex';
import { GOALS, firstBlockForGoal, goalLabel, hasOnboarded, markOnboarded, nextUpBlock, getGoal, setGoal, type GoalId } from '../../lib/onboarding';
import { getDailyMinutes, setDailyMinutes, DAILY_MINUTES_OPTIONS, outcomeForMinutes, getSelectedCourse, setSelectedCourse, getWeeklyDays, getAmbientOn, setAmbientOn } from '../../lib/preferences';
import { levelForXp } from '../../lib/levels';
import { canClaimChest, shouldCelebrateChest, type ChestClaim } from '../../lib/chestGate';
import { chestRewardLabel, rollChestReward, type ChestReward } from '../../lib/chestRewards';
import { getDueCount } from '../../lib/srs';
import { useAmbient } from '../../lib/ambient';
import { useNatural } from '../../lib/natural';
import PathOrb from '../../components/natural/PathOrb';
import QuestMeter from '../../components/natural/QuestMeter';
import ProgressBar from '../../components/natural/ProgressBar';
import SoundToggle from '../../components/natural/SoundToggle';
import { FadeUp } from '../../components/natural/Motion';
import StreakTrail from '../../components/jungle/StreakTrail';

import AudiobookPlayer from '../../components/AudiobookPlayer';
import Celebration, { FULL_CELEBRATION_MS } from '../../components/Celebration';
import ChestOpening from '../../components/ChestOpening';
import Mascot from '../../components/AfricanMascots';
import { playCelebration } from '../../lib/sfx';
import AppIcon, { ContentMark, type AppIconName } from '../../components/AppIcon';
import LearnerAvatar from '../../components/LearnerAvatar';

type NodeState = 'completed' | 'active' | 'locked' | 'processing' | 'failed';

/** Clamped offsets — the old ±56px clipped labels on wide tablets. */
const WIND = [0, -12, 12, -8, 8, 0];

function PathNode({
  state,
  icon,
  label,
  sub,
  onPress,
  offset,
  testID,
}: {
  state: NodeState;
  icon: AppIconName;
  label: string;
  sub?: string;
  onPress?: () => void;
  offset: number;
  testID?: string;
}) {
  // Natural OLED orb — moss done / honey active / dashed stone locked.
  return <PathOrb state={state} icon={icon} label={label} sub={sub} onPress={onPress} offset={offset} testID={testID} />;
}

/** Snake-UI guidance card: the single next block, so users never choose from a menu. */
function UpNextCard({ block, goal, onStart }: { block: CurriculumBlock; goal: GoalId | null; onStart: () => void }) {
  const p = useNatural();
  return (
    <Pressable
      onPress={onStart}
      accessibilityRole="button"
      accessibilityLabel={`Up next: ${block.title}`}
      style={({ pressed }) => ({
        width: '100%',
        maxWidth: 384,
        marginBottom: 14,
        borderRadius: 24,
        padding: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: p.isDark ? '#2C3728' : '#DCE3D2',
        backgroundColor: p.isDark ? '#151B12' : '#F2F5EA',
        opacity: pressed ? 0.96 : 1,
      })}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: -46,
          top: -58,
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: p.moss,
          opacity: p.isDark ? 0.16 : 0.12,
        }}
      />
      <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', color: p.moss }}>
        Up next{goal ? ` · ${goalLabel(goal)}` : ''}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 7 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: p.moss,
          }}
        >
          <AppIcon name={block.kind === 'project' ? 'folder' : KIND_ICON[block.kind] ?? 'star'} size={19} color="#10150D" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 18, fontWeight: '800', color: p.ink }}
          >
            {block.title}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: p.muted, marginTop: 1 }}>
            {KIND_META[block.kind].label} · {block.minutes} min · +{block.xp} XP
          </Text>
        </View>
        <AppIcon name="chevRight" size={20} color={p.moss} />
      </View>
      <View
        style={{
          marginTop: 13,
          borderRadius: 14,
          backgroundColor: p.honey,
          paddingVertical: 11,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
        }}
      >
        <AppIcon name="play" size={14} color="#241806" />
        <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#241806' }}>
          Start · {block.minutes} min
        </Text>
      </View>
    </Pressable>
  );
}

/** Natural unit banner: clay rule, animated progress, guidebook chip. */
function UnitHeader({ unit, doneCount, totalCount }: { unit: CurriculumUnit; doneCount: number; totalCount: number }) {
  const p = useNatural();
  const pct = totalCount ? doneCount / totalCount : 0;
  return (
    <View
      style={{
        width: '100%',
        maxWidth: 384,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: p.line,
        backgroundColor: p.surface,
        overflow: 'hidden',
      }}
    >
      <View style={{ height: 3, backgroundColor: p.clay, opacity: 0.85 }} />
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', color: p.clay }}>
              {unit.section}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 }}>
              <ContentMark emoji={unit.icon} size={19} color={p.ink} badgeBg={p.surfaceAlt} />
              <Text
                numberOfLines={1}
                style={{ flex: 1, fontSize: 16.5, fontWeight: '800', color: p.ink }}
              >
                {unit.title}
              </Text>
            </View>
            <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '600', color: p.muted, marginTop: 2 }}>
              {unit.goal}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push({ pathname: '/curriculum/[unitId]', params: { unitId: unit.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${unit.title} guidebook`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 9,
              paddingVertical: 7,
              borderRadius: 11,
              borderWidth: 1,
              borderColor: p.line,
              backgroundColor: p.surfaceAlt,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <AppIcon name="book" size={13} color={p.ink} />
            <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 0.6, color: p.ink }}>GUIDE</Text>
          </Pressable>
        </View>
        <View style={{ marginTop: 12 }}>
          <ProgressBar value={pct} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: p.muted }}>
            {doneCount}/{totalCount} complete
          </Text>
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: p.muted }}>Chest: XP · gems · freeze</Text>
        </View>
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
  const p = useNatural();
  const meta = KIND_META[block.kind];
  const statusName: AppIconName =
    state === 'completed' ? 'checkCircle' : state === 'locked' ? 'lock' : state === 'processing' ? 'refresh' : 'starOutline';
  const statusColor = state === 'completed' ? p.moss : state === 'locked' ? p.stone : state === 'processing' ? p.honey : p.teal;
  const dim = state === 'locked' || state === 'processing';
  return (
    <Pressable
      onPress={onOpen}
      disabled={dim}
      accessibilityRole="button"
      accessibilityLabel={`${block.title}, ${block.kind}, ${state}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: p.line,
        backgroundColor: p.surface,
        padding: 11,
        opacity: dim ? 0.6 : pressed ? 0.94 : 1,
      })}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: p.surfaceAlt,
        }}
      >
        <AppIcon name={KIND_ICON[block.kind] ?? 'star'} size={17} color={p.ink} />
      </View>
      <View style={{ marginLeft: 10, flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 0.6, color: p.clay, textTransform: 'uppercase' }}>
            {meta.label}
          </Text>
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: p.stone, marginLeft: 7 }}>
            {block.minutes} min · +{block.xp} XP
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={{
            marginTop: 1,
            fontSize: 14,
            fontWeight: '700',
            color: state === 'locked' ? p.muted : p.ink,
          }}
        >
          {block.title}
        </Text>
      </View>
      <AppIcon name={statusName} size={18} color={statusColor} />
    </Pressable>
  );
}

/** Compact explore card — replaces the old full-width promo stack. */
function ExploreTile({
  icon,
  title,
  sub,
  tone,
  badge,
  onPress,
}: {
  icon: AppIconName;
  title: string;
  sub: string;
  tone: string;
  badge?: string;
  onPress: () => void;
}) {
  const p = useNatural();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${sub}`}
      style={({ pressed }) => ({
        flexGrow: 1,
        flexBasis: '47%',
        minWidth: 150,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: p.line,
        backgroundColor: p.surface,
        padding: 12,
        opacity: pressed ? 0.94 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tone,
          }}
        >
          <AppIcon name={icon} size={17} color={p.isDark ? '#0D120B' : '#FFFDF8'} />
        </View>
        {badge ? (
          <Text style={{ fontSize: 8.5, fontWeight: '800', letterSpacing: 0.5, color: p.honey, textTransform: 'uppercase' }}>
            {badge}
          </Text>
        ) : (
          <AppIcon name="chevRight" size={15} color={p.stone} />
        )}
      </View>
      <Text style={{ marginTop: 9, fontSize: 13.5, fontWeight: '800', color: p.ink }} numberOfLines={1}>
        {title}
      </Text>
      <Text style={{ marginTop: 1, fontSize: 10.5, fontWeight: '600', color: p.muted }} numberOfLines={2}>
        {sub}
      </Text>
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

const KIND_ICON: Record<string, AppIconName> = {
  lesson: 'star',
  workshop: 'code',
  lab: 'flask',
  review: 'pencil',
  quiz: 'trophy',
  project: 'folder',
};

export default function PathMap() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [userLessons, setUserLessons] = useState<UserLesson[]>([]);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [picked, setPicked] = useState<{ uri: string; name: string; mime: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [rightsChecks, setRightsChecks] = useState<ContentRightsChecks>({});
  const [sandboxMsg, setSandboxMsg] = useState<string | null>(null);
  const [audiobook, setAudiobook] = useState<Audiobook | null>(null);
  const [listening, setListening] = useState(false);
  const [audioMsg, setAudioMsg] = useState<string | null>(null);
  const [freeListen, setFreeListen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Unit chest win: drives the same five-second burst as results.
  // `chestClaim` is set only after an eligible claim is awarded, so the
  // opening and the storm can never celebrate an incomplete or failed claim.
  const [chestClaim, setChestClaim] = useState<ChestClaim | null>(null);
  const [chestReward, setChestReward] = useState<ChestReward | null>(null);
  const [chestWin, setChestWin] = useState<string | null>(null);
  // Chest ceremony runs in two phases so the applause starts exactly on the
  // frame the ribbons do, not a second earlier when the chest is claimed.
  const [chestPhase, setChestPhase] = useState<'opening' | 'storm'>('opening');
  // Inverted onboarding: guests play before they ever see a signup form.
  const [onboarded, setOnboardedState] = useState(true); // true until proven first-run (avoids card flash)
  const [goal, setGoalState] = useState<GoalId | null>(null);
  // Duolingo onboarding: daily commitment (minutes/day) + projected outcome.
  const [minutes, setMinutesState] = useState(10);
  // Codecademy-style weekly target: gentler than a strict daily streak.
  const [weeklyDays, setWeeklyDays] = useState(5);
  // SRS: how many memory cards are due (drives the Daily Review nudge).
  const [dueCount, setDueCount] = useState(0);
  // Daily Quest: lessons finished today (drives the quest progress bar).
  const [todayCount, setTodayCount] = useState(0);
  // Course picker (Duolingo style): null = all-courses grid, else one course path.
  const [courseId, setCourseIdState] = useState<string | null>(null);
  // Natural OLED palette + soothing ambience (paused off-screen and during narration).
  const p = useNatural();
  const { width: screenWidth } = useWindowDimensions();
  // Narrow phones drop the wordmark and XP chip rather than crushing them.
  const compactHud = screenWidth < 360;
  // "Bolingo Learn" plus the three chips and the avatar need ~410dp of HUD.
  const showWordmark = screenWidth >= 420;
  const [ambientOn, setAmbientOnState] = useState(false);
  const [screenFocused, setScreenFocused] = useState(true);
  const { error: ambientError, play: playAmbient } = useAmbient(ambientOn && screenFocused && !listening);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    setNow(Date.now());
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
      setWeeklyDays(await getWeeklyDays().catch(() => 5));
      setAmbientOnState(await getAmbientOn().catch(() => true));
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
      setScreenFocused(true);
      refresh();
      return () => setScreenFocused(false);
    }, [refresh])
  );

  const statusByUpload = new Map(uploads.map((u) => [u.id, u.status]));
  const lessonStatus = (l: UserLesson): 'ready' | 'processing' | 'failed' =>
    (l.upload_source_id ? statusByUpload.get(l.upload_source_id) : undefined) ?? 'ready';

  const isPremium = profile?.is_premium === true;
  const pickedIsMedia = picked ? isMediaUpload(picked.name, picked.mime) : false;
  const rightsComplete =
    !pickedIsMedia || CONTENT_RIGHTS_ITEMS.every((item) => rightsChecks[item.id] === true);

  const toggleRightsItem = (id: ContentRightsItemId) => {
    setRightsChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        // Free tier: raw text only. Premium unlocks PDF, text, CSV, photo Scan
        // and consented audio/video transcription.
        type: isPremium
          ? ['application/pdf', 'text/*', 'image/*', 'audio/*', 'video/*']
          : ['text/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const a = res.assets[0];
      const next = { uri: a.uri, name: a.name ?? 'upload', mime: a.mimeType ?? 'application/octet-stream' };
      setPicked(next);
      setRightsChecks({});
      setSandboxMsg(null);
    } catch (e) {
      setSandboxMsg(String(e instanceof Error ? e.message : e));
    }
  };

  // Premium Scan: snap notes with the camera (or pick a gallery photo) and
  // Bingo OCRs + curates a revision node through the normal pipeline — the
  // picked photo flows into uploadPicked() unchanged.
  const scanNotes = async (source: 'camera' | 'library') => {
    if (!isPremium) {
      setSandboxMsg(`Scan is a Premium perk (${PREMIUM_PRICE_LABEL}) — snap your notes and Bingo builds the revision node.`);
      return;
    }
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setSandboxMsg('Photo permission denied — allow access in system settings, then try again.');
        return;
      }
      const launcher = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const res = await launcher({ mediaTypes: ['images'], quality: 0.7, exif: false });
      if (res.canceled) return;
      const a = res.assets[0];
      const stamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
      setPicked({ uri: a.uri, name: `Scanned-notes-${stamp}.jpg`, mime: 'image/jpeg' });
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
      setSandboxMsg('Pick a file first — PDF, text, photo, audio or video.');
      return;
    }
    const media = isMediaUpload(picked.name, picked.mime);
    const attestation = media ? buildContentRightsAttestation(rightsChecks) : null;
    if (media && !attestation) {
      setSandboxMsg(CONTENT_RIGHTS_REQUIRED_MESSAGE);
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
      const upload = await uploadRawFile(bytes, picked.name, picked.mime, {
        rightsAttestation: attestation,
      });
      setPicked(null);
      setRightsChecks({});
      setSandboxMsg('Uploaded! The AI is generating your custom path node…');
      refresh();
      // Wait for the pipeline, then surface the finished node.
      waitForUploadReady(upload.id)
        .then((finished) => {
          setSandboxMsg(
            finished.status === 'failed'
              ? finished.error ?? 'Generation hit an error — check the node status below.'
              : 'Your custom revision node is ready!'
          );
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
        const prompts = ((qs as { id: string; prompt: string }[] | null) ?? []).map((r) => ({
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
  const chestRewardText = chestReward ? chestRewardLabel(chestReward) : '';
  const chestRewardIcon: AppIconName =
    chestReward?.kind === 'gems' ? 'gem' : chestReward?.kind === 'streak_freeze' ? 'shield' : 'star';

  const [newestReady, ...olderLessons] = userLessons.filter((l) => lessonStatus(l) === 'ready');
  const pendingUploads = uploads.filter((u) => u.status === 'processing');
  const failedLessons = userLessons.filter((l) => lessonStatus(l) === 'failed');

  const lowHearts = hearts <= 1;

  // Loss-aversion trigger: the streak is alive but hasn't been fed today.
  // Yesterday => at risk; older => went cold (next lesson restarts it).
  const todayKey = new Date(now).toISOString().slice(0, 10);
  const yesterdayKey = new Date(now - 86400000).toISOString().slice(0, 10);
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
  const toggleAmbient = async () => {
    const next = !ambientOn || !!ambientError;
    if (next && !listening) playAmbient();
    setAmbientOnState(next);
    await setAmbientOn(next);
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
    const claim = {
      unitComplete: unit.blocks.every(isBlockDone),
      alreadyClaimed: completed.has(id),
    };
    if (!canClaimChest(claim)) return;
    const reward = rollChestReward();
    try {
      await completeLesson(profile.id, reward.kind === 'xp' ? reward.amount : 0, id, {
        gems: reward.kind === 'gems' ? reward.amount : 0,
        streakFreezes: reward.kind === 'streak_freeze' ? reward.amount : 0,
      });
      // A unit chest is a milestone, not a tap: the chest cracks open first,
      // then hands off to the full five-second applause + ribbon storm. Only
      // an awarded, eligible claim may set the ceremony state, and the rolled
      // reward travels with that state so the reveal never falls back to XP.
      setChestClaim({ ...claim, awarded: true });
      setChestReward(reward);
      setChestPhase('opening');
      setChestWin(unit.title);
      await refresh();
    } catch {
      Alert.alert('Claim failed', 'Check your connection and try again.');
    }
  };

  // Play-first entry: goal defaults to exploring; the funnel starts the
  // moment they tap through — the account prompt waits until results.
  const startFirstLesson = async () => {
    const picked = goal ?? 'explore';
    if (!goal) {
      setGoalState('explore');
      await setGoal('explore');
    }
    await markOnboarded();
    setOnboardedState(true);
    const first = firstBlockForGoal(picked, completed);
    if (first) openBlock(first);
  };

  const hudChip = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.line,
  };

  const sideNav = (
    <View style={{ width: 220, gap: 3, paddingRight: 14 }}>
      {[
        { label: 'Learn', icon: 'home', href: '/', active: true },
        { label: 'Leaderboard', icon: 'trophy', href: '/leaderboard', active: false },
        { label: 'Quests', icon: 'target', href: '/settings', active: false },
        { label: 'Shop', icon: 'crown', href: '/paywall', active: false },
        { label: 'Profile', icon: 'user', href: '/auth', active: false },
      ].map((n) => (
        <Link key={n.label} href={n.href as never} asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={n.label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 14,
              backgroundColor: n.active ? (p.isDark ? '#141C10' : '#ECF1E1') : 'transparent',
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <AppIcon name={n.icon as AppIconName} size={19} color={n.active ? p.moss : p.stone} />
            <Text
              style={{
                marginLeft: 10,
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 0.9,
                color: n.active ? p.moss : p.stone,
              }}
            >
              {n.label.toUpperCase()}
            </Text>
          </Pressable>
        </Link>
      ))}
      <View
        style={{
          marginTop: 14,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: p.line,
          backgroundColor: p.surface,
          padding: 14,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ flex: 1, fontSize: 11.5, fontWeight: '800', color: p.ink }}>
            Daily Quest · {minutes} min/day
          </Text>
          {todayCount >= 1 ? <AppIcon name="checkCircle" size={15} color={p.moss} /> : null}
        </View>
        <View style={{ marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: p.muted }}>
            Weekly target: {weeklyDays} days · streak {streak}
          </Text>
          <AppIcon name="flame" size={11} color={p.honey} />
        </View>
        <Text style={{ marginTop: 4, fontSize: 10.5, lineHeight: 15, fontWeight: '600', color: p.muted }}>
          {profile
            ? todayCount >= 1
              ? 'Quest complete! Streak protected.'
              : 'Complete 1 lesson to keep your streak alive.'
            : 'Sign in to track your daily quest.'}
        </Text>
        {profile ? (
          <View style={{ marginTop: 9 }}>
            <ProgressBar value={todayCount >= 1 ? 1 : 0} height={5} />
          </View>
        ) : null}
      </View>
    </View>
  );

  const rightPanel = (
    <View style={{ width: 268, gap: 12, paddingLeft: 14 }}>
      <View style={{ borderRadius: 20, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, padding: 14 }}>
        <Text style={{ fontSize: 9.5, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', color: p.stone }}>
          Stats
        </Text>
        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppIcon name="flame" size={16} color={p.honey} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: p.ink }}>Streak {streak}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppIcon name="gem" size={16} color={p.moss} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: p.ink }}>{xp.toLocaleString()} XP</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppIcon name="heart" size={16} color={p.berry} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: p.ink }}>
            {hearts}/{MAX_HEARTS}
          </Text>
        </View>
      </View>
      <View style={{ borderRadius: 20, borderWidth: 1, borderColor: p.line, backgroundColor: p.surfaceAlt, padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppIcon name="brain" size={17} color={p.moss} />
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: p.ink }}>AI Sandbox</Text>
        </View>
        <Text style={{ marginTop: 3, fontSize: 11, lineHeight: 16, fontWeight: '600', color: p.muted }}>
          Turn your own material into path nodes.
        </Text>
        <Pressable
          onPress={() => {
            setSandboxOpen(true);
            setSandboxMsg(null);
          }}
          accessibilityRole="button"
          accessibilityLabel="Open sandbox"
          style={({ pressed }) => ({
            marginTop: 10,
            alignItems: 'center',
            borderRadius: 12,
            backgroundColor: p.surface,
            borderWidth: 1,
            borderColor: p.line,
            paddingVertical: 9,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: p.moss }}>Open Sandbox</Text>
        </Pressable>
      </View>
      {!isPremium ? (
        <Link href="/paywall" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go premium"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              borderRadius: 14,
              backgroundColor: p.honey,
              paddingHorizontal: 12,
              paddingVertical: 11,
            }}
          >
            <AppIcon name="crown" size={16} color="#241806" />
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#241806' }}>
              Go Premium ({PREMIUM_PRICE_LABEL})
            </Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      {/* Natural HUD: brand · streak · XP · hearts · ambience · avatar */}
      <View
        style={{
          backgroundColor: p.isDark ? 'rgba(1,8,4,0.72)' : 'rgba(243,247,238,0.86)',
          borderBottomWidth: 1,
          borderBottomColor: p.line,
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 9,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 1024,
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 }}>
            <AppIcon name="leaf" size={17} color={p.moss} />
            {showWordmark ? (
              <Text
                numberOfLines={1}
                style={{ fontSize: 16, fontWeight: '800', letterSpacing: -0.3, color: p.ink }}
              >
                Bolingo Learn
              </Text>
            ) : null}
            <View
              style={{
                borderRadius: 99,
                borderWidth: 1,
                borderColor: p.line,
                backgroundColor: p.surface,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 9.5, fontWeight: '800', color: p.moss }}>LV {levelForXp(xp)}</Text>
            </View>
          </View>
          <View style={{ flex: 1 }} />
          <View accessibilityLabel={`Streak ${streak} days`} style={hudChip}>
            <AppIcon name="flame" size={13} color={p.honey} />
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: p.ink }}>
              {streak}
            </Text>
          </View>
          {!compactHud ? (
            <View accessibilityLabel={`${xp} experience points`} style={hudChip}>
              <AppIcon name="gem" size={13} color={p.moss} />
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: p.ink }}>
                {xp.toLocaleString()}
              </Text>
            </View>
          ) : null}
          <View accessibilityLabel={`${hearts} hearts remaining`} style={hudChip}>
            <AppIcon name="heart" size={13} color={p.berry} />
            <Text
              style={{
                fontSize: 12.5,
                fontWeight: '800',
                color: lowHearts ? p.berry : p.ink,
              }}
            >
              {hearts}
              {lowHearts ? '!' : ''}
            </Text>
          </View>
          <SoundToggle on={ambientOn && !ambientError} onToggle={() => void toggleAmbient()} />
          <Pressable
            onPress={() => router.push('/auth')}
            accessibilityRole="button"
            accessibilityLabel={profile ? 'Account' : 'Sign in'}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              backgroundColor: p.surfaceAlt,
              borderWidth: 1,
              borderColor: profile ? p.moss : p.line,
            }}
          >
            {profile ? (
              <LearnerAvatar uri={profile.avatar_url} size={28} premium={profile.is_premium} />
            ) : (
              <Text style={{ fontSize: 10, fontWeight: '800', color: p.ink }}>IN</Text>
            )}
          </Pressable>
        </View>
      </View>

      <View className="mx-auto flex-1 w-full max-w-5xl md:flex-row md:justify-center">
        {/* Desktop left rail (web, md+) */}
        {Platform.OS === 'web' ? <View className="hidden pt-6 md:flex">{sideNav}</View> : null}

        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerClassName="mx-auto w-full max-w-xl items-center self-center px-4 pb-40 pt-4"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: '100%', maxWidth: 384, marginBottom: 12 }}>
            <FadeUp delay={30}>
              <StreakTrail
                streak={streak}
                doneToday={todayCount >= 1}
                minutes={minutes}
                onPress={() => {
                  const b = nextUpBlock(completed);
                  if (b) openBlock(b);
                }}
              />
            </FadeUp>
          </View>
          <View style={{ width: '100%', maxWidth: 384, marginBottom: 12 }}>
            <FadeUp delay={40}>
              <QuestMeter
                done={todayCount >= 1}
                streak={streak}
                minutes={minutes}
                onPress={() => {
                  const b = nextUpBlock(completed);
                  if (b) openBlock(b);
                }}
              />
            </FadeUp>
          </View>
          {/* Hook trigger: Bingo guilt-trips when the streak needs feeding. */}
          {streakAtRisk ? (
            <FadeUp delay={60} style={{ width: '100%', alignItems: 'center', marginBottom: 12 }}>
              <View
                style={{
                  width: '100%',
                  maxWidth: 384,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: p.isDark ? '#35251C' : '#EBD3C1',
                  backgroundColor: p.isDark ? '#150F0C' : '#FBF1E8',
                  padding: 14,
                }}
              >
                <Mascot character="bingo" mood="sad" size={68} />
                <View style={{ marginLeft: 12, flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 16.5, fontWeight: '800', color: p.clay }}>
                    {lastKey === yesterdayKey ? 'Bingo missed you!' : 'Bingo is worried…'}
                  </Text>
                  <Text style={{ marginTop: 3, fontSize: 12, lineHeight: 17, fontWeight: '600', color: p.muted }}>
                    {lastKey === yesterdayKey
                      ? `One quick lesson today keeps your ${profile?.streak_count ?? 0}-day streak alive. Don't let it hit zero!`
                      : `Your fire was at ${profile?.streak_count ?? 0}. Bingo forgives you — one lesson restarts it.`}
                  </Text>
                  <Pressable
                    onPress={() => {
                      const b = nextUpBlock(completed);
                      if (b) openBlock(b);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={lastKey === yesterdayKey ? 'Keep my streak' : 'Restart my streak'}
                    style={({ pressed }) => ({
                      marginTop: 10,
                      alignSelf: 'flex-start',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      borderRadius: 13,
                      backgroundColor: p.honey,
                      paddingHorizontal: 13,
                      paddingVertical: 8,
                      transform: [{ translateY: pressed ? 1.5 : 0 }],
                    })}
                  >
                    <AppIcon name="flame" size={14} color="#241806" />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#241806' }}>
                      {lastKey === yesterdayKey ? 'Keep my streak' : 'Restart my streak'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </FadeUp>
          ) : null}
          {/* SRS injection: due memory cards surface as a 2-minute review. */}
          {profile && dueCount > 0 ? (
            <FadeUp delay={70} style={{ width: '100%', alignItems: 'center', marginBottom: 12 }}>
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/quiz/[lessonId]', params: { lessonId: 'srs-review', title: 'Daily Review' } })
                }
                accessibilityRole="button"
                accessibilityLabel={`Daily review, ${dueCount} cards due`}
                style={({ pressed }) => ({
                  width: '100%',
                  maxWidth: 384,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: p.line,
                  backgroundColor: p.surface,
                  padding: 14,
                  opacity: pressed ? 0.95 : 1,
                })}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: p.teal,
                  }}
                >
                  <AppIcon name="refresh" size={21} color={p.isDark ? '#08110E' : '#F6FBF9'} />
                </View>
                <View style={{ marginLeft: 12, flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 9.5, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase', color: p.teal }}>
                    Daily Review · ~2 min
                  </Text>
                  <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 15, fontWeight: '800', color: p.ink }}>
                    {dueCount} card{dueCount === 1 ? '' : 's'} slipping — lock {dueCount === 1 ? 'it' : 'them'} in
                  </Text>
                  <Text style={{ marginTop: 1, fontSize: 11, fontWeight: '600', color: p.muted }}>
                    Spaced repetition · +10 XP per recall
                  </Text>
                </View>
                <AppIcon name="chevRight" size={20} color={p.teal} />
              </Pressable>
            </FadeUp>
          ) : null}
          {/* Inverted onboarding: play first, profile second. First-run guests
              pick a goal and drop straight into a 2-minute lesson — signup
              comes only after they've won XP (see results upsell). */}
          {!profile && !onboarded ? (
            <FadeUp delay={90} style={{ width: '100%', alignItems: 'center', marginBottom: 14 }}>
              <View
                style={{
                  width: '100%',
                  maxWidth: 384,
                  borderRadius: 26,
                  borderWidth: 1,
                  borderColor: p.isDark ? p.line : p.mossDeep,
                  backgroundColor: p.isDark ? p.surface : p.mossDeep,
                  padding: 18,
                  overflow: 'hidden',
                }}
              >
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    right: -40,
                    top: -50,
                    width: 150,
                    height: 150,
                    borderRadius: 75,
                    backgroundColor: p.mossSoft,
                    opacity: 0.12,
                  }}
                />
                <View style={{ alignItems: 'center' }}>
                  <Mascot character="livia" mood="happy" size={78} />
                </View>
                <Text
                  style={{
                    marginTop: 6,
                    textAlign: 'center',
                    fontSize: 9.5,
                    fontWeight: '800',
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: p.honeySoft,
                  }}
                >
                  Meet Livia, your mentor
                </Text>
                <Text
                  style={{
                    marginTop: 3,
                    textAlign: 'center',
                    fontSize: 21,
                    fontWeight: '800',
                    color: '#F3F0E7',
                  }}
                >
                  Learn by doing
                </Text>
                <Text style={{ marginTop: 4, textAlign: 'center', fontSize: 12.5, lineHeight: 18, fontWeight: '600', color: '#BFC5B4' }}>
                  Try a 2-minute lesson now — no account needed. Save your XP after you win it.
                </Text>
                <View style={{ marginTop: 13, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {GOALS.map((g) => {
                    const on = goal === g.id;
                    return (
                      <Pressable
                        key={g.id}
                        onPress={() => {
                          setGoalState(g.id);
                          void setGoal(g.id);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Goal: ${g.label}`}
                        style={{
                          flexGrow: 1,
                          flexBasis: '30%',
                          minWidth: 92,
                          alignItems: 'center',
                          borderRadius: 16,
                          borderWidth: 1.5,
                          borderColor: on ? p.mossSoft : 'rgba(243,240,231,0.16)',
                          backgroundColor: on ? p.moss : 'rgba(243,240,231,0.06)',
                          paddingHorizontal: 4,
                          paddingVertical: 8,
                        }}
                      >
                        <AppIcon name={g.icon as AppIconName} size={19} color={on ? '#F3F0E7' : '#CBD0C2'} />
                        <Text
                          numberOfLines={2}
                          style={{
                            marginTop: 2,
                            textAlign: 'center',
                            fontSize: 10,
                            lineHeight: 13,
                            fontWeight: '700',
                            color: on ? '#F3F0E7' : '#CBD0C2',
                          }}
                        >
                          {g.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text
                  style={{
                    marginTop: 13,
                    fontSize: 9.5,
                    fontWeight: '800',
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: '#9EA795',
                  }}
                >
                  How much per day?
                </Text>
                <View style={{ marginTop: 6, flexDirection: 'row', gap: 8 }}>
                  {DAILY_MINUTES_OPTIONS.map((m) => {
                    const on = minutes === m;
                    return (
                      <Pressable
                        key={m}
                        onPress={() => {
                          setMinutesState(m);
                          void setDailyMinutes(m);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`${m} minutes per day`}
                        style={{
                          flex: 1,
                          alignItems: 'center',
                          borderRadius: 14,
                          borderWidth: 1.5,
                          borderColor: on ? p.honeySoft : 'rgba(243,240,231,0.16)',
                          backgroundColor: on ? p.honey : 'rgba(243,240,231,0.06)',
                          paddingVertical: 8,
                        }}
                      >
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: on ? '#241806' : '#CBD0C2' }}>{m} min</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={{ marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppIcon name="target" size={14} color={p.mossSoft} />
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: p.mossSoft }}>{outcomeForMinutes(minutes)}</Text>
                </View>
                <Pressable
                  onPress={() => void startFirstLesson()}
                  accessibilityRole="button"
                  accessibilityLabel="Start my first lesson"
                  style={({ pressed }) => ({
                    marginTop: 13,
                    alignItems: 'center',
                    borderRadius: 16,
                    backgroundColor: p.honey,
                    paddingVertical: 13,
                    transform: [{ translateY: pressed ? 2 : 0 }],
                  })}
                >
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#241806' }}>
                    Start my first lesson
                  </Text>
                </Pressable>
              </View>
            </FadeUp>
          ) : nextUpBlock(completed) ? (
            /* Snake-UI guidance: one unambiguous next action, no menu decisions. */
            <FadeUp delay={90} style={{ width: '100%', alignItems: 'center' }}>
              <UpNextCard block={nextUpBlock(completed)!} goal={goal} onStart={() => openBlock(nextUpBlock(completed)!)} />
            </FadeUp>
          ) : null}
          {/* Course picker (Duolingo style): every course on one screen —
              open the one you care about and follow its path to completion. */}
          {courseId ? (
            <View style={{ marginBottom: 8, width: '100%', maxWidth: 384, flexDirection: 'row', alignItems: 'center' }}>
              <Pressable
                onPress={() => void selectCourse(null)}
                accessibilityRole="button"
                accessibilityLabel="Back to all courses"
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 2,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: p.line,
                  backgroundColor: p.surface,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <AppIcon name="chevBack" size={16} color={p.moss} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: p.moss }}>All courses</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ marginBottom: 30, width: '100%', maxWidth: 384 }}>
              {/* Licensed LabEx corpus: hundreds of hands-on labs, kept out of
                  the path itself so the map stays a curated course. */}
              <Pressable
                onPress={() => router.push('/labs')}
                accessibilityRole="button"
                accessibilityLabel={`Open Labs: ${LABEX_COUNT} licensed hands-on labs`}
                style={({ pressed }) => ({
                  marginBottom: 20,
                  width: '100%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: p.line,
                  backgroundColor: p.surface,
                  padding: 14,
                  opacity: pressed ? 0.96 : 1,
                })}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: p.teal,
                  }}
                >
                  <AppIcon name="flask" size={22} color={p.isDark ? '#0D120B' : '#FFFDF8'} />
                </View>
                <View style={{ marginLeft: 12, flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '800', color: p.ink }}>Open Labs</Text>
                    <View style={{ borderRadius: 99, backgroundColor: p.honey, paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 8.5, fontWeight: '800', letterSpacing: 0.6, color: '#0D120B' }}>NEW</Text>
                    </View>
                  </View>
                  <Text style={{ marginTop: 3, fontSize: 11.5, fontWeight: '600', color: p.muted }} numberOfLines={2}>
                    {LABEX_COUNT.toLocaleString()} licensed hands-on labs · CSS, JS, Python, Rust, Go, data science
                  </Text>
                </View>
                <AppIcon name="chevRight" size={20} color={p.stone} />
              </Pressable>
              <Text style={{ fontSize: 20, fontWeight: '800', color: p.ink }}>
                Your courses
              </Text>
              <Text style={{ marginTop: 2, marginBottom: 12, fontSize: 12.5, fontWeight: '600', color: p.muted }}>
                Pick one and follow its path — no more endless scrolling.
              </Text>
              {COURSES_META.map((c) => {
                const units = CURRICULUM.filter((u) => u.course === c.id);
                const total = units.reduce((a, u) => a + u.blocks.length, 0);
                const done = units.reduce((a, u) => a + u.blocks.filter(isBlockDone).length, 0);
                const pct = total ? done / total : 0;
                const status = total > 0 && done >= total ? 'Course complete' : done > 0 ? `Continue · ${done}/${total}` : `Start · ${total} steps`;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => void selectCourse(c.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.name}: ${status}`}
                    style={({ pressed }) => ({
                      marginBottom: 10,
                      width: '100%',
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderRadius: 22,
                      borderWidth: 1,
                      borderColor: p.line,
                      backgroundColor: p.surface,
                      padding: 13,
                      opacity: pressed ? 0.96 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: p.surfaceAlt,
                      }}
                    >
                      <ContentMark emoji={c.icon} size={22} color={p.ink} badgeBg={p.surfaceAlt} />
                    </View>
                    <View style={{ marginLeft: 12, flex: 1, minWidth: 0 }}>
                      <Text
                        numberOfLines={1}
                        style={{ fontSize: 14.5, fontWeight: '800', color: p.ink }}
                      >
                        {c.name}
                      </Text>
                      <View style={{ marginTop: 6 }}>
                        <ProgressBar value={pct} height={5} />
                      </View>
                      <Text style={{ marginTop: 4, fontSize: 11, fontWeight: '700', color: done > 0 ? p.moss : p.muted }}>
                        {status}
                      </Text>
                      <Text style={{ marginTop: 1, fontSize: 10, fontWeight: '700', color: p.stone }}>
                        {c.difficulty} · {c.hours}
                      </Text>
                    </View>
                    <AppIcon name="chevRight" size={20} color={p.stone} />
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
              <View key={unit.id} style={{ marginBottom: 32, width: '100%', maxWidth: 384, alignItems: 'center' }}>
                {courseChanged && courseMeta ? (
                  <View
                    style={{
                      marginBottom: 14,
                      width: '100%',
                      borderRadius: 20,
                      backgroundColor: p.isDark ? p.surface : p.mossDeep,
                      borderWidth: 1,
                      borderColor: p.isDark ? p.line : p.mossDeep,
                      padding: 14,
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#F3F0E7' }}>
                      {courseMeta.icon} {courseMeta.name}
                    </Text>
                    <Text style={{ marginTop: 2, fontSize: 11.5, fontWeight: '600', color: '#BFC5B4' }}>{courseMeta.blurb}</Text>
                  </View>
                ) : null}
                <UnitHeader unit={unit} doneCount={done} totalCount={unit.blocks.length} />

                <View style={{ position: 'relative', marginTop: 16, width: '100%', alignItems: 'center', gap: 20 }}>
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      bottom: 24,
                      top: 24,
                      width: 2,
                      borderRadius: 1,
                      backgroundColor: p.line,
                    }}
                  />
                  {unit.blocks.map((b, i) => {
                    const st = unitState(unit, i);
                    // Grey-out cascade: nodes two or more steps past the
                    // frontier fade harder, so the unlock path reads ahead.
                    const prevLocked = i > 0 ? unitState(unit, i - 1) === 'locked' : false;
                    const deepLocked = st === 'locked' && prevLocked;
                    return (
                    <View key={b.id} className={deepLocked ? 'opacity-50' : ''}>
                    <PathNode
                      state={st}
                      icon={isBlockDone(b) ? 'trophy' : KIND_ICON[b.kind] ?? 'star'}
                      label={b.title}
                      sub={`${KIND_META[b.kind].label} · ${b.minutes} min`}
                      offset={WIND[i % WIND.length]}
                      onPress={() => openBlock(b)}
                    />
                    </View>
                    );
                  })}
                  {/* Variable-reward chest: one weighted claim per finished unit. */}
                  {(() => {
                    const unitDone = unit.blocks.every(isBlockDone);
                    const claimed = completed.has(`chest:${unit.id}`);
                    return (
                      <PathNode
                        state={!unitDone ? 'locked' : claimed ? 'completed' : 'active'}
                        icon={claimed ? 'trophy' : 'gift'}
                        label="Unit chest"
                        sub={!unitDone ? 'Finish the unit' : claimed ? 'Claimed!' : 'Tap to claim a reward'}
                        offset={WIND[unit.blocks.length % WIND.length]}
                        onPress={() => void claimChest(unit)}
                      />
                    );
                  })()}
                </View>

                {/* FCC-style expandable syllabus (sibling buttons — no nested pressables) */}
                <View style={{ marginTop: 14, width: '100%', flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => setExpanded((e) => ({ ...e, [unit.id]: !open }))}
                    accessibilityRole="button"
                    accessibilityLabel={`${open ? 'Hide' : 'View'} ${unit.title} syllabus`}
                    style={({ pressed }) => ({
                      flex: 1,
                      alignItems: 'center',
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: p.line,
                      backgroundColor: p.surface,
                      paddingVertical: 10,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: p.ink }}>
                      {open ? 'Hide syllabus ▴' : 'View syllabus ▾'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push({ pathname: '/curriculum/[unitId]', params: { unitId: unit.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${unit.title} full syllabus page`}
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: p.line,
                      backgroundColor: p.surfaceAlt,
                      paddingHorizontal: 13,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8, color: p.moss }}>FULL PAGE →</Text>
                  </Pressable>
                </View>
                {open ? (
                  <View style={{ marginTop: 8, width: '100%', gap: 7 }}>
                    {unit.blocks.map((b, i) => (
                      <SyllabusRow key={b.id} block={b} state={unitState(unit, i)} onOpen={() => openBlock(b)} />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          }) : null}

          <FadeUp delay={120} style={{ width: '100%', alignItems: 'center', marginBottom: 18 }}>
            <View style={{ width: '100%', maxWidth: 384 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', color: p.muted }}>
                  Explore
                </Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: p.stone }}>more ways to learn</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <ExploreTile
                  icon="chat"
                  title="AI tutors"
                  sub="Livia & Bingo · ES · FR · DE"
                  tone={p.clay}
                  badge={isPremium ? undefined : 'Premium'}
                  onPress={() => router.push('/roleplay')}
                />
                <ExploreTile
                  icon="book"
                  title="Kamusi"
                  sub="Kiswahili ↔ English · offline"
                  tone={p.teal}
                  onPress={() => router.push('/dictionary')}
                />
                <ExploreTile
                  icon="gradCap"
                  title="Certificates"
                  sub="7 tracks · 5 projects each"
                  tone={p.honey}
                  onPress={() => router.push('/certifications')}
                />
                <ExploreTile
                  icon="palette"
                  title="Design lab"
                  sub="Figma · wireframes · guides"
                  tone={p.berry}
                  onPress={() => router.push('/design')}
                />
              </View>
            </View>
          </FadeUp>
          {/* Special node: newest custom revision */}
          {newestReady && (
            <View style={{ marginBottom: 32, width: '100%', maxWidth: 384, alignItems: 'center' }}>
              <Text
                style={{
                  marginBottom: 12,
                  fontSize: 9.5,
                  fontWeight: '800',
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                  color: p.berry,
                }}
              >
                My Custom Revision
              </Text>
              <PathNode
                state={completed.has(newestReady.id) ? 'completed' : 'active'}
                icon="brain"
                label="My Custom Revision"
                sub={newestReady.title}
                offset={0}
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
            <View style={{ marginBottom: 32, width: '100%', maxWidth: 384, alignItems: 'center', gap: 20 }}>
              {olderLessons.map((l, i) => (
                <PathNode
                  key={l.id}
                  state={completed.has(l.id) ? 'completed' : 'active'}
                  icon={completed.has(l.id) ? 'trophy' : 'doc'}
                  label={l.title}
                  offset={WIND[(i + 1) % WIND.length]}
                  onPress={() =>
                    router.push({ pathname: '/quiz/[lessonId]', params: { lessonId: l.id, title: l.title } })
                  }
                />
              ))}
            </View>
          )}

          {/* Still-generating uploads */}
          {pendingUploads.length > 0 && (
            <View style={{ marginBottom: 32, width: '100%', maxWidth: 384, alignItems: 'center', gap: 20 }}>
              {pendingUploads.map((u, i) => (
                <PathNode
                  key={u.id}
                  state="processing"
                  icon="refresh"
                  label={u.file_name}
                  sub="AI is generating…"
                  offset={WIND[i % WIND.length]}
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
              style={({ pressed }) => ({
                marginBottom: 32,
                maxWidth: 384,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: p.isDark ? '#3A2118' : '#E9CDB8',
                backgroundColor: p.isDark ? '#170F0B' : '#FBF1E8',
                paddingHorizontal: 16,
                paddingVertical: 12,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={{ textAlign: 'center', fontSize: 12, fontWeight: '700', color: p.berry }}>
                {failedLessons.length} upload{failedLessons.length > 1 ? 's' : ''} failed to generate — tap to try again.
              </Text>
            </Pressable>
          )}

          {!listening ? (
            <Pressable
              onPress={openAudiobookMode}
              accessibilityRole="button"
              accessibilityLabel="Listen to audiobook mode"
              style={({ pressed }) => ({
                marginTop: 4,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: p.line,
                backgroundColor: p.surface,
                paddingHorizontal: 22,
                paddingVertical: 13,
                transform: [{ translateY: pressed ? 1.5 : 0 }],
              })}
            >
              <AppIcon name="headset" size={20} color={p.teal} />
              <Text style={{ fontSize: 14.5, fontWeight: '800', color: p.ink }}>
                Listen to Audiobook Mode
              </Text>
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
          {!listening && !isPremium ? (
            <Text
              style={{
                marginTop: 8,
                maxWidth: 340,
                textAlign: 'center',
                fontSize: 11.5,
                lineHeight: 16,
                color: p.muted,
              }}
            >
              Free narration uses your device voice over the question prompts. Premium adds one consistent narrator, a continuous full mix and a clip for every question.
            </Text>
          ) : null}
          {audioMsg && !listening ? (
            <Text style={{ marginTop: 8, fontSize: 12, color: p.muted }}>{audioMsg}</Text>
          ) : null}

          {/* Tier badge */}
          <View
            style={{
              marginTop: 16,
              borderRadius: 99,
              borderWidth: 1,
              borderColor: isPremium ? p.honey : p.line,
              backgroundColor: p.surface,
              paddingHorizontal: 14,
              paddingVertical: 6,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: isPremium ? p.honey : p.muted }}>
              {isPremium
                ? `Premium • ${(PREMIUM_MONTHLY_WORD_CAP - used).toLocaleString()} AI words left`
                : `Free tier • text ≤${FREE_WORD_LIMIT} words • device voice`}
            </Text>
          </View>
          {!isPremium && (
            <Pressable
              onPress={() => router.push('/paywall')}
              accessibilityRole="button"
              accessibilityLabel="Go Premium"
              style={({ pressed }) => ({
                marginTop: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                borderRadius: 16,
                backgroundColor: p.honey,
                paddingHorizontal: 18,
                paddingVertical: 12,
                transform: [{ translateY: pressed ? 2 : 0 }],
              })}
            >
              <AppIcon name="crown" size={17} color="#241806" />
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#241806' }}>
                Go Premium ({PREMIUM_PRICE_LABEL}) — PDF, note scans, elite voices
              </Text>
            </Pressable>
          )}

          <View style={{ marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            {[
              { label: 'Hearts refill options →', href: '/refill' },
              { label: 'My uploads →', href: '/uploads' },
              { label: 'AI Roleplay', href: '/roleplay' },
              { label: 'Settings', href: '/settings' },
            ].map((l) => (
              <Link key={l.href} href={l.href as never} asChild>
                <Pressable>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: p.stone }}>{l.label}</Text>
                </Pressable>
              </Link>
            ))}
          </View>
          {/* spacer for mobile bottom nav */}
          <View className="h-16 md:hidden" />
        </ScrollView>

        {/* Desktop right panel (web, lg+) */}
        {Platform.OS === 'web' ? <View className="hidden pt-6 lg:flex">{rightPanel}</View> : null}
      </View>

      {/* Mobile bottom nav — natural tab bar (native + narrow web) */}
      <View
        className="md:hidden"
        style={{
          borderTopWidth: 1,
          borderTopColor: p.line,
          backgroundColor: p.isDark ? 'rgba(1,8,4,0.92)' : 'rgba(243,247,238,0.94)',
          paddingHorizontal: 18,
          paddingTop: 7,
          paddingBottom: 5,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
          {[
            { label: 'LEARN', icon: 'home', href: '/', active: true },
            { label: 'LEAGUES', icon: 'trophy', href: '/leaderboard', active: false },
            { label: 'QUESTS', icon: 'target', href: '/settings', active: false },
            { label: 'SHOP', icon: 'crown', href: '/paywall', active: false },
          ].map((n) => (
            <Link key={n.label} href={n.href as never} asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={n.label}
                style={{
                  alignItems: 'center',
                  borderRadius: 14,
                  backgroundColor: n.active ? (p.isDark ? '#141C10' : '#ECF1E1') : 'transparent',
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                }}
              >
                <AppIcon name={n.icon as AppIconName} size={21} color={n.active ? p.moss : p.stone} />
                <Text
                  style={{
                    fontSize: 8.5,
                    fontWeight: '800',
                    letterSpacing: 0.7,
                    marginTop: 1,
                    color: n.active ? p.moss : p.stone,
                  }}
                >
                  {n.label}
                </Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </View>

      {!compactHud && !(!profile && !onboarded) ? (
        <View style={{ position: 'absolute', right: 16, bottom: 92, zIndex: 20 }}>
          <Pressable
            onPress={() => {
              setSandboxOpen(true);
              setSandboxMsg(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Open AI Sandbox"
            style={({ pressed }) => ({
              width: 54,
              height: 54,
              borderRadius: 27,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: p.isDark ? '#6B573A' : '#A8712F',
              backgroundColor: p.honey,
              shadowColor: '#000',
              shadowOpacity: 0.35,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
              transform: [{ translateY: pressed ? 2 : 0 }, { scale: pressed ? 0.96 : 1 }],
            })}
          >
            <AppIcon name="brain" size={22} color="#241806" />
          </Pressable>
        </View>
      ) : null}

      {/* AI Sandbox panel */}
      <Modal visible={sandboxOpen} animationType="slide" transparent onRequestClose={() => setSandboxOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <View
            style={{
              maxHeight: '90%',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderWidth: 1,
              borderColor: p.line,
              backgroundColor: p.surface,
              overflow: 'hidden',
            }}
          >
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: 34 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: p.isDark ? '#171F12' : '#EDF2E2',
                  }}
                >
                  <AppIcon name="brain" size={19} color={p.moss} />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: p.ink }}>
                  AI Sandbox
                </Text>
              </View>
              <Text style={{ marginTop: 8, fontSize: 12.5, lineHeight: 18, fontWeight: '600', color: p.muted }}>
                {isPremium
                  ? 'Pick a PDF, text file, photo, or audio/video recording — or scan your notes above — and Bingo builds a custom revision node on your map.'
                  : `Free tier: text files up to ${FREE_WORD_LIMIT} words with the device voice. Premium (${PREMIUM_PRICE_LABEL}) adds PDFs, note scans, audio/video transcription, smart compilation, and elite voices.`}
              </Text>

              <Pressable
                onPress={pickFile}
                style={({ pressed }) => ({
                  marginTop: 14,
                  alignItems: 'center',
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  borderColor: p.line,
                  backgroundColor: p.surfaceAlt,
                  paddingVertical: 18,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <AppIcon name="upload" size={32} color={p.stone} />
                <Text style={{ marginTop: 6, fontSize: 13, fontWeight: '800', color: p.ink }}>Tap to pick a file</Text>
                <Text style={{ marginTop: 1, fontSize: 10.5, fontWeight: '600', color: p.muted }}>
                  {isPremium ? 'PDF · TXT · Photo · Audio · Video' : 'TXT · MD · CSV (Free)'}
                </Text>
              </Pressable>

              {isPremium ? (
                <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => scanNotes('camera')}
                    style={({ pressed }) => ({
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      borderRadius: 14,
                      backgroundColor: p.moss,
                      paddingVertical: 11,
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <AppIcon name="camera" size={17} color={p.isDark ? '#0D120B' : '#F7FBF2'} />
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: p.isDark ? '#0D120B' : '#F7FBF2' }}>
                      Take photo
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => scanNotes('library')}
                    style={({ pressed }) => ({
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: p.line,
                      backgroundColor: p.surfaceAlt,
                      paddingVertical: 11,
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <AppIcon name="image" size={17} color={p.ink} />
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: p.ink }}>From gallery</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    setSandboxOpen(false);
                    router.push('/paywall');
                  }}
                  style={({ pressed }) => ({
                    marginTop: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    borderRadius: 14,
                    backgroundColor: p.isDark ? '#2A2115' : '#F6EAD6',
                    borderWidth: 1,
                    borderColor: p.isDark ? '#3B2E1B' : '#E9D6B4',
                    paddingVertical: 11,
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <AppIcon name="camera" size={17} color={p.honey} />
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: p.honey }}>Scan notes with Bingo — Premium</Text>
                </Pressable>
              )}

              {picked && (
                <View
                  style={{
                    marginTop: 10,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: p.line,
                    backgroundColor: p.surfaceAlt,
                    padding: 11,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppIcon
                      name={picked.mime.startsWith('image/') ? 'image' : pickedIsMedia ? 'music' : 'doc'}
                      size={17}
                      color={p.ink}
                    />
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: p.ink }}>
                      {picked.name}
                    </Text>
                  </View>
                  <Text style={{ marginTop: 2, fontSize: 10.5, fontWeight: '600', color: p.muted }}>{picked.mime}</Text>
                </View>
              )}

              {pickedIsMedia ? (
                <View
                  style={{
                    marginTop: 10,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: p.line,
                    backgroundColor: p.surfaceAlt,
                    padding: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <AppIcon name="shield" size={17} color={p.honey} />
                    <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '800', color: p.ink }}>
                      Content rights
                    </Text>
                    <Text
                      style={{
                        fontSize: 9.5,
                        fontWeight: '800',
                        letterSpacing: 0.4,
                        color: rightsComplete ? p.moss : p.berry,
                      }}
                    >
                      {rightsComplete ? 'CONFIRMED' : 'REQUIRED'}
                    </Text>
                  </View>
                  <Text style={{ marginTop: 4, fontSize: 10.5, lineHeight: 15, fontWeight: '600', color: p.muted }}>
                    Audio and video need confirmed rights before the AI can transcribe and narrate them. The recording is transcribed on our servers; the transcript stays private to your account.
                  </Text>
                  {CONTENT_RIGHTS_ITEMS.map((item) => {
                    const checked = rightsChecks[item.id] === true;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => toggleRightsItem(item.id)}
                        accessibilityRole="checkbox"
                        accessibilityLabel={item.label}
                        accessibilityState={{ checked }}
                        style={({ pressed }) => ({
                          marginTop: 8,
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          gap: 8,
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <View
                          style={{
                            marginTop: 1,
                            width: 18,
                            height: 18,
                            borderRadius: 5,
                            borderWidth: 1.5,
                            borderColor: checked ? p.moss : p.line,
                            backgroundColor: checked ? p.moss : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {checked ? (
                            <AppIcon name="check" size={12} color={p.isDark ? '#0D120B' : '#FFFDF8'} />
                          ) : null}
                        </View>
                        <Text style={{ flex: 1, fontSize: 10.8, lineHeight: 15, fontWeight: '600', color: p.ink }}>
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {!rightsComplete ? (
                    <Text style={{ marginTop: 8, fontSize: 10, fontWeight: '700', color: p.berry }}>
                      Confirm every item to unlock upload.
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <Pressable
                onPress={uploadPicked}
                disabled={uploading || (pickedIsMedia && !rightsComplete)}
                style={({ pressed }) => ({
                  marginTop: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  borderRadius: 16,
                  backgroundColor: p.honey,
                  paddingVertical: 14,
                  opacity: uploading
                    ? 0.5
                    : pickedIsMedia && !rightsComplete
                      ? 0.45
                      : pressed
                        ? 0.92
                        : 1,
                  transform: [{ translateY: pressed && !uploading ? 2 : 0 }],
                })}
              >
                {uploading ? (
                  <ActivityIndicator color="#241806" />
                ) : (
                  <>
                    <AppIcon
                      name={pickedIsMedia && !rightsComplete ? 'lock' : 'sparkles'}
                      size={19}
                      color="#241806"
                    />
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#241806' }}>
                      {pickedIsMedia && !rightsComplete ? 'Confirm rights to upload' : 'Generate my node'}
                    </Text>
                  </>
                )}
              </Pressable>
              {sandboxMsg ? (
                <Text style={{ marginTop: 8, textAlign: 'center', fontSize: 11.5, fontWeight: '600', color: p.muted }}>
                  {sandboxMsg}
                </Text>
              ) : null}

              {uploads.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={{ fontSize: 9.5, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', color: p.stone }}>
                    Recent uploads
                  </Text>
                  {uploads.slice(0, 5).map((u) => (
                    <View key={u.id} style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <Text numberOfLines={1} style={{ flex: 1, fontSize: 11.5, fontWeight: '600', color: p.muted }}>
                        {u.file_name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 10.5,
                          fontWeight: '800',
                          color: u.status === 'ready' ? p.moss : u.status === 'failed' ? p.berry : p.honey,
                        }}
                      >
                        {u.status === 'ready' ? '● ready' : u.status === 'failed' ? '● failed' : '● generating…'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <Pressable onPress={() => setSandboxOpen(false)} style={{ marginTop: 18, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: p.stone }}>Close</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {chestWin && chestReward && shouldCelebrateChest(chestClaim) && chestPhase === 'opening' ? (
        <ChestOpening
          key={`open-${chestWin}`}
          title={chestWin}
          rewardLabel={chestRewardText}
          onOpened={() => {
            if (!shouldCelebrateChest(chestClaim)) return;
            setChestPhase('storm');
            void playCelebration();
          }}
        />
      ) : null}
      {chestWin && chestReward && shouldCelebrateChest(chestClaim) && chestPhase === 'storm' ? (
        <Celebration
          key={`storm-${chestWin}`}
          duration={FULL_CELEBRATION_MS}
          onDone={() => {
            setChestWin(null);
            setChestClaim(null);
            setChestReward(null);
          }}
        />
      ) : null}
      {chestWin && chestReward && shouldCelebrateChest(chestClaim) && chestPhase === 'storm' ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 78, left: 0, right: 0, zIndex: 70, alignItems: 'center' }}
        >
          <View
            accessible
            accessibilityLabel={`Unit chest claimed: ${chestRewardText} for ${chestWin}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              maxWidth: 320,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: p.isDark ? '#5C4A12' : '#F2D98E',
              backgroundColor: p.isDark ? '#1B1608' : '#FFF7DE',
              paddingHorizontal: 15,
              paddingVertical: 9,
            }}
          >
            <AppIcon name={chestRewardIcon} size={17} color={p.honey} />
            <View style={{ flexShrink: 1 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '900', color: p.ink }}>
                Chest claimed · {chestRewardText}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 10.5, fontWeight: '700', color: p.muted }}>
                {chestWin}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}
