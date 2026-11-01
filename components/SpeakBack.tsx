import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import Text from './ui/Text';
import AppIcon from './AppIcon';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionErrorCode,
} from 'expo-speech-recognition';
import { useAudioPlayer } from 'expo-audio';
import { speakAs, stopSpeaking, type LanguagePreset } from '../lib/pronunciation';
import { bestSpeakBack, speakBackVerdict, type SpeakBackScore } from '../lib/speakBack';
import {
  attemptCaptureSupported,
  beginWebAttempt,
  cancelWebAttempt,
  discardAttempt,
  endWebAttempt,
  nativeAttemptCaptureOptions,
  speechRecognitionAvailable,
} from '../lib/attemptAudio';

type Phase = 'idle' | 'listening' | 'result' | 'error';

const VERDICT_COPY: Record<ReturnType<typeof speakBackVerdict>, string> = {
  great: 'Nailed it',
  good: 'Close — nice work',
  almost: 'Almost there',
  again: 'Try it once more',
};

/** Recognizer failures, in words a learner can act on. */
function messageFor(code: ExpoSpeechRecognitionErrorCode | undefined, language: string): string {
  switch (code) {
    case 'not-allowed':
      return 'Microphone access is off. Allow it in Settings, then try again.';
    case 'service-not-allowed':
      return 'Speech recognition is unavailable right now.';
    case 'language-not-supported':
      return `${language} speech recognition isn’t installed on this device.`;
    case 'network':
      return 'Speech recognition needs a connection (or the offline language pack).';
    case 'no-speech':
      return 'I didn’t hear anything. Try again, a little closer to the mic.';
    case 'audio-capture':
      return 'No microphone was available.';
    case 'busy':
      return 'The recognizer is busy — tap Try again.';
    default:
      return 'Speech recognition stopped. Try again.';
  }
}

const WORD_STYLE: Record<SpeakBackScore['words'][number]['status'], { chip: string; text: string }> = {
  hit: { chip: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-300' },
  close: { chip: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300' },
  miss: { chip: 'bg-red-100 dark:bg-red-950', text: 'text-red-700 dark:text-red-300' },
  extra: { chip: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500 dark:text-slate-400' },
};

/**
 * Speak-back practice for language lessons: tap, say the model phrase, and get
 * a word-level match score from the device's speech recognizer. No audio is
 * stored by the app; recognition happens in the OS/browser service.
 *
 * `onScore` is what turns practice into a graded exercise — a quiz player uses
 * it to decide pass/fail, and it only ever fires for a real recogniser result.
 */
export default function SpeakBack({
  phrase,
  language,
  onScore,
}: {
  phrase: string;
  language: LanguagePreset;
  onScore?: (score: SpeakBackScore) => void;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState<SpeakBackScore | null>(null);
  const [interim, setInterim] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  // The learner's own voice, replayed next to Livia's model before a retry.
  const [attemptUri, setAttemptUri] = useState<string | null>(null);
  const [attemptPlaying, setAttemptPlaying] = useState(false);
  const [pulse] = useState(() => new Animated.Value(0));
  const [captureSupported] = useState(attemptCaptureSupported);
  const attemptPlayer = useAudioPlayer(attemptUri ? { uri: attemptUri } : null);
  const settled = useRef(false);
  const phaseRef = useRef<Phase>('idle');
  const transcripts = useRef<string[]>([]);
  const attemptRef = useRef<string | null>(null);
  const webCapturing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const listening = phase === 'listening';

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (!listening) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 640, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 640, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [listening, pulse]);

  // The web player emits no status on play or end, so the button follows the
  // live player state — and native needs the same end-of-playback hand-off.
  useEffect(() => {
    if (!attemptPlaying) return;
    const id = setInterval(() => {
      const status = attemptPlayer.currentStatus;
      if (status.didJustFinish || (!status.playing && status.currentTime > 0)) {
        setAttemptPlaying(false);
      }
    }, 250);
    // An attempt is capped at 12s; never leave the label stuck past that.
    const cap = setTimeout(() => setAttemptPlaying(false), 15000);
    return () => {
      clearInterval(id);
      clearTimeout(cap);
    };
  }, [attemptPlaying, attemptPlayer]);

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const rememberAttempt = useCallback((uri: string | null) => {
    if (!uri || !mounted.current) return;
    const previous = attemptRef.current;
    attemptRef.current = uri;
    setAttemptUri(uri);
    if (previous && previous !== uri) discardAttempt(previous);
  }, []);

  // Web records beside the recognizer and hands back a blob URL; native hands
  // back a file URI through `audioend`. Both end here.
  const stopCapture = useCallback(() => {
    if (!webCapturing.current) return;
    webCapturing.current = false;
    void endWebAttempt().then(rememberAttempt);
  }, [rememberAttempt]);

  const finish = useCallback(() => {
    if (settled.current) return;
    settled.current = true;
    clearTimer();
    stopCapture();
    const result = bestSpeakBack(phrase, transcripts.current);
    if (!result.heard || result.words.length === 0) {
      if (!mounted.current) return;
      setPhase('error');
      setMessage('I didn’t catch that. Try again, a little closer to the mic.');
      return;
    }
    if (!mounted.current) return;
    setScore(result);
    setPhase('result');
    onScore?.(result);
  }, [clearTimer, onScore, phrase, stopCapture]);

  const fail = useCallback(
    (code?: ExpoSpeechRecognitionErrorCode) => {
      if (settled.current) return;
      settled.current = true;
      clearTimer();
      stopCapture();
      if (!mounted.current) return;
      setPhase('error');
      setMessage(messageFor(code, language.label));
    },
    [clearTimer, language.label, stopCapture]
  );

  useSpeechRecognitionEvent('start', () => {
    if (mounted.current) setPhase('listening');
  });

  useSpeechRecognitionEvent('audioend', (event) => {
    // Native persistence: the WAV is only safe to read once audioend fires.
    if (event.uri) rememberAttempt(event.uri);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const heard = event.results.map((r) => r.transcript).filter((text) => text.trim().length > 0);
    if (heard.length > 0) {
      transcripts.current = heard;
      if (mounted.current) setInterim(heard[0] ?? '');
    }
    // iOS only emits alternatives on the final result, so wait for it.
    if (event.isFinal) finish();
  });

  useSpeechRecognitionEvent('error', (event) => {
    // Our own abort (unmount, new attempt) is not a learner-facing failure.
    if (event.error === 'aborted') return;
    fail(event.error);
  });

  useSpeechRecognitionEvent('end', () => {
    // "end" is the last event of every session, including the one that just
    // produced a final result. Only an unsettled session needs finishing;
    // touching the phase here would race the result card back to idle.
    if (!settled.current) finish();
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimer();
      webCapturing.current = false;
      cancelWebAttempt();
      const uri = attemptRef.current;
      attemptRef.current = null;
      // Let the audio player release the source before the file disappears.
      if (uri) setTimeout(() => discardAttempt(uri), 0);
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {}
    };
  }, [clearTimer]);

  const start = async () => {
    if (phaseRef.current === 'listening') return;
    // Livia must not talk into the microphone, and a new attempt replaces the
    // previous recording rather than being compared with the wrong one.
    await stopSpeaking();
    attemptPlayer.pause();
    setAttemptPlaying(false);
    discardAttempt(attemptRef.current);
    attemptRef.current = null;
    setAttemptUri(null);
    if (!mounted.current) return;
    settled.current = false;
    transcripts.current = [];
    setScore(null);
    setInterim('');
    setMessage(null);
    try {
      if (!speechRecognitionAvailable()) {
        setPhase('error');
        setMessage('Speech recognition isn’t available in this browser or on this device.');
        return;
      }
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!mounted.current) return;
      if (!permission.granted) {
        setPhase('error');
        setMessage(messageFor('not-allowed', language.label));
        return;
      }
      setPhase('listening');
      // Web cannot persist from the recognizer, so record beside it.
      webCapturing.current = await beginWebAttempt();
      if (!mounted.current) return;
      // A learner who taps and walks away shouldn't hold the microphone open.
      timer.current = setTimeout(() => {
        try {
          ExpoSpeechRecognitionModule.stop();
        } catch {}
      }, 12000);
      ExpoSpeechRecognitionModule.start({
        lang: language.locales[0] ?? language.base,
        interimResults: true,
        continuous: false,
        maxAlternatives: 3,
        addsPunctuation: false,
        // Bias the recognizer toward the phrase being taught.
        contextualStrings: [phrase],
        // Android 13+/iOS keep the attempt audio; elsewhere this is omitted.
        ...(nativeAttemptCaptureOptions() ?? {}),
      });
    } catch {
      if (!mounted.current) return;
      setPhase('error');
      setMessage('Speech recognition couldn’t start. Try again.');
    }
  };

  const stop = () => {
    stopCapture();
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {}
  };

  const hearModel = () => {
    attemptPlayer.pause();
    setAttemptPlaying(false);
    void speakAs({ character: 'livia', text: phrase, language, slow: true });
  };

  // Play / stop the learner's own take. Livia waits while they listen.
  const toggleAttempt = async () => {
    if (!attemptUri) return;
    if (attemptPlaying) {
      attemptPlayer.pause();
      setAttemptPlaying(false);
      void attemptPlayer.seekTo(0);
      return;
    }
    await stopSpeaking();
    await attemptPlayer.seekTo(0);
    attemptPlayer.play();
    setAttemptPlaying(true);
  };

  if (listening) {
    const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
    const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] });
    return (
      <View className="mt-2 w-full rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Animated.View style={{ transform: [{ scale }], opacity }} className="h-3 w-3 rounded-full bg-emerald-500" />
            <Text className="ml-2 text-xs font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
              Listening
            </Text>
          </View>
          <Pressable
            onPress={stop}
            accessibilityRole="button"
            accessibilityLabel="Stop recording"
            className="rounded-full bg-emerald-600 px-3 py-1.5 active:bg-emerald-700"
          >
            <Text className="text-xs font-extrabold text-white">Stop</Text>
          </Pressable>
        </View>
        <Text className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">Say: {phrase}</Text>
        <Text className="mt-1 min-h-[18px] text-sm text-slate-500 dark:text-slate-400">
          {interim ? `“${interim}”` : 'Speak naturally — tap Stop when you’re done.'}
        </Text>
      </View>
    );
  }

  if (phase === 'result' && score) {
    const verdict = speakBackVerdict(score.score);
    const tone =
      verdict === 'great'
        ? { card: 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950', text: 'text-green-700 dark:text-green-300' }
        : verdict === 'good'
          ? { card: 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300' }
          : { card: 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950', text: 'text-red-700 dark:text-red-300' };
    return (
      <View
        className={`mt-2 w-full rounded-2xl border-2 p-3 ${tone.card}`}
        accessibilityLiveRegion="polite"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Speak-back · word match
            </Text>
            <Text className={`mt-0.5 text-lg font-extrabold ${tone.text}`}>{VERDICT_COPY[verdict]}</Text>
          </View>
          <Text className={`text-3xl font-extrabold ${tone.text}`}>{score.score}%</Text>
        </View>
        <View className="mt-2 flex-row flex-wrap gap-1.5">
          {score.words.map((word, i) => (
            <View key={`${word.word}-${i}`} className={`rounded-full px-2.5 py-1 ${WORD_STYLE[word.status].chip}`}>
              <Text className={`text-xs font-extrabold ${WORD_STYLE[word.status].text}`}>{word.word}</Text>
            </View>
          ))}
        </View>
        {score.heard ? (
          <Text className="mt-2 text-xs text-slate-500 dark:text-slate-400">Heard: “{score.heard}”</Text>
        ) : null}
        <Text className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {verdict === 'great'
            ? 'Clear and complete. Say it once more to lock it in.'
            : 'Green words matched, amber only differed by an accent, red is what the recognizer missed.'}
        </Text>
        <Text className="mt-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Compare
        </Text>
        <View className="mt-1 flex-row flex-wrap gap-2">
          {attemptUri && captureSupported ? (
            <Pressable
              onPress={() => void toggleAttempt()}
              accessibilityRole="button"
              accessibilityLabel={attemptPlaying ? 'Stop your attempt' : 'Replay your attempt'}
              accessibilityHint="Plays the recording of your own voice"
              className="flex-row items-center rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 active:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950"
            >
              <AppIcon name={attemptPlaying ? 'pause' : 'play'} size={15} color="#059669" />
              <Text className="ml-1.5 text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                {attemptPlaying ? 'Playing…' : 'Your attempt'}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={hearModel}
            accessibilityRole="button"
            accessibilityLabel="Hear Livia say the phrase slowly"
            className="flex-row items-center rounded-full border border-violet-300 bg-violet-50 px-4 py-2 active:bg-violet-100 dark:border-violet-800 dark:bg-violet-950"
          >
            <AppIcon name="volume" size={15} color="#7C3AED" />
            <Text className="ml-1.5 text-sm font-extrabold text-violet-700 dark:text-violet-300">Hear Livia</Text>
          </Pressable>
        </View>
        {attemptUri ? (
          <Text className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            Listen to yours, then Livia’s — the difference is what to fix.
          </Text>
        ) : null}
        <View className="mt-3 flex-row flex-wrap gap-2">
          <Pressable
            onPress={() => void start()}
            accessibilityRole="button"
            accessibilityLabel="Try the phrase again"
            className="flex-row items-center rounded-full bg-emerald-600 px-4 py-2 active:bg-emerald-700"
          >
            <AppIcon name="mic" size={15} color="#FFFFFF" />
            <Text className="ml-1.5 text-sm font-extrabold text-white">Try again</Text>
          </Pressable>
        </View>
        <Text className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          Recognized by your device’s speech service. Your attempt stays on this device and is deleted when you retry.
        </Text>
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <View className="mt-2 w-full rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
        <Text className="text-sm font-bold text-amber-800 dark:text-amber-200">{message}</Text>
        <Pressable
          onPress={() => void start()}
          accessibilityRole="button"
          accessibilityLabel="Try speak-back again"
          className="mt-2 self-start rounded-full bg-amber-600 px-4 py-2 active:bg-amber-700"
        >
          <Text className="text-sm font-extrabold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => void start()}
      accessibilityRole="button"
      accessibilityLabel="Practise speaking the phrase"
      className="mt-2 flex-row items-center self-start rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 active:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950"
    >
      <AppIcon name="mic" size={16} color="#059669" />
      <Text className="ml-1.5 font-semibold text-emerald-700 dark:text-emerald-300">Say it back</Text>
    </Pressable>
  );
}
