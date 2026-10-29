import { useEffect, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import Text from './ui/Text';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { AudioSegment } from '../lib/audiobook';
import { speakFree, stopFree } from '../lib/voice';
import AppIcon from './AppIcon';

interface Props {
  title: string;
  segments: AudioSegment[];
  /** Full-mix narration URL (fallback when segments are missing). */
  fullUrl: string | null;
  /** Free tier: on-device robot voice instead of elite TTS. */
  freeMode?: boolean;
  onClose: () => void;
}

export default function AudiobookPlayer(props: Props) {
  if (props.segments.length === 0 && !props.fullUrl && !props.freeMode) {
    return (
      <View className="mt-6 w-full max-w-sm rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5">
        <Text className="text-base text-slate-600 dark:text-slate-400">
          No audio yet — upload material and wait for the pipeline to finish generating the audiobook.
        </Text>
        <Pressable onPress={props.onClose} className="mt-3 items-center rounded-2xl bg-slate-800 py-3">
          <Text className="font-bold text-white">Back</Text>
        </Pressable>
      </View>
    );
  }
  if (props.freeMode || (props.segments.length === 0 && !props.fullUrl)) return <FreePlayer {...props} />;
  return <PlayerInner {...props} />;
}

/** Free tier: device-native speech, $0 cost, same block highlighting. */
function FreePlayer({ title, segments, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const prompts = segments.map((s) => s.prompt);

  useEffect(() => {
    speakFree(prompts, setIndex);
    return () => stopFree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (i: number) => {
    const n = (i + prompts.length) % Math.max(1, prompts.length);
    setIndex(n);
    setPlaying(true);
    stopFree();
    speakFree(prompts.slice(n), (k) => setIndex(n + k));
  };

  return (
    <View className="mt-6 w-full max-w-sm rounded-3xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <View className="flex-row items-center justify-between">
        <AppIcon name="headset" size={22} color="#0F172A" />
        <Text className="ml-2 flex-1 text-lg font-extrabold text-slate-800 dark:text-slate-200" numberOfLines={1}>
          {title}
        </Text>
        <Pressable onPress={() => { stopFree(); onClose(); }} className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5">
          <AppIcon name="close" size={16} color="#475569" />
        </Pressable>
      </View>
      <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Device voice (free)</Text>
      <ScrollView className="mt-3 max-h-64">
        {prompts.map((p, i) => (
          <Pressable
            key={i}
            onPress={() => go(i)}
            className={`mb-2 rounded-2xl border-2 p-3 ${i === index ? 'border-slate-500 bg-slate-100 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900'}`}
          >
            <View className="flex-row items-center gap-2">
              {i === index ? <AppIcon name="play" size={14} color="#0F172A" /> : null}
              <Text className={`flex-1 text-base ${i === index ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>{p}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <View className="mt-2 flex-row items-center justify-between">
        <Pressable onPress={() => go(index - 1)} className="rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2">
          <AppIcon name="prev" size={20} color="#334155" />
        </Pressable>
        <Pressable
          onPress={() => {
            if (playing) {
              stopFree();
              setPlaying(false);
            } else {
              setPlaying(true);
              speakFree(prompts.slice(index), (k) => setIndex(index + k));
            }
          }}
          className="items-center rounded-full bg-slate-700 px-8 py-3"
        >
          <View className="flex-row items-center justify-center gap-2">
            <AppIcon name={playing ? 'pause' : 'play'} size={20} color="#FFFFFF" />
            <Text className="text-lg font-extrabold text-white">{playing ? 'Pause' : 'Play'}</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => go(index + 1)} className="rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2">
          <AppIcon name="next" size={20} color="#334155" />
        </Pressable>
      </View>
    </View>
  );
}

function PlayerInner({ title, segments, fullUrl, onClose }: Props) {
  const queue =
    segments.length > 0
      ? segments.map((s) => ({ id: s.question_id, prompt: s.prompt, url: s.url }))
      : [{ id: 'full-mix', prompt: 'Full narration (segments still generating)', url: fullUrl as string }];

  const [index, setIndex] = useState(0);
  const player = useAudioPlayer({ uri: queue[0].url });
  const status = useAudioPlayerStatus(player);

  // Autoplay on open.
  useEffect(() => {
    player.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (i: number) => {
    const n = (i + queue.length) % queue.length;
    setIndex(n);
    player.replace({ uri: queue[n].url });
    player.play();
  };

  // Advance + highlight the next block when a segment ends.
  useEffect(() => {
    if (status.didJustFinish) go(index + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);

  const fmt = (s?: number) =>
    s == null || !isFinite(s) ? '--:--' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <View className="mt-6 w-full max-w-sm rounded-3xl border-2 border-green-500 bg-white dark:bg-slate-900 p-5">
      <View className="flex-row items-center justify-between">
        <AppIcon name="headset" size={22} color="#0F172A" />
        <Text className="ml-2 flex-1 text-lg font-extrabold text-slate-800 dark:text-slate-200" numberOfLines={1}>
          {title}
        </Text>
        <Pressable onPress={() => { player.pause(); onClose(); }} className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5">
          <AppIcon name="close" size={16} color="#475569" />
        </Pressable>
      </View>

      <ScrollView className="mt-3 max-h-64">
        {queue.map((q, i) => (
          <Pressable
            key={q.id + i}
            onPress={() => go(i)}
            className={`mb-2 rounded-2xl border-2 p-3 ${
              i === index ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900'
            }`}
          >
            <View className="flex-row items-center gap-2">
              {i === index ? <AppIcon name="play" size={14} color="#0F172A" /> : null}
              <Text className={`flex-1 text-base ${i === index ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>{q.prompt}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <View className="mt-2 flex-row items-center justify-between">
        <Pressable onPress={() => go(index - 1)} className="rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2">
          <AppIcon name="prev" size={20} color="#334155" />
        </Pressable>
        <Pressable
          onPress={() => (status.playing ? player.pause() : player.play())}
          className="flex-row items-center justify-center gap-2 rounded-full bg-green-500 px-8 py-3"
        >
          <AppIcon name={status.playing ? 'pause' : 'play'} size={20} color="#FFFFFF" />
          <Text className="text-lg font-extrabold text-white">{status.playing ? 'Pause' : 'Play'}</Text>
        </Pressable>
        <Pressable onPress={() => go(index + 1)} className="rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2">
          <AppIcon name="next" size={20} color="#334155" />
        </Pressable>
      </View>
      <Text className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
        Block {index + 1}/{queue.length} • {fmt(status.currentTime)} / {fmt(status.duration)}
      </Text>
    </View>
  );
}
