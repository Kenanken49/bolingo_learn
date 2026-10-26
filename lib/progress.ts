import { supabase } from './supabase';

export const MAX_HEARTS = 5;
export const REFILL_WAIT_MS = 4 * 3600 * 1000;

export interface Profile {
  id: string;
  username: string | null;
  xp: number;
  streak_count: number;
  last_activity_at: string | null;
  is_premium: boolean;
  hearts: number;
  hearts_refilled_at: string;
  ai_words_used: number;
  ai_words_reset_at: string;
}

const DEFAULTS = {
  xp: 0,
  streak_count: 0,
  last_activity_at: null,
  is_premium: false,
  hearts: MAX_HEARTS,
  ai_words_used: 0,
};

/** Load the signed-in user's profile, creating it on first run. Null when guest. */
export async function getProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (data) return data as Profile;
  if (error && (error as { code?: string }).code !== 'PGRST116') throw error;
  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({ id: user.id })
    .select()
    .single();
  if (insertError || !created) throw insertError ?? new Error('Could not create profile.');
  const now = new Date().toISOString();
  return { ...DEFAULTS, username: null, hearts_refilled_at: now, ai_words_reset_at: now, ...created } as Profile;
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Lesson ids the user has finished (drives node states on the Path). */
export async function getCompletedLessonIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('lesson_completions').select('lesson_id').eq('user_id', userId);
  if (error) throw error;
  return new Set(((data as Array<{ lesson_id: string }> | null) ?? []).map((r) => r.lesson_id));
}

/** Award XP and tick the streak (same-day replays don't double-count). */
export async function completeLesson(userId: string, xpEarned: number, lessonId?: string): Promise<Profile> {
  const { data: p, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error || !p) throw error ?? new Error('Profile not found.');
  const profile = p as Profile;
  const today = dayKey(new Date());
  const last = profile.last_activity_at ? dayKey(new Date(profile.last_activity_at)) : null;
  const yesterday = dayKey(new Date(Date.now() - 86400000));
  const streak_count = last === today ? profile.streak_count : last === yesterday ? profile.streak_count + 1 : 1;
  const { data, error: upError } = await supabase
    .from('profiles')
    .update({ xp: profile.xp + xpEarned, streak_count, last_activity_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (upError || !data) throw upError ?? new Error('Could not save progress.');
  if (lessonId) {
    await supabase.from('lesson_completions').upsert({ user_id: userId, lesson_id: lessonId });
  }
  return data as Profile;
}

/** Lose one heart; stamps hearts_refilled_at when hitting zero (starts the 4h wait). */
export async function loseHeart(userId: string): Promise<Profile> {
  const { data: p, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error || !p) throw error ?? new Error('Profile not found.');
  const profile = p as Profile;
  const hearts = Math.max(0, profile.hearts - 1);
  const patch: Partial<Profile> =
    hearts === 0 ? { hearts, hearts_refilled_at: new Date().toISOString() } : { hearts };
  const { data, error: upError } = await supabase.from('profiles').update(patch).eq('id', userId).select().single();
  if (upError || !data) throw upError ?? new Error('Could not update hearts.');
  return data as Profile;
}

/** Grant hearts (ad reward / refill), capped at MAX_HEARTS. */
export async function grantHearts(userId: string, n: number): Promise<Profile> {
  const { data: p, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error || !p) throw error ?? new Error('Profile not found.');
  const profile = p as Profile;
  const hearts = Math.min(MAX_HEARTS, profile.hearts + n);
  const { data, error: upError } = await supabase.from('profiles').update({ hearts }).eq('id', userId).select().single();
  if (upError || !data) throw upError ?? new Error('Could not grant hearts.');
  return data as Profile;
}

/** ms remaining on the 4-hour wait (0 = refill available). */
export function refillWaitRemaining(profile: Profile): number {
  return Math.max(0, new Date(profile.hearts_refilled_at).getTime() + REFILL_WAIT_MS - Date.now());
}
