import { useCallback, useState } from 'react';
import { View, Pressable } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Shell from '../../components/dashboard/Shell';
import { SectionHeader, DashBar } from '../../components/dashboard/widgets';
import Text from '../../components/ui/Text';
import AppIcon from '../../components/AppIcon';
import { getProfile, getCompletedLessonIds, type Profile } from '../../lib/progress';
import { allTracks, type DashTrack } from '../../lib/dashboard';

type Tab = 'all' | 'progress' | 'done';

export default function Explore() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>('all');

  const refresh = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
      setCompleted(p ? await getCompletedLessonIds(p.id).catch(() => new Set<string>()) : new Set());
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const query = (typeof q === 'string' ? q : '').trim().toLowerCase();
  const tracks = allTracks(completed).filter((t) => {
    if (query && !`${t.title} ${t.blurb}`.toLowerCase().includes(query)) return false;
    const pct = t.total ? t.progress / t.total : 0;
    if (tab === 'progress') return pct > 0 && pct < 1;
    if (tab === 'done') return pct >= 1;
    return true;
  });

  const open = (t: DashTrack) =>
    router.push({ pathname: t.route as never, params: t.params } as never);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'all', label: 'All courses' },
    { id: 'progress', label: 'In progress' },
    { id: 'done', label: 'Completed' },
  ];

  return (
    <Shell active="/explore" eyebrow="Find your next move" greeting="Explore tracks" profile={profile}>
      <View className="flex-row gap-2">
        {tabs.map((t) => {
          const on = tab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              accessibilityRole="button"
              accessibilityLabel={t.label}
              className={`rounded-full px-4 py-2 ${on ? 'bg-dash-hero' : 'border border-dash-line bg-dash-card dark:border-dash-dline dark:bg-dash-dcard'}`}
            >
              <Text className={`text-[12.5px] font-extrabold ${on ? 'text-white' : 'text-dash-muted dark:text-dash-dmuted'}`}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {query ? (
        <Text className="mt-3 text-[12px] font-semibold text-dash-muted dark:text-dash-dmuted">
          {tracks.length} result{tracks.length === 1 ? '' : 's'} for “{typeof q === 'string' ? q : ''}”
        </Text>
      ) : null}
      <SectionHeader title={tab === 'all' ? 'All tracks' : tab === 'progress' ? 'In progress' : 'Completed'} />
      <View className="gap-2">
        {tracks.map((t) => {
          const pct = t.total ? t.progress / t.total : 0;
          return (
            <Pressable
              key={t.id}
              onPress={() => open(t)}
              accessibilityRole="button"
              accessibilityLabel={`${t.title}, ${t.lessonLabel}`}
              className="flex-row items-center rounded-2xl border border-dash-line bg-dash-card p-3 dark:border-dash-dline dark:bg-dash-dcard"
            >
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-dash-pill dark:bg-dash-dbg">
                <AppIcon name={t.kind === 'cert' ? 'medal' : 'gradCap'} size={20} color="#0284C7" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[14px] font-extrabold text-dash-ink dark:text-dash-dink" numberOfLines={1}>
                  {t.title}
                </Text>
                <Text className="mt-0.5 text-[11px] font-semibold text-dash-muted dark:text-dash-dmuted" numberOfLines={1}>
                  {t.lessonLabel} · {t.progress}/{t.total} done
                </Text>
                <View className="mt-1.5">
                  <DashBar value={pct} height={5} />
                </View>
              </View>
              <AppIcon name="chevRight" size={18} color="#94A3B8" />
            </Pressable>
          );
        })}
        {tracks.length === 0 ? (
          <Text className="mt-4 text-center text-[13px] font-semibold text-dash-muted dark:text-dash-dmuted">
            Nothing here yet — try another filter.
          </Text>
        ) : null}
      </View>
    </Shell>
  );
}
