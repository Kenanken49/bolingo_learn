import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, View, Pressable, ScrollView } from 'react-native';
import Text from '../../../components/ui/Text';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import GamifiedCodePlayer, { type CodeQuizData } from '../../../components/GamifiedCodePlayer';
import CodeExercise from '../../../components/CodeExercise';
import TextAnswer from '../../../components/TextAnswer';
import MatchPairs from '../../../components/MatchPairs';
import ListenAnswer from '../../../components/ListenAnswer';
import SpeakAnswer from '../../../components/SpeakAnswer';
import TerminalPlayer from '../../../components/TerminalPlayer';
import GuidedLabPlayer from '../../../components/GuidedLabPlayer';
import DuoButton from '../../../components/DuoButton';
import AppIcon, { type AppIconName } from '../../../components/AppIcon';
import AskBingo from '../../../components/AskBingo';
import Mascot from '../../../components/AfricanMascots';
import OutOfHeartsSheet from '../../../components/OutOfHeartsSheet';
import { supabase, toDbLessonId } from '../../../lib/supabase';
import { getProfile, grantHearts, loseHeart, MAX_HEARTS } from '../../../lib/progress';
import { completeLessonOfflineFirst } from '../../../lib/sync/syncStore';
import { signAudioPath } from '../../../lib/audiobook';
import { getCourseLesson } from '../../../lib/courses';
import { getLanguageLessonAsync, isLanguageLessonId } from '../../../lib/languageCatalog';
import { getLabexLesson, isLabexLessonId } from '../../../lib/labex/load';
import { getGuidedLab } from '../../../lib/labex/guided';
import { GIT_SCENARIOS } from '../../../lib/labex/gitScenarios';
import { setLessonResult, type QuestionResult } from '../../../lib/quizResults';
import { levelForXp } from '../../../lib/levels';
import { gradeCard, getDueItems } from '../../../lib/srs';
import { skillOfLesson } from '../../../lib/kiki';
import { flushKiki, kikiAttempt, loadKiki } from '../../../lib/kikiStore';
import { hasSeenQuizIntro, markQuizIntroSeen, markOnboarded, savePendingGuestResult } from '../../../lib/onboarding';
import { blockByLessonId } from '../../../lib/curriculum';
import { selectSession } from '../../../lib/quizSession';
import { isMastery, sessionStandard } from '../../../lib/learningStandards';
import { languageForLesson } from '../../../lib/pronunciation';
import { speechRecognitionAvailable } from '../../../lib/attemptAudio';
import { track } from '../../../lib/telemetry';

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
  // Role split: Zora introduces code/design lessons; Livia introduces languages.
  const isLanguageLesson = typeof lessonId === 'string' && isLanguageLessonId(lessonId);
  // The path block decides the pedagogy: a lab hides its checklist, an exam
  // counts first attempts, and a guided lesson/workshop lets learners retry.
  const block = typeof lessonId === 'string' ? blockByLessonId(lessonId) : undefined;
  const sessionKind = typeof lessonId === 'string' && lessonId.startsWith('srs-review')
    ? 'review'
    : isLabexLessonId(lessonId)
      ? 'lab'
      : block?.kind ?? 'lesson';
  const standard = sessionStandard(sessionKind);
  // One voice for the whole session: listen and speak items need the lesson's
  // own language, and the loader drops those kinds when it cannot be supplied.
  const lessonSpeech = languageForLesson(lessonId);
  const [questions, setQuestions] = useState<CodeQuizData[] | null>(null);
  // Title and theory come from the loaded catalog, not the route param: a
  // dashboard edit must reach the header and Bingo/Zora's grounding too.
  const [lessonTitle, setLessonTitle] = useState(typeof title === 'string' ? title : 'Lesson');
  const [lessonTheory, setLessonTheory] = useState<string | undefined>(undefined);
  const [index, setIndex] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [userId, setUserId] = useState<string | null>(null);
  // Premium learners never lose hearts, so the refill sheet must never offer
  // them an ad. The flag rides along with every profile read.
  const [isPremium, setIsPremium] = useState(false);
  // One record per question: the first response and the latest practice
  // response. Guided lessons count the final answer; labs/exams count the
  // first, so retrying can never inflate mastery.
  const attemptsRef = useRef<Record<number, { first: QuestionResult; final: QuestionResult }>>({});
  // Session timing feeds the funnel p95 and the experiment guardrail. The
  // clock is read in the load effect, never during render (purity rule).
  const startedAtRef = useRef(0);
  // Micro-onboarding: coach overlay appears the very first time a user meets
  // the quiz player, then never again.
  const [showCoach, setShowCoach] = useState(false);
  // SRS keys parallel `questions` so every graded answer updates memory.
  const [qKeys, setQKeys] = useState<string[]>([]);
  // Daily Review with nothing due renders a celebration, not an error.
  const [reviewEmpty, setReviewEmpty] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  // Addictive combo loop: consecutive correct answers build a visible streak.
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  // Stable per mount, and react-native-web has no useAnimatedValue.
  const [pulse] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (combo < 2) return;
    pulse.setValue(0.7);
    Animated.spring(pulse, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();
  }, [combo, pulse]);

  const load = useCallback(async () => {
    // Spaced Repetition: per-unit Daily Review nodes (lessonId srs-review:<unit>)
    // assemble due memory cards into a bite-sized (~5 Q) session instead of
    // loading a static bank. Distinct ids keep each unit's review node
    // completing independently while sharing one review engine.
    if (lessonId === 'srs-review' || lessonId.startsWith('srs-review:')) {
      const rp = await getProfile();
      setUserId(rp?.id ?? null);
      setHearts(rp?.hearts ?? MAX_HEARTS);
      setIsPremium(rp?.is_premium ?? false);
      if (!rp) {
        setQuestions([]);
        setReviewEmpty(true);
        return;
      }
      const items = await getDueItems(rp.id).catch(() => []);
      if (items.length === 0) {
        // Nothing due still counts as practiced (0 XP): without this the
        // Path review node could never complete and would lock its quiz.
        void completeLessonOfflineFirst({ userId: rp.id, xp: 0, lessonId }).catch(() => {});
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
    // Labs whose runtime this build does not ship keep their knowledge check
    // and add one read-only walkthrough at the end.
    let guidedQuestion: CodeQuizData | null = null;
    // LabEx banks are split per category and resolved on demand; language rows
    // may have been edited in Supabase; core code lessons stay bundled.
    const course = isLabexLessonId(lessonId)
      ? await getLabexLesson(lessonId)
      : (await getLanguageLessonAsync(lessonId)) ?? getCourseLesson(lessonId);
    if (course) {
      const scenario = isLabexLessonId(lessonId) ? GIT_SCENARIOS[lessonId] : undefined;
      // A lab that already runs in this build (terminal VM or code sandbox)
      // never gets the read-only walkthrough — that stage is the fallback for
      // languages this runtime cannot execute.
      const runsHere = !!scenario || course.questions.some((q) => q.kind === 'code');
      const guided = !runsHere && isLabexLessonId(lessonId) ? await getGuidedLab(lessonId) : undefined;
      setLessonTitle(course.title);
      setLessonTheory(course.theory.slice(0, 2).join(' ').slice(0, 900));
      if (scenario) {
        // A runnable lab replaces the recall quiz: the learner performs the
        // real workflow and every task is graded from the repo state.
        baseQuestions = [
          {
            prompt: scenario.brief,
            correctChain: ['Complete every task in the terminal'],
            scrambledTokens: [],
            explain: 'Each task is verified against the repository the terminal actually builds.',
            kind: 'terminal',
            terminal: { scenarioId: lessonId },
          },
        ];
        baseKeys = [`${lessonId}:0`];
      } else {
        const recall = course.questions.map((q) => ({
          prompt: q.prompt,
          correctChain: q.correctChain,
          scrambledTokens: q.scrambledTokens.length > 1 ? [...q.scrambledTokens].sort(() => Math.random() - 0.5) : [...q.scrambledTokens],
          explain: q.explain,
          kind: q.kind,
          match: q.match,
          listen: q.listen,
          speak: q.speak,
          code: q.code,
          text: q.text,
        }));
        // Guided labs stay bite-sized: four recall items, then the walkthrough.
        baseQuestions = guided ? recall.slice(0, 4) : selectSession(recall);
        baseKeys = baseQuestions.map((_, i) => `${lessonId}:${i}`);
        if (guided) {
          guidedQuestion = {
            prompt: `Walk through the “${course.title}” lab step by step`,
            correctChain: ['Walk through every step'],
            scrambledTokens: [],
            explain:
              'This runtime is guided, not executed: the lab keeps its real steps, commands and reference files.',
            kind: 'guided',
            guided,
          };
        }
      }
    } else if (lessonId.startsWith('demo-')) {
      baseQuestions = DEMO_QUESTIONS;
      baseKeys = DEMO_QUESTIONS.map((_, i) => `${lessonId}:${i}`);
    } else if (isLabexLessonId(lessonId)) {
      // A known lab id that failed to resolve must never fall through to the
      // Supabase question table, which has no rows for it.
      baseQuestions = [];
      baseKeys = [];
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
      const segments = (lesson?.content as { segments?: { question_id: string; prompt: string; audio_url: string }[] } | null)?.segments ?? [];
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
    // Assessments and labs shuffle items so a memorised sequence cannot carry
    // a learner through a checkpoint; guided lessons keep their teaching order.
    // Interactive stages (run the code, use the terminal, walk the lab) stay
    // after the recall questions so a session never ends on a soft note.
    if (standard.shuffleQuestions && baseQuestions.length > 1) {
      const paired = baseQuestions.map((question, i) => ({ question, key: baseKeys[i] }));
      const interactive = (q: CodeQuizData) => q.kind === 'code' || q.kind === 'terminal' || q.kind === 'guided';
      const recall = paired.filter((item) => !interactive(item.question));
      const handsOn = paired.filter((item) => interactive(item.question));
      for (let i = recall.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [recall[i], recall[j]] = [recall[j], recall[i]];
      }
      const ordered = [...recall, ...handsOn];
      baseQuestions = ordered.map((item) => item.question);
      baseKeys = ordered.map((item) => item.key);
    }
    const p = await getProfile();
    setUserId(p?.id ?? null);
    setHearts(p?.hearts ?? MAX_HEARTS);
    setIsPremium(p?.is_premium ?? false);
    // Kiki v3 loads its brain alongside the profile (best-effort, never blocks).
    void loadKiki(p?.id ?? null);
    // SRS injection: subtly weave up to 2 due memory cards from OTHER lessons
    // into this session so slipping rules resurface right when they're fading.
    // Injected cards keep their original keys so grading reschedules them,
    // and get a Review prefix so learners know why old content reappeared.
    // Total stays bite-sized: never exceed 6 questions per session.
    if (p && baseQuestions.length > 0 && baseQuestions.length < 6 && !guidedQuestion) {
      try {
        const room = Math.min(2, 6 - baseQuestions.length);
        const due = (await getDueItems(p.id, 10).catch(() => []))
          .filter((d) => !baseKeys.includes(d.key) && !d.key.startsWith(`${lessonId}:`))
          .slice(0, room);
        if (due.length > 0) {
          const injectedQ = due.map((d) => ({
            ...d.question,
            prompt: `Review · ${d.lessonTitle}: ${d.question.prompt}`,
          }));
          const injectedK = due.map((d) => d.key);
          // Weave after the 2nd question so the session starts familiar, then recalls.
          const recallCount = baseQuestions.filter(
            (q) => q.kind !== 'code' && q.kind !== 'terminal' && q.kind !== 'guided'
          ).length;
          const at = Math.min(2, recallCount);
          baseQuestions = [...baseQuestions.slice(0, at), ...injectedQ, ...baseQuestions.slice(at)];
          baseKeys = [...baseKeys.slice(0, at), ...injectedK, ...baseKeys.slice(at)];
        }
      } catch {
        // injection is best-effort — lesson plays on without it
      }
    }
    if (guidedQuestion) {
      baseQuestions = [...baseQuestions, guidedQuestion];
      baseKeys = [...baseKeys, `${lessonId}:guided`];
    }
    // A skill this device cannot run is dropped, never faked: a listening item
    // with no voice, or a speaking item with no recogniser, would hand out a
    // result the learner did not earn. (docs/hands-on-labs.md applies to audio
    // exactly as it does to terminals.)
    const playable = baseQuestions
      .map((question, i) => ({ question, key: baseKeys[i] }))
      .filter(
        ({ question }) =>
          !(question.kind === 'listen' && (!question.listen || !lessonSpeech)) &&
          !(question.kind === 'speak' && (!question.speak || !speechRecognitionAvailable())) &&
          !(question.kind === 'match' && !question.match)
      );
    baseQuestions = playable.map((item) => item.question);
    baseKeys = playable.map((item) => item.key);
    setQuestions(baseQuestions);
    setQKeys(baseKeys);
  }, [lessonId, lessonSpeech, standard.shuffleQuestions]);

  useEffect(() => {
    hasSeenQuizIntro(isLanguageLesson ? 'lang' : 'code')
      .then((seen) => {
        if (!seen) setShowCoach(true);
      })
      .catch(() => {});
  }, [isLanguageLesson]);

  useEffect(() => {
    startedAtRef.current = Date.now();
    if (typeof lessonId === 'string' && lessonId) {
      track('lesson_started', { lessonId, kind: sessionKind });
    }
    Promise.resolve()
      .then(load)
      .catch((e) => {
        console.warn('Quiz load failed:', e);
        setLoadFailed(true);
      });
  }, [load, lessonId, sessionKind]);

  useFocusEffect(
    useCallback(() => {
      getProfile()
        .then((p) => {
          if (p) {
            setHearts(p.hearts);
            setIsPremium(p.is_premium);
          }
        })
        .catch(() => {});
    }, [])
  );

  /**
   * Spend a heart. Signed-in learners persist it through progress.ts (which
   * waives the cost for Premium); guests keep a session-local count, exactly
   * like the rest of guest mode.
   */
  const handleHeartLost = useCallback(async () => {
    // Guests keep their hearts: there is no account to hold a refill, so
    // charging them would dead-end the lesson (no ad reward, no regen).
    if (!userId) return;
    try {
      const p = await loseHeart(userId);
      setHearts(p.hearts);
    } catch {
      // Never break the lesson over a failed write: the learner keeps playing.
    }
  }, [userId]);

  /** The rewarded video completed — persist the heart before closing the sheet. */
  const grantHeart = useCallback(async () => {
    if (!userId) {
      setHearts((h) => Math.min(MAX_HEARTS, h + 1));
      return;
    }
    try {
      const p = await grantHearts(userId, 1);
      setHearts(p.hearts);
    } catch {
      // The sheet stays open; the learner can retry or take the free refill.
    }
  }, [userId]);

  // Zero hearts pauses the session behind the refill sheet: ad, 4-hour wait or
  // Premium. Derived, never stored, so a refilled heart closes the sheet and a
  // spent one reopens it with no extra state to keep in sync.
  const outOfHearts = (questions?.length ?? 0) > 0 && hearts <= 0;

  useEffect(() => {
    if (outOfHearts) track('hearts_depleted', { lessonId });
  }, [outOfHearts, lessonId]);

  const q = questions?.[index];
  // Sessions that contain a runnable or free-response exercise get coach copy
  // about typing instead of token tapping.
  const typedSession = !!questions?.some(
    (qq) =>
      qq.kind === 'code' ||
      qq.kind === 'text' ||
      qq.kind === 'listen' ||
      qq.kind === 'terminal' ||
      qq.kind === 'guided'
  );

  const handleAnswer = (r: QuestionResult) => {
    if (!q) return;
    const previous = attemptsRef.current[index];
    const isFirst = !previous;
    const first = previous?.first ?? r;
    // `final` replaces the practice answer; `first` never changes. Assessment
    // feedback and SRS use the first response, guided practice uses the final.
    attemptsRef.current[index] = { first, final: { ...r, firstTryCorrect: first.correct } };
    if (!isFirst) return;
    // Kiki v3: only the first response is evidence of skill. Retries are
    // practice, not a second chance to inflate the learner model.
    if (typeof lessonId === 'string') {
      const chainLen = Array.isArray(q.correctChain) ? q.correctChain.length : 1;
      const isBuild = q.kind === 'code' || chainLen > 1;
      kikiAttempt(skillOfLesson(lessonId), qKeys[index] ?? `${lessonId}:${index}`, r.correct, { chainLen, isBuild });
    }
    // Combo loop: a first-try correct extends it, a first-try miss resets it.
    if (r.correct) {
      const n = combo + 1;
      setCombo(n);
      if (n > bestCombo) setBestCombo(n);
    } else {
      setCombo(0);
    }
    // SRS snapshots only carry tokens, so a code/text card could not replay in
    // Daily Review. Those exercises are performance tasks — graded, not scheduled.
    if (userId && q.kind !== 'code' && q.kind !== 'text' && q.kind !== 'terminal' && q.kind !== 'guided') {
      void gradeCard(userId, qKeys[index] ?? `${lessonId}:${index}`, r.correct, {
        prompt: q.prompt,
        correctChain: q.correctChain,
        options: q.scrambledTokens,
        lessonTitle,
      });
    }
  };

  if (loadFailed && !questions) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Mascot character="bingo" mood="sad" size={110} />
        <Text onPhoto className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">Nothing to load</Text>
        <Text onPhoto className="mt-3 text-center font-duo text-2xl font-extrabold text-slate-900 dark:text-slate-50">
          This lesson is not available yet
        </Text>
        <Text onPhoto className="mt-3 text-center text-base leading-7 text-slate-700 dark:text-slate-200">
          It may have been renamed or is not part of this build. Your progress is safe — pick another lesson and continue.
        </Text>
        <View className="mt-5 w-full max-w-sm">
          <DuoButton
            color="grey"
            onPress={() => router.replace(isLabexLessonId(lessonId) ? '/labs' : '/')}
            label="Back to my lessons"
            title="Back"
          />
        </View>
      </View>
    );
  }
  if (!questions) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-slate-500 dark:text-slate-400">Loading questions…</Text>
      </View>
    );
  }
  if (reviewEmpty) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Mascot character="livia" mood="happy" size={110} />
        <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Livia says well done</Text>
        <Text className="mt-3 font-duo text-2xl font-extrabold text-slate-900 dark:text-slate-100">All caught up!</Text>
        <Text className="mt-1 text-center text-base text-slate-500 dark:text-slate-400">
          Nothing is due — your memory is fresh. Come back tomorrow to keep it that way.
        </Text>
        <View className="mt-5 w-full max-w-sm">
          <DuoButton onPress={() => router.replace('/')} label="Back to learning path" title="Path" />
        </View>
        <StatusBar style="auto" />
      </View>
    );
  }
  if (questions.length === 0 || !q) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text onPhoto className="text-lg text-slate-600 dark:text-slate-200">No questions in this lesson yet.</Text>
        <Pressable
          onPress={() => router.replace(isLabexLessonId(lessonId) ? '/labs' : '/')}
          className="mt-4 rounded-2xl bg-slate-800 px-6 py-3"
        >
          <Text className="font-bold text-white">{isLabexLessonId(lessonId) ? 'Back to lab library' : 'Back to Path'}</Text>
        </Pressable>
      </View>
    );
  }

  const finish = () => {
    void flushKiki();
    const total = questions?.length ?? 0;
    const entries = questions
      ?.map((_, i) => attemptsRef.current[i])
      .filter((entry): entry is { first: QuestionResult; final: QuestionResult } => Boolean(entry)) ?? [];
    const firstCorrect = entries.filter((entry) => entry.first.correct).length;
    const finalCorrect = entries.filter((entry) => entry.final.correct).length;
    // Guided lessons and workshops count the corrected final answer; labs,
    // reviews, and exams count the first attempt so retries cannot rewrite it.
    const counted = standard.firstAttemptCounts ? firstCorrect : finalCorrect;
    const mastered = isMastery(counted, total, sessionKind);
    const xpEarned = mastered ? counted * standard.xpPerCorrect : 0;
    track('quiz_submitted', {
      lessonId,
      kind: sessionKind,
      correct: counted,
      total,
      scorePct: total > 0 ? Math.round((counted / total) * 100) : 0,
      mastered,
      firstTryCorrect: firstCorrect,
      durationMs: startedAtRef.current > 0 ? Date.now() - startedAtRef.current : 0,
      ok: mastered,
    });
    const reviewAnswers = entries.map((entry) => ({
      ...(standard.firstAttemptCounts ? entry.first : entry.final),
      firstTryCorrect: entry.first.correct,
    }));
    const goResults = (streakCount: number, leveledUp = false, newLevel = 0, totalXp = 0, pendingSync = false) => {
      setLessonResult({
        lessonId,
        title: lessonTitle,
        xpEarned,
        streak: streakCount,
        correctCount: counted,
        total,
        results: reviewAnswers,
        bestCombo,
        mastered,
        firstTryCorrect: firstCorrect,
        leveledUp,
        newLevel,
        totalXp,
        pendingSync,
        durationMs: startedAtRef.current > 0 ? Date.now() - startedAtRef.current : undefined,
      });
      router.replace('/results');
    };
    // A failed mastery check does not unlock the node or award XP. The results
    // screen keeps the retry button, so the learner can review and try again.
    if (!mastered) {
      if (userId) {
        getProfile()
          .then((p) => goResults(p?.streak_count ?? 0))
          .catch(() => goResults(0));
      } else {
        void markOnboarded();
        goResults(0);
      }
      return;
    }
    if (userId) {
      // Offline-first: saved to the cloud now, or queued on the device when the
      // network is down and uploaded by Smart Sync once it's back.
      completeLessonOfflineFirst({ userId, xp: xpEarned, lessonId })
        .then((r) => {
          if (r.queued) {
            goResults(0, false, 0, 0, true);
            return;
          }
          // Level-up detection: compare the curve before/after this lesson.
          const p = r.profile;
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
        title: lessonTitle,
        xpEarned,
        at: Date.now(),
      });
      goResults(0);
    }
  };

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-xl self-center px-4 pb-24 pt-8" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Combo banner: pops every time the streak extends past 1. */}
        {combo >= 2 ? (
          <Animated.View
            style={{ transform: [{ scale: pulse }] }}
            className="mb-2 items-center rounded-2xl bg-orange-500 py-2"
          >
            <View className="flex-row items-center justify-center gap-1.5">
              <AppIcon name="flame" size={20} color="#FFFFFF" />
              <Text className="text-lg font-black text-white">
                COMBO ×{combo}{combo >= 5 ? ' — UNSTOPPABLE' : combo >= 3 ? ' — ON FIRE' : ''}
              </Text>
            </View>
          </Animated.View>
        ) : null}
        {q.kind === 'code' && q.code ? (
          <CodeExercise
            key={`${lessonId}-${index}`}
            userId={userId}
            lessonId={lessonId}
            questionData={q}
            questionLabel={`${lessonTitle} • Q${index + 1}/${questions.length}`}
            progressPct={Math.round(((index + 1) / questions.length) * 100)}
            hearts={hearts}
            sessionKind={sessionKind}
            onCorrect={() => {}}
            onAnswer={handleAnswer}
            onContinue={() => (index + 1 >= questions.length ? finish() : setIndex((i) => i + 1))}
          />
        ) : q.kind === 'terminal' && q.terminal && GIT_SCENARIOS[q.terminal.scenarioId] ? (
          <TerminalPlayer
            key={`${lessonId}-${index}`}
            userId={userId}
            lessonId={lessonId}
            prompt={q.prompt}
            questionLabel={`${lessonTitle} • Q${index + 1}/${questions.length}`}
            progressPct={Math.round(((index + 1) / questions.length) * 100)}
            hearts={hearts}
            sessionKind={sessionKind}
            terminal={q.terminal}
            scenario={GIT_SCENARIOS[q.terminal.scenarioId]}
            onCorrect={() => {}}
            onAnswer={handleAnswer}
            onContinue={() => (index + 1 >= questions.length ? finish() : setIndex((i) => i + 1))}
          />
        ) : q.kind === 'guided' && q.guided ? (
          <GuidedLabPlayer
            key={`${lessonId}-${index}`}
            lessonId={lessonId}
            prompt={q.prompt}
            questionLabel={`${lessonTitle} • Q${index + 1}/${questions.length}`}
            progressPct={Math.round(((index + 1) / questions.length) * 100)}
            sessionKind={sessionKind}
            guided={q.guided}
            onCorrect={() => {}}
            onAnswer={handleAnswer}
            onContinue={() => (index + 1 >= questions.length ? finish() : setIndex((i) => i + 1))}
          />
        ) : q.kind === 'match' && q.match ? (
          <MatchPairs
            key={`${lessonId}-${index}`}
            questionData={q}
            questionLabel={`${lessonTitle} • Q${index + 1}/${questions.length}`}
            progressPct={Math.round(((index + 1) / questions.length) * 100)}
            hearts={hearts}
            sessionKind={sessionKind}
            onCorrect={() => {}}
            onAnswer={handleAnswer}
            onContinue={() => (index + 1 >= questions.length ? finish() : setIndex((i) => i + 1))}
          />
        ) : q.kind === 'listen' && q.listen && lessonSpeech ? (
          <ListenAnswer
            key={`${lessonId}-${index}`}
            questionData={q}
            questionLabel={`${lessonTitle} • Q${index + 1}/${questions.length}`}
            progressPct={Math.round(((index + 1) / questions.length) * 100)}
            hearts={hearts}
            sessionKind={sessionKind}
            language={lessonSpeech}
            onCorrect={() => {}}
            onAnswer={handleAnswer}
            onContinue={() => (index + 1 >= questions.length ? finish() : setIndex((i) => i + 1))}
          />
        ) : q.kind === 'speak' && q.speak && lessonSpeech ? (
          <SpeakAnswer
            key={`${lessonId}-${index}`}
            questionData={q}
            questionLabel={`${lessonTitle} • Q${index + 1}/${questions.length}`}
            progressPct={Math.round(((index + 1) / questions.length) * 100)}
            hearts={hearts}
            sessionKind={sessionKind}
            language={lessonSpeech}
            onCorrect={() => {}}
            onAnswer={handleAnswer}
            onContinue={() => (index + 1 >= questions.length ? finish() : setIndex((i) => i + 1))}
          />
        ) : q.kind === 'text' && q.text ? (
          <TextAnswer
            key={`${lessonId}-${index}`}
            questionData={q}
            questionLabel={`${lessonTitle} • Q${index + 1}/${questions.length}`}
            progressPct={Math.round(((index + 1) / questions.length) * 100)}
            hearts={hearts}
            sessionKind={sessionKind}
            onCorrect={() => {}}
            onAnswer={handleAnswer}
            onContinue={() => (index + 1 >= questions.length ? finish() : setIndex((i) => i + 1))}
          />
        ) : (
          <GamifiedCodePlayer
            key={`${lessonId}-${index}`}
            userId={userId}
            lessonId={lessonId}
            questionData={q}
            theory={lessonTheory}
            questionLabel={`${lessonTitle} • Q${index + 1}/${questions.length}`}
            progressPct={Math.round(((index + 1) / questions.length) * 100)}
            hearts={hearts}
            sessionKind={sessionKind}
            onHeartsChange={setHearts}
            onHeartLost={handleHeartLost}
            onOutOfHearts={() => router.push('/refill')}
            onCorrect={() => {}}
            onAnswer={handleAnswer}
            onContinue={() => (index + 1 >= questions.length ? finish() : setIndex((i) => i + 1))}
          />
        )}
      </ScrollView>
      {/* First-visit coach marks: contextual, dismissible, shown exactly once. */}
      {showCoach ? (
        <View className="absolute inset-0 z-10 items-center justify-center bg-slate-900/70 px-6">
          <View className="w-full max-w-sm items-center rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-xl">
            <Mascot character={isLanguageLesson ? 'livia' : 'zora'} mood="happy" size={72} />
            <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {isLanguageLesson ? 'Meet Livia, your language mentor' : 'Meet Zora, your build coach'}
            </Text>
            <Text className="mt-2 font-duo text-xl font-extrabold text-slate-900 dark:text-slate-100">How a lesson works</Text>
            {[
                typedSession
                  ? ['code', 'Write and run', 'Type your answer, then run the tests — free, no hearts lost.']
                  : ['hand', 'Tap tokens', 'Build your answer in the drop zone. Tap again to remove one.'],
                isLanguageLesson
                  ? ['volume', 'Hear Livia', 'Livia pronounces the phrase in its native voice — tap 🐢 to hear it slowly. Bingo can read the question too.']
                  : ['play', 'Run tests', 'Check your code like a real dev — free, no hearts lost.'],
                ['checkCircle', 'Check answer', 'Correct earns +10 XP. A wrong answer costs a heart — at zero, a short video gives one back.'],
              ].map(([icon, title, body]) => (
              <View key={title} className="mt-3 flex-row items-start">
                <AppIcon name={icon as AppIconName} size={26} color="#0F172A" />
                <View className="ml-2 flex-1">
                  <Text className="font-extrabold text-slate-900 dark:text-slate-100">{title}</Text>
                  <Text className="text-sm text-slate-600 dark:text-slate-400">{body}</Text>
                </View>
              </View>
            ))}
            <View className="mt-4 w-full">
              <DuoButton
                onPress={() => {
                  void markQuizIntroSeen(isLanguageLesson ? 'lang' : 'code');
                  setShowCoach(false);
                }}
                label="Start playing"
                title="Got it — let's play"
              />
            </View>
          </View>
        </View>
      ) : null}
      {/* Super Intelligent help: Bingo answers stuck learners in context, grounded in lesson theory. */}
      <AskBingo
        lessonTitle={lessonTitle}
        prompt={q?.prompt}
        theory={lessonTheory}
        strongFirst={isLanguageLesson}
        userId={userId}
        isPremium={isPremium}
      />
      <OutOfHeartsSheet
        visible={outOfHearts}
        hearts={hearts}
        isPremium={isPremium}
        onEarned={grantHeart}
        onClose={() => router.replace('/')}
        onOpenAllOptions={() => router.push('/refill')}
        onOpenPremium={() => router.push('/paywall')}
      />
      <StatusBar style="auto" />
    </View>
  );
}
