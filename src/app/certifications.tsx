import { useCallback, useEffect, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import Text from '../../components/ui/Text';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Mascot from '../../components/AfricanMascots';
import AppIcon from '../../components/AppIcon';
import { ContentMark } from '../../components/AppIcon';
import { CERTIFICATIONS, fetchRemoteCatalog, isTrackCertified, trackProgress } from '../../lib/certifications';
import type { CertTrack } from '../../lib/certifications';
import { getCompletedLessonIds, getProfile } from '../../lib/progress';

/**
 * Core Curriculum — 7 freeCodeCamp-style certification tracks × 5 mandatory
 * projects. Passing all 5 automated-test projects earns the certification.
 * Progress reuses lesson_completions, so it syncs across devices.
 */
export default function Certifications() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Record<string, boolean>>({ rwd: true });
  // Remote catalog wins when it validates; the bundle is the offline fallback.
  const [tracks, setTracks] = useState<CertTrack[]>(CERTIFICATIONS);
  useEffect(() => {
    fetchRemoteCatalog().then((remote) => {
      if (remote) setTracks(remote);
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const p = await getProfile();
      if (p) setCompleted(await getCompletedLessonIds(p.id));
    } catch {
      // guests see the catalog; progress unlocks after sign-in
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const earned = tracks.filter((t) => isTrackCertified(t, completed)).length;

  return (
    <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-xl self-center px-4 pb-24 pt-8" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <Pressable onPress={() => router.replace('/')} accessibilityRole="button" accessibilityLabel="Back to learning path">
        <View className="flex-row items-center gap-0.5">
          <AppIcon name="chevBack" size={16} color="#0284C7" />
          <Text className="font-bold text-sky-600 dark:text-sky-400">Back to Learn</Text>
        </View>
      </Pressable>

      <View className="mt-3 items-center rounded-3xl bg-slate-900 p-6">
        <Mascot character="bingo" mood="party" size={84} />
        <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-amber-300">Bingo presents</Text>
        <Text className="mt-2 text-center font-duo text-2xl font-extrabold text-white">Core Certifications</Text>
        <Text className="mt-1 text-center text-sm font-semibold leading-5 text-slate-300 dark:text-slate-200">
          7 tracks · 5 mandatory projects each · automated tests grade every build. Pass all 5 to earn the certification.
        </Text>
        <View className="mt-3 rounded-full bg-amber-400 px-4 py-1.5">
          <View className="flex-row items-center gap-1">
            <AppIcon name="trophy" size={14} color="#0F172A" />
            <Text className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
              {earned}/{tracks.length} certifications earned
            </Text>
          </View>
        </View>
      </View>

      {tracks.map((t) => {
        const done = trackProgress(t, completed);
        const certified = isTrackCertified(t, completed);
        const expanded = open[t.id] ?? false;
        return (
          <View key={t.id} className="mt-4 overflow-hidden rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Pressable
              onPress={() => setOpen((o) => ({ ...o, [t.id]: !expanded }))}
              accessibilityRole="button"
              accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${t.name}`}
              className="flex-row items-center bg-slate-50 dark:bg-slate-900 px-5 py-4"
            >
              <ContentMark emoji={t.icon} size={32} color="#0F172A" badgeBg="#F1F5F9" />
              <View className="ml-3 flex-1">
                <Text className="font-duo text-lg font-extrabold text-slate-900 dark:text-slate-100">{t.name}</Text>
                <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {done}/5 projects{certified ? ' · CERTIFIED' : ''}
                </Text>
                <View className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <View className={`h-full rounded-full ${certified ? 'bg-amber-400' : 'bg-green-500'}`} style={{ width: `${(done / 5) * 100}%` }} />
                </View>
                <Text className="mt-1 text-xs text-slate-400 dark:text-slate-500" numberOfLines={2}>
                  {t.skills.join(' · ')}
                </Text>
              </View>
              <Text className="ml-2 text-xl text-slate-400 dark:text-slate-500">{expanded ? '▲' : '▼'}</Text>
            </Pressable>
            {expanded ? (
              <View>
                <Text className="px-5 pt-3 text-sm text-slate-500 dark:text-slate-400">{t.blurb}</Text>
                {t.projects.map((p, i) => {
                  const passed = completed.has(p.id);
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() =>
                        router.push({ pathname: '/project/[lessonId]', params: { lessonId: p.id, title: p.title } })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Start ${p.title}`}
                      className={`mx-3 mb-2 mt-2 flex-row items-center rounded-2xl border-2 p-3 ${
                        passed ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900'
                      }`}
                    >
                      <AppIcon name={passed ? 'trophy' : 'starOutline'} size={22} color={passed ? '#D97706' : '#94A3B8'} />
                      <View className="ml-2 flex-1">
                        <Text className="text-[10px] font-extrabold uppercase tracking-widest text-orange-500 dark:text-orange-400">
                          Project {i + 1}/5 · +{p.xp} XP
                        </Text>
                        <Text className="font-duo text-base font-extrabold text-slate-900 dark:text-slate-100">{p.title}</Text>
                        <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={1}>
                          {p.skills.join(' · ')}
                        </Text>
                      </View>
                      <AppIcon name="chevRight" size={20} color="#22C55E" />
                    </Pressable>
                  );
                })}
                {certified ? (
                  <View className="mx-3 mb-3 items-center rounded-2xl bg-amber-100 dark:bg-amber-950 py-2.5">
                    <View className="flex-row items-center justify-center gap-1.5">
                      <AppIcon name="trophy" size={16} color="#92400E" />
                      <Text className="font-duo text-sm font-extrabold text-amber-800 dark:text-amber-200">
                        {t.name} — Certified!
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
      <StatusBar style="auto" />
    </ScrollView>
  );
}
