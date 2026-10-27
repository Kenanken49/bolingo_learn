import { createElement, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import CodeEditor, { combineDoc, type CodeDoc } from '../../../components/CodeEditor';
import { getCourseProject } from '../../../lib/courses';
import { completeLesson, getProfile } from '../../../lib/progress';
import { setLessonResult } from '../../../lib/quizResults';

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
  const project = useMemo(() => getCourseProject(lessonId), [lessonId]);
  const starter: CodeDoc = useMemo(
    () => ({
      html: project?.starterCode ?? '',
      css: '/* Your styles live here */\n',
      js: '// Optional JavaScript — e.g. document.querySelector("h1").style.color = "green";\n',
    }),
    [project]
  );
  const [doc, setDoc] = useState<CodeDoc>(starter);
  const [submitted, setSubmitted] = useState(false);
  const [resetTick, setResetTick] = useState(0);

  const combined = useMemo(() => combineDoc(doc), [doc]);
  const checks = useMemo(() => {
    if (!project) return [];
    return project.stories.map((s) => {
      let pass = false;
      try {
        pass = new RegExp(s.pattern, 'i').test(combined);
      } catch {
        pass = false;
      }
      return { ...s, pass };
    });
  }, [combined, project]);
  const passed = checks.filter((c) => c.pass).length;
  const allPass = passed >= checks.length && checks.length > 0;

  if (!project) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-lg text-slate-600">Project not found.</Text>
        <Pressable onPress={() => router.replace('/')} className="mt-4 rounded-2xl bg-slate-800 px-6 py-3">
          <Text className="font-bold text-white">Back to Path</Text>
        </Pressable>
      </View>
    );
  }

  const reset = () => {
    setDoc(starter);
    setSubmitted(false);
    setResetTick((t) => t + 1); // remounts the editor back to starter code
  };

  const submit = async () => {
    if (!allPass || submitted) return;
    setSubmitted(true);
    const results = checks.map((c) => ({
      prompt: c.label,
      yourAnswer: c.pass ? 'satisfied' : '—',
      correctAnswer: c.hint,
      correct: c.pass,
    }));
    const goResults = (streakCount: number) => {
      setLessonResult({
        lessonId,
        title: String(title ?? project.title),
        xpEarned: project.xp,
        streak: streakCount,
        correctCount: passed,
        total: checks.length,
        results,
      });
      router.replace('/results');
    };
    const p = await getProfile().catch(() => null);
    if (p) {
      completeLesson(p.id, project.xp, lessonId)
        .then((prof) => goResults(prof.streak_count))
        .catch(() => goResults(0));
    } else {
      goResults(0);
    }
  };

  return (
    <ScrollView contentContainerClassName="bg-slate-100 px-4 pb-16 pt-12 md:px-6">
      <View className="w-full max-w-3xl self-center">
        <Pressable onPress={() => router.replace('/')} accessibilityRole="button" accessibilityLabel="Back to learning path">
          <Text className="font-bold text-sky-600">‹ Back to Learn</Text>
        </Pressable>

        {/* FCC-style project header */}
        <View className="mt-3 rounded-3xl bg-slate-900 p-6 shadow-lg">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-extrabold uppercase tracking-widest text-orange-400">🏗️ Certification project</Text>
            <View className="rounded-full bg-amber-400 px-3 py-1.5">
              <Text className="text-xs font-extrabold text-slate-900">⭐ +{project.xp} XP</Text>
            </View>
          </View>
          <Text className="mt-1 text-3xl font-extrabold text-white">{project.title}</Text>
          {project.brief.map((b, i) => (
            <Text key={i} className="mt-2 text-base font-semibold leading-6 text-slate-300">
              {b}
            </Text>
          ))}
        </View>

        {/* User stories — FCC lab checklist as status cards */}
        <View className="mt-4 rounded-3xl border-2 border-slate-200 bg-white p-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-extrabold text-slate-900">✅ User stories</Text>
            <View className={`rounded-full px-3 py-1 ${allPass ? 'bg-green-100' : 'bg-slate-100'}`}>
              <Text className={`text-xs font-extrabold ${allPass ? 'text-green-700' : 'text-slate-500'}`}>
                {passed}/{checks.length} passing
              </Text>
            </View>
          </View>
          <View className="mt-2">
            {checks.map((c, i) => (
              <View
                key={i}
                className={`mt-2 flex-row items-start rounded-2xl border-2 p-3 ${c.pass ? 'border-green-200 bg-green-50' : 'border-slate-100 bg-slate-50'}`}
              >
                <Text className={`text-lg ${c.pass ? 'text-green-500' : 'text-slate-300'}`}>{c.pass ? '●' : '○'}</Text>
                <View className="ml-2 flex-1">
                  <Text className={`font-mono text-sm font-bold ${c.pass ? 'text-green-800' : 'text-slate-700'}`}>
                    {c.label}
                  </Text>
                  {!c.pass ? <Text className="mt-0.5 text-xs text-slate-400">Hint: {c.hint}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Tabbed editor with reset */}
        <View className="mt-4 flex-row items-center justify-between">
          <Text className="text-sm font-extrabold uppercase tracking-widest text-slate-500">💻 Code editor</Text>
          <Pressable
            onPress={reset}
            accessibilityRole="button"
            accessibilityLabel="Reset code to starter"
            className="rounded-full border-2 border-slate-300 bg-white px-4 py-1.5 active:bg-slate-100"
          >
            <Text className="text-xs font-extrabold text-slate-600">↺ Reset</Text>
          </Pressable>
        </View>
        <View className="mt-2 shadow-lg">
          <CodeEditor key={resetTick} initial={starter} onChange={(d) => { setDoc(d); setSubmitted(false); }} />
        </View>

        {/* Live preview */}
        <Text className="mb-1 mt-4 text-sm font-extrabold uppercase tracking-widest text-slate-500">👀 Live preview</Text>
        <View className="h-72 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
          {Platform.OS === 'web' ? (
            <WebPreview html={previewDoc(doc)} />
          ) : (
            <WebView originWhitelist={['*']} source={{ html: previewDoc(doc) }} style={{ flex: 1 }} />
          )}
        </View>

        {/* Duo-style 3D submit button */}
        <Pressable
          onPress={submit}
          disabled={!allPass || submitted}
          accessibilityRole="button"
          accessibilityLabel="Submit project for grading"
          className={`mt-4 items-center rounded-2xl border-b-4 py-4 shadow-lg active:translate-y-0.5 active:border-b-0 ${
            allPass ? 'border-green-700 bg-green-500' : 'border-slate-300 bg-slate-300'
          }`}
        >
          <Text className="text-lg font-extrabold uppercase tracking-wide text-white">
            {allPass ? `Submit project · +${project.xp} XP` : `Pass all ${checks.length} stories to submit (${passed}/${checks.length})`}
          </Text>
        </Pressable>
      </View>
      <StatusBar style="auto" />
    </ScrollView>
  );
}
