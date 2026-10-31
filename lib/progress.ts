import { supabase } from './supabase';
import { advanceStreak } from './streak';
import { track } from './telemetry';

export const MAX_HEARTS = 5;
export const REFILL_WAIT_MS = 4 * 3600 * 1000;

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  xp: number;
  streak_count: number;
  last_activity_at: string | null;
  is_premium: boolean;
  hearts: number;
  hearts_refilled_at: string;
  gems: number;
  streak_freezes: number;
  ai_words_used: number;
  ai_words_reset_at: string;
  /** Owner console only; absent until migrations_quality_ops.sql is applied. */
  is_admin?: boolean;
}

const DEFAULTS = {
  xp: 0,
  streak_count: 0,
  last_activity_at: null,
  is_premium: false,
  hearts: MAX_HEARTS,
  gems: 0,
  streak_freezes: 0,
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

/** Pull Google OAuth details (name + photo) out of the auth user metadata. */
function oauthImport(user: { user_metadata?: Record<string, unknown> }): { username: string | null; avatar_url: string | null } {
  const m = user?.user_metadata ?? {};
  const pick = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = m[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return null;
  };
  return { username: pick('full_name', 'name', 'preferred_username'), avatar_url: pick('avatar_url', 'picture') };
}

/**
 * Backfill name/photo from the OAuth provider (Google) into the profile row.
 * Never overwrites a username the learner set themselves — only fills blanks
 * and refreshes the photo. Best-effort, never blocks the caller.
 */
async function syncOAuthProfile(userId: string, row: Profile, user: { user_metadata?: Record<string, unknown> }): Promise<Profile> {
  const imported = oauthImport(user);
  const patch: Partial<Profile> = {};
  if (!row.username && imported.username) patch.username = imported.username;
  if (imported.avatar_url && imported.avatar_url !== row.avatar_url) patch.avatar_url = imported.avatar_url;
  if (Object.keys(patch).length === 0) return row;
  try {
    const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select().single();
    if (!error && data) return data as Profile;
    // Name taken by another learner (usernames are unique)? Keep the photo,
    // drop the clashing name — never show data that isn't saved.
    if (patch.avatar_url && patch.username) {
      const { data: retried, error: retryError } = await supabase
        .from('profiles')
        .update({ avatar_url: patch.avatar_url })
        .eq('id', userId)
        .select()
        .single();
      if (!retryError && retried) return retried as Profile;
    }
  } catch {
    /* best-effort — callers must never break on a photo/name sync */
  }
  return row;
}

/** Load the signed-in user's profile, creating it on first run. Null when guest. */
export async function getProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (data) {
    const synced = await syncOAuthProfile(user.id, data as Profile, user);
    return applyHeartRegen(synced);
  }
  if (error && (error as { code?: string }).code !== 'PGRST116') throw error;
  const imported = oauthImport(user);
  let created: Profile | null = null;
  const { data: first, error: firstError } = await supabase
    .from('profiles')
    .insert({ id: user.id, username: imported.username, avatar_url: imported.avatar_url })
    .select()
    .single();
  if (!firstError && first) {
    created = first as Profile;
  } else if ((firstError as { code?: string } | null)?.code === '23505' && imported.username) {
    // Google display name already taken — retry without it; the learner can
    // set their own name later. Photo has no unique constraint, keep it.
    const { data: second, error: secondError } = await supabase
      .from('profiles')
      .insert({ id: user.id, avatar_url: imported.avatar_url })
      .select()
      .single();
    if (secondError || !second) throw secondError ?? new Error('Could not create profile.');
    created = second as Profile;
  } else {
    throw firstError ?? new Error('Could not create profile.');
  }
  const now = new Date().toISOString();
  const base = { ...DEFAULTS, username: null, avatar_url: null, hearts_refilled_at: now, ai_words_reset_at: now };
  return { ...base, ...(created as unknown as Record<string, unknown>) } as Profile;
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
    return ((data as { lesson_id: string }[] | null) ?? []).length;
  } catch {
    return 0;
  }
}

/** Lesson ids the user has finished (drives node states on the Path). */
export async function getCompletedLessonIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('lesson_completions').select('lesson_id').eq('user_id', userId);
  if (error) throw error;
  return new Set(((data as { lesson_id: string }[] | null) ?? []).map((r) => r.lesson_id));
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

/** Optional non-XP chest payout persisted alongside the completion. */
export interface LessonExtras {
  gems?: number;
  streakFreezes?: number;
}

/**
 * Award XP and tick the streak (same-day replays don't double-count).
 *
 * A streak freeze covers missed calendar days: if the learner has enough
 * freezes for the gap, the streak continues and the freezes are consumed.
 * Otherwise the streak restarts at one. Chest extras (gems/freezes) ride the
 * same update, so the reward and the completion commit together.
 */
export async function completeLesson(
  userId: string,
  xpEarned: number,
  lessonId?: string,
  extras: LessonExtras = {}
): Promise<Profile> {
  const { data: p, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error || !p) throw error ?? new Error('Profile not found.');
  const profile = p as Profile;
  const today = dayKey(new Date());
  const lastDay = profile.last_activity_at ? dayKey(new Date(profile.last_activity_at)) : null;
  const advance = advanceStreak({
    streak: profile.streak_count,
    freezes: profile.streak_freezes ?? 0,
    lastDay,
    today,
  });

  const gainedGems = Math.max(0, Math.floor(extras.gems ?? 0));
  const gainedFreezes = Math.max(0, Math.floor(extras.streakFreezes ?? 0));
  const patch: Record<string, number | string> = {
    xp: profile.xp + Math.max(0, xpEarned),
    streak_count: advance.streak,
    last_activity_at: new Date().toISOString(),
  };
  if (gainedGems > 0) patch.gems = (profile.gems ?? 0) + gainedGems;
  if (advance.usedFreezes > 0 || gainedFreezes > 0) {
    patch.streak_freezes = advance.freezes + gainedFreezes;
  }

  const { data, error: upError } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();
  if (upError || !data) throw upError ?? new Error('Could not save progress.');
  if (lessonId) {
    await supabase.from('lesson_completions').upsert({ user_id: userId, lesson_id: lessonId });
    track('lesson_completed', {
      lessonId,
      xp: Math.max(0, xpEarned),
      streak: advance.streak,
      gems: gainedGems,
      freezes: gainedFreezes,
    });
  }
  void logXpEvent(userId, Math.max(0, xpEarned));
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
