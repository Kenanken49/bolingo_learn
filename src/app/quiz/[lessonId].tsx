import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import GamifiedCodePlayer, { type CodeQuizData } from '../../../components/GamifiedCodePlayer';
import DuoButton from '../../../components/DuoButton';
import Mascot from '../../../components/AfricanMascots';
import { supabase, toDbLessonId } from '../../../lib/supabase';
import { completeLesson, getProfile, MAX_HEARTS } from '../../../lib/progress';
import { signAudioPath } from '../../../lib/audiobook';
import { getCourseLesson } from '../../../lib/courses';
import { setLessonResult, type QuestionResult } from '../../../lib/quizResults';
import { levelForXp } from '../../../lib/levels';
import { gradeCard, getDueItems } from '../../../lib/srs';
import { hasSeenQuizIntro, markQuizIntroSeen, markOnboarded, savePendingGuestResult } from '../../../lib/onboarding';

const DEMO_QUESTIONS: CodeQuizData[] = [
  {
    prompt: 'Wrap this text in a paragraph tag: Hello',
    correctChain: ['<p>', 'Hello', '</p>'],
    scrambledTokens: ['</div>', '<p>', 'Hello', '</p>', '<div>'],
  },
  {
    prompt: 'Which keyword declares a constant in JavaScript? (tap the answer)',
    correctChain: ['const'],
    scrambledTokens: ['let', 'var', 'const', 'static'],
  },
  {
    prompt: 'Build a div wrapping a paragraph:',
    correctChain: ['<div>', '<p>', 'Hi', '</p>', '</div>'],
    scrambledTokens: ['<p>', '</div>', '<div>', 'Hi', '</p>'],
  },
];

interface DbQuestion {
  id: string;
  type: 'multiple-choice' | 'drag-and-drop';
  prompt: string;
  options: string[];
  answer: string;
}

export default function QuizPlayer() {
  const { lessonId, title } = useLocalSearchParams<{ lessonId: string; title?: string }>();
  const [questions, setQuestions] = useState<CodeQuizData[] | null>(null);
  const [index, setIndex] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [userId, setUserId] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState<QuestionResult[]>([]);
  // Micro-onboarding: coach overlay appears the very first time a user meets
  // the quiz player, then never again.
  const [showCoach, setShowCoach] = useState(false);
  // SRS keys parallel `questions` so every graded answer updates memory.
  const [qKeys, setQKeys] = useState<string[]>([]);
  // Daily Review with nothing due renders a celebration, not an error.
  const [reviewEmpty, setReviewEmpty] = useState(false);

  const load = useCallback(async () => {
    // Spaced Repetition: the Daily Review assembles due memory cards into a
    // bite-sized (~5 Q) session instead of loading a static bank.
    if (lessonId === 'srs-review') {
      const rp = await getProfile();
      setUserId(rp?.id ?? null);
      setHearts(rp?.hearts ?? MAX_HEARTS);
      if (!rp) {
        setQuestions([]);
        setReviewEmpty(true);
        return;
      }
      const items = await getDueItems(rp.id).catch(() => []);
      if (items.length === 0) {
        setQuestions([]);
        setReviewEmpty(true);
        return;
      }
      setQuestions(items.map((i) => i.question));
      setQKeys(items.map((i) => i.key));
      return;
    }
    // Real course banks first — demo placeholders and DB lessons after.
    // Bite-sized cap: every session stays 2–5 min (3–6 questions max).
    let baseQuestions: CodeQuizData[] = [];
    let baseKeys: string[] = [];
    const course = getCourseLesson(lessonId);
    if (course) {
      baseQuestions = course.questions.map((q) => ({
        prompt: q.prompt,
        correctChain: q.correctChain,
        scrambledTokens: [...q.scrambledTokens].sort(() => Math.random() - 0.5),
        explain: q.explain,
      }));
      baseKeys = course.questions.map((_, i) => `${lessonId}:${i}`);
    } else if (lessonId.startsWith('demo-')) {
      baseQuestions = DEMO_QUESTIONS;
      baseKeys = DEMO_QUESTIONS.map((_, i) => `${lessonId}:${i}`);
    } else {
      const dbId = toDbLessonId(lessonId); // "45" -> 45 for the integer FK
      const { data, error } = await supabase.from('questions').select('*').eq('lesson_id', dbId).order('created_at');
      if (error) throw error;
      const rows = (data as DbQuestion[] | null) ?? [];
      // Multiple-choice answers collapse to a single token; drag-and-drop
      // splits the stored answer string back into its token chain.
      const mapped: CodeQuizData[] = rows.map((q) => {
        if (q.type === 'multiple-choice') {
          return { prompt: q.prompt, correctChain: [q.answer], scrambledTokens: q.options };
        }
        return { prompt: q.prompt, correctChain: q.answer.split(' '), scrambledTokens: [...q.options].sort(() => Math.random() - 0.5) };
      });
      // Attach narration when this lesson has generated segments.
      const { data: lesson } = await supabase.from('lessons').select('content').eq('id', dbId).single();
      const segments = (lesson?.content as { segments?: Array<{ question_id: string; prompt: string; audio_url: string }> } | null)?.segments ?? [];
      if (segments.length > 0) {
        for (let i = 0; i < Math.min(mapped.length, segments.length); i++) {
          try {
            const url = await signAudioPath(segments[i].audio_url);
            mapped[i] = { ...mapped[i], audioUrl: url };
          } catch {
            // narration stays locked — quiz still playable
          }
        }
      }
      baseQuestions = mapped;
      baseKeys = mapped.map((_, i) => `${lessonId}:${i}`);
    }
    const p = await getProfile();
    setUserId(p?.id ?? null);
    setHearts(p?.hearts ?? MAX_HEARTS);
    // SRS injection: subtly weave up to 2 due memory cards from OTHER lessons
    // into this session so slipping rules resurface right when they're fading.
    // Injected cards keep their original keys so grading reschedules them,
    // and get a 🔁 prefix so learners know why old content reappeared.
    // Total stays bite-sized: never exceed 6 questions per session.
    if (p && baseQuestions.length > 0 && baseQuestions.length < 6) {
      try {
        const room = Math.min(2, 6 - baseQuestions.length);
        const due = (await getDueItems(p.id, 10).catch(() => []))
          .filter((d) => !baseKeys.includes(d.key) && !d.key.startsWith(`${lessonId}:`))
          .slice(0, room);
        if (due.length > 0) {
          const injectedQ = due.map((d) => ({
            ...d.question,
            prompt: `🔁 Review · ${d.lessonTitle}: ${d.question.prompt}`,
          }));
          const injectedK = due.map((d) => d.key);
          // Weave after the 2nd question so the session starts familiar, then recalls.
          const at = Math.min(2, baseQuestions.length);
          baseQuestions = [...baseQuestions.slice(0, at), ...injectedQ, ...baseQuestions.slice(at)];
          baseKeys = [...baseKeys.slice(0, at), ...injectedK, ...baseKeys.slice(at)];
        }
      } catch {
        // injection is best-effort — lesson plays on without it
      }
    }
    setQuestions(baseQuestions);
    setQKeys(baseKeys);
    if (!(await hasSeenQuizIntro())) setShowCoach(true);
  }, [lessonId]);

  useEffect(() => {
    load().catch((e) => console.warn('Quiz load failed:', e));
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      getProfile()
        .then((p) => {
          if (p) setHearts(p.hearts);
        })
        .catch(() => {});
    }, [])
  );

  const q = questions?.[index];

  if (!questions) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-slate-500">Loading questions…</Text>
      </View>
    );
  }
  if (reviewEmpty) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Mascot character="livia" mood="happy" size={110} />
        <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">Livia ✋ says well done</Text>
        <Text className="mt-3 font-duo text-2xl font-extrabold text-slate-900">All caught up!</Text>
        <Text className="mt-1 text-center text-base text-slate-500">
          Nothing is due — your memory is fresh. Come back tomorrow to keep it that way.
        </Text>
        <View className="mt-5 w-full max-w-sm">
          <DuoButton onPress={() => router.replace('/')} label="Back to learning path" title="Path 🗺️" />
        </View>
        <StatusBar style="auto" />
      </View>
    );
  }
  if (questions.length === 0 || !q) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-lg text-slate-600">No questions in this lesson yet.</Text>
        <Pressable onPress={() => router.replace('/')} className="mt-4 rounded-2xl bg-slate-800 px-6 py-3">
          <Text className="font-bold text-white">Back to Path</Text>
        </Pressable>
      </View>
    );
  }

  const finish = () => {
    const xpEarned = correctCount * 10;
    const goResults = (streakCount: number, leveledUp = false, newLevel = 0, totalXp = 0) => {
      setLessonResult({
        lessonId,
        title: String(title ?? 'Lesson'),
        xpEarned,
        streak: streakCount,
        correctCount,
        total: questions?.length ?? 0,
        results: answers,
        leveledUp,
        newLevel,
        totalXp,
      });
      router.replace('/results');
    };
    if (userId) {
      completeLesson(userId, xpEarned, lessonId)
        .then((p) => {
          // Level-up detection: compare the curve before/after this lesson.
          const newLevel = levelForXp(p.xp);
          const leveledUp = newLevel > levelForXp(p.xp - xpEarned);
          goResults(p.streak_count, leveledUp, newLevel, p.xp);
        })
        .catch(() => goResults(0));
    } else {
      // Guest played first: stash the winnings so signup can rescue them.
      void markOnboarded();
      void savePendingGuestResult({
        lessonId,
        title: String(title ?? 'Lesson'),
        xpEarned,
        at: Date.now(),
      });
      goResults(0);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerClassName="bg-white px-6 pb-16 pt-12">
        <GamifiedCodePlayer
          key={`${lessonId}-${index}`}
          userId={userId}
          lessonId={lessonId}
          questionData={q}
          questionLabel={`${String(title ?? 'Lesson')} • Q${index + 1}/${questions.length}`}
          progressPct={Math.round(((index + 1) / questions.length) * 100)}
          hearts={hearts}
          onHeartsChange={setHearts}
          onOutOfHearts={() => router.push('/refill')}
          onCorrect={() => setCorrectCount((c) => c + 1)}
          onAnswer={(r) => {
            setAnswers((a) => [...a, r]);
            // SRS: every graded answer reschedules that memory card.
            if (userId && q) {
              void gradeCard(userId, qKeys[index] ?? `${lessonId}:${index}`, r.correct, {
                prompt: q.prompt,
                correctChain: q.correctChain,
                options: q.scrambledTokens,
                lessonTitle: String(title ?? 'Lesson'),
              });
            }
          }}
          onContinue={() => (index + 1 >= questions.length ? finish() : setIndex((i) => i + 1))}
        />
      </ScrollView>
      {/* First-visit coach marks: contextual, dismissible, shown exactly once. */}
      {showCoach ? (
        <View className="absolute inset-0 z-10 items-center justify-center bg-slate-900/70 px-6">
          <View className="w-full max-w-sm items-center rounded-3xl bg-white p-5 shadow-xl">
            <Mascot character="zora" mood="happy" size={72} />
            <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">Meet Zora ⚡ your coach</Text>
            <Text className="mt-2 font-duo text-xl font-extrabold text-slate-900">How a lesson works</Text>
            {[
              ['👆', 'Tap tokens', 'Build your answer in the drop zone. Tap again to remove one.'],
              ['▶️', 'Run tests', 'Check your code like a real dev — free, no hearts lost.'],
              ['✅', 'Check answer', 'Correct earns +10 XP. Wrong costs one ❤️.'],
            ].map(([icon, title, body]) => (
              <View key={title} className="mt-3 flex-row items-start">
                <Text className="text-2xl">{icon}</Text>
                <View className="ml-2 flex-1">
                  <Text className="font-extrabold text-slate-900">{title}</Text>
                  <Text className="text-sm text-slate-600">{body}</Text>
                </View>
              </View>
            ))}
            <View className="mt-4 w-full">
              <DuoButton
                onPress={() => {
                  void markQuizIntroSeen();
                  setShowCoach(false);
                }}
                label="Start playing"
                title="Got it — let's play"
              />
            </View>
          </View>
        </View>
      ) : null}
      <StatusBar style="auto" />
    </View>
  );
}
