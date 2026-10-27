import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

/** One ranked row from get_weekly_leaderboard(). Leagues hold 30 users each. */
export interface BoardRow {
  user_id: string;
  username: string;
  weekly_xp: number;
  rank: number;
  league: number;
}

export const LEAGUE_SIZE = 30;
const CACHE_KEY = 'bolingo.weeklyBoard';
const CACHE_TTL_MS = 3600 * 1000;

const LEAGUE_NAMES = [
  'Diamond',
  'Gold',
  'Silver',
  'Bronze',
  'Copper',
  'Iron',
  'Stone',
  'Wood',
  'Seed',
  'Sprout',
];

/** Human name for a 1-based league number (League 11+ fall back to "League N"). */
export function leagueName(league: number): string {
  return LEAGUE_NAMES[league - 1] ?? `League ${league}`;
}

interface Cached {
  at: number;
  rows: BoardRow[];
}

/**
 * Weekly board (Monday reset), cached for 1 hour client-side so the Path and
 * leaderboard screens never hammer the database. Falls back to stale cache
 * when offline; throws only when nothing is cached at all.
 */
export async function getWeeklyBoard(force = false): Promise<BoardRow[]> {
  let stale: BoardRow[] | null = null;
  if (!force) {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as Cached;
        if (Date.now() - cached.at < CACHE_TTL_MS) return cached.rows;
        stale = cached.rows;
      }
    } catch {}
  }
  const { data, error } = await supabase.rpc('get_weekly_leaderboard', { p_limit: 300 });
  if (error || !data) {
    if (stale) return stale;
    throw error ?? new Error('Leaderboard unavailable.');
  }
  const rows = (data as BoardRow[]).map((r) => ({ ...r, weekly_xp: Number(r.weekly_xp) }));
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), rows } satisfies Cached));
  } catch {}
  return rows;
}

/** Rows sharing the given user's league (empty when the user has no weekly XP yet). */
export function leagueMates(rows: BoardRow[], userId: string | null): BoardRow[] {
  if (!userId) return [];
  const me = rows.find((r) => r.user_id === userId);
  if (!me) return [];
  return rows.filter((r) => r.league === me.league);
}
