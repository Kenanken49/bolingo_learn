import { supabase } from './supabase';

/** Free tier: paste raw text only, capped per upload. */
export const FREE_WORD_LIMIT = 1000;
/** Premium: monthly ceiling across all AI generation (protects margins). */
export const PREMIUM_MONTHLY_WORD_CAP = 100_000;
/** $7.70/mo — paywall wiring goes here (RevenueCat/Stripe). */
export const PREMIUM_PRICE_LABEL = '$7.70/mo';

export const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

export interface TierCheck {
  allowed: boolean;
  reason?: string;
  words: number;
}

/** Decide whether an upload may enter the pipeline, and how many words to bill. */
export async function checkUploadAllowed(
  userId: string,
  fileName: string,
  textForSizing: string | null
): Promise<TierCheck> {
  const { data, error } = await supabase
    .from('profiles')
    .select('is_premium,ai_words_used,ai_words_reset_at')
    .eq('id', userId)
    .single();
  if (error || !data) throw error ?? new Error('Profile not found.');
  const p = data as { is_premium: boolean; ai_words_used: number; ai_words_reset_at: string };

  // Monthly reset: first check after 30 days zeroes the counter.
  let used = p.ai_words_used;
  if (Date.now() - new Date(p.ai_words_reset_at).getTime() > 30 * 86400 * 1000) {
    used = 0;
    await supabase.from('profiles').update({ ai_words_used: 0, ai_words_reset_at: new Date().toISOString() }).eq('id', userId);
  }

  const lower = fileName.toLowerCase();
  const isText = lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.csv');
  const words = textForSizing ? countWords(textForSizing) : 0;

  if (!p.is_premium) {
    // Free: raw text only (no PDF/audio), ≤1000 words, device TTS on-device.
    if (!isText) {
      return { allowed: false, words: 0, reason: 'Free tier supports pasted text files only — upgrade to Premium for PDF & audio uploads.' };
    }
    if (textForSizing && words > FREE_WORD_LIMIT) {
      return { allowed: false, words, reason: `Free tier caps uploads at ${FREE_WORD_LIMIT} words (this file: ~${words}). Trim it or upgrade to Premium.` };
    }
    return { allowed: true, words };
  }

  // Premium: everything allowed, subject to the monthly ceiling.
  // Estimate unparsed files generously (a 500-page book ≈ 150k words > cap).
  const billable = words > 0 ? words : 5000;
  if (used + billable > PREMIUM_MONTHLY_WORD_CAP) {
    return {
      allowed: false,
      words: billable,
      reason: `Monthly AI budget used (${used.toLocaleString()}/${PREMIUM_MONTHLY_WORD_CAP.toLocaleString()} words). Resets monthly.`,
    };
  }
  return { allowed: true, words: billable };
}

/** Add billed words to the user's monthly counter (call after extraction). */
export async function billWords(userId: string, words: number): Promise<void> {
  if (words <= 0) return;
  const { data } = await supabase.from('profiles').select('ai_words_used').eq('id', userId).single();
  const used = ((data as { ai_words_used: number } | null)?.ai_words_used ?? 0) + words;
  await supabase.from('profiles').update({ ai_words_used: used }).eq('id', userId);
}
