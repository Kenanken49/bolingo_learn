import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Mascot from './AfricanMascots';
import { askBingo, type BingoContext } from '../lib/askBingo';

interface Props {
  /** Where the learner is stuck — shown to Bingo and in the sheet header. */
  lessonTitle: string;
  /** Current question/project step, when there is one. */
  prompt?: string;
}

/**
 * Floating "🦉 Ask Bingo" button for every lesson path. Opens a help sheet
 * where the learner types what confuses them; Bingo answers in context.
 * Free for all learners — offline or AI failure falls back to the Kamusi.
 */
export default function AskBingo({ lessonTitle, prompt }: Props) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const context: BingoContext = { lessonTitle, prompt };

  const send = async () => {
    if (loading || !question.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setAnswer(await askBingo(question, context));
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
        <Text className="text-base font-black text-slate-900">🦉 Ask Bingo</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-slate-900/60">
          <View className="max-h-[85%] rounded-t-3xl bg-white p-5">
            <View className="flex-row items-center">
              <Mascot character="bingo" mood="happy" size={56} />
              <View className="ml-2 flex-1">
                <Text className="text-xs font-bold uppercase tracking-widest text-amber-600">
                  Super Intelligent · stuck? ask away
                </Text>
                <Text className="font-duo text-lg font-extrabold text-slate-900" numberOfLines={2}>
                  Bingo helps · {lessonTitle}
                </Text>
              </View>
              <Pressable onPress={() => setOpen(false)} accessibilityLabel="Close Bingo help">
                <Text className="px-2 text-2xl font-bold text-slate-400">×</Text>
              </Pressable>
            </View>

            <ScrollView className="mt-3">
              {prompt ? (
                <View className="rounded-2xl bg-slate-100 p-3">
                  <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    You are on
                  </Text>
                  <Text className="mt-0.5 text-sm font-semibold text-slate-700">{prompt}</Text>
                </View>
              ) : null}

              {answer ? (
                <View className="mt-3 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
                  <Text className="text-sm font-bold uppercase tracking-widest text-amber-700">
                    🦉 Bingo says
                  </Text>
                  <Text className="mt-1 text-base leading-6 text-slate-800">{answer}</Text>
                </View>
              ) : null}

              {error ? (
                <View className="mt-3 rounded-2xl bg-red-50 p-4">
                  <Text className="text-sm font-bold text-red-700">{error}</Text>
                  <Pressable onPress={() => { setOpen(false); router.push('/dictionary'); }} className="mt-2">
                    <Text className="font-bold text-sky-600">
                      📖 Try the offline Kamusi instead — no AI needed →
                    </Text>
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
                  className="min-h-[48px] flex-1 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-800"
                />
                <Pressable
                  onPress={send}
                  disabled={loading || !question.trim()}
                  className={`justify-center rounded-2xl border-b-4 px-4 ${
                    loading || !question.trim() ? 'border-slate-300 bg-slate-200' : 'border-amber-700 bg-amber-400'
                  }`}
                >
                  <Text className="font-black text-slate-900">{loading ? '…' : 'Ask'}</Text>
                </Pressable>
              </View>
              <Text className="mt-2 text-xs text-slate-400">
                Bingo sees your lesson so hints land in context. Hints guide — the XP is still yours to win.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
