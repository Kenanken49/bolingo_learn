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

/**
 * Timed regen: 1 heart per REFILL_WAIT_MS elapsed since hearts_refilled_at,
 * capped at MAX_HEARTS. Premium users skip hearts entirely (unlimited).
 * Returns the updated profile, persisting only when hearts actually grew.
 */
async function applyHeartRegen(profile: Profile): Promise<Profile> {
  if (profile.is_premium) return { ...profile, hearts: MAX_HEARTS };
  if (profile.hearts >= MAX_HEARTS) return profile;
  const elapsed = Date.now() - new Date(profile.hearts_refilled_at).getTime();
  if (elapsed < REFILL_WAIT_MS) return profile;
  const gain = Math.min(MAX_HEARTS - profile.hearts, Math.floor(elapsed / REFILL_WAIT_MS));
  if (gain <= 0) return profile;
  const hearts = profile.hearts + gain;
  const patch: Partial<Profile> =
    hearts >= MAX_HEARTS
      ? { hearts, hearts_refilled_at: new Date().toISOString() }
      : { hearts };
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', profile.id)
    .select()
    .single();
  if (error || !data) return { ...profile, hearts };
  return data as Profile;
}

/** Load the signed-in user's profile, creating it on first run. Null when guest. */
export async function getProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (data) return applyHeartRegen(data as Profile);
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

/** Lessons finished since local-midnight UTC (drives the Daily Quest progress). Best-effort: 0 on error. */
export async function getTodayCompletionCount(userId: string): Promise<number> {
  try {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from('lesson_completions')
      .select('lesson_id')
      .eq('user_id', userId)
      .gte('completed_at', start.toISOString());
    if (error) return 0;
    return ((data as Array<{ lesson_id: string }> | null) ?? []).length;
  } catch {
    return 0;
  }
}

/** Lesson ids the user has finished (drives node states on the Path). */
export async function getCompletedLessonIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('lesson_completions').select('lesson_id').eq('user_id', userId);
  if (error) throw error;
  return new Set(((data as Array<{ lesson_id: string }> | null) ?? []).map((r) => r.lesson_id));
}

/** Log XP into xp_events for the weekly leaderboard (best-effort, never blocks). */
async function logXpEvent(userId: string, xp: number): Promise<void> {
  if (xp <= 0) return;
  try {
    await supabase.from('xp_events').insert({ user_id: userId, xp });
  } catch (e) {
    console.warn('xp_events insert failed (run latest schema.sql):', e);
  }
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
  void logXpEvent(userId, xpEarned);
  return data as Profile;
}

/**
 * Lose one heart; stamps hearts_refilled_at when dropping below max (starts
 * the 4h per-heart regen clock). Premium users never lose hearts.
 */
export async function loseHeart(userId: string): Promise<Profile> {
  const { data: p, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error || !p) throw error ?? new Error('Profile not found.');
  const profile = p as Profile;
  if (profile.is_premium) return { ...profile, hearts: MAX_HEARTS };
  const regen = await applyHeartRegen(profile);
  const hearts = Math.max(0, regen.hearts - 1);
  const patch: Partial<Profile> =
    regen.hearts >= MAX_HEARTS && hearts < MAX_HEARTS
      ? { hearts, hearts_refilled_at: new Date().toISOString() }
      : { hearts };
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

/** ms until the NEXT single heart regenerates (0 = full or premium). */
export function nextHeartIn(profile: Profile): number {
  if (profile.is_premium || profile.hearts >= MAX_HEARTS) return 0;
  return Math.max(0, new Date(profile.hearts_refilled_at).getTime() + REFILL_WAIT_MS - Date.now());
}

/** ms until hearts are completely full (0 = full or premium). */
export function refillWaitRemaining(profile: Profile): number {
  if (profile.is_premium || profile.hearts >= MAX_HEARTS) return 0;
  const missing = MAX_HEARTS - profile.hearts;
  return Math.max(0, new Date(profile.hearts_refilled_at).getTime() + REFILL_WAIT_MS * missing - Date.now());
}
