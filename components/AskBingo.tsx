import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import Text from './ui/Text';
import TextInput from './ui/TextInput';
import { router } from 'expo-router';
import Mascot from './AfricanMascots';
import AppIcon from './AppIcon';
import HelpfulVote from './HelpfulVote';
import { type BingoContext, type BingoMessage } from '../lib/askBingo';
import { askTutor } from '../lib/edgeAI/tutor';
import { getAiBudget } from '../lib/aiBudget';
import { AI_TOKENS_PER_EXCHANGE_ESTIMATE, type AiBudgetView } from '../lib/entitlements';
import { getProfile } from '../lib/progress';

interface Props {
  /** Where the learner is stuck — shown to Bingo and in the sheet header. */
  lessonTitle: string;
  /** Current question/project step, when there is one. */
  prompt?: string;
  /** Authoritative lesson theory — grounds the small model in facts. */
  theory?: string;
  /** Language banks: try the strong fallback brain first. */
  strongFirst?: boolean;
  /** Signed-in learner id — votes are logged only when present. */
  userId?: string | null;
  /** Premium learners skip the daily allowance. Looked up when omitted. */
  isPremium?: boolean;
}

/** One meter for the sheet: free learners see what's left today. */
function AllowanceMeter({ budget }: { budget: AiBudgetView | null }) {
  if (!budget) return null;
  if (budget.unlimited) {
    return (
      <View className="mt-3 flex-row items-center gap-1.5 rounded-2xl bg-amber-50 px-3 py-2 dark:bg-amber-950">
        <AppIcon name="crown" size={14} color="#D97706" />
        <Text className="text-xs font-bold text-amber-800 dark:text-amber-200">Premium · unlimited AI tutor</Text>
      </View>
    );
  }
  const fraction = budget.limit > 0 ? Math.min(1, budget.used / budget.limit) : 1;
  const questionsLeft = Math.floor(budget.remaining / AI_TOKENS_PER_EXCHANGE_ESTIMATE);
  return (
    <View className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">
          {budget.exhausted
            ? "Today's free AI tutor allowance is used up"
            : `Free AI tutor today · about ${questionsLeft} question${questionsLeft === 1 ? '' : 's'} left`}
        </Text>
        <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500">resets at midnight</Text>
      </View>
      <View
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        accessibilityRole="progressbar"
        accessibilityLabel="Free AI tutor allowance used today"
        accessibilityValue={{ min: 0, max: budget.limit, now: Math.min(budget.used, budget.limit) }}
      >
        <View
          className={budget.exhausted ? 'h-2 bg-red-400' : fraction > 0.75 ? 'h-2 bg-amber-400' : 'h-2 bg-emerald-500'}
          style={{ width: `${Math.round(fraction * 100)}%` }}
        />
      </View>
      {budget.exhausted ? (
        <Text className="mt-2 text-xs leading-4 text-slate-500 dark:text-slate-400">
          Bingo still answers by searching your lessons on this device.{' '}
          <Text className="text-xs font-extrabold text-amber-600 dark:text-amber-400" onPress={() => router.push('/paywall')}>
            Go Premium for unlimited AI →
          </Text>
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Floating "Ask Bingo" button for every lesson path. Opens a help sheet
 * where the learner types what confuses them; Bingo answers in context.
 * Questions go through the offline-first tutor (lib/edgeAI/tutor.ts): cloud
 * AI when online and within the free daily allowance, otherwise the
 * on-device model or lesson search. Each reply says where it came from.
 */
export default function AskBingo({ lessonTitle, prompt, theory, strongFirst, userId = null, isPremium }: Props) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  // Real conversation: the thread persists while the sheet is open so
  // greetings and follow-ups keep their context ("hello" gets a hello).
  const [messages, setMessages] = useState<BingoMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Where each Bingo reply came from (cloud / on-device / lesson search), by message index.
  const [labels, setLabels] = useState<Record<number, string>>({});
  // The caller's value wins; otherwise the profile is looked up when the sheet opens.
  const [fetchedPremium, setFetchedPremium] = useState<boolean | null>(null);
  const premium = isPremium ?? fetchedPremium;
  const [budget, setBudget] = useState<AiBudgetView | null>(null);

  const context: BingoContext = { lessonTitle, prompt, theory, strongFirst };

  // On open: resolve the plan (offline → treated as free) and read today's meter.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    void (async () => {
      let plan = premium;
      if (plan === null) {
        plan = await getProfile()
          .then((p) => p?.is_premium === true)
          .catch(() => false);
        if (alive) setFetchedPremium(plan);
      }
      const view = await getAiBudget(plan === true);
      if (alive) setBudget(view);
    })();
    return () => {
      alive = false;
    };
  }, [open, premium]);

  const send = async () => {
    if (loading || !question.trim()) return;
    const mine: BingoMessage = { role: 'user', text: question.trim() };
    const thread = [...messages, mine];
    setMessages(thread);
    setQuestion('');
    setLoading(true);
    setError(null);
    try {
      const answer = await askTutor(mine.text, context, thread, premium === true);
      setMessages([...thread, { role: 'bingo', text: answer.text }]);
      setLabels((prev) => ({
        ...prev,
        [thread.length]: answer.sources.length ? `${answer.label} · ${answer.sources.slice(0, 2).join(', ')}` : answer.label,
      }));
      setBudget(answer.budget);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bingo is unreachable right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => {
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Ask Bingo for help"
        className="absolute bottom-6 right-4 items-center rounded-full border-b-4 border-amber-700 bg-amber-400 px-4 py-3 shadow-lg"
      >
        <View className="flex-row items-center gap-1.5">
          <AppIcon name="chat" size={20} color="#0F172A" />
          <Text className="text-base font-black text-slate-900 dark:text-slate-100">Ask Bingo</Text>
        </View>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-slate-900/60">
          <View className="max-h-[85%] rounded-t-3xl bg-white dark:bg-slate-900 p-5">
            <View className="flex-row items-center">
              <Mascot character="bingo" mood="happy" size={56} />
              <View className="ml-2 flex-1">
                <Text className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  Super Intelligent · stuck? ask away
                </Text>
                <Text className="font-duo text-lg font-extrabold text-slate-900 dark:text-slate-100" numberOfLines={2}>
                  Bingo helps · {lessonTitle}
                </Text>
              </View>
              <Pressable onPress={() => setOpen(false)} accessibilityLabel="Close Bingo help">
                <Text className="px-2 text-2xl font-bold text-slate-400 dark:text-slate-500">×</Text>
              </Pressable>
            </View>

            <ScrollView className="mt-3">
              {prompt ? (
                <View className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3">
                  <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    You are on
                  </Text>
                  <Text className="mt-0.5 text-sm font-semibold text-slate-700 dark:text-slate-300">{prompt}</Text>
                </View>
              ) : null}
              {messages.map((m, i) =>
                m.role === 'user' ? (
                  <View key={i} className="mt-2 self-end rounded-2xl rounded-br-sm bg-sky-500 px-4 py-2.5" style={{ maxWidth: '85%' }}>
                    <Text className="text-base text-white">{m.text}</Text>
                  </View>
                ) : (
                  <View key={i} className="mt-2 rounded-2xl rounded-bl-sm border-2 border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950 p-3" style={{ maxWidth: '90%' }}>
                    <Text className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">Bingo</Text>
                    <Text className="mt-0.5 text-base leading-6 text-slate-800 dark:text-slate-200">{m.text}</Text>
                    {labels[i] ? (
                      <Text className="mt-1.5 text-[10px] font-bold text-amber-700/70 dark:text-amber-300/70">{labels[i]}</Text>
                    ) : null}
                  </View>
                )
              )}
              {loading ? (
                <View className="mt-2 self-start rounded-2xl rounded-bl-sm bg-slate-100 dark:bg-slate-800 px-4 py-2.5">
                  <Text className="text-base text-slate-400 dark:text-slate-500">Bingo is thinking…</Text>
                </View>
              ) : null}
              {messages.length > 0 && messages[messages.length - 1].role === 'bingo' && !loading ? (
                <HelpfulVote
                  userId={userId}
                  lessonTitle={lessonTitle}
                  prompt={prompt ?? ''}
                  question={messages.filter((m) => m.role === 'user').map((m) => m.text).join(' / ')}
                />
              ) : null}

              {error ? (
                <View className="mt-3 rounded-2xl bg-red-50 dark:bg-red-950 p-4">
                  <Text className="text-sm font-bold text-red-700 dark:text-red-300">{error}</Text>
                  <Pressable onPress={() => { setOpen(false); router.push('/dictionary'); }} className="mt-2">
                    <View className="flex-row items-center gap-1.5">
                      <AppIcon name="book" size={16} color="#0284C7" />
                      <Text className="flex-1 font-bold text-sky-600 dark:text-sky-400">Try the offline Kamusi instead — no AI needed</Text>
                      <AppIcon name="chevRight" size={16} color="#0284C7" />
                    </View>
                  </Pressable>
                </View>
              ) : null}

              <View className="mt-3 flex-row gap-2">
                <TextInput
                  value={question}
                  onChangeText={setQuestion}
                  onSubmitEditing={send}
                  returnKeyType="send"
                  placeholder="What confuses you? (e.g. why hablé, not hablo?)"
                  multiline
                  className="min-h-[48px] flex-1 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-base text-slate-800 dark:text-slate-200"
                />
                <Pressable
                  onPress={send}
                  disabled={loading || !question.trim()}
                  className={`justify-center rounded-2xl border-b-4 px-4 ${
                    loading || !question.trim() ? 'border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-700' : 'border-amber-700 bg-amber-400'
                  }`}
                >
                  <Text className="font-black text-slate-900 dark:text-slate-100">{loading ? '…' : 'Ask'}</Text>
                </Pressable>
              </View>
              <AllowanceMeter budget={budget} />
              <Text className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                Bingo sees your lesson so hints land in context. No connection? Bingo answers from your lessons on this device.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
