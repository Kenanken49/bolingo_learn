import { useMemo, useState } from 'react';
import LessonProgress from './lesson/LessonProgress';
import { Platform, Pressable, View } from 'react-native';
import Text from './ui/Text';
import DuoButton from './DuoButton';
import AppIcon from './AppIcon';
import type { BlockKind } from '../lib/curriculum';
import { sessionStandard } from '../lib/learningStandards';
import type { GuidedLab } from '../lib/quizBank';
import { track } from '../lib/telemetry';

interface Props {
  lessonId: string;
  prompt: string;
  questionLabel: string;
  progressPct: number;
  sessionKind?: BlockKind;
  guided: GuidedLab;
  onCorrect: () => void;
  onContinue: () => void;
  onAnswer?: (r: { prompt: string; yourAnswer: string; correctAnswer: string; correct: boolean }) => void;
}

const MONO = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
});

/**
 * Read-only walkthrough for labs whose runtime is not shipped in this build
 * (Python, Go, Rust, data science). Every task, command and reference file is
 * the licensed lab's own material, presented as a guided terminal — nothing
 * is executed, and the UI says so on three separate surfaces.
 */
export default function GuidedLabPlayer({
  lessonId,
  prompt,
  questionLabel,
  progressPct,
  sessionKind,
  guided,
  onCorrect,
  onContinue,
  onAnswer,
}: Props) {
  const standard = sessionStandard(sessionKind);
  const steps = guided.steps;
  const [index, setIndex] = useState(0);
  const [visited, setVisited] = useState<number[]>([0]);
  const [completed, setCompleted] = useState(false);
  const [openReference, setOpenReference] = useState<string | null>(
    guided.reference.length > 0 ? guided.reference[0].path : null
  );
  const step = steps[index];
  const last = index >= steps.length - 1;
  const allVisited = visited.length >= steps.length;
  const reference = useMemo(
    () => guided.reference.find((file) => file.path === openReference) ?? guided.reference[0],
    [guided.reference, openReference]
  );

  const go = (next: number) => {
    const bounded = Math.max(0, Math.min(steps.length - 1, next));
    setIndex(bounded);
    if (!visited.includes(bounded)) {
      const nextVisited = [...visited, bounded];
      setVisited(nextVisited);
      track('guided_step_viewed', {
        lessonId,
        step: bounded + 1,
        total: steps.length,
        complete: nextVisited.length >= steps.length,
      });
    }
  };

  const complete = () => {
    if (completed || !allVisited) return;
    setCompleted(true);
    track('guided_lab_completed', { lessonId, steps: steps.length, engine: 'guided' });
    onCorrect();
    onAnswer?.({
      prompt,
      yourAnswer: `Walked through ${steps.length} step(s): ${steps.map((s) => s.title).join(' · ')}`,
      correctAnswer: guided.reference[0]?.path
        ? `Reference: ${guided.reference[0].path}`
        : guided.commands[0] ?? step?.title ?? 'Guided walkthrough',
      correct: true,
    });
  };

  return (
    <View className="flex-1">
      <View className="mb-4 flex-row items-center justify-between">
        <LessonProgress pct={progressPct} color="#FBBF24" />
        <View className="flex-row items-center gap-1">
          <AppIcon name="book" size={18} color="#FBBF24" />
          <Text className="text-sm font-extrabold text-amber-600 dark:text-amber-300">Guided</Text>
        </View>
      </View>

      <View className="my-2 rounded-3xl border-2 border-amber-500/40 bg-white dark:bg-slate-900 p-4">
        <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {standard.badge} | {questionLabel}
        </Text>
        <View className="mb-2 flex-row items-center gap-2">
          <View className="rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5">
            <Text className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500">
              Guided — no execution
            </Text>
          </View>
          <Text className="text-[11px] font-semibold text-slate-400">
            {steps.length} step{steps.length === 1 ? '' : 's'}
          </Text>
        </View>
        <Text className="text-sm leading-5 text-slate-500 dark:text-slate-400">{prompt}</Text>
        {guided.intro ? (
          <Text className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">{guided.intro}</Text>
        ) : null}
        <Text className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
          This build does not run this language. Follow the steps on your own machine — every command and
          reference file below is the lab’s real material.
        </Text>
      </View>

      {/* Step rail */}
      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        {steps.map((item, i) => {
          const seen = visited.includes(i);
          const active = i === index;
          return (
            <Pressable
              key={`${item.title}-${i}`}
              onPress={() => go(i)}
              accessibilityRole="button"
              accessibilityLabel={`Step ${i + 1}: ${item.title}`}
              className={`h-8 min-w-8 items-center justify-center rounded-full border-2 px-2 ${
                active
                  ? 'border-amber-400 bg-amber-400/20'
                  : seen
                    ? 'border-emerald-400/60 bg-emerald-400/10'
                    : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              {seen && !active ? (
                <AppIcon name="check" size={12} color="#34D399" />
              ) : (
                <Text
                  className={`text-[11px] font-extrabold ${
                    active ? 'text-amber-500' : 'text-slate-500'
                  }`}
                >
                  {i + 1}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Current step */}
      <View className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
        <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Step {index + 1} of {steps.length}
        </Text>
        <Text className="mt-1 font-duo text-lg font-bold text-slate-900 dark:text-slate-100">
          {step?.title ?? guided.reference[0]?.path ?? 'Walkthrough'}
        </Text>
        {(step?.body ?? []).map((paragraph, i) => (
          <Text
            key={`${index}-p-${i}`}
            selectable
            className="mt-2 text-sm leading-5 text-slate-700 dark:text-slate-200"
          >
            {paragraph}
          </Text>
        ))}

        <View className="mt-3 overflow-hidden rounded-xl" style={{ backgroundColor: '#000000' }}>
          <View className="flex-row items-center justify-between border-b border-amber-500/20 px-3 py-2">
            <Text className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300">
              {guided.commands.length > 0 && index === 0 ? 'Reference terminal' : 'Reference code'}
            </Text>
            <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Read-only
            </Text>
          </View>
          <View className="gap-1 p-3">
            {index === 0
              ? guided.commands.map((command, i) => (
                  <Text key={`cmd-${i}`} selectable style={{ fontFamily: MONO }} className="text-[13px] leading-5 text-cyan-300">
                    {`$ ${command}`}
                  </Text>
                ))
              : null}
            {(step?.code ?? []).map((snippet, i) => (
              <View key={`code-${i}`} className={i > 0 ? 'mt-2' : ''}>
                <Text className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  {snippet.lang}
                </Text>
                <Text selectable style={{ fontFamily: MONO }} className="text-[13px] leading-5 text-slate-200">
                  {snippet.text}
                </Text>
              </View>
            ))}
            {(index > 0 || guided.commands.length === 0) && (step?.code ?? []).length === 0 ? (
              <Text style={{ fontFamily: MONO }} className="text-[13px] leading-5 text-slate-400">
                No code for this step — follow the task above.
              </Text>
            ) : null}
            {index === 0 && guided.commands.length === 0 ? (
              <Text style={{ fontFamily: MONO }} className="text-[13px] leading-5 text-slate-400">
                This lab has no shell commands; use the reference file below.
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Reference files */}
      {guided.reference.length > 0 ? (
        <View className="mt-3 rounded-2xl border border-violet-500/40 bg-violet-500/5 p-3">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-[10px] font-extrabold uppercase tracking-wider text-violet-400">
              Reference files · read-only
            </Text>
            <Text className="text-[10px] text-slate-500">{guided.reference.length} file(s)</Text>
          </View>
          <View className="mb-2 flex-row flex-wrap gap-1">
            {guided.reference.map((file) => (
              <Pressable
                key={file.path}
                onPress={() => setOpenReference(file.path)}
                accessibilityRole="button"
                className={`rounded-lg border px-2 py-1 ${
                  reference?.path === file.path
                    ? 'border-violet-400 bg-violet-500/20'
                    : 'border-slate-700'
                }`}
              >
                <Text
                  style={{ fontFamily: MONO }}
                  className={`text-[11px] ${reference?.path === file.path ? 'text-violet-200' : 'text-slate-400'}`}
                >
                  {file.path}
                </Text>
              </Pressable>
            ))}
          </View>
          {reference ? (
            <View className="overflow-hidden rounded-xl" style={{ backgroundColor: '#000000' }}>
              <View className="flex-row items-center gap-1 border-b border-violet-500/20 px-3 py-2">
                <AppIcon name="doc" size={12} color="#A78BFA" />
                <Text style={{ fontFamily: MONO }} className="text-[11px] text-violet-300">
                  {reference.path}
                </Text>
              </View>
              <View className="p-3">
                <Text selectable style={{ fontFamily: MONO }} className="text-[12px] leading-5 text-slate-200">
                  {reference.text}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {guided.source ? (
        <Text className="mt-3 text-center text-[10px] text-slate-500">
          Guided walkthrough · source: {guided.source}
        </Text>
      ) : null}

      {/* Navigation + completion */}
      <View className="mt-4 flex-row flex-wrap items-center gap-2">
        <Pressable
          onPress={() => go(index - 1)}
          disabled={index === 0}
          accessibilityRole="button"
          accessibilityLabel="Previous step"
          className={`flex-row items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 ${
            index === 0 ? 'opacity-40' : ''
          }`}
        >
          <AppIcon name="prev" size={14} color="#94A3B8" />
          <Text className="text-xs font-bold text-slate-500">Back</Text>
        </Pressable>
        {!last ? (
          <Pressable
            onPress={() => go(index + 1)}
            accessibilityRole="button"
            accessibilityLabel="Next step"
            className="flex-row items-center gap-1 rounded-xl bg-amber-500/20 px-3 py-2"
          >
            <Text className="text-xs font-extrabold uppercase tracking-wider text-amber-500">Next step</Text>
            <AppIcon name="next" size={14} color="#F59E0B" />
          </Pressable>
        ) : (
          <DuoButton
            title={completed ? 'Lab complete' : allVisited ? 'Mark lab complete' : 'Visit every step'}
            label={completed ? 'Lab complete' : allVisited ? 'Mark lab complete' : 'Visit every step'}
            color="green"
            onPress={complete}
          />
        )}
        <Text className="text-[11px] font-semibold text-slate-500">
          {visited.length}/{steps.length} steps viewed
        </Text>
      </View>

      {completed ? (
        <View className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
          <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
            Walkthrough complete. Run the reference on your machine to build the muscle memory — this panel
            never executes code.
          </Text>
        </View>
      ) : null}

      {completed ? (
        <View className="mt-3">
          <DuoButton title="Continue" label="Continue" color="blue" onPress={onContinue} />
        </View>
      ) : null}
      <Text className="mt-3 text-center text-[11px] text-slate-500">
        Guided — no execution · {lessonId} · nothing leaves this device
      </Text>
    </View>
  );
}
