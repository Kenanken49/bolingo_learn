import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import Text from './ui/Text';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { AudioChapter, AudioSegment } from '../lib/audiobook';
import { speakFree, stopFree } from '../lib/voice';
import AppIcon from './AppIcon';

interface Props {
  title: string;
  /** Shown under the title in the in-app media player. */
  author?: string;
  segments: AudioSegment[];
  /** The complete narration, in order (uploads narrate the whole text). */
  chapters?: AudioChapter[];
  /** Single-file narration URL (fallback for older books). */
  fullUrl: string | null;
  /** Free tier: on-device robot voice instead of elite TTS. */
  freeMode?: boolean;
  onClose: () => void;
}

export default function AudiobookPlayer(props: Props) {
  const hasChapters = (props.chapters ?? []).length > 0;
  if (props.segments.length === 0 && !props.fullUrl && !hasChapters && !props.freeMode) {
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
  if (props.freeMode || (props.segments.length === 0 && !props.fullUrl && !hasChapters)) {
    return <FreePlayer {...props} />;
  }
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

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];
const SLEEP_STEPS = [0, 15, 30, 45, 60];

function PlayerInner({ title, author, segments, chapters = [], fullUrl, onClose }: Props) {
  // One ordered queue: the whole book plays in sequence, start to finish.
  // Downloaded parts keep their on-disk order (index-sorted); nothing is
  // shuffled and the auto-advance never skips a part.
  const queue = useMemo(() => {
    const ordered = [...chapters].sort((a, b) => a.index - b.index);
    if (ordered.length > 0) {
      return ordered.map((c) => ({
        id: `chapter-${c.index}`,
        label: c.title?.trim() ? c.title.trim() : `Part ${c.index + 1} of ${ordered.length}`,
        url: c.url,
        offline: c.offline ?? false,
      }));
    }
    if (segments.length > 0) {
      return segments.map((s) => ({ id: s.question_id, label: s.prompt, url: s.url, offline: false }));
    }
    return [{ id: 'full-mix', label: 'Full narration', url: fullUrl as string, offline: false }];
  }, [chapters, segments, fullUrl]);

  const [index, setIndex] = useState(0);
  const [rate, setRate] = useState(1);
  const [sleepMin, setSleepMin] = useState(0);
  const [barWidth, setBarWidth] = useState(0);
  const rateRef = useRef(1);
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const player = useAudioPlayer({ uri: queue[0].url });
  const status = useAudioPlayerStatus(player);
  const offlineCount = useMemo(() => queue.filter((q) => q.offline).length, [queue]);

  const clearSleep = useCallback(() => {
    if (sleepTimer.current) {
      clearTimeout(sleepTimer.current);
      sleepTimer.current = null;
    }
  }, []);

  // Autoplay on open; stop the sleep timer when the player unmounts.
  useEffect(() => {
    player.play();
    return () => clearSleep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  const applyRate = useCallback(
    (next: number) => {
      rateRef.current = next;
      setRate(next);
      player.setPlaybackRate(next);
    },
    [player]
  );

  const go = useCallback(
    (i: number) => {
      const n = Math.max(0, Math.min(queue.length - 1, i));
      setIndex(n);
      player.replace({ uri: queue[n].url });
      player.setPlaybackRate(rateRef.current);
      player.play();
    },
    [player, queue]
  );

  // Play the book in full: when a part ends, the next part starts
  // automatically in order. The last part pauses at the end (no wrap, the
  // sequence is never skipped or repeated on its own).
  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (s) => {
      if (!s.didJustFinish) return;
      if (index < queue.length - 1) go(index + 1);
      else player.pause();
    });
    return () => sub.remove();
  }, [player, go, index, queue.length]);

  const duration = status.duration;
  const position = status.currentTime;
  const ratio = duration && isFinite(duration) && duration > 0 ? Math.min(1, Math.max(0, (position ?? 0) / duration)) : 0;

  const seekBy = (delta: number) => {
    if (duration == null || !isFinite(duration)) return;
    void player.seekTo(Math.max(0, Math.min(duration, (position ?? 0) + delta)));
  };
  const seekToRatio = (x: number) => {
    if (duration == null || !isFinite(duration) || barWidth <= 0) return;
    void player.seekTo(Math.max(0, Math.min(duration, (x / barWidth) * duration)));
  };
  // Audiobook convention: Prev restarts the chapter when a few seconds in,
  // otherwise steps to the previous chapter; Next steps forward and stops
  // at the final chapter (it never wraps around the book).
  const prev = () => {
    if ((position ?? 0) > 5) void player.seekTo(0);
    else go(index - 1);
  };
  const next = () => {
    if (index < queue.length - 1) go(index + 1);
  };
  const cycleSpeed = () => {
    const at = SPEEDS.indexOf(rate);
    applyRate(SPEEDS[(at + 1) % SPEEDS.length]);
  };
  const cycleSleep = () => {
    clearSleep();
    const at = SLEEP_STEPS.indexOf(sleepMin);
    const nextMin = SLEEP_STEPS[(at + 1) % SLEEP_STEPS.length];
    setSleepMin(nextMin);
    if (nextMin > 0) {
      sleepTimer.current = setTimeout(() => {
        player.pause();
        setSleepMin(0);
        sleepTimer.current = null;
      }, nextMin * 60 * 1000);
    }
  };
  const close = () => {
    clearSleep();
    player.pause();
    onClose();
  };

  const fmt = (s?: number) =>
    s == null || !isFinite(s) ? '--:--' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <View className="mt-2 w-full max-w-sm rounded-3xl border-2 border-green-500 bg-white dark:bg-slate-900 p-5">
      <View className="flex-row items-center justify-between">
        <AppIcon name="headset" size={22} color="#0F172A" />
        <View className="ml-2 flex-1">
          <Text className="text-lg font-extrabold text-slate-800 dark:text-slate-200" numberOfLines={1}>
            {title}
          </Text>
          {author ? (
            <Text className="text-xs font-bold text-slate-500 dark:text-slate-400" numberOfLines={1}>
              {author}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={close} className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5">
          <AppIcon name="close" size={16} color="#475569" />
        </Pressable>
      </View>
      <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        Part {index + 1} of {queue.length}
        {offlineCount > 0 ? ` • ${offlineCount}/${queue.length} offline` : ' • streaming'}
      </Text>

      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-sm font-bold text-slate-600 dark:text-slate-300">{fmt(position)}</Text>
        <Text className="text-sm font-bold text-slate-600 dark:text-slate-300">{fmt(duration)}</Text>
      </View>
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Seek"
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        onPress={(e) => seekToRatio(e.nativeEvent.locationX)}
        className="mt-1 h-8 justify-center"
      >
        <View className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <View className="h-2 rounded-full bg-green-500" style={{ width: `${Math.round(ratio * 100)}%` }} />
        </View>
      </Pressable>

      <View className="mt-1 flex-row items-center justify-between">
        <Pressable onPress={prev} accessibilityLabel="Previous chapter" className="rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2.5">
          <AppIcon name="prev" size={20} color="#334155" />
        </Pressable>
        <Pressable onPress={() => seekBy(-15)} accessibilityLabel="Back 15 seconds" className="rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2.5">
          <Text className="text-sm font-extrabold text-slate-600 dark:text-slate-300">−15</Text>
        </Pressable>
        <Pressable
          onPress={() => (status.playing ? player.pause() : player.play())}
          accessibilityLabel={status.playing ? 'Pause' : 'Play'}
          className="flex-row items-center justify-center gap-2 rounded-full bg-green-500 px-8 py-3"
        >
          <AppIcon name={status.playing ? 'pause' : 'play'} size={20} color="#FFFFFF" />
          <Text className="text-lg font-extrabold text-white">{status.playing ? 'Pause' : 'Play'}</Text>
        </Pressable>
        <Pressable onPress={() => seekBy(30)} accessibilityLabel="Forward 30 seconds" className="rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2.5">
          <Text className="text-sm font-extrabold text-slate-600 dark:text-slate-300">+30</Text>
        </Pressable>
        <Pressable
          onPress={next}
          disabled={index >= queue.length - 1}
          accessibilityLabel="Next chapter"
          className="rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2.5"
          style={{ opacity: index >= queue.length - 1 ? 0.4 : 1 }}
        >
          <AppIcon name="next" size={20} color="#334155" />
        </Pressable>
      </View>

      <View className="mt-3 flex-row items-center justify-center gap-2">
        <Pressable onPress={cycleSpeed} accessibilityLabel="Playback speed" className="rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2">
          <Text className="text-sm font-extrabold text-slate-700 dark:text-slate-200">{rate}× speed</Text>
        </Pressable>
        <Pressable onPress={cycleSleep} accessibilityLabel="Sleep timer" className="rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2">
          <Text className="text-sm font-extrabold text-slate-700 dark:text-slate-200">
            {sleepMin === 0 ? 'Sleep off' : `Sleep ${sleepMin}m`}
          </Text>
        </Pressable>
      </View>

      <ScrollView className="mt-3 max-h-64">
        {queue.map((q, i) => (
          <Pressable
            key={q.id + i}
            onPress={() => go(i)}
            accessibilityLabel={`Play ${q.label}`}
            className={`mb-2 rounded-2xl border-2 p-3 ${
              i === index ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900'
            }`}
          >
            <View className="flex-row items-center gap-2">
              {i === index ? <AppIcon name="play" size={14} color="#0F172A" /> : null}
              <Text className={`flex-1 text-base ${i === index ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`} numberOfLines={2}>
                {q.label}
              </Text>
              <Text className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500">
                {q.offline ? 'offline' : 'stream'}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
