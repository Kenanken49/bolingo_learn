import { useCallback, useState } from 'react';
import { View, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Shell from '../../components/dashboard/Shell';
import { SectionHeader, DashBar, ScheduleCard } from '../../components/dashboard/widgets';
import Text from '../../components/ui/Text';
import AppIcon from '../../components/AppIcon';
import { getProfile, getCompletedLessonIds, type Profile } from '../../lib/progress';
import { CURRICULUM, type CurriculumUnit } from '../../lib/curriculum';
import { greeting, firstName, scheduleItems, type ScheduleItem } from '../../lib/dashboard';
import { openBlock } from './index';

type Tab = 'progress' | 'todo' | 'done';

function unitState(u: CurriculumUnit, completed: Set<string>): Tab {
  const done = u.blocks.filter((b) => completed.has(b.lessonId) || completed.has(b.id)).length;
  if (done >= u.blocks.length) return 'done';
  if (done > 0) return 'progress';
  return 'todo';
}

export default function MyLearning() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [tab, setTab] = useState<Tab>('progress');

  const refresh = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
      const done = p ? await getCompletedLessonIds(p.id).catch(() => new Set<string>()) : new Set<string>();
      setCompleted(done);
      setSchedule(await scheduleItems(p?.id ?? null, done));
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const units = CURRICULUM.filter((u) => unitState(u, completed) === tab);

  return (
    <Shell
      active="/mylearning"
      eyebrow="Learning space"
      greeting={greeting(firstName(profile?.username))}
      profile={profile}
    >
      <View className="flex-row gap-2">
        {(
          [
            { id: 'progress', label: 'In progress' },
            { id: 'todo', label: 'To do' },
            { id: 'done', label: 'Completed' },
          ] as { id: Tab; label: string }[]
        ).map((t) => {
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

      <ScheduleCard
        items={schedule}
        onOpen={(s) => router.push({ pathname: s.route as never, params: s.params } as never)}
        onFull={() => {}}
      />

      <SectionHeader title={tab === 'progress' ? 'Continue learning' : tab === 'todo' ? 'Up next' : 'Finished units'} />
      <View className="gap-2">
        {units.map((u) => {
          const done = u.blocks.filter((b) => completed.has(b.lessonId) || completed.has(b.id)).length;
          const pct = u.blocks.length ? done / u.blocks.length : 0;
          const nextBlock = u.blocks.find((b) => !completed.has(b.lessonId) && !completed.has(b.id));
          return (
            <View
              key={u.id}
              className="rounded-2xl border border-dash-line bg-dash-card p-3 dark:border-dash-dline dark:bg-dash-dcard"
            >
              <Text className="text-[9.5px] font-extrabold uppercase tracking-[1.2px] text-dash-pillink">
                {u.section}
              </Text>
              <Text className="mt-0.5 text-[14.5px] font-extrabold text-dash-ink dark:text-dash-dink" numberOfLines={1}>
                {u.title}
              </Text>
              <Text className="mt-0.5 text-[11px] font-semibold text-dash-muted dark:text-dash-dmuted">
                {done}/{u.blocks.length} complete
              </Text>
              <View className="mt-2">
                <DashBar value={pct} height={5} />
              </View>
              <View className="mt-2 flex-row gap-2">
                {nextBlock ? (
                  <Pressable
                    onPress={() => openBlock(nextBlock)}
                    accessibilityRole="button"
                    accessibilityLabel={`Resume ${u.title}`}
                    className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-dash-cyan py-2.5"
                  >
                    <AppIcon name="play" size={13} color="#062A33" />
                    <Text className="text-[12.5px] font-extrabold text-[#062A33]">
                      {tab === 'todo' ? 'Start' : 'Resume'}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => router.push({ pathname: '/curriculum/[unitId]', params: { unitId: u.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${u.title} details`}
                  className="flex-1 items-center rounded-xl border border-dash-line py-2.5 dark:border-dash-dline"
                >
                  <Text className="text-[12.5px] font-extrabold text-dash-pillink">Details</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
        {units.length === 0 ? (
          <Text className="mt-4 text-center text-[13px] font-semibold text-dash-muted dark:text-dash-dmuted">
            Nothing here yet.
          </Text>
        ) : null}
      </View>
    </Shell>
  );
}
