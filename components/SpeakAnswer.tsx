import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Text from './ui/Text';
import DuoButton from './DuoButton';
import AppIcon from './AppIcon';
import SpeakBack from './SpeakBack';
import type { CodeQuizData } from './GamifiedCodePlayer';
import type { BlockKind } from '../lib/curriculum';
import { sessionInstruction, sessionStandard } from '../lib/learningStandards';
import { speakAs, type LanguagePreset } from '../lib/pronunciation';
import type { SpeakBackScore } from '../lib/speakBack';

interface Props {
  questionData: CodeQuizData;
  questionLabel: string;
  progressPct: number;
  hearts: number;
  sessionKind?: BlockKind;
  /** The lesson's own voice — the recogniser listens in this language. */
  language: LanguagePreset;
  onCorrect: () => void;
  onContinue: () => void;
  onAnswer?: (r: { prompt: string; yourAnswer: string; correctAnswer: string; correct: boolean }) => void;
}

/** A spoken answer passes at 75% word match or better ("good" in speak-back). */
const DEFAULT_PASS_SCORE = 75;

/**
 * Graded speaking exercise. The phrase is on screen because this is production,
 * not recognition; the verdict comes from the device recogniser scoring what it
 * actually heard. No recogniser result means no verdict — the button never
 * reports a pass the learner did not earn.
 */
export default function SpeakAnswer({
  questionData,
  questionLabel,
  progressPct,
  sessionKind,
  language,
  onCorrect,
  onContinue,
  onAnswer,
}: Props) {
  const spec = questionData.speak;
  const standard = sessionStandard(sessionKind);
  const passScore = spec?.passScore ?? DEFAULT_PASS_SCORE;
  const [attempts, setAttempts] = useState(0);
  const [last, setLast] = useState<SpeakBackScore | null>(null);

  if (!spec) return null;

  const phrase = spec.phrase;

  const grade = (score: SpeakBackScore) => {
    const pass = score.score >= passScore;
    setAttempts((n) => n + 1);
    setLast(score);
    onAnswer?.({
      prompt: questionData.prompt,
      yourAnswer: `“${score.heard}” · ${score.score}% word match`,
      correctAnswer: phrase,
      correct: pass,
    });
    if (pass) onCorrect();
  };

  const passed = !!last && last.score >= passScore;

  return (
    <View className="flex-1">
      {/* Top HUD Row */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="h-4 w-2/3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <View className="h-full rounded-full bg-green-500" style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }} />
        </View>
        <View className="flex-row items-center gap-1">
          <AppIcon name="checkCircle" size={18} color="#0EA5E9" />
          <Text className="text-sm font-extrabold text-sky-600 dark:text-sky-400">{standard.masteryPct}% mastery</Text>
        </View>
      </View>

      {/* Challenge card */}
      <View className="my-2 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {standard.badge} | {questionLabel}
        </Text>
        <Text className="mb-1 font-duo text-xl font-bold text-slate-900 dark:text-slate-100">{questionData.prompt}</Text>
        <Text className="text-sm text-slate-500 dark:text-slate-400">
          {sessionInstruction(sessionKind)} Say it out loud — your device scores the words it hears. Pass at {passScore}%.
        </Text>
        <Text className="mt-2 rounded-2xl bg-slate-100 px-3 py-2 text-lg font-extrabold text-slate-900 dark:bg-slate-800 dark:text-slate-100">
          {phrase}
        </Text>
        <Pressable
          onPress={() => void speakAs({ character: 'livia', text: phrase, language, slow: true })}
          accessibilityRole="button"
          accessibilityLabel="Hear the phrase before you speak"
          className="mt-2 flex-row items-center self-start rounded-full border border-violet-300 bg-violet-50 px-4 py-2 active:bg-violet-100 dark:border-violet-800 dark:bg-violet-950"
        >
          <AppIcon name="volume" size={15} color="#7C3AED" />
          <Text className="ml-1.5 text-sm font-extrabold text-violet-700 dark:text-violet-300">Hear it first</Text>
        </Pressable>
      </View>

      {/* The real capture + word-level scoring */}
      <SpeakBack phrase={phrase} language={language} onScore={grade} />

      {last ? (
        <View className={`mb-8 mt-4 rounded-3xl p-5 ${passed ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'}`}>
          <View className="flex-row items-center gap-2">
            <AppIcon name={passed ? 'party' : 'xCircle'} size={24} color={passed ? '#15803D' : '#DC2626'} />
            <Text
              className={`font-duo text-xl font-extrabold ${
                passed ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {passed
                ? `${last.score}% — ${attempts > 1 ? 'there it is' : 'clear on the first take'}`
                : `${last.score}% — short of ${passScore}%`}
            </Text>
          </View>
          <Text className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Heard: “{last.heard || 'nothing the recogniser could use'}”
          </Text>
          {!passed && attempts > 1 && standard.firstAttemptCounts ? (
            <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Practice rep complete — your first take is what counts toward mastery.
            </Text>
          ) : null}
          {questionData.explain ? (
            <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">Why: {questionData.explain}</Text>
          ) : null}
          <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {passed
              ? 'Say it once more to lock the muscle memory, then continue.'
              : 'Tap the mic again — the green words matched, the red ones are what to fix.'}
          </Text>
          <View className="mt-3">
            <DuoButton onPress={onContinue} label="Continue to next question" title="Continue" />
          </View>
        </View>
      ) : (
        <Text onPhoto className="mb-8 mt-4 text-sm text-slate-600 dark:text-slate-200">
          Nothing is graded until you record — tap “Say it back” when you are ready.
        </Text>
      )}
    </View>
  );
}
