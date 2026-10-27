import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import DuoOwl from '../../components/DuoOwl';
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
    <ScrollView contentContainerClassName="bg-white px-6 pb-16 pt-12">
      <Pressable onPress={() => router.replace('/')} accessibilityRole="button" accessibilityLabel="Back to learning path">
        <Text className="font-bold text-sky-600">‹ Back to Learn</Text>
      </Pressable>

      <View className="mt-3 items-center rounded-3xl bg-slate-900 p-6">
        <DuoOwl mood="party" size={84} />
        <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-amber-300">Bingo 🦉 presents</Text>
        <Text className="mt-2 text-center font-duo text-2xl font-extrabold text-white">Core Certifications</Text>
        <Text className="mt-1 text-center text-sm font-semibold leading-5 text-slate-300">
          7 tracks · 5 mandatory projects each · automated tests grade every build. Pass all 5 to earn the certification.
        </Text>
        <View className="mt-3 rounded-full bg-amber-400 px-4 py-1.5">
          <Text className="text-xs font-extrabold text-slate-900">
            🏆 {earned}/{tracks.length} certifications earned
          </Text>
        </View>
      </View>

      {tracks.map((t) => {
        const done = trackProgress(t, completed);
        const certified = isTrackCertified(t, completed);
        const expanded = open[t.id] ?? false;
        return (
          <View key={t.id} className="mt-4 overflow-hidden rounded-3xl border-2 border-slate-200 bg-white">
            <Pressable
              onPress={() => setOpen((o) => ({ ...o, [t.id]: !expanded }))}
              accessibilityRole="button"
              accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${t.name}`}
              className="flex-row items-center bg-slate-50 px-5 py-4"
            >
              <Text className="text-3xl">{t.icon}</Text>
              <View className="ml-3 flex-1">
                <Text className="font-duo text-lg font-extrabold text-slate-900">{t.name}</Text>
                <Text className="text-xs font-bold text-slate-500">
                  {done}/5 projects{certified ? ' · 🏆 CERTIFIED' : ''}
                </Text>
                <View className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
                  <View className={`h-full rounded-full ${certified ? 'bg-amber-400' : 'bg-green-500'}`} style={{ width: `${(done / 5) * 100}%` }} />
                </View>
                <Text className="mt-1 text-xs text-slate-400" numberOfLines={2}>
                  {t.skills.join(' · ')}
                </Text>
              </View>
              <Text className="ml-2 text-xl text-slate-400">{expanded ? '▲' : '▼'}</Text>
            </Pressable>
            {expanded ? (
              <View>
                <Text className="px-5 pt-3 text-sm text-slate-500">{t.blurb}</Text>
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
                        passed ? 'border-green-200 bg-green-50' : 'border-slate-100 bg-slate-50'
                      }`}
                    >
                      <Text className="text-xl">{passed ? '🏆' : '🧱'}</Text>
                      <View className="ml-2 flex-1">
                        <Text className="text-[10px] font-extrabold uppercase tracking-widest text-orange-500">
                          Project {i + 1}/5 · +{p.xp} XP
                        </Text>
                        <Text className="font-duo text-base font-extrabold text-slate-900">{p.title}</Text>
                        <Text className="text-xs text-slate-500" numberOfLines={1}>
                          {p.skills.join(' · ')}
                        </Text>
                      </View>
                      <Text className="text-xl font-extrabold text-green-500">›</Text>
                    </Pressable>
                  );
                })}
                {certified ? (
                  <View className="mx-3 mb-3 items-center rounded-2xl bg-amber-100 py-2.5">
                    <Text className="font-duo text-sm font-extrabold text-amber-800">
                      🏆 {t.name} — Certified!
                    </Text>
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
