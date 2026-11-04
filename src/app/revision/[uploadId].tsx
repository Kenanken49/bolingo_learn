import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Text from '../../../components/ui/Text';
import AppIcon from '../../../components/AppIcon';
import DuoButton from '../../../components/DuoButton';
import { supabase } from '../../../lib/supabase';
import {
  enrolPackInReview,
  loadRevisionPack,
  type PackRow,
  type RevisionPack,
} from '../../../lib/revisionPack';
import { track } from '../../../lib/telemetry';

/**
 * Revision material for one upload.
 *
 * The seven techniques are separated on purpose: a learner practises one mode
 * at a time (retrieve, then flip, then explain) instead of scrolling a summary,
 * because re-reading is the behaviour these techniques exist to replace.
 */

type Tab = 'map' | 'cards' | 'recall' | 'chunks' | 'palace' | 'teach' | 'plan';

const TABS: { id: Tab; label: string; icon: Parameters<typeof AppIcon>[0]['name'] }[] = [
  { id: 'map', label: 'Mind map', icon: 'globe' },
  { id: 'cards', label: 'Flashcards', icon: 'star' },
  { id: 'recall', label: 'Active recall', icon: 'zap' },
  { id: 'chunks', label: 'Chunks', icon: 'target' },
  { id: 'palace', label: 'Memory palace', icon: 'home' },
  { id: 'teach', label: 'Teach it', icon: 'users' },
  { id: 'plan', label: 'Spaced plan', icon: 'time' },
];

const KIND_LABEL: Record<string, string> = {
  book: 'Book',
  notes: 'Notes',
  article: 'Article',
  transcript: 'Transcript',
  unknown: 'Material',
};

export default function RevisionScreen() {
  const { uploadId } = useLocalSearchParams<{ uploadId?: string }>();
  const id = typeof uploadId === 'string' ? uploadId : '';
  const [row, setRow] = useState<PackRow | null>(null);
  // No upload id means there is nothing to load: start in the empty state
  // rather than flipping it from an effect on mount.
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>(id ? 'loading' : 'empty');
  const [tab, setTab] = useState<Tab>('map');
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    if (!id) return undefined;
    loadRevisionPack(id)
      .then((pack) => {
        if (!alive) return;
        setRow(pack);
        setStatus(pack ? 'ready' : 'empty');
        if (pack) track('revision_pack_opened', { kind: pack.kind });
      })
      .catch(() => {
        if (alive) setStatus('error');
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const pack: RevisionPack | null = row?.pack ?? null;
  const cards = pack?.flashcards ?? [];
  const card = cards[cardIndex] ?? cards[0];

  const detected = useMemo(() => {
    const d = pack?.detected;
    if (!d) return [];
    return [`${d.words.toLocaleString()} words`, `${Math.round((d.confidence ?? 0) * 100)}% confident`, ...(d.signals ?? []).slice(0, 2)];
  }, [pack]);

  const enrol = useCallback(async () => {
    if (!pack) return;
    setEnrolling(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      const count = await enrolPackInReview(pack, user.id, id);
      setEnrolled(count);
      track('revision_pack_enrolled', { cards: count, kind: pack.kind });
    } finally {
      setEnrolling(false);
    }
  }, [pack, id]);

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-black">
        <Text className="text-slate-500 dark:text-slate-400">Building your revision material…</Text>
      </View>
    );
  }

  if (status !== 'ready' || !pack) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6 dark:bg-black">
        <AppIcon name="book" size={40} color="#94A3B8" />
        <Text className="mt-3 text-center font-duo text-xl font-extrabold text-slate-900 dark:text-slate-100">
          {status === 'error' ? 'Could not load this pack' : 'No revision material yet'}
        </Text>
        <Text className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
          {status === 'error'
            ? 'Check your connection and try again.'
            : 'Revision material is built from notes, articles and transcripts. A book becomes an audiobook instead.'}
        </Text>
        <View className="mt-5 w-full max-w-xs">
          <DuoButton label="Back" title="Back" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-black">
      <ScrollView contentContainerClassName="pb-16">
        {/* Header: what was detected, and why */}
        <View className="px-5 pt-14">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" className="mb-2 self-start p-1">
            <AppIcon name="chevBack" size={22} color="#64748B" />
          </Pressable>
          <Text className="text-xs font-bold uppercase tracking-widest text-violet-500">
            {KIND_LABEL[pack.kind] ?? 'Material'} · revision pack
          </Text>
          <Text className="mt-1 font-duo text-2xl font-extrabold text-slate-900 dark:text-slate-100">{pack.title}</Text>
          <Text className="mt-2 text-sm text-slate-600 dark:text-slate-400">{pack.summary}</Text>
          <View className="mt-3 flex-row flex-wrap gap-1.5">
            {detected.map((chip) => (
              <View key={chip} className="rounded-full bg-slate-200 px-2.5 py-1 dark:bg-slate-800">
                <Text className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{chip}</Text>
              </View>
            ))}
            {!pack.generated ? (
              <View className="rounded-full bg-emerald-100 px-2.5 py-1 dark:bg-emerald-950">
                <Text className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">quoted from your text</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Technique switcher */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5 py-4">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTab(t.id)}
                accessibilityRole="button"
                className={`flex-row items-center gap-1.5 rounded-full border-2 px-3 py-2 ${
                  active
                    ? 'border-violet-500 bg-violet-500'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <AppIcon name={t.icon} size={14} color={active ? '#FFFFFF' : '#64748B'} />
                <Text className={`text-xs font-extrabold ${active ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="px-5">
          {tab === 'map' ? (
            <View className="rounded-3xl border-2 border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <Text className="text-center font-duo text-lg font-extrabold text-violet-600 dark:text-violet-300">
                {pack.mindMap.center}
              </Text>
              <View className="mt-3 gap-2">
                {pack.mindMap.branches.map((branch) => (
                  <View key={branch.label} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                    <Text className="font-bold text-slate-800 dark:text-slate-100">↳ {branch.label}</Text>
                    {branch.leaves.map((leaf) => (
                      <Text key={`${branch.label}-${leaf}`} className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        • {leaf}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
              <Text className="mt-3 text-xs text-slate-400">
                Draw this on paper from memory before you look at it again — the drawing is the practice.
              </Text>
            </View>
          ) : null}

          {tab === 'cards' && card ? (
            <View>
              <Pressable
                onPress={() => setFlipped((f) => !f)}
                accessibilityRole="button"
                accessibilityLabel={flipped ? 'Hide answer' : 'Show answer'}
                className="min-h-[220px] justify-center rounded-3xl border-2 border-violet-200 bg-white p-6 dark:border-violet-900 dark:bg-slate-900"
              >
                <Text className="text-center text-xs font-bold uppercase tracking-widest text-violet-400">
                  {flipped ? 'Answer' : 'Front'}
                </Text>
                <Text className="mt-2 text-center font-duo text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  {flipped ? card.back : card.front}
                </Text>
                <Text className="mt-4 text-center text-xs text-slate-400">
                  {flipped ? 'Tap to hide' : 'Say it out loud, then tap to check'}
                </Text>
              </Pressable>
              <Text className="mt-2 text-center text-[11px] text-slate-400">Quoted from: “{card.source.slice(0, 120)}…”</Text>
              <View className="mt-3 flex-row items-center justify-between">
                <Pressable
                  onPress={() => {
                    setFlipped(false);
                    setCardIndex((i) => (i - 1 + cards.length) % cards.length);
                  }}
                  accessibilityRole="button"
                  className="rounded-2xl border-2 border-slate-200 px-4 py-3 dark:border-slate-700"
                >
                  <Text className="font-extrabold text-slate-600 dark:text-slate-300">Previous</Text>
                </Pressable>
                <Text className="text-sm font-bold text-slate-400">
                  {cardIndex + 1} / {cards.length}
                </Text>
                <Pressable
                  onPress={() => {
                    setFlipped(false);
                    setCardIndex((i) => (i + 1) % cards.length);
                  }}
                  accessibilityRole="button"
                  className="rounded-2xl bg-violet-600 px-4 py-3"
                >
                  <Text className="font-extrabold text-white">Next</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {tab === 'recall' ? (
            <View className="gap-3">
              {pack.recall.map((item, index) => (
                <View key={`${item.source}-${index}`} className="rounded-3xl border-2 border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <Text className="font-bold text-slate-800 dark:text-slate-100">{item.prompt}</Text>
                  {revealed[index] ? (
                    <Text className="mt-2 text-sm text-slate-600 dark:text-slate-400">{item.answer}</Text>
                  ) : (
                    <Text className="mt-2 text-sm italic text-slate-400">Write or say your answer first — then reveal.</Text>
                  )}
                  <Pressable
                    onPress={() => setRevealed((r) => ({ ...r, [index]: !r[index] }))}
                    accessibilityRole="button"
                    className="mt-3 self-start rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800"
                  >
                    <Text className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                      {revealed[index] ? 'Hide answer' : 'Reveal answer'}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {tab === 'chunks' ? (
            <View className="gap-3">
              {pack.chunks.map((chunk) => (
                <View key={chunk.title} className="rounded-3xl border-2 border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <Text className="font-bold text-slate-800 dark:text-slate-100">{chunk.title}</Text>
                  <View className="mt-2 flex-row flex-wrap gap-1.5">
                    {chunk.items.map((item) => (
                      <View key={item} className="rounded-xl bg-sky-100 px-2.5 py-1 dark:bg-sky-950">
                        <Text className="text-xs font-semibold text-sky-800 dark:text-sky-200">{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
              <Text className="text-xs text-slate-400">
                Drill one chunk at a time. Only add the next chunk when this one comes back without looking.
              </Text>
            </View>
          ) : null}

          {tab === 'palace' ? (
            <View className="rounded-3xl border-2 border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
              <Text className="text-sm text-amber-800 dark:text-amber-200">{pack.palace.scene}</Text>
              <View className="mt-3 gap-2">
                {pack.palace.stops.map((stop, index) => (
                  <View key={`${stop.place}-${index}`} className="flex-row items-start gap-2 rounded-2xl bg-white/70 p-3 dark:bg-slate-900/70">
                    <View className="h-6 w-6 items-center justify-center rounded-full bg-amber-500">
                      <Text className="text-xs font-extrabold text-white">{index + 1}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">{stop.place}</Text>
                      <Text className="text-sm font-semibold text-slate-800 dark:text-slate-100">{stop.fact}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {tab === 'teach' ? (
            <View className="gap-3">
              {pack.teachBack.map((item) => (
                <View key={item.prompt} className="rounded-3xl border-2 border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <Text className="font-bold text-slate-800 dark:text-slate-100">{item.prompt}</Text>
                  <Text className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Must mention</Text>
                  {item.checklist.map((point) => {
                    const key = `${item.prompt}:${point}`;
                    const done = !!checked[key];
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setChecked((c) => ({ ...c, [key]: !c[key] }))}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: done }}
                        className="mt-1 flex-row items-center gap-2"
                      >
                        <AppIcon name={done ? 'checkCircle' : 'starOutline'} size={16} color={done ? '#16A34A' : '#94A3B8'} />
                        <Text className={`flex-1 text-sm ${done ? 'text-slate-400 line-through' : 'text-slate-600 dark:text-slate-300'}`}>
                          {point}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
              <Text className="text-xs text-slate-400">
                If you cannot explain a point in plain words, that is the part to reread — not the whole chapter.
              </Text>
            </View>
          ) : null}

          {tab === 'plan' ? (
            <View className="gap-3">
              <View className="rounded-3xl border-2 border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <Text className="font-bold text-slate-800 dark:text-slate-100">Review on these days</Text>
                {pack.reviewPlan.map((step) => (
                  <View key={step.day} className="mt-2 flex-row items-center gap-2">
                    <View className="rounded-lg bg-violet-100 px-2 py-1 dark:bg-violet-950">
                      <Text className="text-xs font-extrabold text-violet-700 dark:text-violet-300">Day {step.day}</Text>
                    </View>
                    <Text className="flex-1 text-sm text-slate-600 dark:text-slate-400">{step.focus}</Text>
                  </View>
                ))}
              </View>
              <View className="rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
                <Text className="font-bold text-emerald-800 dark:text-emerald-200">Put these cards in Daily Review</Text>
                <Text className="mt-1 text-sm text-emerald-800/80 dark:text-emerald-200/80">
                  They join the same spaced-repetition queue as your lessons, so due cards appear on the Path — no second schedule to check.
                </Text>
                <View className="mt-3">
                  <DuoButton
                    color="green"
                    label={enrolled !== null ? `Added ${enrolled} cards` : enrolling ? 'Adding…' : 'Add to Daily Review'}
                    title="Add cards to review"
                    disabled={enrolling || enrolled !== null}
                    onPress={enrol}
                  />
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
}
