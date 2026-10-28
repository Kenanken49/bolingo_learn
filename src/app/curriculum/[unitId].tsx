import { useEffect, useMemo, useState } from 'react';
import { getProfile } from '../../../lib/progress';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CURRICULUM, KIND_META, type BlockKind } from '../../../lib/curriculum';
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
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-lg text-slate-600">Unit not found.</Text>
        <Pressable onPress={() => router.replace('/')} className="mt-4 rounded-2xl bg-slate-800 px-6 py-3">
          <Text className="font-bold text-white">Back to Path</Text>
        </Pressable>
      </View>
    );
  }

  const totalMin = unit.blocks.reduce((s, b) => s + b.minutes, 0);
  const totalXp = unit.blocks.reduce((s, b) => s + b.xp, 0);

  return (
    <View className="flex-1 bg-slate-50">
    <ScrollView contentContainerClassName="bg-slate-50 px-6 pb-16 pt-12">
      <Pressable onPress={() => router.replace('/')} accessibilityRole="button" accessibilityLabel="Back to learning path">
        <Text className="font-bold text-sky-600">‹ Back to Learn</Text>
      </Pressable>

      {/* FCC-style course intro header */}
      <View className={`mt-3 rounded-3xl ${unit.color} p-6`}>
        <Text className="text-xs font-extrabold uppercase tracking-widest text-white/80">{unit.section}</Text>
        <Text className="mt-1 text-3xl font-extrabold text-white">
          {unit.icon} {unit.title}
        </Text>
        <Text className="mt-1 text-base font-semibold text-white/90">{unit.goal}</Text>
        <View className="mt-4 flex-row gap-2">
          <View className="rounded-full bg-black/20 px-3 py-1.5">
            <Text className="text-xs font-extrabold text-white">⏱ {totalMin} min</Text>
          </View>
          <View className="rounded-full bg-black/20 px-3 py-1.5">
            <Text className="text-xs font-extrabold text-white">⭐ {totalXp} XP</Text>
          </View>
          <View className="rounded-full bg-black/20 px-3 py-1.5">
            <Text className="text-xs font-extrabold text-white">📦 {unit.blocks.length} blocks</Text>
          </View>
        </View>
      </View>

      {GROUPS.map((g) => {
        const blocks = unit.blocks.filter((b) => g.kinds.includes(b.kind));
        if (blocks.length === 0) return null;
        const isOpen = open[g.title] ?? false;
        return (
          <View key={g.title} className="mt-4 overflow-hidden rounded-3xl border-2 border-slate-200 bg-white">
            <Pressable
              onPress={() => setOpen((o) => ({ ...o, [g.title]: !isOpen }))}
              accessibilityRole="button"
              accessibilityLabel={`${isOpen ? 'Collapse' : 'Expand'} ${g.title}`}
              className="flex-row items-center justify-between bg-slate-100 px-5 py-4"
            >
              <View>
                <Text className="text-lg font-extrabold text-slate-900">{g.title}</Text>
                <Text className="text-sm text-slate-500">{g.blurb}</Text>
              </View>
              <Text className="text-xl text-slate-400">{isOpen ? '▲' : '▼'}</Text>
            </Pressable>
            {isOpen
              ? blocks.map((b, i) => {
                  const meta = KIND_META[b.kind];
                  const last = i === blocks.length - 1;
                  const lesson = getCourseLesson(b.lessonId);
                  const showTheory = (b.kind === 'lesson' || b.kind === 'review') && lesson && lesson.theory.length > 0;
                  return (
                    <View key={b.id} className={last ? '' : 'border-b border-slate-100'}>
                    <Pressable
                      onPress={() =>
                        b.kind === 'project'
                          ? router.push({ pathname: '/project/[lessonId]', params: { lessonId: b.lessonId, title: b.lessonTitle } })
                          : router.push({ pathname: '/quiz/[lessonId]', params: { lessonId: b.lessonId, title: b.lessonTitle } })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Start ${b.title}`}
                      className={`flex-row items-center px-5 py-4 ${last ? '' : 'border-b border-slate-100'}`}
                    >
                      <Text className="text-2xl">{meta.icon}</Text>
                      <View className="ml-3 flex-1">
                        <View className="flex-row items-center">
                          <Text className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${meta.color}`}>
                            {meta.label.toUpperCase()}
                          </Text>
                          <Text className="text-xs font-bold text-slate-400">
                            {b.minutes} min · +{b.xp} XP
                          </Text>
                        </View>
                        <Text className="mt-0.5 text-base font-bold text-slate-800">{b.title}</Text>
                        <Text className="text-sm text-slate-500" numberOfLines={2}>
                          {b.blurb}
                        </Text>
                      </View>
                      <Text className="text-xl font-extrabold text-green-500">›</Text>
                    </Pressable>
                    {showTheory ? (
                      <View className="bg-slate-50 px-5 pb-4">
                        {lesson!.theory.map((t, ti) => (
                          <Text key={ti} className="mt-1 text-sm leading-5 text-slate-600">
                            {t}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                    </View>
                  );
                })
              : null}
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
        <Text className="text-lg font-extrabold text-white">Start unit →</Text>
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
