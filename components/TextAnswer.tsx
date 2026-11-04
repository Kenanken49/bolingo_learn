import { useState } from 'react';
import LessonProgress from './lesson/LessonProgress';
import { View } from 'react-native';
import Text from './ui/Text';
import TextInput from './ui/TextInput';
import DuoButton from './DuoButton';
import AppIcon from './AppIcon';
import type { CodeQuizData } from './GamifiedCodePlayer';
import { normalizeAnswer } from '../lib/quizBank';
import type { BlockKind } from '../lib/curriculum';
import { sessionInstruction, sessionStandard } from '../lib/learningStandards';

interface Props {
  questionData: CodeQuizData;
  questionLabel: string;
  progressPct: number;
  hearts: number;
  sessionKind?: BlockKind;
  onCorrect: () => void;
  onContinue: () => void;
  onAnswer?: (r: { prompt: string; yourAnswer: string; correctAnswer: string; correct: boolean }) => void;
}

/**
 * Free-response exercise for commands and phrases: the learner types the
 * answer instead of tapping it. Near-misses are matched against the
 * question's misconception map so the feedback reteaches the exact slip.
 */
export default function TextAnswer({
  questionData,
  questionLabel,
  progressPct,
  sessionKind,
  onCorrect,
  onContinue,
  onAnswer,
}: Props) {
  const spec = questionData.text;
  const standard = sessionStandard(sessionKind);
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  if (!spec) return null;

  const check = () => {
    if (feedback === 'correct') return;
    const answer = normalizeAnswer(value);
    if (!answer) return;
    setAttemptCount((n) => n + 1);
    const accepted = spec.answers.map(normalizeAnswer);
    const pass = accepted.includes(answer);
    onAnswer?.({
      prompt: questionData.prompt,
      yourAnswer: value.trim(),
      correctAnswer: spec.answers[0],
      correct: pass,
    });
    if (pass) {
      setFeedback('correct');
      setNote(null);
      onCorrect();
      return;
    }
    const misconception = Object.entries(spec.misconceptions ?? {}).find(([k]) => normalizeAnswer(k) === answer)?.[1];
    setFeedback('wrong');
    setNote(misconception ?? `The answer is “${spec.answers[0]}”.`);
  };

  return (
    <View className="flex-1">
      {/* Top HUD Row */}
      <View className="mb-4 flex-row items-center justify-between">
        <LessonProgress pct={progressPct} />
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
          {sessionInstruction(sessionKind)} Type the answer yourself — spelling matters, and so do accents.
        </Text>
      </View>

      {/* Answer field */}
      <View className="mt-3">
        <Text onPhoto className="mb-2 text-sm font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-200">Your answer</Text>
        <TextInput
          value={value}
          onChangeText={(t) => {
            setValue(t);
            if (feedback === 'wrong') {
              setFeedback(null);
              setNote(null);
            }
          }}
          onSubmitEditing={check}
          editable={feedback !== 'correct'}
          returnKeyType="done"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          placeholder={spec.placeholder ?? 'Type it here…'}
          placeholderTextColor="#74748A"
          accessibilityLabel="Type your answer"
          className="rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-4 font-mono text-lg text-slate-900 dark:text-slate-100"
        />
      </View>

      {feedback === null ? (
        <View className="mb-8 mt-4">
          <DuoButton onPress={check} disabled={normalizeAnswer(value).length === 0} label="Check answer" title="Check answer" />
        </View>
      ) : feedback === 'wrong' ? (
        <View className="mb-8 mt-4 rounded-3xl p-5 bg-red-100 dark:bg-red-950">
          <View className="flex-row items-center gap-2">
            <AppIcon name="xCircle" size={24} color="#DC2626" />
            <Text className="font-duo text-xl font-extrabold text-red-600 dark:text-red-400">Not quite</Text>
          </View>
          {note ? <Text className="mt-1 text-sm text-slate-600 dark:text-slate-400">{note}</Text> : null}
          {questionData.explain ? (
            <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">Why: {questionData.explain}</Text>
          ) : null}
          <View className="mt-3">
            <DuoButton color="slate" onPress={() => { setFeedback(null); setNote(null); }} label="Keep editing and try again" title="Try again" />
          </View>
        </View>
      ) : (
        <View className="mb-8 mt-4 rounded-3xl p-5 bg-green-100 dark:bg-green-950">
          <View className="flex-row items-center gap-2">
            <AppIcon name="party" size={24} color="#15803D" />
            <Text className="font-duo text-xl font-extrabold text-green-700 dark:text-green-300">
              {attemptCount > 1 ? 'Correct on retry' : 'Correct!'}
            </Text>
          </View>
          <Text className="mt-1 text-sm text-slate-600 dark:text-slate-400">Answer: {spec.answers[0]}</Text>
          {attemptCount > 1 && standard.firstAttemptCounts ? (
            <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Practice rep complete — your first try is what counts toward mastery.
            </Text>
          ) : null}
          {questionData.explain ? (
            <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">Why: {questionData.explain}</Text>
          ) : null}
          <View className="mt-3">
            <DuoButton onPress={onContinue} label="Continue to next question" title="Continue" />
          </View>
        </View>
      )}
    </View>
  );
}
