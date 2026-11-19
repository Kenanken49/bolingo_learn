import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import LessonProgress from './lesson/LessonProgress';
import { Platform, Pressable, View } from 'react-native';
import Text from './ui/Text';
import DuoButton from './DuoButton';
import AppIcon from './AppIcon';
import CodeEditor, { type CodeDoc } from './CodeEditor';
import type { CodeQuizData } from './GamifiedCodePlayer';
import type { BlockKind } from '../lib/curriculum';
import { sessionInstruction, sessionStandard } from '../lib/learningStandards';
import {
  SANDBOX_TIMEOUT_MS,
  buildSandboxDoc,
  buildWebSandboxDoc,
  normalizeCodeSource,
  parseSandboxMessage,
  type SandboxResult,
} from '../lib/codeSandbox';
import { track } from '../lib/telemetry';

interface Props {
  userId: string | null;
  lessonId: string;
  questionData: CodeQuizData;
  questionLabel: string;
  progressPct: number;
  diamonds: number;
  sessionKind?: BlockKind;
  onCorrect: () => void;
  onContinue: () => void;
  onAnswer?: (r: { prompt: string; yourAnswer: string; correctAnswer: string; correct: boolean }) => void;
}

/**
 * freeCodeCamp-style runnable exercise: the learner writes real JavaScript,
 * presses Run as often as they like (free — wrong answers never cost diamonds), and Check is graded by
 * the question's own assertions in a sandboxed frame, not by string matching.
 */
export default function CodeExercise({
  lessonId,
  questionData,
  questionLabel,
  progressPct,
  sessionKind,
  onCorrect,
  onContinue,
  onAnswer,
}: Props) {
  const spec = questionData.code;
  const standard = sessionStandard(sessionKind);
  const starter = spec?.starter ?? '';
  const isWeb = spec?.language === 'html' || spec?.language === 'css';
  const starterDoc: CodeDoc = {
    html: spec?.language === 'html' ? starter : spec?.fixture?.html ?? '',
    css: spec?.language === 'css' ? starter : spec?.fixture?.css ?? '',
    js: '',
  };
  const [webDoc, setWebDoc] = useState<CodeDoc>(starterDoc);
  const [code, setCode] = useState(starter);
  const answerSource = isWeb ? `${webDoc.html}\n${webDoc.css}`.trim() : code;
  const [resetTick, setResetTick] = useState(0);
  const [frame, setFrame] = useState<{ seq: number; doc: string } | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SandboxResult | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const modeRef = useRef<'run' | 'check'>('run');
  const runningRef = useRef(false);
  const seqRef = useRef(0);
  const resultRef = useRef<(r: SandboxResult) => void>(() => {});
  // Native runner: lazy import only where the module exists (dev build); Expo
  // Go falls back to reference-solution checking with an honest notice.
  const [NativeWebView, setNativeWebView] = useState<React.ComponentType<{
    originWhitelist?: string[];
    source?: { html: string };
    style?: unknown;
    onMessage?: (e: { nativeEvent: { data: string } }) => void;
  }> | null>(null);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let live = true;
    import('react-native-webview')
      .then((m) => {
        if (live) {
          setNativeWebView(
            () =>
              (m as {
                WebView: React.ComponentType<{
                  originWhitelist?: string[];
                  source?: { html: string };
                  style?: unknown;
                  onMessage?: (e: { nativeEvent: { data: string } }) => void;
                }>;
              }).WebView
          );
        }
      })
      .catch(() => {
        if (live) setNativeWebView(null);
      });
    return () => {
      live = false;
    };
  }, []);
  const canRun = Platform.OS === 'web' || NativeWebView !== null;

  const settle = useCallback(
    (r: SandboxResult) => {
      if (!runningRef.current || !spec) return;
      runningRef.current = false;
      setRunning(false);
      setResult(r);
      const allPass = !r.error && spec.tests.every((t) => r.outcomes.some((o) => o.id === t.id && o.pass));
      track('code_sandbox_result', {
        lessonId,
        language: spec.language,
        mode: modeRef.current,
        passed: allPass ? spec.tests.length : spec.tests.filter((t) => r.outcomes.some((o) => o.id === t.id && o.pass)).length,
        total: spec.tests.length,
        ms: r.ms,
        error: r.error ? String(r.error).slice(0, 140) : null,
      });
      if (modeRef.current === 'check') {
        onAnswer?.({
          prompt: questionData.prompt,
          yourAnswer: answerSource,
          correctAnswer: questionData.correctChain[0] ?? '',
          correct: allPass,
        });
        if (allPass) {
          setFeedback('correct');
          setNote(null);
          onCorrect();
        } else {
          setFeedback('wrong');
          const failing = spec.tests.find((t) => !r.outcomes.some((o) => o.id === t.id && o.pass));
          setNote(r.error ?? failing?.hint ?? (failing ? `“${failing.label}” is still failing.` : 'Some tests are still failing.'));
        }
      }
    },
    [answerSource, lessonId, onAnswer, onCorrect, questionData.prompt, questionData.correctChain, spec]
  );
  // Latest-callback ref for the message listeners, assigned after commit.
  useEffect(() => {
    resultRef.current = settle;
  }, [settle]);

  // Web: the sandbox posts JSON to its parent window.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const receive = (e: MessageEvent) => {
      const parsed = parseSandboxMessage(e.data);
      if (parsed) resultRef.current(parsed);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);

  // Timeout kills runaway loops: clearing the frame remounts (and disposes)
  // the sandbox, so the runaway script dies with it.
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => {
      if (!runningRef.current) return;
      runningRef.current = false;
      setRunning(false);
      setFrame(null);
      setResult({ outcomes: [], error: null, logs: [], ms: SANDBOX_TIMEOUT_MS, timedOut: true });
      track('code_sandbox_timeout', { lessonId, language: spec?.language ?? 'js' });
      if (modeRef.current === 'check') {
        setFeedback('wrong');
        setNote('Timed out after 5 seconds — your code may contain an infinite loop.');
        onAnswer?.({
          prompt: questionData.prompt,
          yourAnswer: answerSource,
          correctAnswer: questionData.correctChain[0] ?? '',
          correct: false,
        });
      }
    }, SANDBOX_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [running, frame, answerSource, lessonId, spec, onAnswer, questionData.prompt, questionData.correctChain]);

  if (!spec) return null;

  const startRun = (mode: 'run' | 'check') => {
    if (running) return;
    if (!canRun) {
      // No browser runtime in this build. Web tasks keep their authored
      // pattern fallback; JS tasks compare with the reference solution.
      const pass = isWeb
        ? spec.tests.every((t) => !!t.pattern && new RegExp(t.pattern, 'i').test(answerSource))
        : normalizeCodeSource(code) === normalizeCodeSource(questionData.correctChain[0] ?? '');
      onAnswer?.({
        prompt: questionData.prompt,
        yourAnswer: answerSource,
        correctAnswer: questionData.correctChain[0] ?? '',
        correct: pass,
      });
      if (pass) {
        setFeedback('correct');
        setNote(null);
        onCorrect();
      } else {
        setFeedback('wrong');
        setNote(
          isWeb
            ? 'This build cannot render a page — open the web build for live DOM checks, or use the hints to revise.'
            : 'This build cannot execute JavaScript — compare your code with the reference solution.'
        );
      }
      return;
    }
    modeRef.current = mode;
    runningRef.current = true;
    seqRef.current += 1;
    setResult(null);
    setFeedback(null);
    setNote(null);
    setRunning(true);
    setFrame({ seq: seqRef.current, doc: isWeb ? buildWebSandboxDoc(spec, webDoc) : buildSandboxDoc(spec, code) });
  };

  const resetCode = () => {
    setCode(starter);
    setWebDoc(starterDoc);
    setResetTick((t) => t + 1);
    setResult(null);
    setFeedback(null);
    setNote(null);
  };

  const runPassing = result && !result.error ? spec.tests.filter((t) => result.outcomes.some((o) => o.id === t.id && o.pass)).length : 0;
  const showChecklist = running || result !== null || feedback !== null;

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
          {sessionInstruction(sessionKind)}{' '}
          {isWeb
            ? 'Build the real page, then run the DOM checks like a browser would.'
            : 'Write real JavaScript and run the tests like a developer.'}
        </Text>
        {!canRun ? (
          <Text className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
            {isWeb
              ? 'This build cannot render a page — the authored pattern checks still grade your markup and styles.'
              : 'This build cannot execute JavaScript — Check compares your code with the reference solution.'}
          </Text>
        ) : null}
      </View>

      {/* Editor */}
      <View className="mt-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <AppIcon name="code" size={16} color="#64748B" />
          <Text onPhoto className="text-sm font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-200">
            {isWeb ? (spec.language === 'css' ? 'styles.css' : 'index.html') : 'script.js'}
          </Text>
        </View>
        <Pressable
          onPress={resetCode}
          accessibilityRole="button"
          accessibilityLabel="Reset code to starter"
          className="rounded-full border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-1.5 active:bg-slate-100"
        >
          <Text className="text-xs font-extrabold text-slate-600 dark:text-slate-400">↺ Reset</Text>
        </Pressable>
      </View>
      <View className="mt-2">
        <CodeEditor
          key={`${lessonId}-${resetTick}`}
          initial={isWeb ? starterDoc : { html: '', css: '', js: starter }}
          languages={isWeb ? (spec.language === 'css' ? ['css', 'html'] : ['html', 'css']) : ['js']}
          defaultTab={isWeb ? spec.language : 'js'}
          onChange={(doc) => {
            if (feedback === 'correct') return;
            if (isWeb) setWebDoc(doc);
            else setCode(doc.js);
          }}
        />
      </View>

      {/* Test console */}
      <View className="mt-3 rounded-2xl bg-slate-950 p-4">
        <Text className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Tests {showChecklist ? `· ${runPassing}/${spec.tests.length} passing` : ''}
          {running ? ' · running…' : ''}
        </Text>
        {spec.tests.map((t) => {
          const outcome = result?.outcomes.find((o) => o.id === t.id);
          const shown = showChecklist && !(running && !result);
          const pass = !!outcome?.pass && !result?.error;
          return (
            <Text key={t.id} className={`mt-1 font-mono text-sm ${!shown ? 'text-slate-500 dark:text-slate-400' : pass ? 'text-green-400' : 'text-red-400'}`}>
              {!shown ? '○' : pass ? '● PASS' : '● FAIL'}  {t.label}
            </Text>
          );
        })}
        {result?.error ? (
          <Text className="mt-2 font-mono text-xs text-red-400">{result.error}</Text>
        ) : result?.timedOut ? (
          <Text className="mt-2 font-mono text-xs text-red-400">Timed out after 5s — check for an infinite loop.</Text>
        ) : result && result.logs.length > 0 ? (
          <View className="mt-2">
            <Text className="font-mono text-xs text-slate-500 dark:text-slate-400">console</Text>
            {result.logs.slice(-6).map((line, i) => (
              <Text key={i} className="font-mono text-xs text-slate-300 dark:text-slate-200">{`> ${line}`}</Text>
            ))}
          </View>
        ) : null}
        {result && !result.error && !result.timedOut ? (
          <Text className="mt-2 font-mono text-xs text-slate-500 dark:text-slate-400">
            {'>'} finished in {result.ms} ms
          </Text>
        ) : null}
      </View>

      {/* The hidden runner: iframe on web, WebView on a dev build. */}
      {Platform.OS === 'web' && frame
        ? createElement('iframe', {
            key: frame.seq,
            srcDoc: frame.doc,
            sandbox: 'allow-scripts',
            title: 'Code test runner',
            style: { position: 'absolute', width: 1, height: 1, opacity: 0, borderWidth: 0, pointerEvents: 'none' },
          })
        : null}
      {Platform.OS !== 'web' && NativeWebView && frame ? (
        <NativeWebView
          key={frame.seq}
          originWhitelist={['*']}
          source={{ html: frame.doc }}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
          onMessage={(e) => {
            const parsed = parseSandboxMessage(e.nativeEvent.data);
            if (parsed) resultRef.current(parsed);
          }}
        />
      ) : null}

      {feedback === null ? (
        <View className="mb-8 mt-4 flex-row gap-2">
          {standard.scaffolds ? (
            <View className="flex-1">
              <DuoButton
                color="blue"
                onPress={() => startRun('run')}
                disabled={running}
                label="Run tests without submitting"
                title={running ? 'Running…' : 'Run'}
              />
            </View>
          ) : null}
          <View className={standard.scaffolds ? 'flex-[2]' : 'flex-1'}>
            <DuoButton onPress={() => startRun('check')} disabled={running} label="Check answer" title="Check answer" />
          </View>
        </View>
      ) : feedback === 'wrong' ? (
        <View className="mb-8 rounded-3xl p-5 bg-red-100 dark:bg-red-950">
          <View className="flex-row items-center gap-2">
            <AppIcon name="xCircle" size={24} color="#DC2626" />
            <Text className="font-duo text-xl font-extrabold text-red-600 dark:text-red-400">Not passing yet</Text>
          </View>
          {note ? <Text className="mt-1 text-sm text-slate-600 dark:text-slate-400">{note}</Text> : null}
          {questionData.explain ? (
            <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">Why: {questionData.explain}</Text>
          ) : null}
          <View className="mt-3 flex-row gap-2">
            <View className="flex-1">
              <DuoButton color="slate" onPress={() => { setFeedback(null); setNote(null); }} label="Keep editing and try again" title="Try again" />
            </View>
            <View className="flex-1">
              <DuoButton color="blue" onPress={() => startRun('check')} label="Re-run tests and check" title="Check again" />
            </View>
          </View>
        </View>
      ) : (
        <View className="mb-8 rounded-3xl p-5 bg-green-100 dark:bg-green-950">
          <View className="flex-row items-center gap-2">
            <AppIcon name="party" size={24} color="#15803D" />
            <Text className="font-duo text-xl font-extrabold text-green-700 dark:text-green-300">All tests pass!</Text>
          </View>
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
