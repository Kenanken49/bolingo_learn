import { supabase } from './supabase';
import type { CodeQuizData } from '../components/GamifiedCodePlayer';

/**
 * Spaced Repetition System: predicts when a rule is slipping out of memory
 * and injects due cards into a bite-sized Daily Review.
 *
 * Each row is keyed `<lessonId>:<index>` and carries a question snapshot so
 * review assembly needs no bank lookups. Scheduling is simplified SM-2:
 * first correct → due in 1 day, second → 6 days, then interval × ease;
 * a miss sends the card back to relearning (due tomorrow) and trims ease.
 */
const DAY_MS = 86400 * 1000;
export const REVIEW_CAP = 5;

export interface CardSnapshot {
  prompt: string;
  correctChain: string[];
  options: string[];
  explain?: string;
  lessonTitle: string;
}

export interface DueItem {
  key: string;
  question: CodeQuizData;
  lessonTitle: string;
}

/** Grade one answer (best-effort — never blocks the lesson flow). */
export async function gradeCard(
  userId: string,
  key: string,
  correct: boolean,
  snapshot: CardSnapshot
): Promise<void> {
  try {
    const { data } = await supabase
      .from('srs_cards')
      .select('ease,interval_days,reps,lapses')
      .eq('user_id', userId)
      .eq('item_key', key)
      .maybeSingle();
    const row = data as { ease: number; interval_days: number; reps: number; lapses: number } | null;
    let ease = Number(row?.ease ?? 2.5);
    let interval = row?.interval_days ?? 0;
    let reps = row?.reps ?? 0;
    let lapses = row?.lapses ?? 0;
    if (correct) {
      reps += 1;
      interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.max(1, Math.round(interval * ease));
    } else {
      lapses += 1;
      reps = 0;
      interval = 1;
      ease = Math.max(1.3, ease - 0.2);
    }
    const now = new Date();
    await supabase.from('srs_cards').upsert({
      user_id: userId,
      item_key: key,
      prompt: snapshot.prompt,
      correct_chain: snapshot.correctChain,
      options: snapshot.options,
      lesson_title: snapshot.lessonTitle,
      ease,
      interval_days: interval,
      reps,
      lapses,
      due_at: new Date(now.getTime() + interval * DAY_MS).toISOString(),
      last_seen_at: now.toISOString(),
    });
  } catch (e) {
    console.warn('SRS grade failed:', e);
  }
}

/** How many cards are due right now (drives the Path review nudge). */
export async function getDueCount(userId: string): Promise<number> {
  try {
    const { count } = await supabase
      .from('srs_cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('due_at', new Date().toISOString());
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Mistakes first, then oldest-due (Duolingo Mistakes-review pattern):
 * lapsed cards are retrieval failures — rehearse them before routine dues.
 * Capped for a ~2-minute session.
 */
export async function getDueItems(userId: string, limit = REVIEW_CAP): Promise<DueItem[]> {
  const { data, error } = await supabase
    .from('srs_cards')
    .select('item_key,prompt,correct_chain,options,lesson_title,lapses')
    .eq('user_id', userId)
    .lte('due_at', new Date().toISOString())
    .order('lapses', { ascending: false })
    .order('due_at', { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return (data as Array<{ item_key: string; prompt: string; correct_chain: string[]; options: string[]; lesson_title: string }>)
    .filter((r) => Array.isArray(r.correct_chain) && r.correct_chain.length > 0)
    .map((r) => ({
      key: r.item_key,
      lessonTitle: r.lesson_title || 'Review',
      question: {
        prompt: r.prompt,
        correctChain: r.correct_chain,
        scrambledTokens: [...r.options].sort(() => Math.random() - 0.5),
      },
    }));
}
