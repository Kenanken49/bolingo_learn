import { createElement, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getCourseProject } from '../../../lib/courses';
import { completeLesson, getProfile } from '../../../lib/progress';
import { setLessonResult } from '../../../lib/quizResults';

/** Web preview: react-native-webview has no web implementation, so render a real iframe. */
function WebPreview({ html }: { html: string }) {
  return createElement('iframe', {
    srcDoc: html,
    title: 'Live preview',
    style: { width: '100%', height: '100%', borderWidth: 0 },
  }) as unknown as React.ReactElement;
}

/** Wrap raw learner code in a minimal document for the live preview. */
function previewDoc(code: string): string {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui,sans-serif;padding:16px;color:#0f172a}h1{margin:0 0 8px}</style></head><body>${code}</body></html>`;
}

export default function CertificationProject() {
  const { lessonId, title } = useLocalSearchParams<{ lessonId: string; title?: string }>();
  const project = useMemo(() => getCourseProject(lessonId), [lessonId]);
  const [code, setCode] = useState(project?.starterCode ?? '');
  const [submitted, setSubmitted] = useState(false);

  const checks = useMemo(() => {
    if (!project) return [];
    return project.stories.map((s) => {
      let pass = false;
      try {
        pass = new RegExp(s.pattern, 'i').test(code);
      } catch {
        pass = false;
      }
      return { ...s, pass };
    });
  }, [code, project]);
  const passed = checks.filter((c) => c.pass).length;

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

  const submit = async () => {
    if (passed < checks.length || submitted) return;
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
    <ScrollView contentContainerClassName="bg-slate-50 px-6 pb-16 pt-12">
      <Pressable onPress={() => router.replace('/')} accessibilityRole="button" accessibilityLabel="Back to learning path">
        <Text className="font-bold text-sky-600">‹ Back to Learn</Text>
      </Pressable>

      {/* FCC-style project header */}
      <View className="mt-3 rounded-3xl bg-orange-500 p-6">
        <Text className="text-xs font-extrabold uppercase tracking-widest text-white/80">Certification project</Text>
        <Text className="mt-1 text-3xl font-extrabold text-white">🏗️ {project.title}</Text>
        {project.brief.map((b, i) => (
          <Text key={i} className="mt-2 text-base font-semibold text-white/90">
            {b}
          </Text>
        ))}
        <View className="mt-3 rounded-full self-start bg-black/20 px-3 py-1.5">
          <Text className="text-xs font-extrabold text-white">⭐ +{project.xp} XP on submit</Text>
        </View>
      </View>

      {/* User stories checklist — live pass/fail like FCC labs */}
      <View className="mt-4 rounded-3xl border-2 border-slate-200 bg-white p-4">
        <Text className="text-base font-extrabold text-slate-900">
          User stories · {passed}/{checks.length} passing
        </Text>
        {checks.map((c, i) => (
          <View key={i} className="mt-2">
            <Text className={`font-mono text-sm font-bold ${c.pass ? 'text-green-600' : 'text-slate-500'}`}>
              {c.pass ? '● PASS' : '○ TODO'} — {c.label}
            </Text>
            {!c.pass ? <Text className="ml-4 text-xs text-slate-400">Hint: {c.hint}</Text> : null}
          </View>
        ))}
      </View>

      {/* Code editor */}
      <Text className="mb-1 mt-4 text-sm font-extrabold uppercase tracking-widest text-slate-500">index.html</Text>
      <TextInput
        value={code}
        onChangeText={(t) => {
          setCode(t);
          setSubmitted(false);
        }}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        placeholder="<h1>Start here…"
        className="min-h-48 rounded-2xl border-2 border-slate-800 bg-slate-950 p-4 font-mono text-sm leading-5 text-green-300"
        style={{ textAlignVertical: 'top' }}
      />

      {/* Live preview */}
      <Text className="mb-1 mt-4 text-sm font-extrabold uppercase tracking-widest text-slate-500">Live preview</Text>
      <View className="h-64 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white">
        {Platform.OS === 'web' ? (
          <WebPreview html={previewDoc(code)} />
        ) : (
          <WebView originWhitelist={['*']} source={{ html: previewDoc(code) }} style={{ flex: 1 }} />
        )}
      </View>

      <Pressable
        onPress={submit}
        disabled={passed < checks.length || submitted}
        accessibilityRole="button"
        accessibilityLabel="Submit project for grading"
        className={`mt-4 items-center rounded-2xl py-4 ${passed >= checks.length ? 'bg-green-500' : 'bg-slate-300'}`}
      >
        <Text className="text-lg font-extrabold text-white">
          {passed >= checks.length ? `Submit project · +${project.xp} XP` : `Pass all ${checks.length} stories to submit (${passed}/${checks.length})`}
        </Text>
      </Pressable>
      <StatusBar style="auto" />
    </ScrollView>
  );
}
