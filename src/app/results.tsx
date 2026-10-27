import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Animated } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { getLessonResult } from '../../lib/quizResults';
import { levelProgress, xpForLevel } from '../../lib/levels';
import { playCorrect } from '../../lib/sfx';
import DuoButton from '../../components/DuoButton';
import DuoOwl from '../../components/DuoOwl';
import { getProfile, type Profile } from '../../lib/progress';
import { getPendingGuestResult, type PendingGuestResult } from '../../lib/onboarding';
import { CURRICULUM, blockByLessonId } from '../../lib/curriculum';
import { isProjectLesson } from '../../lib/courses';

/** freeCodeCamp-style pass threshold. */
const PASS_PCT = 80;

export default function Results() {
  const result = getLessonResult();
  // Profile-second upsell: guests see a save-progress card after winning XP.
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pending, setPending] = useState<PendingGuestResult | null>(null);
  // Instant gratification: level-up celebration pops over the breakdown.
  const [showLevelUp, setShowLevelUp] = useState(!!result?.leveledUp);
  const pop = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    if (!showLevelUp) return;
    void playCorrect();
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }, [showLevelUp, pop]);
  useFocusEffect(
    useCallback(() => {
      getProfile()
        .then(async (p) => {
          setProfile(p);
          if (!p) setPending(await getPendingGuestResult());
        })
        .catch(() => {});
    }, [])
  );

  if (!result) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-4xl">🗺️</Text>
        <Text className="mt-2 text-lg text-slate-600">No results yet — finish a lesson first.</Text>
        <Pressable onPress={() => router.replace('/')} className="mt-4 rounded-2xl bg-green-500 px-6 py-3">
          <Text className="font-bold text-white">Back to Path</Text>
        </Pressable>
        <StatusBar style="auto" />
      </View>
    );
  }

  const pct = result.total > 0 ? Math.round((result.correctCount / result.total) * 100) : 0;
  const passed = pct >= PASS_PCT;
  const missed = result.results.filter((r) => !r.correct);
  const block = blockByLessonId(result.lessonId);

  return (
    <View className="flex-1 bg-white">
    <ScrollView contentContainerClassName="items-center bg-white px-6 py-12">
      <DuoOwl mood={pct >= 80 ? 'party' : pct >= 50 ? 'happy' : 'sad'} size={110} />
      <Text className="mt-2 font-duo text-2xl font-extrabold text-slate-900">Lesson complete!</Text>
      <Text className="text-base text-slate-500">{result.title}</Text>

      {/* Duo-style XP / accuracy / streak stat bar */}
      <View className="mt-4 w-full max-w-sm flex-row justify-between rounded-3xl bg-slate-900 px-5 py-4">
        <View className="items-center">
          <Text className="text-2xl font-extrabold text-white">+{result.xpEarned}</Text>
          <Text className="text-xs font-bold text-slate-400">XP</Text>
        </View>
        <View className="items-center">
          <Text className="text-2xl font-extrabold text-white">
            {result.correctCount}/{result.total}
          </Text>
          <Text className="text-xs font-bold text-slate-400">CORRECT</Text>
        </View>
        <View className="items-center">
          <Text className="text-2xl font-extrabold text-orange-400">🔥{result.streak}</Text>
          <Text className="text-xs font-bold text-slate-400">STREAK</Text>
        </View>
      </View>

      <View className="mt-3 h-3 w-full max-w-sm overflow-hidden rounded-full bg-slate-200">
        <View className={`h-full rounded-full ${passed ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
      </View>
      <Text className="mt-1 text-sm font-bold text-slate-400">{pct}% mastery</Text>

      {/* FCC-style pass / fail certification panel */}
      <View className={`mt-4 w-full max-w-sm rounded-3xl border-2 p-4 ${passed ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
        <Text className={`text-lg font-extrabold ${passed ? 'text-green-700' : 'text-amber-700'}`}>
          {passed ? '✅ Quiz passed — 80%+ required' : `📝 ${PASS_PCT}% needed to pass — you scored ${pct}%`}
        </Text>
        <Text className="mt-1 text-sm text-slate-600">
          {passed
            ? 'Certification check cleared. The next node is unlocked on your path.'
            : 'Review the missed concepts below, then retry. Replays still protect your streak.'}
        </Text>
        {!passed && missed.length > 0 ? (
          <View className="mt-2 gap-1">
            <Text className="text-sm font-extrabold text-slate-700">Review these concepts:</Text>
            {missed.map((r, i) => (
              <Text key={i} className="text-sm text-slate-600">
                • {r.prompt}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      <Text className="mt-6 self-start text-lg font-extrabold text-slate-900">Review</Text>
      {result.results.map((r, i) => (
        <View
          key={i}
          className={`mt-2 w-full max-w-sm rounded-2xl border-2 p-4 ${r.correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
        >
          <Text className="text-sm font-bold text-slate-500">
            Q{i + 1} {r.correct ? '✅' : '❌'}
          </Text>
          <Text className="mt-1 text-base font-bold text-slate-900">{r.prompt}</Text>
          <Text className={`mt-1 font-mono text-sm ${r.correct ? 'text-green-700' : 'text-red-600'}`}>
            You: {r.yourAnswer || '—'}
          </Text>
          {!r.correct && <Text className="mt-1 font-mono text-sm text-slate-700">Answer: {r.correctAnswer}</Text>}
        </View>
      ))}

      {/* Inverted onboarding payoff: value first, account second. */}
      {!profile && pending && pending.xpEarned > 0 ? (
        <View className="mt-4 w-full max-w-sm rounded-3xl border-2 border-green-300 bg-green-50 p-4">
          <Text className="text-lg font-extrabold text-green-800">🎁 Save your +{pending.xpEarned} XP</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-600">
            Nice work! Create a free account to keep this XP, protect your streak, and sync across devices.
          </Text>
          <View className="mt-3">
            <DuoButton
              onPress={() => router.push('/auth')}
              label="Save progress by creating an account"
              title="Save my progress"
            />
          </View>
        </View>
      ) : null}

      <View className="mt-6 w-full max-w-sm flex-row gap-2">
        <View className="flex-1">
          <DuoButton
            color="slate"
            onPress={() =>
              isProjectLesson(result.lessonId)
                ? router.replace({ pathname: '/project/[lessonId]', params: { lessonId: result.lessonId, title: result.title } })
                : router.replace({ pathname: '/quiz/[lessonId]', params: { lessonId: result.lessonId, title: result.title } })
            }
            label="Retry this lesson"
            title="Retry 🔁"
          />
        </View>
        <View className="flex-1">
          <DuoButton onPress={() => router.replace('/')} label="Back to learning path" title="Path 🗺️" />
        </View>
      </View>
      {block ? (
        <Pressable
          onPress={() => {
            const unit = CURRICULUM.find((u) => u.blocks.some((b) => b.lessonId === block.lessonId));
            if (unit) router.push({ pathname: '/curriculum/[unitId]', params: { unitId: unit.id } });
          }}
          className="mt-2 w-full max-w-sm items-center rounded-2xl border-2 border-slate-200 py-3"
        >
          <Text className="font-extrabold text-slate-600">📖 Back to syllabus</Text>
        </Pressable>
      ) : null}
      {/* LEVEL UP! — variable-reward peak moment, shown once per crossing. */}
      {showLevelUp && result.leveledUp ? (
        <View className="absolute inset-0 z-10 items-center justify-center bg-slate-900/70 px-6">
          <Animated.View
            style={{ transform: [{ scale: pop }] }}
            className="w-full max-w-sm items-center rounded-3xl bg-white p-6 shadow-xl"
          >
            <DuoOwl mood="party" size={110} />
            <Text className="mt-2 font-duo text-3xl font-extrabold text-slate-900">LEVEL {result.newLevel}!</Text>
            <Text className="mt-1 text-center text-sm leading-5 text-slate-600">
              Your brain just grew. {result.newLevel && result.totalXp != null
                ? `${Math.max(0, xpForLevel(result.newLevel + 1) - result.totalXp)} XP to Level ${result.newLevel + 1} — keep the streak to climb faster.`
                : 'Keep the streak to climb even faster.'}
            </Text>
            {result.totalXp != null ? (
              <View className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <View
                  className="h-full rounded-full bg-violet-500"
                  style={{
                    width: `${Math.round((levelProgress(result.totalXp).into / levelProgress(result.totalXp).needed) * 100)}%`,
                  }}
                />
              </View>
            ) : null}
            <View className="mt-4 w-full">
              <DuoButton
                color="violet"
                onPress={() => setShowLevelUp(false)}
                label="Continue to results"
                title="Keep climbing 🚀"
              />
            </View>
          </Animated.View>
        </View>
      ) : null}
    </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
}
