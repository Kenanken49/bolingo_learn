import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import GamifiedCodePlayer, { type CodeQuizData } from '../../../components/GamifiedCodePlayer';
import { supabase, toDbLessonId } from '../../../lib/supabase';
import { completeLesson, getProfile, MAX_HEARTS } from '../../../lib/progress';
import { signAudioPath } from '../../../lib/audiobook';
import { setLessonResult, type QuestionResult } from '../../../lib/quizResults';

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

  const load = useCallback(async () => {
    if (lessonId.startsWith('demo-')) {
      setQuestions(DEMO_QUESTIONS);
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
      setQuestions(mapped);
    }
    const p = await getProfile();
    setUserId(p?.id ?? null);
    setHearts(p?.hearts ?? MAX_HEARTS);
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
  if (questions.length === 0 || !q) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-lg text-slate-600">No questions in this lesson yet.</Text>
        <Pressable onPress={() => router.back()} className="mt-4 rounded-2xl bg-slate-800 px-6 py-3">
          <Text className="font-bold text-white">Back to Path</Text>
        </Pressable>
      </View>
    );
  }

  const finish = () => {
    const xpEarned = correctCount * 10;
    const goResults = (streakCount: number) => {
      setLessonResult({
        lessonId,
        title: String(title ?? 'Lesson'),
        xpEarned,
        streak: streakCount,
        correctCount,
        total: questions?.length ?? 0,
        results: answers,
      });
      router.replace('/results');
    };
    if (userId) {
      completeLesson(userId, xpEarned, lessonId)
        .then((p) => goResults(p.streak_count))
        .catch(() => goResults(0));
    } else {
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
          onAnswer={(r) => setAnswers((a) => [...a, r])}
          onContinue={() => (index + 1 >= questions.length ? finish() : setIndex((i) => i + 1))}
        />
      </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
}
