import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, View, Pressable, ScrollView, Platform } from 'react-native';
import Text from '../../../components/ui/Text';
// NOTE: no top-level react-native-webview import — Expo Go ships no
// RNCWebViewModule and the static import crashed the whole route tree.
// The native preview loads lazily below and degrades to a notice.
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import CodeEditor, { combineDoc, type CodeDoc } from '../../../components/CodeEditor';
import { getCourseProject } from '../../../lib/courses';
import { fetchRemoteProject, getCertProject, gradeProject } from '../../../lib/certifications';
import {
  PROJECT_TIMEOUT_MS,
  buildProjectTestDoc,
  parseProjectMessage,
  type ProjectSandboxResult,
} from '../../../lib/projectSandbox';
import { getProfile } from '../../../lib/progress';
import { completeLessonOfflineFirst, offlineUserId } from '../../../lib/sync/syncStore';
import AskBingo from '../../../components/AskBingo';
import AppIcon from '../../../components/AppIcon';
import Mascot from '../../../components/AfricanMascots';
import { supabase } from '../../../lib/supabase';
import { setLessonResult } from '../../../lib/quizResults';
import { levelForXp } from '../../../lib/levels';
import { APP_SPEECH, speakAs, stopSpeaking } from '../../../lib/pronunciation';

/** Web preview: react-native-webview has no web implementation, so render a real iframe. */
function WebPreview({ html }: { html: string }) {
  return createElement('iframe', {
    srcDoc: html,
    title: 'Live preview',
    style: { width: '100%', height: '100%', borderWidth: 0, backgroundColor: '#fff' },
  }) as unknown as React.ReactElement;
}

/** Wrap learner code in a minimal document for the live preview. */
function previewDoc(doc: CodeDoc): string {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui,sans-serif;padding:16px;color:#0f172a}h1{margin:0 0 8px}</style><style>${doc.css}</style></head><body>${doc.html}<script>${doc.js}</script></body></html>`;
}

export default function CertificationProject() {
  const { lessonId, title } = useLocalSearchParams<{ lessonId: string; title?: string }>();
  // Core Curriculum: certification projects resolve here too (same runner + tests).
  // Bundled catalog first; remote-only projects (shipped after this build) fill in async.
  const [project, setProject] = useState(() => getCourseProject(lessonId) ?? getCertProject(lessonId));
  const [remoteCert, setRemoteCert] = useState(false);
  useEffect(() => {
    if (project || typeof lessonId !== 'string') return;
    fetchRemoteProject(lessonId).then((p) => {
      if (p) {
        setProject(p);
        setRemoteCert(true);
      }
    });
  }, [lessonId, project]);
  const starter: CodeDoc = useMemo(
    () => ({
      html: project?.starterCode ?? '',
      css: '/* Your styles live here */\n',
      js: '// Optional JavaScript — e.g. document.querySelector("h1").style.color = "green";\n',
    }),
    [project]
  );
  const [builderId, setBuilderId] = useState<string | null>(null);
  useEffect(() => {
    getProfile().then((p) => setBuilderId(p?.id ?? null)).catch(() => {});
  }, []);
  const [doc, setDoc] = useState<CodeDoc>(starter);
  const [submitted, setSubmitted] = useState(false);
  const [resetTick, setResetTick] = useState(0);
  // Native live preview: loads only where the native module exists (dev
  // build). Expo Go / missing module => null => friendly notice instead
  // of a red screen. Must run before the `!project` early return.
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
        if (live)
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
      })
      .catch(() => {
        if (live) setNativeWebView(null);
      });
    return () => {
      live = false;
    };
  }, []);
  // Live grading: the page runs in a hidden frame and stories with a `check`
  // expression report pass/fail from the real DOM, not from regex luck.
  const [live, setLive] = useState<ProjectSandboxResult | null>(null);
  const [liveRunning, setLiveRunning] = useState(false);
  const [liveDoc, setLiveDoc] = useState<{ seq: number; html: string } | null>(null);
  const liveSeq = useRef(0);
  const finishLive = useCallback((r: ProjectSandboxResult) => {
    setLive(r);
    setLiveRunning(false);
    setLiveDoc(null);
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const receive = (e: MessageEvent) => {
      const parsed = parseProjectMessage(e.data);
      if (parsed) finishLive(parsed);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [finishLive]);
  useEffect(() => {
    if (!liveRunning) return;
    const timer = setTimeout(() => {
      setLiveRunning(false);
      setLive(null);
      setLiveDoc(null);
      Alert.alert('Tests timed out', 'Your page did not finish loading in 6 seconds — check for an infinite loop.');
    }, PROJECT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [liveRunning, liveDoc]);
  // Leaving the project must not leave Zora talking over the next screen.
  useEffect(
    () => () => {
      void stopSpeaking();
    },
    []
  );

  const combined = useMemo(() => combineDoc(doc), [doc]);
  const checks = useMemo(() => (project ? gradeProject(project, combined) : []), [combined, project]);
  // Server verdict display: when the server disagrees with local checks, show its checklist.
  const [serverChecks, setServerChecks] = useState<typeof checks | null>(null);
  // Live DOM verdict overrides the regex for every story that has a `check`.
  const verdict = useMemo(
    () =>
      checks.map((c, i) => {
        const outcome = live?.outcomes.find((o) => o.index === i);
        return outcome ? { ...c, pass: outcome.pass } : c;
      }),
    [checks, live]
  );
  const shown = serverChecks ?? verdict;
  const passed = verdict.filter((c) => c.pass).length;
  // Stories with a runtime check need one live run before shipping; builds
  // without a web view (Expo Go) keep the offline regex verdict.
  const hasLiveChecks = !!project?.stories.some((s) => !!s.check);
  const runtimeAvailable = Platform.OS === 'web' || NativeWebView !== null;
  const needsLive = hasLiveChecks && runtimeAvailable;
  const allPass = passed >= verdict.length && verdict.length > 0 && (!needsLive || live !== null);

  if (!project) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text onPhoto className="text-lg text-slate-600 dark:text-slate-200">Project not found.</Text>
        <Pressable onPress={() => router.replace('/')} className="mt-4 rounded-2xl bg-slate-800 px-6 py-3">
          <Text className="font-bold text-white">Back to Path</Text>
        </Pressable>
      </View>
    );
  }

  // One line for both the card and Zora's voice, so she always reads exactly
  // what the learner sees.
  const coachLine = allPass
    ? `All ${checks.length} stories pass. Ship it — submit for +${project.xp} XP.`
    : `${shown.filter((c) => !c.pass).length} of ${shown.length} stories still failing. Next: ${shown.find((c) => !c.pass)?.hint ?? 'run the tests and read the first failing story.'}`;

  const hearZora = () => {
    void speakAs({ character: 'zora', text: coachLine, language: APP_SPEECH });
  };

  const reset = () => {
    setDoc(starter);
    setSubmitted(false);
    setLive(null);
    setServerChecks(null);
    setResetTick((t) => t + 1); // remounts the editor back to starter code
  };

  const runLive = () => {
    if (liveRunning) return;
    if (!runtimeAvailable) {
      Alert.alert('Sandbox unavailable', 'This build cannot execute a page — the static checks below still grade your project.');
      return;
    }
    setServerChecks(null);
    setLive(null);
    setLiveRunning(true);
    liveSeq.current += 1;
    setLiveDoc({ seq: liveSeq.current, html: buildProjectTestDoc(doc, project.stories) });
  };

  const submit = async () => {
    if (!allPass || submitted) return;
    setSubmitted(true);
    // Server is the source of truth when reachable (same patterns, newer rows);
    // offline or unknown ids fall back to the local verdict.
    let final = verdict;
    if (typeof lessonId === 'string' && (remoteCert || getCertProject(lessonId))) {
      try {
        const { data, error } = await supabase.functions.invoke('grade-project', {
          body: { projectId: lessonId, code: combined },
        });
        if (!error && data && Array.isArray(data.results) && data.results.length === checks.length) {
          final = data.results;
        }
      } catch {
        /* offline-first: local verdict stands */
      }
    }
    const finalPassed = final.filter((c) => c.pass).length;
    if (finalPassed < final.length) {
      setServerChecks(final);
      setSubmitted(false);
      Alert.alert('Not quite yet', 'The server tests found a story still failing — see the updated checklist.');
      return;
    }
    setServerChecks(null);
    const results = final.map((c) => ({
      prompt: c.label,
      yourAnswer: c.pass ? 'satisfied' : '—',
      correctAnswer: c.hint,
      correct: c.pass,
    }));
    const goResults = (streakCount: number, leveledUp = false, newLevel = 0, totalXp = 0, pendingSync = false) => {
      setLessonResult({
        lessonId,
        title: String(title ?? project.title),
        xpEarned: project.xp,
        streak: streakCount,
        correctCount: passed,
        total: checks.length,
        results,
        leveledUp,
        newLevel,
        totalXp,
        pendingSync,
      });
      router.replace('/results');
    };
    // Offline, getProfile() fails — the saved session still knows who the
    // learner is, so the project XP is queued instead of lost.
    const p = await getProfile().catch(() => null);
    const uid = p?.id ?? (await offlineUserId());
    if (uid) {
      completeLessonOfflineFirst({ userId: uid, xp: project.xp, lessonId })
        .then((r) => {
          if (r.queued) {
            goResults(0, false, 0, 0, true);
            return;
          }
          const prof = r.profile;
          const newLevel = levelForXp(prof.xp);
          goResults(prof.streak_count, newLevel > levelForXp(prof.xp - project.xp), newLevel, prof.xp);
        })
        .catch(() => goResults(0));
    } else {
      goResults(0);
    }
  };

  return (
    <View className="flex-1">
    <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-xl self-center px-4 pb-24 pt-8" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <View className="w-full max-w-3xl self-center">
        <Pressable onPress={() => router.replace('/')} accessibilityRole="button" accessibilityLabel="Back to learning path">
          <View className="flex-row items-center gap-0.5">
            <AppIcon name="chevBack" size={16} color="#0284C7" />
            <Text className="font-bold text-sky-600 dark:text-sky-400">Back to Learn</Text>
          </View>
        </Pressable>

        {/* FCC-style project header — QD-OLED black with a magenta build glow. */}
        <View className="mt-3 overflow-hidden rounded-3xl border border-[#1E1E2C] bg-[#06060A] p-6 shadow-lg">
          <View pointerEvents="none" className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#FF2DAA]/15" />
          <View pointerEvents="none" className="absolute -left-20 -bottom-24 h-52 w-52 rounded-full bg-[#00E5FF]/10" />
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <AppIcon name="folder" size={14} color="#FB923C" />
              <Text className="text-xs font-extrabold uppercase tracking-widest text-orange-400">Certification project</Text>
            </View>
            <View className="rounded-full bg-amber-400 px-3 py-1.5">
              <View className="flex-row items-center gap-1">
                <AppIcon name="star" size={13} color="#0F172A" />
                <Text className="text-xs font-extrabold text-slate-900 dark:text-slate-100">+{project.xp} XP</Text>
              </View>
            </View>
          </View>
          <Text className="mt-1 text-3xl font-extrabold text-white">{project.title}</Text>
          {project.brief.map((b, i) => (
            <Text key={i} className="mt-2 text-base font-semibold leading-6 text-slate-300 dark:text-slate-200">
              {b}
            </Text>
          ))}
        </View>

        {/* Zora owns the build loop: the next failing story becomes a live hint. */}
        <View className="mt-4 flex-row items-center rounded-2xl border-2 border-pink-200 bg-pink-50 p-3 dark:border-[#FF2DAA]/30 dark:bg-[#12000C]">
          <Mascot character="zora" mood={allPass ? 'party' : 'happy'} size={56} />
          <View className="ml-2 flex-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-extrabold uppercase tracking-widest text-pink-700 dark:text-[#FF2DAA]">Zora · Build coach</Text>
              <Pressable
                onPress={hearZora}
                accessibilityRole="button"
                accessibilityLabel="Hear Zora read the build hint"
                hitSlop={8}
                className="h-8 w-8 items-center justify-center rounded-full bg-pink-100 dark:bg-[#FF2DAA]/20"
              >
                <AppIcon name="volume" size={15} color="#DB2777" />
              </Pressable>
            </View>
            <Text className="mt-0.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{coachLine}</Text>
          </View>
        </View>

        {/* User stories — FCC lab checklist as status cards */}
        <View className="mt-4 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <AppIcon name="checkCircle" size={18} color="#0F172A" />
              <Text className="text-base font-extrabold text-slate-900 dark:text-slate-100">User stories</Text>
            </View>
            <View className={`rounded-full px-3 py-1 ${allPass ? 'bg-green-100 dark:bg-green-950' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <Text className={`text-xs font-extrabold ${allPass ? 'text-green-700 dark:text-green-300' : 'text-slate-500 dark:text-slate-400'}`}>
                {live ? 'LIVE · ' : ''}
                {shown.filter((c) => c.pass).length}/{shown.length} passing
              </Text>
            </View>
          </View>
          <View className="mt-2">
            {shown.map((c, i) => (
              <View
                key={i}
                className={`mt-2 flex-row items-start rounded-2xl border-2 p-3 ${c.pass ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900'}`}
              >
                <Text className={`text-lg ${c.pass ? 'text-green-500' : 'text-slate-300 dark:text-slate-200'}`}>{c.pass ? '●' : '○'}</Text>
                <View className="ml-2 flex-1">
                  <Text className={`font-mono text-sm font-bold ${c.pass ? 'text-green-800 dark:text-green-200' : 'text-slate-700 dark:text-slate-300'}`}>
                    {c.label}
                  </Text>
                  {!c.pass ? <Text className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Hint: {c.hint}</Text> : null}
                  {!c.pass && live?.outcomes.find((o) => o.index === i)?.error ? (
                    <Text className="mt-0.5 font-mono text-xs text-red-500">
                      {live.outcomes.find((o) => o.index === i)?.error}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
          <View className="mt-3 flex-row items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 px-3 py-2">
            <Pressable
              onPress={runLive}
              disabled={liveRunning}
              accessibilityRole="button"
              accessibilityLabel="Run project tests in a sandbox"
              className={`rounded-full px-4 py-2 ${liveRunning ? 'bg-slate-200 dark:bg-slate-800' : 'bg-sky-500 active:bg-sky-600'}`}
            >
              <Text className={`text-xs font-extrabold uppercase tracking-wide ${liveRunning ? 'text-slate-500 dark:text-slate-400' : 'text-white'}`}>
                {liveRunning ? 'Running your page…' : '▶ Run tests in a sandbox'}
              </Text>
            </Pressable>
            <Text className="ml-2 flex-1 text-right text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              {live ? `Live DOM · ${live.ms} ms` : needsLive ? 'Runs your real page — required before submit' : 'Static checks only in this build'}
            </Text>
          </View>
        </View>

        {/* Tabbed editor with reset */}
        <View className="mt-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <AppIcon name="code" size={16} color="#64748B" />
            <Text className="text-sm font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Code editor</Text>
          </View>
          <Pressable
            onPress={reset}
            accessibilityRole="button"
            accessibilityLabel="Reset code to starter"
            className="rounded-full border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-1.5 active:bg-slate-100"
          >
            <Text className="text-xs font-extrabold text-slate-600 dark:text-slate-400">↺ Reset</Text>
          </Pressable>
        </View>
        <View className="mt-2 shadow-lg">
          <CodeEditor key={resetTick} initial={starter} onChange={(d) => { setDoc(d); setSubmitted(false); setServerChecks(null); setLive(null); }} />
        </View>

        {/* Live preview */}
        <View className="mb-1 mt-4 flex-row items-center gap-1.5">
          <AppIcon name="eye" size={16} color="#64748B" />
          <Text className="text-sm font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Live preview</Text>
        </View>
        <View className="h-72 overflow-hidden rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          {Platform.OS === 'web' ? (
            <WebPreview html={previewDoc(doc)} />
          ) : NativeWebView ? (
            <NativeWebView originWhitelist={['*']} source={{ html: previewDoc(doc) }} style={{ flex: 1 }} />
          ) : (
            <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
              <Text className="text-center text-sm text-slate-500 dark:text-slate-400">
                Live preview needs the dev-build app — the editor and Run tests below work fully in Expo Go.
              </Text>
            </View>
          )}
        </View>

        {/* Duo-style 3D submit button */}
        <Pressable
          onPress={submit}
          disabled={!allPass || submitted}
          accessibilityRole="button"
          accessibilityLabel="Submit project for grading"
          className={`mt-4 items-center rounded-2xl border-b-4 py-4 shadow-lg active:translate-y-0.5 active:border-b-0 ${
            allPass ? 'border-green-700 bg-green-500' : 'border-slate-300 dark:border-slate-700 bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <Text className="text-lg font-extrabold uppercase tracking-wide text-white">
            {allPass
              ? `Submit project · +${project.xp} XP`
              : needsLive && !live
                ? `Run tests to verify your project (${passed}/${verdict.length})`
                : `Pass all ${verdict.length} stories to submit (${passed}/${verdict.length})`}
          </Text>
        </Pressable>
      </View>
      <StatusBar style="auto" />
    </ScrollView>
      {/* Hidden runtime: the learner's page executes here and reports story verdicts. */}
      {Platform.OS === 'web' && liveDoc
        ? createElement('iframe', {
            key: liveDoc.seq,
            srcDoc: liveDoc.html,
            sandbox: 'allow-scripts',
            title: 'Project test runner',
            style: { position: 'absolute', width: 1, height: 1, opacity: 0, borderWidth: 0, pointerEvents: 'none' },
          })
        : null}
      {Platform.OS !== 'web' && NativeWebView && liveDoc ? (
        <NativeWebView
          key={liveDoc.seq}
          originWhitelist={['*']}
          source={{ html: liveDoc.html }}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
          onMessage={(e) => {
            const parsed = parseProjectMessage(e.nativeEvent.data);
            if (parsed) finishLive(parsed);
          }}
        />
      ) : null}
      {/* Super Intelligent help: Bingo debugs stuck builders in context. */}
      <AskBingo
        lessonTitle={String(title ?? project.title)}
        prompt={project.brief[0]}
        theory={project.brief.join(' ').slice(0, 900)}
        userId={builderId}
      />
    </View>
  );
}
