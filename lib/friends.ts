import { supabase } from './supabase';

/**
 * Community engine (Duolingo social pattern: follow friends, compete on
 * weekly XP, high-five milestones). Follow-model: adding is one-way, so no
 * request/accept round-trip stalls mobile users.
 *
 * Privacy is least-privilege by construction: usernames resolve through the
 * `search_users_by_name` definer (id + username only — never xp/premium),
 * and friends' weekly XP flows through the friends-scoped xp_events policy.
 */

export interface FriendRow {
  user_id: string;
  username: string;
  weekly_xp: number;
  kudos_count: number;
}

export interface UserSearchHit {
  user_id: string;
  username: string;
}

const WEEK_MS = 7 * 86400 * 1000;

/** Monday 00:00 UTC — matches the weekly-league reset. */
export function weekStartISO(now = new Date()): string {
  const d = new Date(now);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString();
}

/** Prefix username search (min 2 chars to keep it cheap). Best-effort: [] on error. */
export async function searchUsers(prefix: string): Promise<UserSearchHit[]> {
  const q = prefix.trim();
  if (q.length < 2) return [];
  try {
    const { data, error } = await supabase.rpc('search_users_by_name', { prefix: q });
    if (error || !data) return [];
    return (data as UserSearchHit[]).filter((r) => r.username);
  } catch {
    return [];
  }
}

/** Follow a user by exact username. Throws human-readable errors. */
export async function addFriend(me: string, username: string): Promise<void> {
  const hits = await searchUsers(username.trim());
  const target = hits.find((h) => h.username.toLowerCase() === username.trim().toLowerCase());
  if (!target) throw new Error('No learner found with that username.');
  if (target.user_id === me) throw new Error('That is you — no self-follows!');
  const { error } = await supabase.from('friendships').insert({ user_id: me, friend_id: target.user_id });
  if (error) {
    if ((error as { code?: string }).code === '23505') throw new Error('Already following this learner.');
    throw new Error('Could not add friend — check your connection.');
  }
}

/** Unfollow. Never blocks UI. */
export async function removeFriend(me: string, friendId: string): Promise<void> {
  const { error } = await supabase.from('friendships').delete().eq('user_id', me).eq('friend_id', friendId);
  if (error) throw error;
}

/** High-five a friend (records one kudos row). */
export async function sendKudos(me: string, friendId: string): Promise<void> {
  const { error } = await supabase.from('kudos').insert({ from_user: me, to_user: friendId });
  if (error) throw error;
}

/**
 * Friends board: friends + kudos via one RPC, then weekly XP summed
 * client-side from the friends-visible xp_events rows (friends are few,
 * so per-friend weekly sums stay cheap).
 */
export async function getFriendsBoard(me: string): Promise<FriendRow[]> {
  const { data, error } = await supabase.rpc('get_friends');
  if (error || !data) throw error ?? new Error('Friends unavailable.');
  const base = data as Array<{ user_id: string; username: string; kudos_count: number | string }>;
  if (base.length === 0) return [];
  const ids = base.map((f) => f.user_id);
  const { data: xp } = await supabase
    .from('xp_events')
    .select('user_id,xp')
    .in('user_id', ids)
    .gte('created_at', weekStartISO());
  const sums = new Map<string, number>();
  for (const row of (xp as Array<{ user_id: string; xp: number }> | null) ?? []) {
    sums.set(row.user_id, (sums.get(row.user_id) ?? 0) + Number(row.xp));
  }
  void me;
  return base.map((f) => ({
    user_id: f.user_id,
    username: f.username,
    weekly_xp: sums.get(f.user_id) ?? 0,
    kudos_count: Number(f.kudos_count),
  }));
}
