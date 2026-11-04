import { useCallback, useState } from 'react';
import { View, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Shell from '../../components/dashboard/Shell';
import { SectionHeader } from '../../components/dashboard/widgets';
import Text from '../../components/ui/Text';
import AppIcon, { type AppIconName } from '../../components/AppIcon';
import { getProfile, type Profile } from '../../lib/progress';
import { greeting, firstName, latestBookTitle } from '../../lib/dashboard';

const SHELVES: { title: string; sub: string; icon: AppIconName; route: string }[] = [
  { title: 'Audiobooks', sub: '186 classics + your generated books', icon: 'headset', route: '/audiobooks' },
  { title: 'My uploads', sub: 'Turn files into lessons & narration', icon: 'upload', route: '/uploads' },
  { title: 'Dictionary', sub: 'Swahili ↔ English lookup', icon: 'book', route: '/dictionary' },
];

/** Library — the wireframe's shelf, backed by the real book + upload stores. */
export default function Library() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [latest, setLatest] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setProfile(await getProfile());
      setLatest(await latestBookTitle());
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return (
    <Shell
      active="/library"
      eyebrow="Your shelf"
      greeting={greeting(firstName(profile?.username))}
      profile={profile}
    >
      {latest ? (
        <Pressable
          onPress={() => router.push('/audiobooks')}
          accessibilityRole="button"
          accessibilityLabel={`Continue ${latest}`}
          className="overflow-hidden rounded-3xl bg-dash-hero p-5"
        >
          <Text className="text-[10px] font-extrabold uppercase tracking-[1.8px] text-emerald-300">
            Continue listening
          </Text>
          <Text className="mt-1 text-[19px] font-extrabold tracking-tight text-white" numberOfLines={2}>
            {latest}
          </Text>
          <View className="mt-3 flex-row items-center justify-center gap-2 rounded-full bg-dash-cyan py-2.5">
            <AppIcon name="play" size={13} color="#062A33" />
            <Text className="text-[13px] font-extrabold text-[#062A33]">Open player</Text>
          </View>
        </Pressable>
      ) : null}
      <SectionHeader title="Shelves" />
      <View className="gap-2">
        {SHELVES.map((s) => (
          <Pressable
            key={s.route}
            onPress={() => router.push(s.route as never)}
            accessibilityRole="button"
            accessibilityLabel={s.title}
            className="flex-row items-center rounded-2xl border border-dash-line bg-dash-card p-3 dark:border-dash-dline dark:bg-dash-dcard"
          >
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-dash-pill dark:bg-dash-dbg">
              <AppIcon name={s.icon} size={20} color="#0284C7" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[14px] font-extrabold text-dash-ink dark:text-dash-dink">{s.title}</Text>
              <Text className="text-[11px] font-semibold text-dash-muted dark:text-dash-dmuted">{s.sub}</Text>
            </View>
            <AppIcon name="chevRight" size={18} color="#94A3B8" />
          </Pressable>
        ))}
      </View>
    </Shell>
  );
}
