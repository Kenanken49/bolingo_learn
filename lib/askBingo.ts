import { supabase } from './supabase';

/**
 * "Super Intelligent" Ask Bingo: free-text help from the owl tutor, aware
 * of where the learner is stuck (lesson + current question). Session-cached
 * by question+context so repeat taps never re-bill.
 */
export interface BingoContext {
  lessonTitle?: string;
  prompt?: string;
  /**
   * Authoritative lesson material (theory text). The small self-hosted
   * model recalls facts poorly (measured: "Sama" for "thank you" instead
   * of "Asante"); with theory attached it reads instead of recalling.
   * Truncated client-side to ~900 chars — free over the VPS, cheap on
   * fallback, and worth every token in correctness.
   */
  theory?: string;
  /** Language banks: try the fallback brain first (see ExplainContext). */
  strongFirst?: boolean;
}

const cache = new Map<string, string>();

export async function askBingo(question: string, context: BingoContext = {}): Promise<string> {
  const q = question.trim();
  if (!q) throw new Error('Type your question first — Bingo is listening.');
  const key = `${context.lessonTitle ?? ''}|||${context.prompt ?? ''}|||${q}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { data, error } = await supabase.functions.invoke('ask-bingo', {
    body: { question: q, context },
  });
  if (error) throw new Error(error.message || 'Bingo is unreachable right now.');
  const text = ((data as { answer?: unknown } | null)?.answer as string | undefined)?.trim();
  if (!text) throw new Error('Bingo came back empty — try asking another way.');
  if (cache.size > 100) cache.clear();
  cache.set(key, text);
  return text;
}
