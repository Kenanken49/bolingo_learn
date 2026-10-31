import { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import Text from '../../components/ui/Text';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Mascot from '../../components/AfricanMascots';
import AppIcon, { ContentMark } from '../../components/AppIcon';
import { DESIGN_GUIDES, DESIGN_VIDEOS } from '../../lib/design';

/**
 * UI/UX Design Ecosystem hub.
 * A — native interactive module (quiz engine lessons + capstone project).
 * B — video masterclasses (freeCodeCamp YouTube, via the device browser).
 * C — bundled publication guides (offline reading, no account needed).
 */
const NATIVE_BLOCKS = [
  { lessonId: 'ux-hierarchy', title: 'Visual hierarchy & contrast', meta: 'Lesson · 3 min · +10 XP' },
  { lessonId: 'ux-scaling', title: 'Scaling & alignment workshop', meta: 'Workshop · 4 min · +20 XP' },
  { lessonId: 'ux-user-centered', title: 'User-centered design lab', meta: 'Lab · 5 min · +20 XP' },
  { lessonId: 'ux-quiz', title: 'Design fundamentals quiz', meta: 'Quiz · 2 min · +30 XP' },
  { lessonId: 'ux-redesign', title: 'Capstone: accessible redesign', meta: 'Project · 5 min · +50 XP' },
];

export default function DesignHub() {
  const [openGuide, setOpenGuide] = useState<string | null>('ux-vs-ui');

  const openLesson = (lessonId: string, title: string) =>
    lessonId === 'ux-redesign'
      ? router.push({ pathname: '/project/[lessonId]', params: { lessonId, title } })
      : router.push({ pathname: '/quiz/[lessonId]', params: { lessonId, title } });

  return (
    <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-xl self-center px-4 pb-24 pt-8" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <Pressable onPress={() => router.replace('/')} accessibilityRole="button" accessibilityLabel="Back to learning path">
        <View className="flex-row items-center gap-0.5">
          <AppIcon name="chevBack" size={16} color="#0284C7" />
          <Text className="font-bold text-sky-600 dark:text-sky-400">Back to Learn</Text>
        </View>
      </Pressable>

      <View className="mt-3 items-center overflow-hidden rounded-3xl border border-pink-300 bg-white p-6 dark:border-[#FF2DAA]/35 dark:bg-[#06060A]">
        {/* QD-OLED quantum halo: magenta core, cyan rim — pure black stays off. */}
        <View pointerEvents="none" className="absolute -right-14 -top-16 h-44 w-44 rounded-full bg-pink-300/25 dark:bg-[#FF2DAA]/20" />
        <View pointerEvents="none" className="absolute -left-16 -bottom-20 h-48 w-48 rounded-full bg-cyan-200/30 dark:bg-[#00E5FF]/10" />
        <Mascot character="zora" mood="happy" size={84} />
        <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-pink-600 dark:text-[#FF2DAA]">Zora · Build coach</Text>
        <Text className="mt-1 text-center font-duo text-2xl font-extrabold text-slate-900 dark:text-white">UI/UX Design Ecosystem</Text>
        <Text className="mt-1 text-center text-sm font-semibold leading-5 text-slate-600 dark:text-slate-300">
          Zora codes every module with you: learn design fundamentals by building them — then go deeper with masterclasses and guides.
        </Text>
      </View>

      {/* A — native interactive module: three sections on wide screens. */}
      <Text className="mt-6 font-duo text-lg font-extrabold text-slate-900 dark:text-slate-100">A · Interactive module</Text>
      <Text className="text-sm text-slate-500 dark:text-slate-400">
        Visual hierarchy & contrast · scaling & alignment · user-centered design — taught as code, tested like code.
      </Text>
      <View className="flex-row flex-wrap gap-2 md:grid md:grid-cols-3">
      {NATIVE_BLOCKS.map((b) => (
        <Pressable
          key={b.lessonId}
          onPress={() => openLesson(b.lessonId, b.title)}
          accessibilityRole="button"
          accessibilityLabel={`Start ${b.title}`}
          className="mt-2 w-full flex-col rounded-2xl border-2 border-pink-200 bg-pink-50 p-4 dark:border-[#FF2DAA]/25 dark:bg-[#12000C] md:w-[31%] md:min-w-[180px] md:flex-1"
        >
          <AppIcon name="palette" size={26} color="#FF2DAA" />
          <View className="mt-2 flex-1">
            <Text className="font-duo text-base font-extrabold text-slate-900 dark:text-slate-100">{b.title}</Text>
            <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">{b.meta}</Text>
          </View>
          <View className="mt-2 flex-row items-center gap-0.5">
            <Text className="text-base font-extrabold text-pink-600 dark:text-[#FF2DAA]">Start</Text>
            <AppIcon name="chevRight" size={18} color="#FF2DAA" />
          </View>
        </Pressable>
      ))}
      </View>

      {/* B — video masterclasses */}
      <Text className="mt-6 font-duo text-lg font-extrabold text-slate-900 dark:text-slate-100">B · Video masterclasses</Text>
      <Text className="text-sm text-slate-500 dark:text-slate-400">Multi-hour Figma courses from freeCodeCamp YouTube — plays in-app, back returns you here.</Text>
      {DESIGN_VIDEOS.map((v) => (
        <View key={v.id} className="mt-2 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-red-500">
              <AppIcon name="play" size={22} color="#FFFFFF" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-duo text-base font-extrabold text-slate-900 dark:text-slate-100">{v.title}</Text>
              <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {v.author} · {v.hours}h
              </Text>
            </View>
          </View>
          <Text className="mt-2 text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">You will learn</Text>
          <Text className="text-sm text-slate-600 dark:text-slate-400">{v.topics.join(' · ')}</Text>
          <Text className="mt-1 text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">You will build</Text>
          <Text className="text-sm text-slate-600 dark:text-slate-400">{v.builds.join(' · ')}</Text>
          <Pressable
            onPress={() => void WebBrowser.openBrowserAsync(v.url, { dismissButtonStyle: 'close' })}
            accessibilityRole="button"
            accessibilityLabel={`Watch ${v.title} on YouTube`}
            className="mt-3 items-center rounded-2xl bg-red-500 py-3"
          >
            <View className="flex-row items-center justify-center gap-1.5">
              <AppIcon name="play" size={18} color="#FFFFFF" />
              <Text className="font-extrabold text-white">Watch on YouTube ({v.hours}h)</Text>
            </View>
          </Pressable>
        </View>
      ))}

      {/* C — publication guides */}
      <Text className="mt-6 font-duo text-lg font-extrabold text-slate-900 dark:text-slate-100">C · Guides hub</Text>
      <Text className="text-sm text-slate-500 dark:text-slate-400">Foundational reads, bundled for offline study — tap to expand.</Text>
      {DESIGN_GUIDES.map((g) => {
        const open = openGuide === g.id;
        return (
          <View key={g.id} className="mt-2 overflow-hidden rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Pressable
              onPress={() => setOpenGuide(open ? null : g.id)}
              accessibilityRole="button"
              accessibilityLabel={`${open ? 'Collapse' : 'Expand'} ${g.title}`}
              className="flex-row items-center px-4 py-3"
            >
              <ContentMark emoji={g.icon} size={26} color="#0F172A" badgeBg="#F1F5F9" />
              <View className="ml-3 flex-1">
                <Text className="font-duo text-base font-extrabold text-slate-900 dark:text-slate-100">{g.title}</Text>
                <View className="flex-row items-center gap-1">
                  <AppIcon name="book" size={12} color="#94A3B8" />
                  <Text className="text-xs font-bold text-slate-400 dark:text-slate-500">{g.minutes} min read</Text>
                </View>
              </View>
              <Text className="text-xl text-slate-400 dark:text-slate-500">{open ? '▲' : '▼'}</Text>
            </Pressable>
            {open ? (
              <View className="border-t border-slate-100 dark:border-slate-800 px-4 pb-4">
                <Text className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{g.blurb}</Text>
                {g.body.map((p, i) => (
                  <Text key={i} className="mt-2 text-sm leading-5 text-slate-700 dark:text-slate-300">
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
