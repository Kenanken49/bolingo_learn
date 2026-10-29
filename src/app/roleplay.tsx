import { useCallback, useRef, useState } from 'react';
import { View, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import Text from '../../components/ui/Text';
import TextInput from '../../components/ui/TextInput';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import { getProfile, type Profile } from '../../lib/progress';
import { PREMIUM_PRICE_LABEL } from '../../lib/tiers';
import Mascot from '../../components/AfricanMascots';
import DuoButton from '../../components/DuoButton';
import AppIcon, { type AppIconName } from '../../components/AppIcon';

interface Scenario {
  id: string;
  icon: string;
  title: string;
  blurb: string;
  opener: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'senior-dev',
    icon: 'briefcase',
    title: 'Senior Dev Review',
    blurb: 'Paste code, get kind senior-level feedback.',
    opener: 'Hey! I\'m your senior dev for this session. Paste some HTML or CSS you wrote (or describe it) and I\'ll review it with you.',
  },
  {
    id: 'debug-duck',
    icon: 'bug',
    title: 'Debug Duck',
    blurb: 'Stuck? Quack through the bug together.',
    opener: 'Quack! Tell me what your code is *supposed* to do, and what it actually does. I\'ll ask questions until we find the bug.',
  },
  {
    id: 'interview',
    icon: 'mic',
    title: 'Mock Interview',
    blurb: 'Practice junior HTML/CSS/JS questions.',
    opener: 'Welcome to your mock interview! Relax — we\'ll start easy. First question: what does HTML stand for, and what is it used for?',
  },
];

interface Msg {
  role: 'user' | 'assistant';
  text: string;
}

export default function Roleplay() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // RN 0.88 types the ScrollView ref opaquely — track just the method we need.
  const scrollRef = useRef<{ scrollToEnd(options?: { animated?: boolean }): void } | null>(null);

  const refresh = useCallback(async () => {
    try {
      setProfile(await getProfile());
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const pick = (s: Scenario) => {
    setScenario(s);
    setMessages([{ role: 'assistant', text: s.opener }]);
    setError(null);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy || !scenario) return;
    setInput('');
    setError(null);
    const history: Msg[] = [...messages, { role: 'user' as const, text }];
    setMessages(history);
    setBusy(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('roleplay-chat', {
        body: {
          scenarioId: scenario.id,
          history: history.map((m) => ({ role: m.role, content: m.text })),
        },
      });
      const premiumBlocked =
        (data as { premium_required?: boolean } | null)?.premium_required === true ||
        /premium/i.test(String((fnError as { message?: string } | null)?.message ?? ''));
      if (premiumBlocked) {
        setError('Roleplay is a Premium perk — upgrade to keep chatting.');
        setBusy(false);
        router.push('/paywall');
        return;
      }
      if (fnError) throw new Error(fnError.message || 'Chat service unreachable.');
      const reply = ((data as { reply?: unknown } | null)?.reply as string | undefined)?.trim();
      if (!reply) throw new Error('The chat came back empty — try again.');
      setMessages([...history, { role: 'assistant', text: reply }]);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <View className="flex-1 px-6 pb-6 pt-12">
        <Pressable onPress={() => (scenario ? setScenario(null) : router.replace('/'))}>
          <View className="flex-row items-center gap-0.5">
            <AppIcon name="chevBack" size={16} color="#0284C7" />
            <Text className="font-bold text-sky-600 dark:text-sky-400">{scenario ? 'All scenarios' : 'Back to Learn'}</Text>
          </View>
        </Pressable>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#7c3aed" size="large" />
          </View>
        ) : !profile ? (
          <View className="flex-1 items-center justify-center">
            <Mascot character="livia" mood="happy" size={110} />
            <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Livia, your conversation partner</Text>
            <Text className="mt-3 font-duo text-2xl font-extrabold text-slate-900 dark:text-slate-100">AI Roleplay</Text>
            <Text className="mt-1 text-center text-base text-slate-500 dark:text-slate-400">
              Chat scenarios with an AI tutor. Sign in to start talking.
            </Text>
            <View className="mt-5 w-full max-w-sm">
              <DuoButton onPress={() => router.push('/auth')} label="Sign in" title="Sign in" />
            </View>
          </View>
        ) : !profile.is_premium ? (
          <View className="flex-1 items-center justify-center">
            <Mascot character="bingo" mood="party" size={110} />
            <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Bingo loves premium parties</Text>
            <Text className="mt-3 font-duo text-2xl font-extrabold text-slate-900 dark:text-slate-100">Duolingo Max style</Text>
            <Text className="mt-1 text-center text-base text-slate-500 dark:text-slate-400">
              Roleplay conversations are a Premium perk ({PREMIUM_PRICE_LABEL}) — live tutors cost real API
              pennies per chat.
            </Text>
            <View className="mt-5 w-full max-w-sm gap-2">
              <DuoButton onPress={() => router.push('/paywall')} label="Go premium" title="Go Premium" />
            </View>
          </View>
        ) : !scenario ? (
          <ScrollView className="w-full flex-1" contentContainerClassName="mx-auto w-full max-w-xl self-center pb-8" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
            <View className="items-center">
              <Mascot character="livia" mood="happy" size={96} />
              <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Livia · Conversation mentor</Text>
              <Text className="mt-2 font-duo text-2xl font-extrabold text-slate-900 dark:text-slate-100">Pick a scenario</Text>
              <Text className="text-base text-slate-500 dark:text-slate-400">Real conversation practice, zero judgment.</Text>
            </View>
            {SCENARIOS.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => pick(s)}
                accessibilityRole="button"
                accessibilityLabel={s.title}
                className="mt-3 flex-row items-center rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
              >
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-950">
                  <AppIcon name={s.icon as AppIconName} size={24} color="#7C3AED" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-duo text-lg font-extrabold text-slate-900 dark:text-slate-100">{s.title}</Text>
                  <Text className="text-sm text-slate-500 dark:text-slate-400">{s.blurb}</Text>
                </View>
                <AppIcon name="chevRight" size={24} color="#CBD5E1" />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <>
            <View className="mt-3 flex-row items-center rounded-2xl bg-slate-900 px-4 py-3">
              <AppIcon name={scenario.icon as AppIconName} size={24} color="#FFFFFF" />
              <Text className="ml-2 font-duo text-base font-extrabold text-white">{scenario.title}</Text>
            </View>
            <ScrollView
              ref={(r) => {
                scrollRef.current = r as unknown as { scrollToEnd(options?: { animated?: boolean }): void } | null;
              }}
              className="w-full flex-1" contentContainerClassName="mx-auto w-full max-w-xl self-center gap-2 py-4" contentContainerStyle={{ flexGrow: 1 }}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((m, i) => (
                <View
                  key={i}
                  className={`max-w-[85%] rounded-3xl px-4 py-3 ${
                    m.role === 'user' ? 'self-end rounded-br-lg bg-sky-500' : 'self-start rounded-bl-lg bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  <Text className={`text-base leading-6 ${m.role === 'user' ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                    {m.text}
                  </Text>
                </View>
              ))}
              {busy ? (
                <View className="self-start rounded-3xl rounded-bl-lg bg-slate-100 dark:bg-slate-800 px-4 py-3">
                  <Text className="text-base text-slate-400 dark:text-slate-500">…</Text>
                </View>
              ) : null}
            </ScrollView>
            {error ? <Text className="mb-1 text-center text-sm text-red-500 dark:text-red-400">{error}</Text> : null}
            <View className="flex-row items-center gap-2">
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Say something…"
                multiline
                onSubmitEditing={send}
                className="flex-1 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-base text-slate-900 dark:text-slate-100"
              />
              <Pressable
                onPress={send}
                disabled={busy || !input.trim()}
                accessibilityRole="button"
                accessibilityLabel="Send message"
                className={`h-12 w-12 items-center justify-center rounded-full ${busy || !input.trim() ? 'bg-slate-200 dark:bg-slate-700' : 'bg-green-500'}`}
              >
                <Text className="text-xl font-extrabold text-white">↑</Text>
              </Pressable>
            </View>
          </>
        )}
        <StatusBar style="auto" />
      </View>
    </KeyboardAvoidingView>
  );
}
