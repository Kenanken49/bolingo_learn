import { useEffect, useRef, useState } from 'react';
import LessonProgress from './lesson/LessonProgress';
import { Pressable, View } from 'react-native';
import Text from './ui/Text';
import TextInput from './ui/TextInput';
import DuoButton from './DuoButton';
import AppIcon from './AppIcon';
import type { CodeQuizData } from './GamifiedCodePlayer';
import { normalizeAnswer } from '../lib/quizBank';
import type { BlockKind } from '../lib/curriculum';
import { sessionInstruction, sessionStandard } from '../lib/learningStandards';
import { speakAs, stopSpeaking, type LanguagePreset } from '../lib/pronunciation';

interface Props {
  questionData: CodeQuizData;
  questionLabel: string;
  progressPct: number;
  hearts: number;
  sessionKind?: BlockKind;
  /** The lesson's own voice. Without it there is nothing to hear, so the
   *  loader drops listen items instead of showing a silent fake. */
  language: LanguagePreset;
  onCorrect: () => void;
  onContinue: () => void;
  onAnswer?: (r: { prompt: string; yourAnswer: string; correctAnswer: string; correct: boolean }) => void;
}

/**
 * Listen-and-type exercise. The phrase is audio only — the text stays hidden
 * until the learner commits an answer, so this drills the ear and not the eye.
 * A device with no voice for this language never gets the item at all.
 */
export default function ListenAnswer({
  questionData,
  questionLabel,
  progressPct,
  sessionKind,
  language,
  onCorrect,
  onContinue,
  onAnswer,
}: Props) {
  const spec = questionData.listen;
  const standard = sessionStandard(sessionKind);
  const phrase = spec?.phrase ?? '';
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [voiceWarning, setVoiceWarning] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const unmounted = useRef(false);

  const play = async (text: string, slow: boolean) => {
    setPlaying(true);
    const result = await speakAs({ character: 'livia', text, language, slow });
    if (unmounted.current) return;
    setPlaying(false);
    if (!result.spoken) {
      setVoiceWarning('This device gave back no audio for that phrase. Check the volume, or read the answer after checking.');
      return;
    }
    if (result.hasVoiceList && !result.matchedVoice) {
      setVoiceWarning(
        result.approximate
          ? `No native ${language.label} voice here — you are hearing the closest match, so some sounds are approximate.`
          : `No ${language.label} voice is installed on this device, so the audio may be spoken in another language.`
      );
    } else {
      setVoiceWarning(null);
    }
  };

  useEffect(() => {
    unmounted.current = false;
    // The clip plays once on arrival; a silent first pass would make the
    // learner think the exercise is broken. One tick late, because the speech
    // engine drops utterances issued during navigation.
    const start = setTimeout(() => {
      if (phrase) void play(phrase, false);
    }, 140);
    return () => {
      unmounted.current = true;
      clearTimeout(start);
      void stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setNote(misconception ?? null);
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

      {/* Challenge card — deliberately without the written phrase */}
      <View className="my-2 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {standard.badge} | {questionLabel}
        </Text>
        <Text className="mb-1 font-duo text-xl font-bold text-slate-900 dark:text-slate-100">{questionData.prompt}</Text>
        <Text className="text-sm text-slate-500 dark:text-slate-400">
          {sessionInstruction(sessionKind)} The words stay hidden until you answer — this one tests your ear.
        </Text>
      </View>

      <View className="mt-2 flex-row items-center gap-3">
        <Pressable
          onPress={() => void play(phrase, false)}
          accessibilityRole="button"
          accessibilityLabel="Play the phrase"
          className="flex-row items-center rounded-2xl border-2 border-sky-300 bg-sky-50 px-5 py-3 active:bg-sky-100 dark:border-sky-800 dark:bg-sky-950"
        >
          <AppIcon name={playing ? 'pause' : 'volume'} size={20} color="#0284C7" />
          <Text className="ml-2 text-base font-extrabold text-sky-700 dark:text-sky-300">
            {playing ? 'Playing…' : 'Play audio'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => void play(phrase, true)}
          accessibilityRole="button"
          accessibilityLabel="Play the phrase slowly"
          className="flex-row items-center rounded-2xl border-2 border-violet-300 bg-violet-50 px-4 py-3 active:bg-violet-100 dark:border-violet-800 dark:bg-violet-950"
        >
          <AppIcon name="headset" size={18} color="#7C3AED" />
          <Text className="ml-1.5 text-sm font-extrabold text-violet-700 dark:text-violet-300">Slowly</Text>
        </Pressable>
      </View>
      {voiceWarning ? (
        <Text onPhoto className="mt-2 text-xs text-amber-700 dark:text-amber-300">{voiceWarning}</Text>
      ) : null}

      {/* Answer field */}
      <View className="mt-3">
        <Text onPhoto className="mb-2 text-sm font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-200">
          What you heard
        </Text>
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
          placeholder={spec.placeholder ?? 'Type what you hear…'}
          placeholderTextColor="#74748A"
          accessibilityLabel="Type what you hear"
          className="rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-4 text-lg text-slate-900 dark:text-slate-100"
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
          <Text className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            The audio said: “{phrase}”
          </Text>
          {note ? <Text className="mt-1 text-sm text-slate-600 dark:text-slate-400">{note}</Text> : null}
          {questionData.explain ? (
            <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">Why: {questionData.explain}</Text>
          ) : null}
          <View className="mt-3 flex-row gap-2">
            <DuoButton color="slate" onPress={() => { setFeedback(null); setNote(null); }} label="Listen again and try" title="Try again" />
            <DuoButton color="slate" onPress={() => void play(phrase, true)} label="Hear it slowly" title="Slow replay" />
          </View>
        </View>
      ) : (
        <View className="mb-8 mt-4 rounded-3xl p-5 bg-green-100 dark:bg-green-950">
          <View className="flex-row items-center gap-2">
            <AppIcon name="party" size={24} color="#15803D" />
            <Text className="font-duo text-xl font-extrabold text-green-700 dark:text-green-300">
              {attemptCount > 1 ? 'Correct on retry' : 'You heard it right'}
            </Text>
          </View>
          <Text className="mt-1 text-sm text-slate-600 dark:text-slate-400">Audio: “{phrase}”</Text>
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
