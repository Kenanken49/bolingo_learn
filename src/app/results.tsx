import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Pressable, ScrollView, Animated } from 'react-native';
import Text from '../../components/ui/Text';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { getLessonResult } from '../../lib/quizResults';
import { PASS_PCT, resultsScore, shouldCelebrate } from '../../lib/resultsGate';
import { levelProgress, xpForLevel } from '../../lib/levels';
import { playCelebration } from '../../lib/sfx';
import DuoButton from '../../components/DuoButton';
import AppIcon from '../../components/AppIcon';
import Celebration, { FULL_CELEBRATION_MS } from '../../components/Celebration';
import Mascot from '../../components/AfricanMascots';
import { getCompletedLessonIds, getProfile, type Profile } from '../../lib/progress';
import { SKILLS, facetValue, predictObserved, skillOfLesson } from '../../lib/kiki';
import { getKikiState } from '../../lib/kikiStore';
import { getPendingGuestResult, type PendingGuestResult } from '../../lib/onboarding';
import { CURRICULUM, blockByLessonId } from '../../lib/curriculum';
import { isProjectLesson } from '../../lib/courses';

export default function Results() {
  const result = getLessonResult();
  // Unrounded, so the banner and the reward agree on the same pass rule.
  const score = result ? resultsScore(result) : 0;
  const pct = Math.round(score);
  const celebrates = shouldCelebrate(result);
  // Profile-second upsell: guests see a save-progress card after winning XP.
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pending, setPending] = useState<PendingGuestResult | null>(null);
  // Instant gratification: level-up celebration pops over the breakdown.
  const [showLevelUp, setShowLevelUp] = useState(!!result?.leveledUp);
  // Live confetti: when the applause plays, ribbons pour for its full five
  // seconds, then stop and unmount — zero timers in this screen.
  const [burst, setBurst] = useState(celebrates);
  const pop = useRef(new Animated.Value(0.5)).current;
  // XP pop: the earned XP floats up and fades like Duolingo's reward burst.
  const xpRise = useRef(new Animated.Value(0)).current;
  const xpFade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(xpRise, { toValue: -46, duration: 1100, useNativeDriver: true }),
      Animated.timing(xpFade, { toValue: 0, duration: 1100, useNativeDriver: true }),
    ]).start();
  }, [xpRise, xpFade]);
  // The arrival is the reward: one long celebration per finished result, and
  // only when the lesson was actually won (or crossed a level). The quiz's own
  // short chimes stay on the question screen.
  const celebratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!result || !celebrates) return;
    if (celebratedFor.current === result.lessonId) return;
    celebratedFor.current = result.lessonId;
    void playCelebration();
  }, [result, celebrates]);
  useEffect(() => {
    if (!showLevelUp) return;
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
      <View className="flex-1 items-center justify-center px-6">
        <AppIcon name="map" size={44} color="#CBD5E1" />
        <Text className="mt-2 text-lg text-slate-600 dark:text-slate-400">No results yet — finish a lesson first.</Text>
        <Pressable onPress={() => router.replace('/')} className="mt-4 rounded-2xl bg-green-500 px-6 py-3">
          <Text className="font-bold text-white">Back to Path</Text>
        </Pressable>
        <StatusBar style="auto" />
      </View>
    );
  }

  const passed = score >= PASS_PCT;
  const missed = result.results.filter((r) => !r.correct);
  const block = blockByLessonId(result.lessonId);
  // Kiki v3 card: next-best challenge + live 40-dim profile summary.
  const [kikiPick, setKikiPick] = useState<{ lessonId: string; title: string; kind: string; p: number } | null>(null);
  const [kikiBars, setKikiBars] = useState<{ skill: string; v: number }[]>([]);
  useEffect(() => {
    try {
      const st = getKikiState();
      setKikiBars(SKILLS.map((s) => ({ skill: s, v: facetValue(st, s, 'accuracy') })));
      if (!block) return;
      const unit = CURRICULUM.find((u) => u.blocks.some((b) => b.lessonId === block.lessonId));
      if (!unit) return;
      const choose = (done: Set<string>) => {
        const idx = unit.blocks.findIndex((b) => b.lessonId === block.lessonId);
        const next = unit.blocks.slice(idx + 1).find((b) => !done.has(b.lessonId) && !done.has(b.id)) ?? null;
        if (!next) return;
        const sk = st.skills[skillOfLesson(next.lessonId)] ?? 0;
        setKikiPick({ lessonId: next.lessonId, title: next.title, kind: next.kind, p: predictObserved(sk, 0) });
      };
      if (profile?.id) getCompletedLessonIds(profile.id).then(choose).catch(() => choose(new Set()));
      else choose(new Set());
    } catch {}
  }, [block, profile?.id]);

  return (
    <View className="flex-1">
      {burst && celebrates ? (
        <Celebration duration={FULL_CELEBRATION_MS} onDone={() => setBurst(false)} />
      ) : null}
    <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-md items-center self-center px-4 py-8" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      {passed ? (
        <Mascot character="bingo" mood="party" size={110} />
      ) : pct >= 50 ? (
        <Mascot character="livia" mood="happy" size={110} />
      ) : (
        <Mascot character="bingo" mood="sad" size={110} />
      )}
      <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {passed ? 'Bingo is dancing' : pct >= 50 ? 'Livia is proud' : 'Bingo believes in you'}
      </Text>
      <Text className="mt-2 font-duo text-2xl font-extrabold text-slate-900 dark:text-slate-100">Lesson complete!</Text>
      <Text className="text-base text-slate-500 dark:text-slate-400">{result.title}</Text>

      {/* XP burst: floats up off the stat bar, then fades. */}
      <Animated.View style={{ transform: [{ translateY: xpRise }], opacity: xpFade }} className="items-center">
        <View className="rounded-full bg-green-500 px-5 py-2 shadow-lg">
          <View className="flex-row items-center gap-1.5">
            <AppIcon name="party" size={20} color="#FFFFFF" />
            <Text className="font-duo text-xl font-black text-white">+{result.xpEarned} XP</Text>
          </View>
        </View>
      </Animated.View>
      {/* Duo-style XP / accuracy / streak stat bar */}
      <View className="mt-1 w-full max-w-sm flex-row justify-between rounded-3xl bg-slate-900 px-5 py-4">
        <View className="items-center">
          <Text className="text-2xl font-extrabold text-white">+{result.xpEarned}</Text>
          <Text className="text-xs font-bold text-slate-400 dark:text-slate-500">XP</Text>
        </View>
        <View className="items-center">
          <Text className="text-2xl font-extrabold text-white">
            {result.correctCount}/{result.total}
          </Text>
          <Text className="text-xs font-bold text-slate-400 dark:text-slate-500">CORRECT</Text>
        </View>
        <View className="items-center">            <View className="flex-row items-center gap-1">
              <AppIcon name="flame" size={20} color="#FB923C" />
              <Text className="text-2xl font-extrabold text-orange-400">{result.streak}</Text>
            </View>
          <Text className="text-xs font-bold text-slate-400 dark:text-slate-500">STREAK</Text>
        </View>
        {result.bestCombo != null && result.bestCombo >= 2 ? (
          <View className="items-center">
            <Text className="text-2xl font-extrabold text-amber-300">×{result.bestCombo}</Text>
            <Text className="text-xs font-bold text-slate-400 dark:text-slate-500">COMBO</Text>
          </View>
        ) : null}
      </View>

      {/* Kiki v3: the Goldilocks next challenge, picked for YOUR brain. */}
      {kikiPick ? (
        <View className="mt-4 w-full max-w-sm rounded-3xl border-2 border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950 p-4">
          <View className="flex-row items-center gap-1.5">
            <AppIcon name="brain" size={14} color="#8B5CF6" />
            <Text className="text-xs font-extrabold uppercase tracking-widest text-violet-500">
              Kiki v3 · your adaptive coach
            </Text>
          </View>
          <Text className="mt-1 font-duo text-lg font-extrabold text-slate-900 dark:text-slate-100">{kikiPick.title}</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">
            Win chance {Math.round(kikiPick.p * 100)}% —{' '}
            {kikiPick.p >= 0.9
              ? 'a quick win to bank XP'
              : kikiPick.p >= 0.65
                ? 'a Goldilocks sweet spot, right in your zone'
                : kikiPick.p >= 0.45
                  ? 'a healthy stretch goal'
                  : 'a boss battle for big growth'}
            .
          </Text>
          <View className="mt-3">
            <DuoButton
              color="violet"
              onPress={() =>
                kikiPick.kind === 'project'
                  ? router.replace({ pathname: '/project/[lessonId]', params: { lessonId: kikiPick.lessonId, title: kikiPick.title } })
                  : router.replace({ pathname: '/quiz/[lessonId]', params: { lessonId: kikiPick.lessonId, title: kikiPick.title } })
              }
              label={`Start ${kikiPick.title}`}
              title="Take Kiki's pick"
            />
          </View>
        </View>
      ) : null}

      {/* Kiki brain: the live 40-dimensional profile, one bar per skill. */}
      {kikiBars.length > 0 ? (
        <View className="mt-4 w-full max-w-sm rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <View className="flex-row items-center gap-1.5">
            <AppIcon name="brain" size={14} color="#94A3B8" />
            <Text className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Kiki brain · 10 skills × 4 facets
            </Text>
          </View>
          {kikiBars.map((b) => (
            <View key={b.skill} className="mt-1.5 flex-row items-center">
              <Text className="w-14 text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400">{b.skill}</Text>
              <View className="ml-2 h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <View className="h-full rounded-full bg-violet-500" style={{ width: `${Math.round(b.v * 100)}%` }} />
              </View>
              <Text className="ml-2 w-9 text-right text-xs font-bold text-slate-400 dark:text-slate-500">{Math.round(b.v * 100)}%</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View className="mt-3 h-3 w-full max-w-sm overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <View className={`h-full rounded-full ${passed ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
      </View>
      <Text className="mt-1 text-sm font-bold text-slate-400 dark:text-slate-500">{pct}% mastery</Text>

      {/* FCC-style pass / fail certification panel */}
      <View className={`mt-4 w-full max-w-sm rounded-3xl border-2 p-4 ${passed ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950' : 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950'}`}>
        <View className="flex-row items-start gap-2">
          <AppIcon name={passed ? 'checkCircle' : 'pencil'} size={22} color={passed ? '#15803D' : '#B45309'} />
          <Text className={`flex-1 text-lg font-extrabold ${passed ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
            {passed ? 'Quiz passed — 80%+ required' : `${PASS_PCT}% needed to pass — you scored ${pct}%`}
          </Text>
        </View>
        <Text className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {passed
            ? 'Certification check cleared. The next node is unlocked on your path.'
            : 'Review the missed concepts below, then retry. Replays still protect your streak.'}
        </Text>
        {!passed && missed.length > 0 ? (
          <View className="mt-2 gap-1">
            <Text className="text-sm font-extrabold text-slate-700 dark:text-slate-300">Review these concepts:</Text>
            {missed.map((r, i) => (
              <Text key={i} className="text-sm text-slate-600 dark:text-slate-400">
                • {r.prompt}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      <Text className="mt-6 self-start text-lg font-extrabold text-slate-900 dark:text-slate-100">Review</Text>
      {result.results.map((r, i) => (
        <View
          key={i}
          className={`mt-2 w-full max-w-sm rounded-2xl border-2 p-4 ${r.correct ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950' : 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950'}`}
        >
          <View className="flex-row items-center gap-1.5">
            <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">Q{i + 1}</Text>
            <AppIcon name={r.correct ? 'checkCircle' : 'xCircle'} size={15} color={r.correct ? '#22C55E' : '#EF4444'} />
          </View>
          <Text className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">{r.prompt}</Text>
          <Text className={`mt-1 font-mono text-sm ${r.correct ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}`}>
            You: {r.yourAnswer || '—'}
          </Text>
          {!r.correct && <Text className="mt-1 font-mono text-sm text-slate-700 dark:text-slate-300">Answer: {r.correctAnswer}</Text>}
        </View>
      ))}

      {/* Inverted onboarding payoff: value first, account second. */}
      {!profile && pending && pending.xpEarned > 0 ? (
        <View className="mt-4 w-full max-w-sm rounded-3xl border-2 border-green-300 bg-green-50 dark:bg-green-950 p-4">
          <View className="flex-row items-center gap-1.5">
              <AppIcon name="gift" size={22} color="#15803D" />
              <Text className="text-lg font-extrabold text-green-800 dark:text-green-200">Save your +{pending.xpEarned} XP</Text>
            </View>
          <Text className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">
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
            title="Retry"
          />
        </View>
        <View className="flex-1">
          <DuoButton onPress={() => router.replace('/')} label="Back to learning path" title="Path" />
        </View>
      </View>
      {block ? (
        <Pressable
          onPress={() => {
            const unit = CURRICULUM.find((u) => u.blocks.some((b) => b.lessonId === block.lessonId));
            if (unit) router.push({ pathname: '/curriculum/[unitId]', params: { unitId: unit.id } });
          }}
          className="mt-2 w-full max-w-sm items-center rounded-2xl border-2 border-slate-200 dark:border-slate-800 py-3"
        >            <View className="flex-row items-center justify-center gap-1.5">
              <AppIcon name="book" size={17} color="#475569" />
              <Text className="font-extrabold text-slate-600 dark:text-slate-400">Back to syllabus</Text>
            </View>
        </Pressable>
      ) : null}
      {/* LEVEL UP! — variable-reward peak moment, shown once per crossing. */}
      {showLevelUp && result.leveledUp ? (
        <View className="absolute inset-0 z-10 items-center justify-center bg-slate-900/70 px-6">
          <Animated.View
            style={{ transform: [{ scale: pop }] }}
            className="w-full max-w-sm items-center rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-xl"
          >
            <Mascot character="bingo" mood="party" size={110} />
            <Text className="mt-2 font-duo text-3xl font-extrabold text-slate-900 dark:text-slate-100">LEVEL {result.newLevel}!</Text>
            <Text className="mt-1 text-center text-sm leading-5 text-slate-600 dark:text-slate-400">
              Your brain just grew. {result.newLevel && result.totalXp != null
                ? `${Math.max(0, xpForLevel(result.newLevel + 1) - result.totalXp)} XP to Level ${result.newLevel + 1} — keep the streak to climb faster.`
                : 'Keep the streak to climb even faster.'}
            </Text>
            {result.totalXp != null ? (
              <View className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
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
              title="Keep climbing"
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
