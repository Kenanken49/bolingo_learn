import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
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
    <View className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} className="mb-2 self-start">
          <Text className="font-bold text-slate-400">‹ Back to Path</Text>
        </Pressable>
        <Text className="text-3xl font-black text-slate-800">📖 Kamusi</Text>
        <Text className="mt-1 text-base text-slate-500">
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
                tab === t.id ? 'border-green-700 bg-green-500' : 'border-slate-300 bg-white'
              }`}
            >
              <Text
                className={`text-center text-sm font-black ${
                  tab === t.id ? 'text-white' : 'text-slate-500'
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
            className="flex-1 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-800"
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
          <View className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {suggestions.map((s, i) => (
              <Pressable
                key={`${s.lang}-${i}`}
                onPress={() => {
                  setQuery(s.entry.word);
                  setSubmitted(s.entry.word);
                }}
                className="border-b border-slate-100 px-4 py-2.5"
              >
                <Text className="text-base text-slate-700">
                  <Text className="font-bold">{s.entry.word}</Text>
                  <Text className="text-slate-400">
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
              <View className="rounded-2xl bg-amber-50 p-4">
                <Text className="text-base font-bold text-amber-800">No offline entry for “{submitted.trim()}”.</Text>
                <Text className="mt-1 text-sm text-amber-700">
                  Try another spelling — or ask the AI tutor, which covers every word in your lessons.
                </Text>
              </View>
            ) : (
              results.map((r, i) => (
                <View key={i} className="mb-2 rounded-2xl border border-slate-200 bg-white p-4">
                  <Text className="text-lg font-black text-slate-800">
                    {r.word}{' '}
                    {'pos' in r && (r as { pos: string }).pos ? (
                      <Text className="text-sm font-bold text-sky-600">
                        ({(r as { pos: string }).pos})
                      </Text>
                    ) : null}
                  </Text>
                  <Text className="mt-1 text-base leading-6 text-slate-600">{r.gloss}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Attribution */}
        <View className="mt-6 rounded-2xl bg-slate-100 p-4">
          <Text className="text-xs leading-5 text-slate-500">
            Sources, bundled for offline use:{'\n'}• Kiswahili–English: FreeDict swh-eng v0.4.4 (freedict.org), GNU GPL v2 or later.{'\n'}•
            English definitions: English WordNet 2024 synset glosses (globalwordnet/english-wordnet).{'\n'}
            Prefer explanations in context? The AI tutor and “Explain my answer” cover every lesson word online.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
