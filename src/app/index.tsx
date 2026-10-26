import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Animated, Modal, ActivityIndicator } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../lib/supabase';
import { getProfile, getCompletedLessonIds, MAX_HEARTS, type Profile } from '../../lib/progress';
import { uploadRawFile, waitForUploadReady } from '../../lib/uploads';
import { FREE_WORD_LIMIT, PREMIUM_MONTHLY_WORD_CAP, PREMIUM_PRICE_LABEL } from '../../lib/tiers';
import { loadLatestAudiobook, type Audiobook } from '../../lib/audiobook';
import AudiobookPlayer from '../../components/AudiobookPlayer';

type NodeState = 'completed' | 'active' | 'locked' | 'processing' | 'failed';

const STARTER_NODES = [
  { id: 'demo-html', title: 'HTML Basics', icon: '🌐' },
  { id: 'demo-code', title: 'Code Basics', icon: '💻' },
];

/** Alternating offsets give the track its signature winding feel. */
const WIND = [0, -56, 56, -28, 28, 0];

function PathNode({
  state,
  icon,
  label,
  sub,
  color,
  onPress,
  offset,
}: {
  state: NodeState;
  icon: string;
  label: string;
  sub?: string;
  color: string;
  onPress?: () => void;
  offset: number;
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
          : 'bg-slate-300';

  return (
    <View className="items-center" style={{ transform: [{ translateX: offset }] }}>
      <Pressable disabled={locked} onPress={onPress}>
        <Animated.View
          style={{ transform: [{ scale: pulse }] }}
          className={`h-20 w-20 items-center justify-center rounded-full border-b-4 ${bg} ${
            locked ? 'border-slate-400 opacity-60' : 'border-black/20'
          }`}
        >
          <Text className="text-3xl">{locked ? '🔒' : icon}</Text>
        </Animated.View>
      </Pressable>
      <Text className={`mt-1 max-w-28 text-center text-sm font-bold ${locked ? 'text-slate-400' : 'text-slate-800'}`}>
        {label}
      </Text>
      {sub ? <Text className="text-xs text-slate-400">{sub}</Text> : null}
    </View>
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
      const b64 = await readAsStringAsync(picked.uri, { encoding: EncodingType.Base64 });
      const upload = await uploadRawFile(new Uint8Array(decode(b64)), picked.name, picked.mime);
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
          setAudioMsg('No lesson yet — open the 🧠 AI Sandbox and paste text first.');
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
        setAudioMsg('No audiobook yet — open the 🧠 AI Sandbox and upload material first.');
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

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerClassName="items-center bg-white px-6 pb-32 pt-12">
        {/* Top Bar */}
        <View className="w-full max-w-sm flex-row items-center justify-between border-b-2 border-slate-100 pb-3">
          <Text className="text-lg font-extrabold text-orange-500">🔥 {streak}</Text>
          <Text className="text-lg font-extrabold text-amber-500">⭐ {xp.toLocaleString()}</Text>
          <Text className="text-lg font-extrabold text-red-500">❤️ {hearts}</Text>
        </View>

        <Text className="mt-4 text-2xl font-extrabold text-slate-900">Your Path</Text>
        <Text className="text-base text-slate-500">Finish nodes to earn XP and keep the streak.</Text>

        {/* Starter track */}
        <View className="mt-6 w-full max-w-sm items-center gap-5">
          {STARTER_NODES.map((n, i) => {
            const isDone = completed.has(n.id);
            const prevDone = i === 0 || completed.has(STARTER_NODES[i - 1].id);
            const state: NodeState = isDone ? 'completed' : prevDone || !profile ? 'active' : 'locked';
            return (
              <PathNode
                key={n.id}
                state={state}
                icon={isDone ? '🏆' : n.icon}
                label={n.title}
                sub={state === 'completed' ? 'Completed' : state === 'locked' ? 'Finish previous node' : undefined}
                color="bg-green-500"
                offset={nextOffset()}
                onPress={() =>
                  router.push({ pathname: '/quiz/[lessonId]', params: { lessonId: n.id, title: n.title } })
                }
              />
            );
          })}
        </View>

        {/* Special node: newest custom revision */}
        {newestReady && (
          <View className="mt-8 w-full max-w-sm items-center">
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
          <View className="mt-6 w-full max-w-sm items-center gap-5">
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
          <View className="mt-6 w-full max-w-sm items-center gap-5">
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
          <Text className="mt-4 text-sm text-red-500">
            {failedLessons.length} upload{failedLessons.length > 1 ? 's' : ''} failed to generate — try re-uploading
            from the sandbox.
          </Text>
        )}

        {!listening ? (
          <Pressable onPress={openAudiobookMode} className="mt-8 items-center rounded-2xl bg-purple-600 px-6 py-3">
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

        <Link href="/refill" asChild>
          <Pressable className="mt-4">
            <Text className="text-sm text-slate-400">Hearts refill options →</Text>
          </Pressable>
        </Link>
      </ScrollView>

      {/* AI Sandbox FAB */}
      <Pressable
        onPress={() => {
          setSandboxOpen(true);
          setSandboxMsg(null);
        }}
        className="absolute bottom-6 self-center rounded-full bg-slate-900 px-8 py-4 shadow-lg"
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
    </View>
  );
}
