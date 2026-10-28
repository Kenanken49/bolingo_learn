import { supabase } from './supabase';

/**
 * Bingo helpfulness votes: 👍👎 on tutor answers. Signed-in learners upsert
 * one vote per question (same user + same question = latest vote wins).
 * Guests stay local-only (no row). Best-effort — the lesson never waits.
 *
 * Down the line, aggregates over (lesson_title, prompt) tell the platform
 * which contexts the small self-hosted model fumbles so those can route to
 * the Kamusi or a stronger brain.
 */

/** Stable, non-reversible fingerprint — never stores the raw question. */
export function hashQuestion(lessonTitle: string, prompt: string, question: string): string {
  const s = `${lessonTitle}|||${prompt}|||${question.trim().toLowerCase()}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 + c, 31);
  }
  return `${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}`;
}

export async function voteBingoHelpful(
  userId: string | null,
  lessonTitle: string,
  prompt: string,
  question: string,
  helpful: boolean
): Promise<void> {
  if (!userId) return; // guests stay device-local by design
  try {
    await supabase.from('bingo_votes').upsert(
      {
        user_id: userId,
        lesson_title: lessonTitle,
        prompt,
        question_hash: hashQuestion(lessonTitle, prompt, question),
        helpful,
      },
      { onConflict: 'user_id,question_hash' }
    );
  } catch {
    /* best-effort — votes never block learning */
  }
}
