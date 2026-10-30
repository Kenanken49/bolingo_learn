import { useCallback, useRef, useState } from 'react';
import {
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
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
import {
  ROLEPLAY_LANGUAGES,
  ROLEPLAY_PERSONAS,
  roleplayLanguage,
  roleplayOpening,
  roleplayPersona,
  roleplayStarters,
  type RoleplayLanguageId,
  type RoleplayPersonaId,
} from '../../lib/roleplayPersonas';
import {
  FRENCH_SPEECH,
  GERMAN_SPEECH,
  SPANISH_SPEECH,
  speakAs,
  stopSpeaking,
} from '../../lib/pronunciation';

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
    opener:
      "Hey! I'm your senior dev for this session. Paste some HTML or CSS you wrote (or describe it) and I'll review it with you.",
  },
  {
    id: 'debug-duck',
    icon: 'bug',
    title: 'Debug Duck',
    blurb: 'Stuck? Quack through the bug together.',
    opener:
      'Quack! Tell me what your code is *supposed* to do, and what it actually does. I’ll ask questions until we find the bug.',
  },
  {
    id: 'interview',
    icon: 'mic',
    title: 'Mock Interview',
    blurb: 'Practice junior HTML/CSS/JS questions.',
    opener:
      'Welcome to your mock interview! Relax — we’ll start easy. First question: what does HTML stand for, and what is it used for?',
  },
];

const SPEECH_PRESETS = {
  spanish: SPANISH_SPEECH,
  french: FRENCH_SPEECH,
  german: GERMAN_SPEECH,
} as const;

interface Msg {
  role: 'user' | 'assistant';
  text: string;
  /** English gloss for a language-tutor reply. */
  translation?: string;
  /** Optional coaching note returned by the tutor. */
  tip?: string;
}

export default function Roleplay() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [languageId, setLanguageId] = useState<RoleplayLanguageId>('spanish');
  const [personaId, setPersonaId] = useState<RoleplayPersonaId | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  // RN 0.88 types the ScrollView ref opaquely — track just the method we need.
  const scrollRef = useRef<{ scrollToEnd(options?: { animated?: boolean }): void } | null>(null);
  // A generation token keeps a slow old utterance from clearing the "playing"
  // state of the line the learner just tapped.
  const speechRequest = useRef(0);

  const activeLanguage = roleplayLanguage(languageId);
  const activePersona = personaId ? roleplayPersona(personaId) : null;
  const languageSession = activePersona !== null && scenario === null;

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
      return () => {
        speechRequest.current += 1;
        void stopSpeaking();
      };
    }, [refresh])
  );

  const leave = () => {
    speechRequest.current += 1;
    void stopSpeaking();
    setSpeakingIndex(null);
    setPersonaId(null);
    setScenario(null);
    setMessages([]);
    setInput('');
    setError(null);
  };

  const startLanguage = (id: RoleplayPersonaId) => {
    const opening = roleplayOpening(id, languageId);
    speechRequest.current += 1;
    void stopSpeaking();
    setSpeakingIndex(null);
    setPersonaId(id);
    setScenario(null);
    setMessages([{ role: 'assistant', text: opening.target, translation: opening.english }]);
    setInput('');
    setError(null);
  };

  const pickScenario = (s: Scenario) => {
    speechRequest.current += 1;
    void stopSpeaking();
    setSpeakingIndex(null);
    setPersonaId(null);
    setScenario(s);
    setMessages([{ role: 'assistant', text: s.opener }]);
    setInput('');
    setError(null);
  };

  const replay = async (index: number) => {
    const message = messages[index];
    if (!languageSession || !message || message.role !== 'assistant') return;
    if (speakingIndex === index) {
      speechRequest.current += 1;
      await stopSpeaking();
      setSpeakingIndex(null);
      return;
    }
    const request = speechRequest.current + 1;
    speechRequest.current = request;
    setSpeakingIndex(index);
    try {
      await speakAs({
        character: activePersona?.id ?? 'livia',
        text: message.text,
        language: SPEECH_PRESETS[languageId],
      });
    } catch {
      setError('The device voice could not play that line. Try again after checking your voice settings.');
    } finally {
      if (speechRequest.current === request) setSpeakingIndex(null);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy || (!languageSession && !scenario)) return;
    setInput('');
    setError(null);
    speechRequest.current += 1;
    void stopSpeaking();
    setSpeakingIndex(null);
    const history: Msg[] = [...messages, { role: 'user' as const, text }];
    setMessages(history);
    setBusy(true);
    try {
      const body = activePersona
        ? {
            personaId: activePersona.id,
            languageId,
            history: history.map((m) => ({ role: m.role, content: m.text })),
          }
        : {
            scenarioId: scenario!.id,
            history: history.map((m) => ({ role: m.role, content: m.text })),
          };
      const { data, error: fnError } = await supabase.functions.invoke('roleplay-chat', { body });
      const payload = (data ?? {}) as {
        reply?: unknown;
        translation?: unknown;
        tip?: unknown;
        premium_required?: boolean;
      };
      const premiumBlocked =
        payload.premium_required === true ||
        /premium/i.test(String((fnError as { message?: string } | null)?.message ?? ''));
      if (premiumBlocked) {
        setError('Roleplay is a Premium perk — upgrade to keep chatting.');
        setBusy(false);
        router.push('/paywall');
        return;
      }
      if (fnError) throw new Error(fnError.message || 'Chat service unreachable.');
      const reply = (typeof payload.reply === 'string' ? payload.reply : '').trim();
      if (!reply) throw new Error('The chat came back empty — try again.');
      const translation =
        typeof payload.translation === 'string' ? payload.translation.trim() : '';
      const tip = typeof payload.tip === 'string' ? payload.tip.trim() : '';
      setMessages([
        ...history,
        {
          role: 'assistant',
          text: reply,
          ...(translation ? { translation } : {}),
          ...(tip ? { tip } : {}),
        },
      ]);
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
        <Pressable
          onPress={() => (languageSession || scenario ? leave() : router.replace('/'))}
        >
          <View className="flex-row items-center gap-0.5">
            <AppIcon name="chevBack" size={16} color="#0284C7" />
            <Text className="font-bold text-sky-600 dark:text-sky-400">
              {languageSession || scenario ? 'All roleplays' : 'Back to Learn'}
            </Text>
          </View>
        </Pressable>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#7c3aed" size="large" />
          </View>
        ) : !profile ? (
          <View className="flex-1 items-center justify-center">
            <Mascot character="livia" mood="happy" size={110} />
            <Text onPhoto className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-200">
              Livia &amp; Bingo · conversation tutors
            </Text>
            <Text className="mt-3 font-duo text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              AI Roleplay
            </Text>
            <Text onPhoto className="mt-1 text-center text-base text-slate-600 dark:text-slate-200">
              Practise Spanish, French or German with a tutor. Sign in to start talking.
            </Text>
            <View className="mt-5 w-full max-w-sm">
              <DuoButton onPress={() => router.push('/auth')} label="Sign in" title="Sign in" />
            </View>
          </View>
        ) : !profile.is_premium ? (
          <View className="flex-1 items-center justify-center">
            <Mascot character="bingo" mood="party" size={110} />
            <Text onPhoto className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-200">
              Bingo loves premium parties
            </Text>
            <Text className="mt-3 font-duo text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              Duolingo Max style
            </Text>
            <Text onPhoto className="mt-1 text-center text-base text-slate-600 dark:text-slate-200">
              Roleplay conversations are a Premium perk ({PREMIUM_PRICE_LABEL}) — live tutors cost real
              API pennies per chat.
            </Text>
            <View className="mt-5 w-full max-w-sm gap-2">
              <DuoButton onPress={() => router.push('/paywall')} label="Go premium" title="Go Premium" />
            </View>
          </View>
        ) : !languageSession && !scenario ? (
          <ScrollView
            className="w-full flex-1"
            contentContainerClassName="mx-auto w-full max-w-xl self-center pb-8"
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="items-center">
              <View className="flex-row items-end justify-center">
                <Mascot character="livia" mood="happy" size={74} />
                <Mascot character="bingo" mood="party" size={82} />
              </View>
              <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Spanish · French · German
              </Text>
              <Text className="mt-2 text-center font-duo text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                Pick your conversation partner
              </Text>
              <Text className="mt-1 text-center text-base text-slate-500 dark:text-slate-400">
                Real conversation practice, two very different teachers.
              </Text>
            </View>

            <View className="mt-5 rounded-3xl border-2 border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <Text className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Language
              </Text>
              <View className="mt-2 flex-row gap-2">
                {ROLEPLAY_LANGUAGES.map((language) => {
                  const selected = language.id === languageId;
                  return (
                    <Pressable
                      key={language.id}
                      onPress={() => setLanguageId(language.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${language.name} roleplay`}
                      className={`flex-1 items-center rounded-2xl border-2 px-2 py-3 ${
                        selected
                          ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950/40'
                          : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-extrabold tracking-widest ${
                          selected
                            ? 'text-emerald-600 dark:text-emerald-300'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {language.code}
                      </Text>
                      <Text
                        className={`mt-0.5 text-sm font-extrabold ${
                          selected
                            ? 'text-emerald-700 dark:text-emerald-200'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {language.nativeName}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Text className="mb-2 mt-5 text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Choose a tutor
            </Text>
            {ROLEPLAY_PERSONAS.map((persona) => {
              const opening = roleplayOpening(persona.id, languageId);
              return (
                <Pressable
                  key={persona.id}
                  onPress={() => startLanguage(persona.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Practise ${activeLanguage.name} with ${persona.name}`}
                  className="mt-3 rounded-3xl border-2 border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <View className="flex-row items-center">
                    <View className="rounded-full bg-slate-100 p-1 dark:bg-slate-800">
                      <Mascot
                        character={persona.id}
                        mood={persona.id === 'bingo' ? 'party' : 'happy'}
                        size={58}
                      />
                    </View>
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="font-duo text-lg font-extrabold text-slate-900 dark:text-slate-100">
                          {persona.name}
                        </Text>
                        <View className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                          <Text className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            AI tutor
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {persona.role}
                      </Text>
                    </View>
                    <AppIcon name="chevRight" size={22} color="#CBD5E1" />
                  </View>
                  <Text className="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400">
                    {persona.blurb}
                  </Text>
                  <View className="mt-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
                    <Text className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {persona.name} in {activeLanguage.nativeName}
                    </Text>
                    <Text
                      numberOfLines={2}
                      className="mt-1 text-sm font-bold leading-5 text-slate-800 dark:text-slate-200"
                    >
                      {opening.target}
                    </Text>
                    <Text
                      numberOfLines={2}
                      className="mt-1 text-xs leading-4 text-slate-500 dark:text-slate-400"
                    >
                      {opening.english}
                    </Text>
                  </View>
                  <View className="mt-3 flex-row items-center justify-between">
                    <Text className="text-xs font-bold text-slate-400 dark:text-slate-500">
                      {persona.approach}
                    </Text>
                    <Text className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
                      Start →
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            <View className="mt-7 border-t-2 border-slate-100 pt-5 dark:border-slate-800">
              <Text className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                More practice
              </Text>
              <Text className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Code &amp; career roleplays, same chat engine.
              </Text>
              {SCENARIOS.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => pickScenario(s)}
                  accessibilityRole="button"
                  accessibilityLabel={s.title}
                  className="mt-3 flex-row items-center rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                >
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950">
                    <AppIcon name={s.icon as AppIconName} size={20} color="#7C3AED" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      {s.title}
                    </Text>
                    <Text className="text-xs text-slate-500 dark:text-slate-400">{s.blurb}</Text>
                  </View>
                  <AppIcon name="chevRight" size={20} color="#CBD5E1" />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : (
          <>
            <View className="mt-3 flex-row items-center rounded-2xl bg-slate-900 px-4 py-3 dark:bg-slate-950">
              {scenario ? (
                <AppIcon name={scenario.icon as AppIconName} size={24} color="#FFFFFF" />
              ) : (
                <Mascot
                  character={activePersona?.id ?? 'livia'}
                  mood={activePersona?.id === 'bingo' ? 'party' : 'happy'}
                  size={40}
                />
              )}
              <View className="ml-2 flex-1">
                <Text className="font-duo text-base font-extrabold text-white">
                  {scenario
                    ? scenario.title
                    : `${activeLanguage.name} with ${activePersona?.name ?? 'Livia'}`}
                </Text>
                <Text className="text-[11px] font-bold text-slate-400">
                  {scenario
                    ? 'Code & career roleplay'
                    : `${activePersona?.role ?? 'Conversation tutor'} · ${activeLanguage.nativeName}`}
                </Text>
              </View>
            </View>

            <ScrollView
              ref={(r) => {
                scrollRef.current = r as unknown as {
                  scrollToEnd(options?: { animated?: boolean }): void;
                } | null;
              }}
              className="w-full flex-1"
              contentContainerClassName="mx-auto w-full max-w-xl self-center gap-2 py-4"
              contentContainerStyle={{ flexGrow: 1 }}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((m, i) => (
                <View
                  key={i}
                  className={`max-w-[88%] rounded-3xl px-4 py-3 ${
                    m.role === 'user'
                      ? 'self-end rounded-br-lg bg-sky-500'
                      : 'self-start rounded-bl-lg bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  <Text
                    className={`text-base leading-6 ${
                      m.role === 'user'
                        ? 'text-white'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {m.text}
                  </Text>
                  {m.translation ? (
                    <View className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-700">
                      <Text className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        English
                      </Text>
                      <Text className="mt-0.5 text-sm leading-5 text-slate-500 dark:text-slate-400">
                        {m.translation}
                      </Text>
                    </View>
                  ) : null}
                  {m.tip ? (
                    <View className="mt-2 flex-row items-start gap-1.5 rounded-xl bg-amber-50 p-2 dark:bg-amber-950/40">
                      <AppIcon name="sparkles" size={13} color="#D97706" />
                      <Text className="flex-1 text-xs font-semibold leading-4 text-amber-800 dark:text-amber-200">
                        {m.tip}
                      </Text>
                    </View>
                  ) : null}
                  {languageSession && m.role === 'assistant' ? (
                    <Pressable
                      onPress={() => replay(i)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        speakingIndex === i
                          ? `Stop ${activePersona?.name ?? 'tutor'}`
                          : `Hear ${activePersona?.name ?? 'tutor'} say this line`
                      }
                      className="mt-2 flex-row items-center gap-1"
                    >
                      <AppIcon
                        name={speakingIndex === i ? 'pause' : 'volume'}
                        size={14}
                        color="#0284C7"
                      />
                      <Text className="text-xs font-extrabold text-sky-600 dark:text-sky-400">
                        {speakingIndex === i
                          ? 'Stop'
                          : `Hear ${activePersona?.name ?? 'tutor'}`}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {busy ? (
                <View className="self-start rounded-3xl rounded-bl-lg bg-slate-100 px-4 py-3 dark:bg-slate-800">
                  <Text className="text-base text-slate-400 dark:text-slate-500">…</Text>
                </View>
              ) : null}
            </ScrollView>

            {error ? (
              <Text className="mb-1 text-center text-sm text-red-500 dark:text-red-400">
                {error}
              </Text>
            ) : null}

            {languageSession && !busy && !input.trim() ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0, maxHeight: 40 }}
                contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
              >
                {roleplayStarters(activePersona!.id, languageId).map((starter) => (
                  <Pressable
                    key={starter}
                    onPress={() => setInput(starter)}
                    accessibilityRole="button"
                    accessibilityLabel={`Use starter: ${starter}`}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {starter}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            <View className="flex-row items-center gap-2">
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={
                  languageSession
                    ? activeLanguage.placeholder
                    : 'Say something…'
                }
                multiline
                onSubmitEditing={send}
                className="flex-1 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
              <Pressable
                onPress={send}
                disabled={busy || !input.trim()}
                accessibilityRole="button"
                accessibilityLabel="Send message"
                className={`h-12 w-12 items-center justify-center rounded-full ${
                  busy || !input.trim()
                    ? 'bg-slate-200 dark:bg-slate-700'
                    : 'bg-green-500'
                }`}
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
