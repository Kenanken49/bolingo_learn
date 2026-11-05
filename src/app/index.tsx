import { useCallback, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Shell from '../../components/dashboard/Shell';
import {
  SectionHeader,
  HeroCard,
  StatsStrip,
  TrackRow,
  CuratedRow,
  MomentumCard,
  ScheduleCard,
  CoachCard,
} from '../../components/dashboard/widgets';
import { getProfile, getCompletedLessonIds, getTodayCompletionCount, type Profile } from '../../lib/progress';
import { getDueCount } from '../../lib/srs';
import { levelForXp, levelProgress } from '../../lib/levels';
import type { CurriculumBlock } from '../../lib/curriculum';
import {
  allTracks,
  curatedTracks,
  greeting,
  firstName,
  weeklyMomentum,
  scheduleItems,
  resumeForSpace,
  type DayCount,
  type ScheduleItem,
} from '../../lib/dashboard';
import { useLearningSpace } from '../../lib/learningSpace';

/** Open a path block in its real player (project runner vs quiz engine). */
export function openBlock(b: CurriculumBlock) {
  if (b.kind === 'project') {
    router.push({ pathname: '/project/[lessonId]', params: { lessonId: b.lessonId, title: b.lessonTitle } });
  } else {
    router.push({ pathname: '/quiz/[lessonId]', params: { lessonId: b.lessonId, title: b.lessonTitle } });
  }
}

export default function DashboardHome() {
  const [space, setSpace] = useLearningSpace();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [todayCount, setTodayCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [momentum, setMomentum] = useState<{ days: DayCount[]; total: number; deltaPct: number | null }>({
    days: [],
    total: 0,
    deltaPct: null,
  });
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const { width } = useWindowDimensions();
  const twoCol = width >= 1024;

  const refresh = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
      const done = p ? await getCompletedLessonIds(p.id).catch(() => new Set<string>()) : new Set<string>();
      setCompleted(done);
      if (p) {
        setTodayCount(await getTodayCompletionCount(p.id).catch(() => 0));
        setDueCount(await getDueCount(p.id).catch(() => 0));
        setMomentum(await weeklyMomentum(p.id));
        setSchedule(await scheduleItems(p.id, done));
      } else {
        setSchedule(await scheduleItems(null, done));
      }
    } catch (e) {
      console.warn('Dashboard refresh failed:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const resume = resumeForSpace(completed, space);
  const resumeBlock = resume?.block ?? null;
  const resumeProject = resume?.project ?? null;

  const xp = profile?.xp ?? 0;
  const level = levelForXp(xp);
  const { into, needed } = levelProgress(xp);
  const todayKey = new Date().toISOString().slice(0, 10);
  const lastKey = profile?.last_activity_at ? new Date(profile.last_activity_at).toISOString().slice(0, 10) : null;
  const streakAtRisk = !!profile && profile.streak_count > 0 && lastKey !== todayKey;

  const tasks = [
    { id: 'lesson', label: 'Complete one lesson', done: todayCount >= 1, frac: todayCount >= 1 ? 'done' : '0/1', icon: 'play' as const },
    { id: 'review', label: 'Clear due reviews', done: dueCount === 0, frac: dueCount === 0 ? 'done' : `${dueCount} due`, icon: 'refresh' as const },
    { id: 'streak', label: 'Feed your streak', done: !streakAtRisk, frac: streakAtRisk ? '0/1' : 'done', icon: 'flame' as const },
  ];

  const tracks = allTracks(completed, space).slice(0, 3);
  const curated = curatedTracks(completed);

  const main = (
    <>
      {resume && (resumeBlock || resumeProject) ? (
        <HeroCard
          eyebrow={resume.eyebrow}
          title={resumeBlock ? resumeBlock.lessonTitle || resumeBlock.title : (resumeProject?.title ?? '')}
          sub={
            resumeBlock
              ? `${resumeBlock.title} · ${resumeBlock.minutes} min · +${resumeBlock.xp} XP`
              : `Capstone project · +${resumeProject?.xp ?? 0} XP`
          }
          progress={resume.progress}
          progressLabel={`${Math.round(resume.progress * 100)}%`}
          onResume={() => {
            if (resumeBlock) openBlock(resumeBlock);
            else if (resumeProject)
              router.push({
                pathname: '/project/[lessonId]',
                params: { lessonId: resumeProject.id, title: resumeProject.title },
              });
          }}
          space={space}
          onSpace={(s) => void setSpace(s)}
        />
      ) : null}
      <StatsStrip
        level={level}
        xp={xp}
        xpInto={into}
        xpNeeded={needed}
        tasks={tasks}
        gems={profile?.gems ?? 0}
      />
      <SectionHeader eyebrow="Find your next move" title="Explore learning tracks" actionLabel="View all →" onAction={() => router.push('/explore')} />
      <TrackRow tracks={tracks} onOpen={(t) => router.push({ pathname: t.route as never, params: t.params } as never)} />
      <SectionHeader eyebrow="Curated for you" title="Keep growing" />
      <CuratedRow tracks={curated} onOpen={() => router.push('/certifications')} />
    </>
  );

  const rail = (
    <>
      <MomentumCard days={momentum.days} total={momentum.total} deltaPct={momentum.deltaPct} />
      <ScheduleCard
        items={schedule}
        onOpen={(s) => router.push({ pathname: s.route as never, params: s.params } as never)}
        onFull={() => router.push('/mylearning')}
      />
      <CoachCard />
    </>
  );

  return (
    <Shell
      active="/"
      eyebrow="Your space"
      greeting={greeting(firstName(profile?.username))}
      profile={profile}
      attention={streakAtRisk || dueCount > 0}
    >
      {twoCol ? (
        <View className="flex-row items-start gap-4">
          <View className="min-w-0 flex-1">{main}</View>
          <View className="w-[320px] shrink-0">{rail}</View>
        </View>
      ) : (
        <View>
          {main}
          {rail}
        </View>
      )}
    </Shell>
  );
}
