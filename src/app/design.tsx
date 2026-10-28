import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Mascot from '../../components/AfricanMascots';
import { DESIGN_GUIDES, DESIGN_VIDEOS } from '../../lib/design';

/**
 * UI/UX Design Ecosystem hub.
 * A — native interactive module (quiz engine lessons + capstone project).
 * B — video masterclasses (freeCodeCamp YouTube, via the device browser).
 * C — bundled publication guides (offline reading, no account needed).
 */
const NATIVE_BLOCKS = [
  { lessonId: 'ux-hierarchy', title: 'Visual hierarchy & contrast', meta: 'Lesson · ⚡ 3 min · +10 XP' },
  { lessonId: 'ux-scaling', title: 'Scaling & alignment workshop', meta: 'Workshop · ⚡ 4 min · +20 XP' },
  { lessonId: 'ux-user-centered', title: 'User-centered design lab', meta: 'Lab · ⚡ 5 min · +20 XP' },
  { lessonId: 'ux-quiz', title: 'Design fundamentals quiz', meta: 'Quiz · ⚡ 2 min · +30 XP' },
  { lessonId: 'ux-redesign', title: 'Capstone: accessible redesign', meta: 'Project · ⚡ 5 min · +50 XP' },
];

export default function DesignHub() {
  const [openGuide, setOpenGuide] = useState<string | null>('ux-vs-ui');

  const openLesson = (lessonId: string, title: string) =>
    lessonId === 'ux-redesign'
      ? router.push({ pathname: '/project/[lessonId]', params: { lessonId, title } })
      : router.push({ pathname: '/quiz/[lessonId]', params: { lessonId, title } });

  return (
    <ScrollView contentContainerClassName="bg-white px-6 pb-16 pt-12">
      <Pressable onPress={() => router.replace('/')} accessibilityRole="button" accessibilityLabel="Back to learning path">
        <Text className="font-bold text-sky-600">‹ Back to Learn</Text>
      </Pressable>

      <View className="mt-3 items-center rounded-3xl bg-pink-500 p-6">
        <Mascot character="livia" mood="happy" size={84} />
        <Text className="mt-2 text-center font-duo text-2xl font-extrabold text-white">UI/UX Design Ecosystem</Text>
        <Text className="mt-1 text-center text-sm font-semibold leading-5 text-white/85">
          Built for developers: learn design fundamentals by coding them — then go deeper with masterclasses and guides.
        </Text>
      </View>

      {/* A — native interactive module: three sections on wide screens. */}
      <Text className="mt-6 font-duo text-lg font-extrabold text-slate-900">A · Interactive module</Text>
      <Text className="text-sm text-slate-500">
        Visual hierarchy & contrast · scaling & alignment · user-centered design — taught as code, tested like code.
      </Text>
      <View className="flex-row flex-wrap gap-2 md:grid md:grid-cols-3">
      {NATIVE_BLOCKS.map((b) => (
        <Pressable
          key={b.lessonId}
          onPress={() => openLesson(b.lessonId, b.title)}
          accessibilityRole="button"
          accessibilityLabel={`Start ${b.title}`}
          className="mt-2 w-full flex-col rounded-2xl border-2 border-pink-100 bg-pink-50 p-4 md:w-[31%] md:min-w-[180px] md:flex-1"
        >
          <Text className="text-2xl">🎨</Text>
          <View className="mt-2 flex-1">
            <Text className="font-duo text-base font-extrabold text-slate-900">{b.title}</Text>
            <Text className="text-xs font-bold text-slate-500">{b.meta}</Text>
          </View>
          <Text className="mt-2 text-base font-extrabold text-pink-500">Start ›</Text>
        </Pressable>
      ))}
      </View>

      {/* B — video masterclasses */}
      <Text className="mt-6 font-duo text-lg font-extrabold text-slate-900">B · Video masterclasses</Text>
      <Text className="text-sm text-slate-500">Multi-hour Figma courses from freeCodeCamp YouTube — plays in-app, back returns you here.</Text>
      {DESIGN_VIDEOS.map((v) => (
        <View key={v.id} className="mt-2 rounded-3xl border-2 border-slate-200 bg-white p-4">
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-red-500">
              <Text className="text-2xl text-white">▶</Text>
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-duo text-base font-extrabold text-slate-900">{v.title}</Text>
              <Text className="text-xs font-bold text-slate-500">
                {v.author} · ⏱ {v.hours}h
              </Text>
            </View>
          </View>
          <Text className="mt-2 text-xs font-extrabold uppercase tracking-widest text-slate-400">You will learn</Text>
          <Text className="text-sm text-slate-600">{v.topics.join(' · ')}</Text>
          <Text className="mt-1 text-xs font-extrabold uppercase tracking-widest text-slate-400">You will build</Text>
          <Text className="text-sm text-slate-600">{v.builds.join(' · ')}</Text>
          <Pressable
            onPress={() => void WebBrowser.openBrowserAsync(v.url, { dismissButtonStyle: 'close' })}
            accessibilityRole="button"
            accessibilityLabel={`Watch ${v.title} on YouTube`}
            className="mt-3 items-center rounded-2xl bg-red-500 py-3"
          >
            <Text className="font-extrabold text-white">▶ Watch on YouTube ({v.hours}h)</Text>
          </Pressable>
        </View>
      ))}

      {/* C — publication guides */}
      <Text className="mt-6 font-duo text-lg font-extrabold text-slate-900">C · Guides hub</Text>
      <Text className="text-sm text-slate-500">Foundational reads, bundled for offline study — tap to expand.</Text>
      {DESIGN_GUIDES.map((g) => {
        const open = openGuide === g.id;
        return (
          <View key={g.id} className="mt-2 overflow-hidden rounded-3xl border-2 border-slate-200 bg-white">
            <Pressable
              onPress={() => setOpenGuide(open ? null : g.id)}
              accessibilityRole="button"
              accessibilityLabel={`${open ? 'Collapse' : 'Expand'} ${g.title}`}
              className="flex-row items-center px-4 py-3"
            >
              <Text className="text-2xl">{g.icon}</Text>
              <View className="ml-3 flex-1">
                <Text className="font-duo text-base font-extrabold text-slate-900">{g.title}</Text>
                <Text className="text-xs font-bold text-slate-400">📖 {g.minutes} min read</Text>
              </View>
              <Text className="text-xl text-slate-400">{open ? '▲' : '▼'}</Text>
            </Pressable>
            {open ? (
              <View className="border-t border-slate-100 px-4 pb-4">
                <Text className="mt-2 text-sm font-semibold text-slate-500">{g.blurb}</Text>
                {g.body.map((p, i) => (
                  <Text key={i} className="mt-2 text-sm leading-5 text-slate-700">
                    {p}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
      <StatusBar style="auto" />
    </ScrollView>
  );
}
