import { useEffect, useState } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import DuoButton from './DuoButton';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { loseHeart } from '../lib/progress';
import { hasSeenHeartsIntro, markHeartsIntroSeen } from '../lib/onboarding';
import { getSoundOn, getHapticsOn } from '../lib/preferences';
import { CORRECT_CHIME, WRONG_BUZZ } from '../assets/sounds';

export interface CodeQuizData {
  prompt: string;
  correctChain: string[];
  scrambledTokens: string[];
  /** One-line teaching note shown in the feedback banner. */
  explain?: string;
  /** Premium narration: signed playback URL for a generated audiobook segment. */
  audioUrl?: string;
  isPremium?: boolean;
}

interface Props {
  userId: string | null;
  lessonId: string;
  questionData: CodeQuizData;
  questionLabel: string;
  progressPct: number;
  hearts: number;
  onHeartsChange: (hearts: number) => void;
  onOutOfHearts: () => void;
  onCorrect: () => void;
  onContinue: () => void;
  onAnswer?: (r: { prompt: string; yourAnswer: string; correctAnswer: string; correct: boolean }) => void;
}

const shuffle = <T,>(arr: T[]): T[] =>
  arr.map((v) => ({ v, r: Math.random() })).sort((a, b) => a.r - b.r).map((o) => o.v);

/**
 * Core game engine: token-assembly quiz with hearts, animated progress,
 * juicy bounce/shake feedback + haptics + chimes, and optional premium
 * narration — the production port of the GamifiedCodePlayer sketch onto
 * expo-audio + progress.ts (no react-native-sound dependency).
 */
export default function GamifiedCodePlayer({
  userId,
  lessonId,
  questionData,
  questionLabel,
  progressPct,
  hearts,
  onHeartsChange,
  onOutOfHearts,
  onCorrect,
  onContinue,
  onAnswer,
}: Props) {
  void lessonId;
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [availableTokens, setAvailableTokens] = useState<string[]>(questionData.scrambledTokens);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [bar] = useState(() => new Animated.Value(0));
  const narration = useAudioPlayer(questionData.audioUrl ? { uri: questionData.audioUrl } : undefined);
  const correctPlayer = useAudioPlayer({ uri: CORRECT_CHIME });
  const wrongPlayer = useAudioPlayer({ uri: WRONG_BUZZ });
  // Elite voices (ElevenLabs/OpenAI) are premium; free tier hears the same
  // prompt through the phone's built-in robot voice ($0).
  const eliteLocked = !questionData.audioUrl;
  const [hint, setHint] = useState<string | null>(null);
  // Micro-onboarding: hearts explainer appears on the first-ever mistake.
  const [showHeartsInfo, setShowHeartsInfo] = useState(false);

  // freeCodeCamp-style test checklist derived from the expected chain.
  // Single-token answers (multiple-choice) collapse to one test.
  const tests = (() => {
    const chain = questionData.correctChain;
    if (chain.length <= 1) return [{ label: `Answer is exactly ${chain.join(' ')}`, pass: (s: string[]) => JSON.stringify(s) === JSON.stringify(chain) }];
    return [
      { label: `Opens with ${chain[0]}`, pass: (s: string[]) => s[0] === chain[0] },
      { label: `Closes with ${chain[chain.length - 1]}`, pass: (s: string[]) => s[s.length - 1] === chain[chain.length - 1] },
      { label: `Full chain matches (${chain.length} tokens)`, pass: (s: string[]) => JSON.stringify(s) === JSON.stringify(chain) },
    ];
  })();
  const [ranTests, setRanTests] = useState(false);

  // Juicy feedback: bounce on correct, shake on wrong.
  const pop = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const bannerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }, { translateX: shakeX.value }],
  }));

  useEffect(() => {
    setSelectedTokens([]);
    setAvailableTokens(shuffle(questionData.scrambledTokens));
    setFeedback(null);
    setRanTests(false);
    pop.value = 1;
    shakeX.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionData]);

  useEffect(() => {
    Animated.timing(bar, { toValue: progressPct, duration: 400, useNativeDriver: false }).start();
  }, [progressPct, bar]);

  const playNarration = () => {
    if (eliteLocked) {
      setHint('Free voice \u{1F50A} — upgrade to Premium for soothing human-like audiobooks.');
      Speech.stop();
      Speech.speak(questionData.prompt.slice(0, 1000));
      return;
    }
    setHint(null);
    narration.seekTo(0);
    narration.play();
  };

  const handleSelectToken = (token: string, index: number) => {
    if (feedback) return;
    setSelectedTokens([...selectedTokens, token]);
    setAvailableTokens(availableTokens.filter((_, i) => i !== index));
  };

  const handleRemoveToken = (token: string, index: number) => {
    if (feedback) return;
    setAvailableTokens([...availableTokens, token]);
    setSelectedTokens(selectedTokens.filter((_, i) => i !== index));
  };

  const checkAnswer = async () => {
    if (selectedTokens.length === 0 || feedback) return;
    const isCorrect = JSON.stringify(selectedTokens) === JSON.stringify(questionData.correctChain);
    onAnswer?.({
      prompt: questionData.prompt,
      yourAnswer: selectedTokens.join(' '),
      correctAnswer: questionData.correctChain.join(' '),
      correct: isCorrect,
    });
    const [soundOn, hapticsOn] = await Promise.all([getSoundOn(), getHapticsOn()]);
    if (isCorrect) {
      setFeedback('correct');
      // Playful bounce: overshoot then settle.
      pop.value = withSequence(
        withSpring(1.15, { damping: 6, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 250 })
      );
      if (soundOn) {
        correctPlayer.seekTo(0);
        correctPlayer.play();
      }
      if (hapticsOn) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      onCorrect();
    } else {
      setFeedback('wrong');
      // Shake: quick left-right jitter that settles at 0.
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(0, { duration: 60 })
      );
      if (soundOn) {
        wrongPlayer.seekTo(0);
        wrongPlayer.play();
      }
      if (hapticsOn) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
      }
      let h = hearts;
      if (userId) {
        const p = await loseHeart(userId).catch(() => null);
        h = p?.hearts ?? Math.max(0, hearts - 1);
      } else {
        h = Math.max(0, hearts - 1);
      }
      onHeartsChange(h);
      // First mistake ever: pause for a contextual hearts explainer.
      if (!(await hasSeenHeartsIntro())) {
        await markHeartsIntroSeen();
        setShowHeartsInfo(true);
      }
      if (h <= 0) onOutOfHearts();
    }
  };

  return (
    <View className="flex-1">
      {/* Top HUD Row */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="h-4 w-2/3 overflow-hidden rounded-full bg-slate-200">
          <Animated.View className="h-full rounded-full bg-green-500" style={{ width: bar.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
        </View>
        <Text className="text-xl font-bold text-red-500">{'\u2764\uFE0F'} {hearts}</Text>
      </View>

      {/* FCC-style instruction card + Duo challenge label */}
      <View className="my-2 rounded-3xl border-2 border-slate-200 bg-white p-4">
        <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Challenge | {questionLabel}
        </Text>
        <Text className="mb-1 font-duo text-xl font-bold text-slate-900">{questionData.prompt}</Text>
        <Text className="text-sm text-slate-500">Assemble the tokens below, run the tests, then check your answer.</Text>
        <Pressable
          onPress={playNarration}
          className={`flex-row items-center self-start rounded-full px-4 py-2 ${
            eliteLocked ? 'bg-slate-700' : 'bg-indigo-600'
          }`}
        >
          <Text className="font-semibold text-white">
            {'\u{1F50A}'} {eliteLocked ? 'Listen (device voice)' : 'Listen to Audiobook Explainer'}
          </Text>
        </Pressable>
        {hint ? <Text className="mt-1 text-xs text-slate-400">{hint}</Text> : null}
      </View>

      {/* FCC-style test console: live pass/fail per test */}
      <View className="mt-2 rounded-2xl bg-slate-950 p-4">
        <Text className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Tests {ranTests ? `· ${tests.filter((t) => t.pass(selectedTokens)).length}/${tests.length} passing` : ''}</Text>
        {tests.map((t, i) => {
          const pass = selectedTokens.length > 0 && t.pass(selectedTokens);
          const show = ranTests || feedback !== null;
          return (
            <Text key={i} className={`mt-1 font-mono text-sm ${!show ? 'text-slate-500' : pass ? 'text-green-400' : 'text-red-400'}`}>
              {!show ? '○' : pass ? '● PASS' : '● FAIL'}  {t.label}
            </Text>
          );
        })}
        <Text className="mt-2 font-mono text-xs text-slate-500">
          {'>'} preview: {selectedTokens.length > 0 ? selectedTokens.join(' ') : '(empty — tap tokens)'}
        </Text>
      </View>

      {/* Assembly drop zone */}
      <View className="mt-4 min-h-24 w-full flex-row flex-wrap items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-950 p-3">
        {selectedTokens.length === 0 ? (
          <Text className="p-1 font-mono text-sm text-slate-600">{'// tap tokens below to build...'}</Text>
        ) : (
          selectedTokens.map((token, i) => (
            <Pressable
              key={`selected-${i}`}
              onPress={() => handleRemoveToken(token, i)}
              className="m-1 rounded-xl bg-sky-500 px-3 py-2 shadow active:scale-95"
            >
              <Text className="font-mono font-bold text-white">{token}</Text>
            </Pressable>
          ))
        )}
      </View>

      {/* Token bank */}
      <View className="my-4">
        <Text className="mb-2 text-sm text-slate-500">Tap tokens to assemble code:</Text>
        <View className="flex-row flex-wrap">
          {availableTokens.map((token, i) => (
            <Pressable
              key={`available-${i}`}
              onPress={() => handleSelectToken(token, i)}
              className="m-1 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 active:bg-slate-200"
            >
              <Text className="font-mono font-semibold text-emerald-600">{token}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {feedback === null ? (
        <View className="mb-8 mt-4 flex-row gap-2">
          <View className="flex-1">
            <DuoButton
              color="blue"
              onPress={() => setRanTests(true)}
              disabled={selectedTokens.length === 0}
              label="Run tests without submitting"
              title="▶ Run"
            />
          </View>
          <View className="flex-[2]">
            <DuoButton
              onPress={checkAnswer}
              disabled={selectedTokens.length === 0}
              label="Check answer"
              title="Check answer"
            />
          </View>
        </View>
      ) : (
        <Reanimated.View style={bannerStyle} className={`mb-8 rounded-3xl p-5 ${feedback === 'correct' ? 'bg-green-100' : 'bg-red-100'}`}>
          <Text className={`font-duo text-xl font-extrabold ${feedback === 'correct' ? 'text-green-700' : 'text-red-600'}`}>
            {feedback === 'correct' ? '\u{1F389} Correct! Great job! +10 XP' : '\u274C Incorrect Syntax'}
          </Text>
          <Text className="mt-1 text-slate-600">
            {feedback === 'correct'
              ? (questionData.explain ?? 'Review your block tags and keep going.')
              : `Expected: ${questionData.correctChain.join(' ')}`}
          </Text>
          {feedback === 'wrong' && questionData.explain ? (
            <Text className="mt-1 text-sm text-slate-500">Why: {questionData.explain}</Text>
          ) : null}
          <View className="mt-3">
            <DuoButton onPress={onContinue} label="Continue to next question" title="Continue" />
          </View>
        </Reanimated.View>
      )}
      {/* First-mistake explainer: hearts introduced exactly when they matter. */}
      {showHeartsInfo ? (
        <View className="absolute inset-0 z-10 items-center justify-center bg-slate-900/70 px-6">
          <View className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl">
            <Text className="text-4xl">💔</Text>
            <Text className="mt-2 text-xl font-extrabold text-slate-900">Wrong answers cost a heart</Text>
            <Text className="mt-1 text-sm leading-5 text-slate-600">
              You have {hearts} {hearts === 1 ? 'heart' : 'hearts'} left. Hearts refill over time — or watch a short ad for +1. Tip: hit Run first to test your code for free!
            </Text>
            <View className="mt-4">
              <DuoButton
                color="red"
                onPress={() => setShowHeartsInfo(false)}
                label="Dismiss hearts explanation"
                title="Got it — I'll be careful"
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
