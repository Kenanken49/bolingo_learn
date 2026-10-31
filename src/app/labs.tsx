import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
import Text from '../../components/ui/Text';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AppIcon from '../../components/AppIcon';
import Mascot from '../../components/AfricanMascots';
import {
  LABEX_CATEGORIES,
  LABEX_COUNT,
  LABEX_META,
  type LabexCategoryId,
  type LabexMeta,
} from '../../lib/labex';
import { useNatural } from '../../lib/natural';

/**
 * Open Labs — the full licensed LabEx corpus, distilled into graded sessions.
 * Metadata stays eager for search; the question banks load per category in the
 * quiz route, so this screen never parses thousands of lessons.
 */

type Filter = LabexCategoryId | 'all';
const PAGE = 60;

const CATEGORY_TITLE: Record<string, string> = Object.fromEntries(
  LABEX_CATEGORIES.map((category) => [category.id, category.title])
);

export default function LabLibrary() {
  const p = useNatural();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  // Pagination resets by derivation when the filter/query changes, instead of
  // a reset effect that would cost an extra render pass.
  const [paging, setPaging] = useState({ key: '', limit: PAGE });

  const labs = useMemo(() => Object.values(LABEX_META), []);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return labs.filter(
      (lab) =>
        (filter === 'all' || lab.category === filter) &&
        (!q || lab.title.toLowerCase().includes(q) || lab.category.includes(q))
    );
  }, [labs, filter, query]);

  const viewKey = `${filter}|${query.trim().toLowerCase()}`;
  const limit = paging.key === viewKey ? paging.limit : PAGE;
  const showMore = () =>
    setPaging({ key: viewKey, limit: (paging.key === viewKey ? paging.limit : PAGE) + PAGE });

  const shown = results.slice(0, limit);

  const open = (lab: LabexMeta) =>
    router.push({ pathname: '/quiz/[lessonId]', params: { lessonId: lab.id, title: lab.title } });

  const header = (
    <View>
      <Pressable onPress={() => router.replace('/')} accessibilityRole="button" accessibilityLabel="Back to learning path">
        <View className="flex-row items-center gap-0.5">
          <AppIcon name="chevBack" size={16} color={p.isDark ? '#7DD3FC' : '#0284C7'} />
          <Text onPhoto className="font-bold text-sky-700 dark:text-sky-300">Back to Learn</Text>
        </View>
      </Pressable>

      <View className="mt-3 items-center rounded-3xl bg-slate-900 p-6">
        <Mascot character="bingo" mood="happy" size={78} />
        <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-amber-300">Open source · licensed</Text>
        <Text className="mt-2 text-center font-duo text-2xl font-extrabold text-white">Open Labs</Text>
        <Text className="mt-1 text-center text-sm font-semibold leading-5 text-slate-300 dark:text-slate-200">
          {LABEX_COUNT.toLocaleString()} hands-on labs distilled into short, graded sessions — CSS, JavaScript, Python, Rust,
          Go, React, data science and more.
        </Text>
        <View className="mt-3 rounded-full bg-amber-400 px-4 py-1.5">
          <View className="flex-row items-center gap-1">
            <AppIcon name="flask" size={14} color="#0F172A" />
            <Text className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
              {LABEX_CATEGORIES.length} topics · searchable
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-4 flex-row items-center rounded-2xl border-2 border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
        <AppIcon name="flask" size={17} color={p.stone} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search labs by title or topic"
          placeholderTextColor={p.stone}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search labs"
          className="ml-2 flex-1 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search">
            <AppIcon name="close" size={17} color={p.stone} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-3"
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        <Pressable
          onPress={() => setFilter('all')}
          accessibilityRole="button"
          accessibilityLabel="All topics"
          className={`rounded-full border-2 px-3.5 py-1.5 ${
            filter === 'all'
              ? 'border-green-500 bg-green-500'
              : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
          }`}
        >
          <Text className={`text-xs font-extrabold ${filter === 'all' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
            All · {LABEX_COUNT}
          </Text>
        </Pressable>
        {LABEX_CATEGORIES.map((category) => {
          const active = filter === category.id;
          return (
            <Pressable
              key={category.id}
              onPress={() => setFilter(category.id)}
              accessibilityRole="button"
              accessibilityLabel={`${category.title} labs`}
              className={`rounded-full border-2 px-3.5 py-1.5 ${
                active
                  ? 'border-green-500 bg-green-500'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <Text className={`text-xs font-extrabold ${active ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                {category.title} · {category.count}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="mb-1 mt-4 flex-row items-baseline justify-between">
        <Text onPhoto className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-200">
          {results.length.toLocaleString()} {results.length === 1 ? 'lab' : 'labs'}
        </Text>
        <Text onPhoto className="text-[10px] font-bold text-slate-600 dark:text-slate-300">short sessions · first try counts</Text>
      </View>
    </View>
  );

  const footer = (
    <View className="mt-2">
      {results.length > limit ? (
        <Pressable
          onPress={showMore}
          accessibilityRole="button"
          accessibilityLabel="Show more labs"
          className="items-center rounded-2xl border-2 border-slate-200 py-3 dark:border-slate-800"
        >
          <Text className="font-extrabold text-slate-600 dark:text-slate-300">
            Show {Math.min(PAGE, results.length - limit)} more
          </Text>
        </Pressable>
      ) : null}
      <View className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <Text className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          About this library
        </Text>
        <Text className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Every lab is adapted from the LabEx open-source corpus and keeps its original license. Lesson briefs credit
          their source and contributors; the quiz questions are original and answerable from each brief.
        </Text>
        <Text className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Licenses: CC BY 4.0 · CC BY 3.0 · MIT · BSD-3-Clause · Apache-2.0. Pro-only, share-alike and unlicensed labs are
          excluded.
        </Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1">
      <FlatList
        data={shown}
        keyExtractor={(lab) => lab.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => open(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.title} — ${CATEGORY_TITLE[item.category] ?? item.category}, ${item.minutes} minutes`}
            className="mb-2 flex-row items-center rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
          >
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
              <AppIcon name="flask" size={17} color={p.moss} />
            </View>
            <View className="ml-3 flex-1">
              <Text numberOfLines={2} className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {item.title}
              </Text>
              <Text className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {CATEGORY_TITLE[item.category] ?? item.category} · {item.difficulty} · {item.minutes} min
              </Text>
            </View>
            <AppIcon name="chevRight" size={18} color={p.stone} />
          </Pressable>
        )}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          <View className="items-center py-10">
            <Mascot character="livia" mood="happy" size={92} />
            <Text className="mt-2 text-center text-base font-bold text-slate-600 dark:text-slate-300">
              No labs match “{query}”.
            </Text>
            <Pressable
              onPress={() => {
                setQuery('');
                setFilter('all');
              }}
              className="mt-3 rounded-2xl bg-slate-800 px-5 py-2.5"
              accessibilityRole="button"
            >
              <Text className="font-bold text-white">Clear filters</Text>
            </Pressable>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 32, paddingBottom: 96, width: '100%', maxWidth: 576, alignSelf: 'center' }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
      <StatusBar style="auto" />
    </View>
  );
}
