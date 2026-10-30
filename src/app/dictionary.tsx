import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Text from '../../components/ui/Text';
import TextInput from '../../components/ui/TextInput';
import { router } from 'expo-router';
import AppIcon from '../../components/AppIcon';
import {
  lookupEnglish,
  lookupSwahili,
  suggest,
  type DictHit,
} from '../../lib/dictionary';

type Tab = 'sw' | 'en';

export default function DictionaryScreen() {
  const [tab, setTab] = useState<Tab>('sw');
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  const results = useMemo(() => {
    const q = submitted.trim();
    if (!q) return null;
    return tab === 'sw' ? lookupSwahili(q) : lookupEnglish(q);
  }, [submitted, tab]);

  const suggestions: DictHit[] = useMemo(() => {
    if (submitted || query.trim().length < 2) return [];
    return suggest(query, 6);
  }, [query, submitted]);

  return (
    <View className="flex-1">
      <ScrollView
        className="w-full flex-1"
        contentContainerClassName="mx-auto w-full max-w-xl self-center"
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 40, alignItems: 'center' }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} className="mb-2 self-start">
          <View className="flex-row items-center gap-0.5">
            <AppIcon name="chevBack" size={16} color="#94A3B8" />
            <Text onPhoto className="font-bold text-slate-600 dark:text-slate-200">Back to Path</Text>
          </View>
        </Pressable>
        <View className="flex-row items-center gap-2">
          <AppIcon name="book" size={30} color="#0F172A" />
          <Text className="text-3xl font-black text-slate-800 dark:text-slate-200">Kamusi</Text>
        </View>
        <Text onPhoto className="mt-1 text-base text-slate-600 dark:text-slate-200">
          Offline dictionary — works with no network and no AI. 2,273 Swahili headwords · 12,000 English words.
        </Text>

        {/* Tabs */}
        <View className="mt-4 flex-row gap-2">
          {(
            [
              { id: 'sw', label: 'Kiswahili → English' },
              { id: 'en', label: 'English → English' },
            ] as { id: Tab; label: string }[]
          ).map((t) => (
            <Pressable
              key={t.id}
              onPress={() => {
                setTab(t.id);
                setSubmitted('');
              }}
              className={`flex-1 rounded-2xl border-b-4 px-3 py-3 ${
                tab === t.id ? 'border-green-700 bg-green-500' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
              }`}
            >
              <Text
                className={`text-center text-sm font-black ${
                  tab === t.id ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Search */}
        <View className="mt-3 flex-row gap-2">
          <TextInput
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              setSubmitted('');
            }}
            onSubmitEditing={() => setSubmitted(query)}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={tab === 'sw' ? 'Tafuta neno… (e.g. chakula)' : 'Look up a word… (e.g. food)'}
            className="flex-1 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-base text-slate-800 dark:text-slate-200"
          />
          <Pressable
            onPress={() => setSubmitted(query)}
            className="rounded-2xl border-b-4 border-blue-700 bg-blue-500 px-5 py-3"
          >
            <Text className="text-base font-black text-white">Go</Text>
          </Pressable>
        </View>

        {/* Autocomplete */}
        {suggestions.length > 0 && (
          <View className="mt-2 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {suggestions.map((s, i) => (
              <Pressable
                key={`${s.lang}-${i}`}
                onPress={() => {
                  setQuery(s.entry.word);
                  setSubmitted(s.entry.word);
                }}
                className="border-b border-slate-100 dark:border-slate-800 px-4 py-2.5"
              >
                <Text className="text-base text-slate-700 dark:text-slate-300">
                  <Text className="font-bold">{s.entry.word}</Text>
                  <Text className="text-slate-400 dark:text-slate-500">
                    {'  '}· {s.lang === 'sw' ? 'SW' : 'EN'} ·{' '}
                    {(s.entry as { gloss: string }).gloss.slice(0, 60)}
                    {(s.entry as { gloss: string }).gloss.length > 60 ? '…' : ''}
                  </Text>
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Results */}
        {results !== null && (
          <View className="mt-3">
            {results.length === 0 ? (
              <View className="rounded-2xl bg-amber-50 dark:bg-amber-950 p-4">
                <Text className="text-base font-bold text-amber-800 dark:text-amber-200">No offline entry for “{submitted.trim()}”.</Text>
                <Text className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  Try another spelling — or ask the AI tutor, which covers every word in your lessons.
                </Text>
              </View>
            ) : (
              results.map((r, i) => (
                <View key={i} className="mb-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <Text className="text-lg font-black text-slate-800 dark:text-slate-200">
                    {r.word}{' '}
                    {'pos' in r && (r as { pos: string }).pos ? (
                      <Text className="text-sm font-bold text-sky-600 dark:text-sky-400">
                        ({(r as { pos: string }).pos})
                      </Text>
                    ) : null}
                  </Text>
                  <Text className="mt-1 text-base leading-6 text-slate-600 dark:text-slate-400">{r.gloss}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Attribution */}
        <View className="mt-6 rounded-2xl bg-slate-100 dark:bg-slate-800 p-4">
          <Text className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            Sources, bundled for offline use:{'\n'}• Kiswahili–English: FreeDict swh-eng v0.4.4 (freedict.org), GNU GPL v2 or later.{'\n'}•
            English definitions: English WordNet 2024 synset glosses (globalwordnet/english-wordnet).{'\n'}
            Prefer explanations in context? The AI tutor and “Explain my answer” cover every lesson word online.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
