import { useEffect, useRef, useState } from 'react';
import LessonProgress from './lesson/LessonProgress';
import { Pressable, View } from 'react-native';
import Text from './ui/Text';
import DuoButton from './DuoButton';
import AppIcon from './AppIcon';
import type { CodeQuizData } from './GamifiedCodePlayer';
import type { BlockKind } from '../lib/curriculum';
import { sessionInstruction, sessionStandard } from '../lib/learningStandards';

interface Props {
  questionData: CodeQuizData;
  questionLabel: string;
  progressPct: number;
  diamonds: number;
  sessionKind?: BlockKind;
  onCorrect: () => void;
  onContinue: () => void;
  onAnswer?: (r: { prompt: string; yourAnswer: string; correctAnswer: string; correct: boolean }) => void;
}

type Side = 'left' | 'right';

interface Selection {
  side: Side;
  index: number;
}

function shuffled<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Tap-the-pairs exercise: every cue on the left is linked to its partner on
 * the right. Nothing is typed, so this drills fast recognition instead of
 * recall-by-spelling. A pair only locks when both sides truly belong together,
 * and the item is graded on the whole board — zero corrections means correct.
 */
export default function MatchPairs({
  questionData,
  questionLabel,
  progressPct,
  sessionKind,
  onCorrect,
  onContinue,
  onAnswer,
}: Props) {
  const spec = questionData.match;
  const standard = sessionStandard(sessionKind);
  const pairs = spec?.pairs ?? [];
  const [rightOrder] = useState(() =>
    shuffled(pairs.map((pair, index) => ({ text: pair.right, pairIndex: index })))
  );
  const [linked, setLinked] = useState<number[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [flash, setFlash] = useState<{ left: number; right: number } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [done, setDone] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    []
  );

  if (!spec || pairs.length === 0) return null;

  const solution = pairs.map((pair) => `${pair.left} → ${pair.right}`).join('; ');

  const link = (left: number, rightSlot: number) => {
    if (rightOrder[rightSlot]?.pairIndex === left) {
      const all = [...linked, left];
      setLinked(all);
      setSelection(null);
      if (all.length === pairs.length) {
        const clean = mistakes === 0;
        setDone(true);
        onAnswer?.({
          prompt: questionData.prompt,
          yourAnswer: clean ? 'All pairs first try' : `${pairs.length} pairs, ${mistakes} corrections`,
          correctAnswer: solution,
          correct: clean,
        });
        if (clean) onCorrect();
      }
      return;
    }
    setMistakes((n) => n + 1);
    setFlash({ left, right: rightSlot });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 480);
    setSelection(null);
  };

  const tapLeft = (index: number) => {
    if (done || linked.includes(index)) return;
    if (selection?.side === 'left' && selection.index === index) {
      setSelection(null);
      return;
    }
    if (selection?.side === 'right') {
      link(index, selection.index);
      return;
    }
    setSelection({ side: 'left', index });
  };

  const tapRight = (index: number) => {
    if (done || linked.includes(rightOrder[index].pairIndex)) return;
    if (selection?.side === 'right' && selection.index === index) {
      setSelection(null);
      return;
    }
    if (selection?.side === 'left') {
      link(selection.index, index);
      return;
    }
    setSelection({ side: 'right', index });
  };

  const chip = (active: boolean, locked: boolean, wrong: boolean) =>
    wrong
      ? 'border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-950'
      : locked
        ? 'border-green-400 bg-green-50 dark:border-green-800 dark:bg-green-950'
        : active
          ? 'border-sky-500 bg-sky-50 dark:border-sky-600 dark:bg-sky-950'
          : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900';
  const chipText = (locked: boolean, wrong: boolean) =>
    wrong
      ? 'text-red-600 dark:text-red-300'
      : locked
        ? 'text-green-700 dark:text-green-300'
        : 'text-slate-900 dark:text-slate-100';

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
          {sessionInstruction(sessionKind)} Tap one card on each side to link them. A pair locks when it is right.
        </Text>
      </View>

      {/* Pair board */}
      <View className="mt-3 flex-row gap-3">
        <View className="flex-1 gap-2">
          {pairs.map((pair, i) => {
            const isLinked = linked.includes(i);
            const wrong = flash?.left === i;
            return (
              <Pressable
                key={`left-${i}`}
                onPress={() => tapLeft(i)}
                disabled={isLinked || done}
                accessibilityRole="button"
                accessibilityLabel={`Match cue ${pair.left}`}
                accessibilityState={{ selected: selection?.side === 'left' && selection?.index === i, disabled: isLinked || done }}
                className={`min-h-[52px] rounded-2xl border-2 px-3 py-3 ${chip(
                  selection?.side === 'left' && selection?.index === i,
                  isLinked,
                  wrong
                )}`}
              >
                <Text className={`text-sm font-extrabold ${chipText(isLinked, wrong)}`}>
                  {isLinked ? '✓ ' : ''}
                  {pair.left}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View className="flex-1 gap-2">
          {rightOrder.map((item, i) => {
            const isLinked = linked.includes(item.pairIndex);
            const wrong = flash?.right === i;
            return (
              <Pressable
                key={`right-${i}`}
                onPress={() => tapRight(i)}
                disabled={isLinked || done}
                accessibilityRole="button"
                accessibilityLabel={`Match answer ${item.text}`}
                accessibilityState={{ selected: selection?.side === 'right' && selection?.index === i, disabled: isLinked || done }}
                className={`min-h-[52px] rounded-2xl border-2 px-3 py-3 ${chip(
                  selection?.side === 'right' && selection?.index === i,
                  isLinked,
                  wrong
                )}`}
              >
                <Text className={`text-sm font-extrabold ${chipText(isLinked, wrong)}`}>
                  {isLinked ? '✓ ' : ''}
                  {item.text}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text onPhoto className="mt-2 text-xs text-slate-600 dark:text-slate-200">
        {linked.length} of {pairs.length} linked
        {mistakes > 0 ? ` · ${mistakes} correction${mistakes === 1 ? '' : 's'}` : ''}
      </Text>

      {done ? (
        <View
          className={`mb-8 mt-4 rounded-3xl p-5 ${
            mistakes === 0 ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'
          }`}
        >
          <View className="flex-row items-center gap-2">
            <AppIcon
              name={mistakes === 0 ? 'party' : 'xCircle'}
              size={24}
              color={mistakes === 0 ? '#15803D' : '#DC2626'}
            />
            <Text
              className={`font-duo text-xl font-extrabold ${
                mistakes === 0 ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {mistakes === 0 ? 'Every pair, first try' : `Linked with ${mistakes} correction${mistakes === 1 ? '' : 's'}`}
            </Text>
          </View>
          <Text className="mt-1 text-sm text-slate-600 dark:text-slate-400">{solution}</Text>
          {questionData.explain ? (
            <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">Why: {questionData.explain}</Text>
          ) : null}
          <View className="mt-3">
            <DuoButton onPress={onContinue} label="Continue to next question" title="Continue" />
          </View>
        </View>
      ) : (
        <Text onPhoto className="mb-8 mt-4 text-sm text-slate-600 dark:text-slate-200">
          {selection ? 'Now tap its partner on the other side.' : 'Tap a card to start a pair.'}
        </Text>
      )}
    </View>
  );
}
