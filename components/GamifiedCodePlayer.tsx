import { useEffect, useState } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { completeLesson, getProfile, loseHeart } from '../lib/progress';
import { CORRECT_CHIME, WRONG_BUZZ } from '../assets/sounds';

export interface CodeQuizData {
  prompt: string;
  correctChain: string[];
  scrambledTokens: string[];
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
 * feedback chimes, and optional premium narration — the production port of
 * the GamifiedCodePlayer sketch onto expo-audio + progress.ts (no
 * react-native-sound dependency).
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

  useEffect(() => {
    setSelectedTokens([]);
    setAvailableTokens(shuffle(questionData.scrambledTokens));
    setFeedback(null);
  }, [questionData]);

  useEffect(() => {
    Animated.timing(bar, { toValue: progressPct, duration: 400, useNativeDriver: false }).start();
  }, [progressPct, bar]);

  const playNarration = () => {
    if (eliteLocked) {
      setHint('Free voice 🔊 — upgrade to Premium for soothing human-like audiobooks.');
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
    if (isCorrect) {
      setFeedback('correct');
      correctPlayer.seekTo(0);
      correctPlayer.play();
      onCorrect();
    } else {
      setFeedback('wrong');
      wrongPlayer.seekTo(0);
      wrongPlayer.play();
      let h = hearts;
      if (userId) {
        const p = await loseHeart(userId).catch(() => null);
        h = p?.hearts ?? Math.max(0, hearts - 1);
      } else {
        h = hearts - 1;
      }
      onHeartsChange(h);
      if (h <= 0) onOutOfHearts();
    }
  };

  void completeLesson;
  void getProfile;
  void lessonId;

  return (
    <View className="flex-1">
      {/* Top HUD Row */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="h-4 w-2/3 overflow-hidden rounded-full bg-slate-700">
          <Animated.View className="h-full rounded-full bg-emerald-500" style={{ width: bar.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
        </View>
        <Text className="text-xl font-bold text-red-500">❤️ {hearts}</Text>
      </View>

      {/* Challenge display + audiobook anchor */}
      <View className="my-2">
        <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Challenge • {questionLabel}
        </Text>
        <Text className="mb-3 text-xl font-bold text-slate-900">{questionData.prompt}</Text>
        <Pressable
          onPress={playNarration}
          className={`flex-row items-center self-start rounded-full px-4 py-2 ${
            eliteLocked ? 'bg-slate-700' : 'bg-indigo-600'
          }`}
        >
          <Text className="font-semibold text-white">
            🔊 {eliteLocked ? 'Listen (device voice)' : 'Listen to Audiobook Explainer'}
          </Text>
        </Pressable>
        {hint ? <Text className="mt-1 text-xs text-slate-400">{hint}</Text> : null}
      </View>

      {/* Assembly drop zone */}
      <View className="mt-4 min-h-24 w-full flex-row flex-wrap items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-950 p-3">
        {selectedTokens.length === 0 ? (
          <Text className="p-1 font-mono text-sm text-slate-600">{'// tap tokens below to build…'}</Text>
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
        <Pressable
          onPress={checkAnswer}
          disabled={selectedTokens.length === 0}
          className={`mb-8 w-full items-center rounded-2xl py-4 shadow-lg ${
            selectedTokens.length > 0 ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
        >
          <Text className="text-lg font-bold text-white">CHECK ANSWER</Text>
        </Pressable>
      ) : (
        <View className={`mb-8 rounded-3xl p-5 ${feedback === 'correct' ? 'bg-green-100' : 'bg-red-100'}`}>
          <Text className={`text-xl font-extrabold ${feedback === 'correct' ? 'text-green-700' : 'text-red-600'}`}>
            {feedback === 'correct' ? '🎉 Correct! Great job! +10 XP' : '❌ Incorrect Syntax'}
          </Text>
          <Text className="mt-1 text-slate-600">
            {feedback === 'correct'
              ? 'Review your block tags and keep going.'
              : `Expected: ${questionData.correctChain.join(' ')}`}
          </Text>
          <Pressable onPress={onContinue} className="mt-3 items-center rounded-2xl bg-green-500 py-3">
            <Text className="text-lg font-extrabold text-white">Continue</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
