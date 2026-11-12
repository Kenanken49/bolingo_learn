import { useEffect, useRef, useState } from 'react';
import LessonProgress from './lesson/LessonProgress';
import { View, Pressable } from 'react-native';
import Text from './ui/Text';
import DuoButton from './DuoButton';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useAudioPlayer } from 'expo-audio';
import { playQuizCorrect, playWrong, preloadRewardCues } from '../lib/sfx';
import * as Haptics from 'expo-haptics';
// Diamonds gate lesson attempts, never answers: a wrong answer is always free,
// and only a failed lesson costs one diamond. At zero the parent pauses the
// session behind the refill sheet (rewarded video, 4-hour wait, or Premium).
// See docs/admob.md.
import { fetchExplanation } from '../lib/explain';
import { getCourseLesson } from '../lib/courses';
import { getLanguageLesson } from '../lib/languages';
import {
  APP_SPEECH,
  languageForLesson,
  phraseForQuestion,
  promptSegments,
  speakAs,
  speakSegments,
  stopSpeaking,
} from '../lib/pronunciation';
import HelpfulVote from './HelpfulVote';
import { getHapticsOn, getSoundOn } from '../lib/preferences';
import { playNaturalSwahili, stopNaturalSwahili } from '../lib/naturalLessonAudio';
import AppIcon from './AppIcon';
import SpeakBack from './SpeakBack';
import type {
  CodeExercise,
  GuidedLab,
  ListenSpec,
  MatchSpec,
  QuestionKind,
  SpeakSpec,
  TerminalExercise,
  TextAnswerSpec,
} from '../lib/quizBank';
import type { BlockKind } from '../lib/curriculum';
import { sessionInstruction, sessionStandard } from '../lib/learningStandards';

export interface CodeQuizData {
  prompt: string;
  correctChain: string[];
  scrambledTokens: string[];
  /** One-line teaching note shown in the feedback banner. */
  explain?: string;
  /** Premium narration: signed playback URL for a generated audiobook segment. */
  audioUrl?: string;
  isPremium?: boolean;
  /** Exercise kind. Absent means token assembly (the classic player). */
  kind?: QuestionKind;
  /** Present when kind === 'code': runnable JS with per-question assertions. */
  code?: CodeExercise;
  /** Present when kind === 'match': cue/answer pairs to link by tapping. */
  match?: MatchSpec;
  /** Present when kind === 'listen': spoken phrase + accepted transcriptions. */
  listen?: ListenSpec;
  /** Present when kind === 'speak': phrase to say aloud, graded by recogniser. */
  speak?: SpeakSpec;
  /** Present when kind === 'text': accepted answers + misconception reteach. */
  text?: TextAnswerSpec;
  /** Present when kind === 'terminal': the runnable Git lab to attach. */
  terminal?: TerminalExercise;
  /** Present when kind === 'guided': a read-only walkthrough for no-runtime labs. */
  guided?: GuidedLab;
}

interface Props {
  userId: string | null;
  lessonId: string;
  questionData: CodeQuizData;
  questionLabel: string;
  progressPct: number;
  sessionKind?: BlockKind;
  onCorrect: () => void;
  onContinue: () => void;
  onAnswer?: (r: { prompt: string; yourAnswer: string; correctAnswer: string; correct: boolean }) => void;
  /**
   * Resolved lesson theory (already trimmed) from the catalog the screen loaded.
   * Passed in because language lessons can be edited in Supabase without an
   * app release; the bundled lookup below would otherwise ground the tutor in
   * stale text.
   */
  theory?: string;
}

/**
 * Core game engine: token-assembly quiz with animated progress,
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
  sessionKind,
  onCorrect,
  onContinue,
  onAnswer,
  theory: theoryOverride,
}: Props) {
  // Language courses get a native-locale phrase model (Livia) plus a character
  // read of the question (Bingo); everything else keeps the normal narrator.
  const language = getLanguageLesson(lessonId) ? languageForLesson(lessonId) : null;
  const phrase = language ? phraseForQuestion(questionData, language) : null;
  const standard = sessionStandard(sessionKind);
  const liveChecklist = standard.scaffolds;
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [availableTokens, setAvailableTokens] = useState<string[]>(questionData.scrambledTokens);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const narration = useAudioPlayer(questionData.audioUrl ? { uri: questionData.audioUrl } : undefined);
  // Elite voices (ElevenLabs/OpenAI) are premium; free tier hears the same
  // prompt through the phone's built-in robot voice ($0).
  const eliteLocked = !questionData.audioUrl;
  const [hint, setHint] = useState<string | null>(null);
  // Retry tracking: assessment mastery is fixed by the first response, so a
  // successful retry must say so instead of implying a fresh full score.
  const [attemptCount, setAttemptCount] = useState(0);
  // Duolingo Max: personalized tutor explanation for this exact mistake.
  const [explain, setExplain] = useState<string | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  // Slow replay of the correct phrase after a miss (Duolingo-style correction).
  const remedyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // freeCodeCamp-style test checklist. Labels stay generic on purpose: the
  // exact answer is never printed until the learner produces it (see the
  // correct banner below). Live pass/fail still guides each attempt.
  const tests = (() => {
    const chain = questionData.correctChain;
    if (chain.length <= 1) return [{ label: 'Test 1 · the exact answer (1 token)', pass: (s: string[]) => JSON.stringify(s) === JSON.stringify(chain) }];
    return [
      { label: 'Test 1 · opening token correct', pass: (s: string[]) => s[0] === chain[0] },
      { label: 'Test 2 · closing token correct', pass: (s: string[]) => s[s.length - 1] === chain[chain.length - 1] },
      { label: `Test 3 · full chain in order (${chain.length} tokens)`, pass: (s: string[]) => JSON.stringify(s) === JSON.stringify(chain) },
    ];
  })();
  const [ranTests, setRanTests] = useState(false);

  // Juicy feedback: bounce on correct, shake on wrong.
  const pop = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const bannerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }, { translateX: shakeX.value }],
  }));

  const explainAnswer = async () => {
    if (explainLoading || explain) return;
    setExplainLoading(true);
    try {
      const text = await fetchExplanation(
        questionData.prompt,
        selectedTokens.join(' '),
        questionData.correctChain.join(' '),
        {
          theory: theoryOverride ?? getCourseLesson(lessonId)?.theory.slice(0, 2).join(' ').slice(0, 900),
          reference: questionData.explain,
          // Language banks: 1.5B misnames terms even grounded — strong brain first.
          strongFirst: !!getLanguageLesson(lessonId),
        }
      );
      setExplain(text);
    } catch {
      setExplain('Hmm — I could not reach the tutor just now. Check your connection and try again.');
    } finally {
      setExplainLoading(false);
    }
  };

  useEffect(() => {
    void preloadRewardCues();
  }, []);

  useEffect(() => () => {
    if (remedyTimer.current) clearTimeout(remedyTimer.current);
  }, []);

  // A language exercise opens with its phrase, like Duolingo's exercise audio.
  useEffect(() => {
    if (!language || !phrase) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled || !(await getSoundOn()) || cancelled) return;
      await stopNaturalSwahili();
      await stopSpeaking();
      if (cancelled) return;
      // Livia's Swahili model phrase is a bundled Fliki take when one exists;
      // device TTS remains the fallback for unsupported or missing clips.
      if (language.base === 'sw' && (await playNaturalSwahili(phrase))) return;
      if (cancelled) return;
      void speakAs({ character: 'livia', text: phrase, language });
    }, 420);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [language, phrase]);

  // Never leave a character talking over the next screen.
  useEffect(
    () => () => {
      if (remedyTimer.current) clearTimeout(remedyTimer.current);
      void stopNaturalSwahili();
      void stopSpeaking();
    },
    []
  );


  const playNarration = () => {
    void stopNaturalSwahili();
    if (eliteLocked) {
      setHint('Free voice — upgrade to Premium for soothing human-like audiobooks.');
      void speakAs({ character: 'bingo', text: questionData.prompt, language: APP_SPEECH });
      return;
    }
    setHint(null);
    narration.seekTo(0);
    narration.play();
  };

  const noteVoiceQuality = (result: { hasVoiceList: boolean; matchedVoice: boolean; approximate: boolean }) => {
    if (!language || !result.hasVoiceList || result.matchedVoice) return;
    setHint(
      result.approximate
        ? `Approximate ${language.label} — install a ${language.label} voice for native audio.`
        : `No ${language.label} voice installed — add one in system settings for native audio.`
    );
  };

  const speakLanguagePhrase = async (slow = false) => {
    if (!language) return;
    setHint(null);
    await stopNaturalSwahili();
    await stopSpeaking();
    const text = phrase ?? questionData.prompt;
    if (language.base === 'sw' && (await playNaturalSwahili(text, { slow }))) return;
    const result = await speakAs({ character: 'livia', text, language, slow });
    if (!result.spoken) setHint('Speech is unavailable on this device.');
    else noteVoiceQuality(result);
  };

  const readPromptAsBingo = async () => {
    setHint(null);
    await stopNaturalSwahili();
    // Mixed prompts are read in runs: English scaffolding in Bingo's voice,
    // the target phrase in the language's own voice.
    const results = await speakSegments(promptSegments(questionData.prompt, language ?? APP_SPEECH), {
      character: 'bingo',
    });
    if (results.length === 0 || !results.some((r) => r.spoken)) {
      setHint('Speech is unavailable on this device.');
    }
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

  // Wrong attempts get a directional hint (which structural test failed),
  // never the expected chain. Single-token (multiple-choice) questions get
  // an elimination hint instead of an opener/closer pointer.
  const firstFailedTest = feedback === 'wrong' ? tests.findIndex((t) => !t.pass(selectedTokens)) : -1;
  const wrongHint = (() => {
    if (questionData.correctChain.length <= 1) return 'Hint: rule out one option you know is wrong, then try another.';
    if (firstFailedTest === 0) return 'Hint: the opening token is off — re-check how this construct starts.';
    if (firstFailedTest === 1) return 'Hint: the closing token is off — re-check how this construct ends.';
    return 'Hint: the shape is close but the order is not — compare token by token.';
  })();

  const checkAnswer = async () => {
    if (selectedTokens.length === 0 || feedback) return;
    // Wrong answers are free: only a failed lesson costs a diamond, so grading
    // never blocks here. The parent handles the zero-diamond refill sheet.
    setAttemptCount((n) => n + 1);
    const isCorrect = JSON.stringify(selectedTokens) === JSON.stringify(questionData.correctChain);
    onAnswer?.({
      prompt: questionData.prompt,
      yourAnswer: selectedTokens.join(' '),
      correctAnswer: questionData.correctChain.join(' '),
      correct: isCorrect,
    });
    const hapticsOn = await getHapticsOn();
    if (isCorrect) {
      setFeedback('correct');
      // Playful bounce: overshoot then settle.
      pop.set(withSequence(withSpring(1.15, { damping: 6, stiffness: 300 }), withSpring(1, { damping: 10, stiffness: 250 })));
      void playQuizCorrect();
      if (hapticsOn) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      onCorrect();
    } else {
      setFeedback('wrong');
      // Shake: quick left-right jitter that settles at 0.
      shakeX.set(
        withSequence(
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(-6, { duration: 50 }),
          withTiming(0, { duration: 60 })
        )
      );
      void playWrong();
      // Correction: hear the right sentence slowly, once the cue has landed.
      if (language && phrase) {
        if (remedyTimer.current) clearTimeout(remedyTimer.current);
        remedyTimer.current = setTimeout(() => {
          void (async () => {
            await stopNaturalSwahili();
            await stopSpeaking();
            if (language.base === 'sw' && (await playNaturalSwahili(phrase, { slow: true }))) return;
            await speakAs({ character: 'livia', text: phrase, language, slow: true });
          })();
        }, 480);
      }
      if (hapticsOn) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
      }
      // Mistakes are free — the retry is the lesson. Only a failed lesson
      // costs a diamond, and that pause lives in the parent's sheet, so the
      // player never has to know what a refill is.
    }
  };

  return (
    <View className="flex-1">
      {/* Top HUD Row */}
      <View className="mb-4 flex-row items-center justify-between">
        <LessonProgress pct={progressPct} />
        <View className="flex-row items-center gap-1">
          <AppIcon name="checkCircle" size={18} color="#0EA5E9" />
          <Text onPhoto className="text-sm font-extrabold text-sky-600 dark:text-sky-300">{standard.masteryPct}% mastery</Text>
        </View>
      </View>

      {/* FCC-style instruction card + Duo challenge label */}
      <View className="my-2 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {standard.badge} | {questionLabel}
        </Text>
        <Text className="mb-1 font-duo text-xl font-bold text-slate-900 dark:text-slate-100">{questionData.prompt}</Text>
        <Text className="text-sm text-slate-500 dark:text-slate-400">{sessionInstruction(sessionKind)}</Text>
        {language ? (
          <>
            <View className="mt-3 flex-row flex-wrap items-center gap-2">
              <Pressable
                onPress={() => void speakLanguagePhrase()}
                accessibilityRole="button"
                accessibilityLabel={`Hear Livia pronounce the ${language.label} phrase`}
                className="flex-row items-center rounded-full bg-violet-600 px-4 py-2 active:bg-violet-700"
              >
                <AppIcon name="volume" size={16} color="#FFFFFF" />
                <Text className="ml-1.5 font-semibold text-white">Hear Livia · {language.label}</Text>
              </Pressable>
              <Pressable
                onPress={() => void speakLanguagePhrase(true)}
                accessibilityRole="button"
                accessibilityLabel={`Hear Livia pronounce the ${language.label} phrase slowly`}
                className="h-10 w-10 items-center justify-center rounded-full border border-violet-300 bg-violet-50 active:bg-violet-100 dark:border-violet-800 dark:bg-violet-950"
              >
                <Text style={{ fontSize: 17 }}>🐢</Text>
              </Pressable>
              <Pressable
                onPress={() => void readPromptAsBingo()}
                accessibilityRole="button"
                accessibilityLabel="Hear Bingo read the question"
                className="flex-row items-center rounded-full border border-slate-300 bg-white px-4 py-2 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
              >
                <AppIcon name="volume" size={16} color="#64748B" />
                <Text className="ml-1.5 font-semibold text-slate-700 dark:text-slate-200">Bingo reads it</Text>
              </Pressable>
            </View>
            {phrase ? <SpeakBack key={`${lessonId}:${phrase}`} phrase={phrase} language={language} /> : null}
          </>
        ) : (
          <Pressable
            onPress={playNarration}
            className={`flex-row items-center self-start rounded-full px-4 py-2 ${
              eliteLocked ? 'bg-slate-700' : 'bg-indigo-600'
            }`}
          >
            <View className="flex-row items-center gap-1.5">
              <AppIcon name="volume" size={16} color="#FFFFFF" />
              <Text className="font-semibold text-white">
                {eliteLocked ? 'Listen (device voice)' : 'Listen to Audiobook Explainer'}
              </Text>
            </View>
          </Pressable>
        )}
        {hint ? <Text className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</Text> : null}
      </View>

      {/* Live checklist: guided sessions see it immediately; labs and exams
          only see failed tests after committing an answer. */}
      {liveChecklist || feedback !== null ? (
        <View className="mt-2 rounded-2xl bg-slate-950 p-4">
          <Text className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Tests {ranTests ? `· ${tests.filter((t) => t.pass(selectedTokens)).length}/${tests.length} passing` : ''}</Text>
          {tests.map((t, i) => {
            const pass = selectedTokens.length > 0 && t.pass(selectedTokens);
            const show = ranTests || feedback !== null;
            return (
              <Text key={i} className={`mt-1 font-mono text-sm ${!show ? 'text-slate-500 dark:text-slate-400' : pass ? 'text-green-400' : 'text-red-400'}`}>
                {!show ? '○' : pass ? '● PASS' : '● FAIL'}  {t.label}
              </Text>
            );
          })}
          <Text className="mt-2 font-mono text-xs text-slate-500 dark:text-slate-400">
            {'>'} preview: {selectedTokens.length > 0 ? selectedTokens.join(' ') : '(empty — tap tokens)'}
          </Text>
        </View>
      ) : (
        <View className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
          <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Live checklist hidden — {standard.mode === 'assessment' ? 'this is a mastery check' : 'this is independent practice'}. Commit an answer, then the failing steps appear.
          </Text>
        </View>
      )}

      {/* Assembly drop zone */}
      <View className="mt-4 min-h-24 w-full flex-row flex-wrap items-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-950 p-3">
        {selectedTokens.length === 0 ? (
          <Text className="p-1 font-mono text-sm text-slate-600 dark:text-slate-400">{'// tap tokens below to build...'}</Text>
        ) : (
          selectedTokens.map((token, i) => (
            <Pressable
              key={`selected-${i}`}
              onPress={() => handleRemoveToken(token, i)}
              accessibilityRole="button"
              accessibilityLabel={`Remove token ${token}`}
              className="m-1 rounded-xl bg-sky-500 px-3 py-2 shadow active:scale-95"
              style={{ maxWidth: '100%' }}
            >
              <Text className="font-mono font-bold text-white" style={{ flexShrink: 1 }}>{token}</Text>
            </Pressable>
          ))
        )}
      </View>

      {/* Token bank */}
      <View className="my-4">
        <Text onPhoto className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-200">Tap tokens to assemble code:</Text>
        <View className="flex-row flex-wrap">
          {availableTokens.map((token, i) => (
            <Pressable
              key={`available-${i}`}
              onPress={() => handleSelectToken(token, i)}
              accessibilityRole="button"
              accessibilityLabel={`Add token ${token}`}
              className="m-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 active:bg-slate-200"
              style={{ maxWidth: '100%' }}
            >
              <Text className="font-mono font-semibold text-emerald-600 dark:text-emerald-400" style={{ flexShrink: 1 }}>{token}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {feedback === null ? (
        <View className="mb-8 mt-4 flex-row gap-2">
          {liveChecklist ? (
            <View className="flex-1">
              <DuoButton
                color="blue"
                onPress={() => setRanTests(true)}
                disabled={selectedTokens.length === 0}
                label="Run tests without submitting"
                title="Run"
              />
            </View>
          ) : null}
          <View className={liveChecklist ? 'flex-[2]' : 'flex-1'}>
            <DuoButton
              onPress={checkAnswer}
              disabled={selectedTokens.length === 0}
              label="Check answer"
              title="Check answer"
            />
          </View>
        </View>
      ) : (
        <Reanimated.View style={bannerStyle} className={`mb-8 rounded-3xl p-5 ${feedback === 'correct' ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'}`}>
          <View className="flex-row items-center gap-2">
            <AppIcon name={feedback === 'correct' ? 'party' : 'xCircle'} size={24} color={feedback === 'correct' ? '#15803D' : '#DC2626'} />
            <Text className={`font-duo text-xl font-extrabold ${feedback === 'correct' ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}`}>
              {feedback === 'correct'
                ? attemptCount > 1
                  ? 'Correct on retry'
                  : 'Correct!'
                : 'Not quite yet'}
            </Text>
          </View>
          <Text className="mt-1 text-slate-600 dark:text-slate-400">
            {feedback === 'correct'
              ? `Answer: ${questionData.correctChain.join(' ')}`
              : wrongHint}
          </Text>
          {feedback === 'correct' && attemptCount > 1 && standard.firstAttemptCounts ? (
            <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Practice rep complete — your first try is what counts toward mastery.
            </Text>
          ) : null}
          {feedback === 'correct' && questionData.explain ? (
            <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">Why: {questionData.explain}</Text>
          ) : null}
          {feedback === 'wrong' && questionData.explain ? (
            <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">Why: {questionData.explain}</Text>
          ) : null}
          {feedback === 'wrong' ? (
            explain ? (
              <View className="mt-2 rounded-xl bg-violet-50 dark:bg-violet-950 p-3">
                <View className="flex-row items-start gap-1.5">
                  <AppIcon name="sparkles" size={15} color="#7C3AED" />
                  <Text className="flex-1 text-sm leading-5 text-violet-900 dark:text-violet-200">{explain}</Text>
                </View>
                <HelpfulVote
                  userId={userId}
                  lessonTitle={questionLabel}
                  prompt={questionData.prompt}
                  question={selectedTokens.join(' ')}
                  compact
                />
              </View>
            ) : (
              <Pressable
                onPress={() => void explainAnswer()}
                disabled={explainLoading}
                accessibilityRole="button"
                accessibilityLabel="Explain my answer"
                className="mt-2 items-center rounded-xl border-2 border-violet-200 dark:border-violet-900 bg-white dark:bg-slate-900 py-2"
              >
                <Text className={`text-sm font-extrabold ${explainLoading ? 'text-slate-400' : 'text-violet-700'}`}>
                  {explainLoading ? 'Asking the tutor…' : 'Explain my answer'}
                </Text>
              </Pressable>
            )
          ) : null}
          <View className="mt-3">
            {feedback === 'wrong' ? (
              <DuoButton color="blue" onPress={() => setFeedback(null)} label="Try again" title="Try again" />
            ) : (
              <DuoButton onPress={onContinue} label="Continue to next question" title="Continue" />
            )}
          </View>
        </Reanimated.View>
      )}
    </View>
  );
}
