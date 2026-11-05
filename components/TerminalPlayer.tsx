import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import LessonProgress from './lesson/LessonProgress';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import Text from './ui/Text';
import DuoButton from './DuoButton';
import AppIcon from './AppIcon';
import type { BlockKind } from '../lib/curriculum';
import { sessionStandard } from '../lib/learningStandards';
import type { TerminalExercise } from '../lib/quizBank';
import { evaluateTasks, openScenario, type CheckOutcome, type LabScenario } from '../lib/vm/scenario';
import { track } from '../lib/telemetry';

interface Props {
  userId: string | null;
  lessonId: string;
  prompt: string;
  questionLabel: string;
  progressPct: number;
  hearts: number;
  sessionKind?: BlockKind;
  terminal: TerminalExercise;
  scenario: LabScenario;
  onCorrect: () => void;
  onContinue: () => void;
  onAnswer?: (r: { prompt: string; yourAnswer: string; correctAnswer: string; correct: boolean }) => void;
}

type Line = { id: number; kind: 'cmd' | 'out' | 'err' | 'sys'; text: string };

const MONO = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
});

/**
 * A real terminal for the Git labs. Commands go through the offline VM
 * (lib/vm), the repo state changes for real, and each task is graded by a
 * shell check rather than by matching keystrokes.
 */
export default function TerminalPlayer({
  lessonId,
  prompt,
  questionLabel,
  progressPct,
  sessionKind,
  terminal,
  scenario,
  onCorrect,
  onContinue,
  onAnswer,
}: Props) {
  const standard = sessionStandard(sessionKind);
  const [shell] = useState(() => openScenario(scenario));
  const [lines, setLines] = useState<Line[]>(() => [
    { id: 0, kind: 'sys', text: `Offline VM ready at ${scenario.cwd ?? '/home/labex/project'}.` },
    { id: 1, kind: 'sys', text: 'Everything runs on this device — no network, no external service.' },
  ]);
  const [input, setInput] = useState('');
  const [cwd, setCwd] = useState(shell.cwd);
  const [outcomes, setOutcomes] = useState<CheckOutcome[]>(() => evaluateTasks(shell, scenario.tasks));
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [hintFor, setHintFor] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const answeredRef = useRef(false);
  const lineId = useRef(2);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [lines]);

  const refresh = useCallback(
    (next = shell) => {
      const result = evaluateTasks(next, scenario.tasks);
      setOutcomes(result);
      setCwd(next.cwd);
      if (result.every((o) => o.pass) && !answeredRef.current) {
        answeredRef.current = true;
        setFeedback('correct');
        setNote(null);
        track('terminal_lab_completed', {
          lessonId,
          scenarioId: scenario.id,
          tasks: scenario.tasks.length,
          commands: next.history.length,
        });
        onCorrect();
        onAnswer?.({
          prompt,
          yourAnswer: next.history.join('\n'),
          correctAnswer: scenario.solution.join('\n'),
          correct: true,
        });
      }
      return result;
    },
    [lessonId, onAnswer, onCorrect, prompt, scenario.id, scenario.solution, scenario.tasks, shell]
  );

  const append = (kind: Line['kind'], text: string) => {
    const id = lineId.current;
    lineId.current += 1;
    setLines((current) => [...current, { id, kind, text }]);
  };

  const submit = () => {
    const command = input.trim();
    if (!command) return;
    setInput('');
    append('cmd', command);
    const result = shell.run(command);
    if (result.out) append('out', result.out.replace(/\n$/, ''));
    if (result.err) append('err', result.err.replace(/\n$/, ''));
    // Only the verb is logged — arguments can name learner paths or content.
    track('terminal_command', {
      lessonId,
      scenarioId: scenario.id,
      verb: command.split(/\s+/)[0].slice(0, 20),
      ok: !result.err,
    });
    setFeedback(null);
    setNote(null);
    const after = refresh();
    track('terminal_tasks_progress', {
      lessonId,
      passed: after.filter((o) => o.pass).length,
      total: after.length,
    });
  };

  const checkWork = () => {
    const result = refresh();
    const remaining = result.filter((o) => !o.pass);
    track('terminal_check', {
      lessonId,
      scenarioId: scenario.id,
      passed: result.length - remaining.length,
      total: result.length,
    });
    if (remaining.length === 0) return;
    const first = remaining[0];
    const task = scenario.tasks.find((t) => t.id === first.id);
    setFeedback('wrong');
    setNote(
      first.err.trim() ||
        first.out.trim() ||
        `“${task?.text ?? first.id}” is not done yet — read the task, then inspect the repo state.`
    );
    onAnswer?.({
      prompt,
      yourAnswer: shell.history.join('\n'),
      correctAnswer: scenario.solution.join('\n'),
      correct: false,
    });
  };

  const reset = () => {
    shell.reset();
    answeredRef.current = false;
    setFeedback(null);
    setNote(null);
    setShowSolution(false);
    setHintFor(null);
    setLines([
      { id: lineId.current, kind: 'sys', text: 'Lab reset. The starting repository is back.' },
      { id: lineId.current + 1, kind: 'sys', text: `Current directory: ${shell.cwd}` },
    ]);
    lineId.current += 2;
    refresh();
  };

  const done = outcomes.filter((o) => o.pass).length;
  const allDone = done === scenario.tasks.length;
  const shortCwd = cwd.replace('/home/labex', '~');

  return (
    <View className="flex-1">
      <View className="mb-4 flex-row items-center justify-between">
        <LessonProgress pct={progressPct} color="#22D3EE" />
        <View className="flex-row items-center gap-1">
          <AppIcon name="linux" size={18} color="#22D3EE" />
          <Text className="text-sm font-extrabold text-cyan-600 dark:text-cyan-300">Offline VM</Text>
        </View>
      </View>

      <View className="my-2 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {standard.badge} | {questionLabel}
        </Text>
        <Text className="mb-1 font-duo text-xl font-bold text-slate-900 dark:text-slate-100">
          {scenario.title}
        </Text>
        <Text className="text-sm leading-5 text-slate-500 dark:text-slate-400">{prompt}</Text>
        <Text className="mt-2 text-xs font-semibold text-slate-400">
          Work in the terminal below — every command runs against a real Git repository on this device.
        </Text>
      </View>

      {/* Terminal */}
      <View className="mt-3 overflow-hidden rounded-2xl border border-cyan-500/30" style={{ backgroundColor: '#000000' }}>
        <View className="flex-row items-center justify-between border-b border-cyan-500/20 px-3 py-2">
          <View className="flex-row items-center gap-1.5">
            <View className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <View className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <View className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <Text className="ml-2 text-[11px] font-bold uppercase tracking-widest text-cyan-300">
              labex@vm
            </Text>
          </View>
          <Text className="text-[11px] text-slate-500">{shortCwd}</Text>
        </View>
        <ScrollView
          ref={scrollRef}
          style={{ maxHeight: 320, minHeight: 220 }}
          contentContainerStyle={{ padding: 12, gap: 4 }}
          keyboardShouldPersistTaps="handled"
        >
          {lines.map((line) => (
            <Text
              key={line.id}
              selectable
              style={{ fontFamily: MONO }}
              className={
                line.kind === 'cmd'
                  ? 'text-[13px] leading-5 text-cyan-300'
                  : line.kind === 'err'
                    ? 'text-[13px] leading-5 text-rose-400'
                    : line.kind === 'sys'
                      ? 'text-[13px] leading-5 text-violet-300'
                      : 'text-[13px] leading-5 text-slate-200'
              }
            >
              {line.kind === 'cmd' ? `$ ${line.text}` : line.text}
            </Text>
          ))}
          <Text style={{ fontFamily: MONO }} className="text-[13px] leading-5 text-slate-500">
            {lines.length === 0 ? 'Type a command to begin.' : ''}
          </Text>
        </ScrollView>
        <View className="flex-row items-center gap-1 border-t border-cyan-500/20 px-3 py-2">
          <Text style={{ fontFamily: MONO }} className="text-[13px] text-cyan-400">
            $
          </Text>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={submit}
            placeholder="type a command and press return"
            placeholderTextColor="#475569"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            blurOnSubmit={false}
            returnKeyType="go"
            accessibilityLabel="Terminal command input"
            className="flex-1 py-1 text-slate-100"
            style={{ fontFamily: MONO, fontSize: 13 }}
          />
          <Pressable
            onPress={submit}
            accessibilityRole="button"
            accessibilityLabel="Run command"
            className="rounded-lg bg-cyan-500/20 px-3 py-1.5"
          >
            <Text className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Run</Text>
          </Pressable>
        </View>
      </View>

      {/* Tasks */}
      <View className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Tasks · {done}/{scenario.tasks.length}
          </Text>
          {allDone ? (
            <View className="flex-row items-center gap-1">
              <AppIcon name="checkCircle" size={14} color="#34D399" />
              <Text className="text-xs font-extrabold text-emerald-500">Lab complete</Text>
            </View>
          ) : null}
        </View>
        {scenario.tasks.map((task, i) => {
          const outcome = outcomes.find((o) => o.id === task.id);
          const passed = outcome?.pass ?? false;
          return (
            <View key={task.id} className="mb-2 flex-row items-start gap-2">
              <View
                className={`mt-0.5 h-5 w-5 items-center justify-center rounded-full border-2 ${
                  passed ? 'border-emerald-400 bg-emerald-400/20' : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                {passed ? (
                  <AppIcon name="check" size={12} color="#34D399" />
                ) : (
                  <Text className="text-[10px] font-bold text-slate-500">{i + 1}</Text>
                )}
              </View>
              <View className="flex-1">
                <Text
                  className={`text-sm leading-5 ${
                    passed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {task.text}
                </Text>
                {task.hint && !passed ? (
                  hintFor === task.id ? (
                    <Text className="mt-1 text-xs text-amber-500">{task.hint}</Text>
                  ) : (
                    <Pressable onPress={() => setHintFor(task.id)} accessibilityRole="button">
                      <Text className="mt-1 text-xs font-bold text-amber-500">Show hint</Text>
                    </Pressable>
                  )
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {note ? (
        <View className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
          <Text className="text-sm text-amber-600 dark:text-amber-300">{note}</Text>
        </View>
      ) : null}
      {feedback === 'correct' ? (
        <View className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
          <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
            Lab verified. Every task matches the repository state a real Git workflow produces.
          </Text>
        </View>
      ) : null}

      {showSolution ? (
        <View className="mt-3 rounded-xl border border-violet-500/40 bg-violet-500/10 p-3">
          <Text className="mb-1 text-xs font-bold uppercase tracking-wider text-violet-400">
            Reference walkthrough
          </Text>
          {scenario.solution.map((line, i) => (
            <Text key={`${line}-${i}`} selectable style={{ fontFamily: MONO }} className="text-[13px] leading-5 text-violet-200">
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      <View className="mt-4 flex-row flex-wrap items-center gap-2">
        <DuoButton title={allDone ? 'Lab complete' : 'Check my work'} label={allDone ? 'Lab complete' : 'Check my work'} color="green" onPress={checkWork} />
        <Pressable
          onPress={() => setShowSolution((v) => !v)}
          accessibilityRole="button"
          className="rounded-xl border border-violet-500/40 px-3 py-2"
        >
          <Text className="text-xs font-bold text-violet-400">
            {showSolution ? 'Hide reference' : 'Reveal reference'}
          </Text>
        </Pressable>
        <Pressable onPress={reset} accessibilityRole="button" className="flex-row items-center gap-1 rounded-xl px-3 py-2">
          <AppIcon name="refresh" size={14} color="#94A3B8" />
          <Text className="text-xs font-bold text-slate-400">Reset lab</Text>
        </Pressable>
      </View>

      {feedback === 'correct' ? (
        <View className="mt-3">
          <DuoButton title="Continue" label="Continue" color="blue" onPress={onContinue} />
        </View>
      ) : null}
      <Text className="mt-3 text-center text-[11px] text-slate-500">
        Offline VM · {lessonId} · nothing leaves this device
      </Text>
    </View>
  );
}
