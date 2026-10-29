import { useEffect, useMemo, useState } from 'react';
import { getProfile } from '../../../lib/progress';
import { View, Pressable, ScrollView } from 'react-native';
import Text from '../../../components/ui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CURRICULUM, KIND_META, type BlockKind } from '../../../lib/curriculum';
import AppIcon from '../../../components/AppIcon';
import { ContentMark } from '../../../components/AppIcon';
import { getCourseLesson } from '../../../lib/courses';
import AskBingo from '../../../components/AskBingo';

const GROUPS: Array<{ title: string; kinds: BlockKind[]; blurb: string }> = [
  { title: 'Learn the theory', kinds: ['lesson'], blurb: 'First exposure: core concepts with live examples.' },
  { title: 'Guided practice', kinds: ['workshop'], blurb: 'Step-based builds that walk you through every move.' },
  { title: 'Build on your own', kinds: ['lab'], blurb: 'User stories + tests. No guidance — like the real job.' },
  { title: 'Study & prove it', kinds: ['review', 'quiz'], blurb: 'Review sheet, then the quiz. 80% to pass.' },
  { title: 'Certification project', kinds: ['project'], blurb: 'Capstone project for this unit.' },
];

export default function CurriculumUnit() {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const unit = useMemo(() => CURRICULUM.find((u) => u.id === unitId) ?? CURRICULUM[0], [unitId]);
  const [open, setOpen] = useState<Record<string, boolean>>({ 'Learn the theory': true });
  const [unitUserId, setUnitUserId] = useState<string | null>(null);
  useEffect(() => {
    getProfile().then((p) => setUnitUserId(p?.id ?? null)).catch(() => {});
  }, []);

  if (!unit) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-lg text-slate-600 dark:text-slate-400">Unit not found.</Text>
        <Pressable onPress={() => router.replace('/')} className="mt-4 rounded-2xl bg-slate-800 px-6 py-3">
          <Text className="font-bold text-white">Back to Path</Text>
        </Pressable>
      </View>
    );
  }

  const totalMin = unit.blocks.reduce((s, b) => s + b.minutes, 0);
  const totalXp = unit.blocks.reduce((s, b) => s + b.xp, 0);

  // Language courses read best centered; interactive blocks split into
  // three columns on wide screens while theory stays full-width below.
  const isLang = unit.course === 'lang';
  return (
    <View className="flex-1">
    <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-xl self-center px-4 pb-24 pt-8" contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
      <Pressable onPress={() => router.replace('/')} accessibilityRole="button" accessibilityLabel="Back to learning path">
        <View className="flex-row items-center gap-0.5">
          <AppIcon name="chevBack" size={16} color="#0284C7" />
          <Text className="font-bold text-sky-600 dark:text-sky-400">Back to Learn</Text>
        </View>
      </Pressable>

      {/* FCC-style course intro header */}
      <View className={`mt-3 rounded-3xl ${unit.color} p-6`}>
        <Text className="text-xs font-extrabold uppercase tracking-widest text-white/80">{unit.section}</Text>
        <View className="mt-1 flex-row items-center gap-2">
          <ContentMark emoji={unit.icon} size={30} color="#FFFFFF" badgeBg="rgba(255,255,255,0.25)" />
          <Text className="flex-1 text-3xl font-extrabold text-white">{unit.title}</Text>
        </View>
        <Text className="mt-1 text-base font-semibold text-white/90">{unit.goal}</Text>
        <View className="mt-4 flex-row gap-2">
          <View className="rounded-full bg-black/20 px-3 py-1.5">
            <View className="flex-row items-center gap-1">
              <AppIcon name="time" size={13} color="#FFFFFF" />
              <Text className="text-xs font-extrabold text-white">{totalMin} min</Text>
            </View>
          </View>
          <View className="rounded-full bg-black/20 px-3 py-1.5">
            <View className="flex-row items-center gap-1">
              <AppIcon name="star" size={13} color="#FFFFFF" />
              <Text className="text-xs font-extrabold text-white">{totalXp} XP</Text>
            </View>
          </View>
          <View className="rounded-full bg-black/20 px-3 py-1.5">
            <View className="flex-row items-center gap-1">
              <AppIcon name="layers" size={13} color="#FFFFFF" />
              <Text className="text-xs font-extrabold text-white">{unit.blocks.length} blocks</Text>
            </View>
          </View>
        </View>
      </View>

      {GROUPS.map((g) => {
        const blocks = unit.blocks.filter((b) => g.kinds.includes(b.kind));
        if (blocks.length === 0) return null;
        const isOpen = open[g.title] ?? false;
        // Theory stays a full-width single column; every interactive group
        // divides into three sections on md+ screens.
        const isTheoryGroup = g.kinds.every((k) => k === 'lesson' || k === 'review');
        return (
          <View key={g.title} className={`mt-4 w-full ${isLang ? 'max-w-3xl' : 'max-w-5xl'} self-center overflow-hidden rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900`}>
            <Pressable
              onPress={() => setOpen((o) => ({ ...o, [g.title]: !isOpen }))}
              accessibilityRole="button"
              accessibilityLabel={`${isOpen ? 'Collapse' : 'Expand'} ${g.title}`}
              className="flex-row items-center justify-between bg-slate-100 dark:bg-slate-800 px-5 py-4"
            >
              <View className="flex-row items-center">
                {/* freeCodeCamp-style step number per section */}
                <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-slate-900">
                  <Text className="text-sm font-black text-white">{GROUPS.indexOf(g) + 1}</Text>
                </View>
                <View>
                  <Text className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{g.title}</Text>
                  <Text className="text-sm text-slate-500 dark:text-slate-400">{g.blurb} · {blocks.length} step{blocks.length === 1 ? '' : 's'}</Text>
                </View>
              </View>
              <Text className="text-xl text-slate-400 dark:text-slate-500">{isOpen ? '▲' : '▼'}</Text>
            </Pressable>
            {isOpen ? (
              <View className={isTheoryGroup ? 'relative' : 'flex-row flex-wrap gap-2 p-3 md:grid md:grid-cols-3'}>
              {isTheoryGroup ? <View pointerEvents="none" className="absolute bottom-4 left-[27px] top-4 w-0 border-l-2 border-dashed border-slate-300 dark:border-slate-700" /> : null}
              {blocks.map((b, i) => {
                  const meta = KIND_META[b.kind];
                  const last = i === blocks.length - 1;
                  const lesson = getCourseLesson(b.lessonId);
                  const showTheory = (b.kind === 'lesson' || b.kind === 'review') && lesson && lesson.theory.length > 0;
                  return (
                    <View key={b.id} className={isTheoryGroup ? '' : 'w-full md:w-[31%] md:min-w-[180px] md:flex-1 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800'}>
                    <Pressable
                      onPress={() =>
                        b.kind === 'project'
                          ? router.push({ pathname: '/project/[lessonId]', params: { lessonId: b.lessonId, title: b.lessonTitle } })
                          : router.push({ pathname: '/quiz/[lessonId]', params: { lessonId: b.lessonId, title: b.lessonTitle } })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Start ${b.title}`}
                      className={isTheoryGroup ? `flex-row items-center px-5 py-4 ${last ? '' : 'border-b border-slate-100 dark:border-slate-800'}` : 'flex-col p-4'}
                    >
                      {isTheoryGroup ? (
                        <View className="h-9 w-9 items-center justify-center rounded-full bg-green-500">
                          <AppIcon name="check" size={18} color="#FFFFFF" />
                        </View>
                      ) : (
                        <ContentMark emoji={meta.icon} size={26} color="#0F172A" badgeBg="#F1F5F9" />
                      )}
                      <View className={isTheoryGroup ? 'ml-3 flex-1' : 'mt-2 flex-1'}>
                        <View className="flex-row items-center">
                          <Text className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${meta.color}`}>
                            {meta.label.toUpperCase()}
                          </Text>
                          <Text className="text-xs font-bold text-slate-400 dark:text-slate-500">
                            {b.minutes} min · +{b.xp} XP
                          </Text>
                        </View>
                        <Text className="mt-0.5 text-base font-bold text-slate-800 dark:text-slate-200">{b.title}</Text>
                        <Text className="text-sm text-slate-500 dark:text-slate-400" numberOfLines={isTheoryGroup ? 2 : 3}>
                          {b.blurb}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-0.5">
                        {isTheoryGroup ? null : <Text className="text-base font-extrabold text-green-500">Start</Text>}
                        <AppIcon name="chevRight" size={20} color="#22C55E" />
                      </View>
                    </Pressable>
                    {showTheory ? (
                      <View className="bg-slate-50 dark:bg-slate-900 px-5 pb-4">
                        {lesson!.theory.map((t, ti) => (
                          <Text key={ti} className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">
                            {t}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                    </View>
                  );
                })}
              </View>
              ) : null}
          </View>
        );
      })}

      <Pressable
        onPress={() => {
          const first = unit.blocks[0];
          if (first.kind === 'project') {
            router.push({ pathname: '/project/[lessonId]', params: { lessonId: first.lessonId, title: first.lessonTitle } });
          } else {
            router.push({ pathname: '/quiz/[lessonId]', params: { lessonId: first.lessonId, title: first.lessonTitle } });
          }
        }}
        className="mt-6 items-center rounded-2xl bg-green-500 py-4"
      >
        <View className="flex-row items-center justify-center gap-1.5">
          <Text className="text-lg font-extrabold text-white">Start unit</Text>
          <AppIcon name="next" size={20} color="#FFFFFF" />
        </View>
      </Pressable>
      <StatusBar style="auto" />
    </ScrollView>
      {/* Super Intelligent help on every unit path: Bingo knows the unit. */}
      <AskBingo
        lessonTitle={unit.title}
        prompt={unit.goal}
        theory={unit.blocks.map((b) => `${b.title}: ${b.blurb}`).join(' ').slice(0, 900)}
        strongFirst={unit.course === 'lang'}
        userId={unitUserId}
      />
    </View>
  );
}
