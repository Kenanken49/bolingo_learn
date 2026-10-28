import { supabase } from './supabase';

/**
 * Duolingo Max "Explain My Answer": instantaneous, personalized feedback on
 * mistakes. Session-cached by question+answer so re-taps never re-bill.
 */
const cache = new Map<string, string>();

export interface ExplainContext {
  /** Authoritative lesson theory — grounds the small model in facts. */
  theory?: string;
  /** The bank's own teaching note for this question (reference answer). */
  reference?: string;
  /**
   * Language banks (measured: 1.5B misnames tenses 1-in-2 even grounded)
   * try the fallback brain FIRST, primary second. Code lessons stay
   * primary-first. Ignored when no fallback is configured.
   */
  strongFirst?: boolean;
}

export async function fetchExplanation(
  prompt: string,
  yourAnswer: string,
  correctAnswer: string,
  context: ExplainContext = {}
): Promise<string> {
  const key = `${prompt}|||${yourAnswer}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { data, error } = await supabase.functions.invoke('explain-answer', {
    body: { prompt, yourAnswer, correctAnswer, ...context },
  });
  if (error) throw new Error(error.message || 'Explanation service unreachable.');
  const text = ((data as { explanation?: unknown } | null)?.explanation as string | undefined)?.trim();
  if (!text) throw new Error('The tutor came back empty — try again.');
  if (cache.size > 100) cache.clear();
  cache.set(key, text);
  return text;
}
