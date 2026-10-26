import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env vars missing: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env (see .env.example).'
  );
}

/**
 * Route params arrive as strings (e.g. "45" from /quiz/45). The database
 * uses INTEGER lesson ids, so convert at the query boundary — exactly the
 * parseInt pattern: `parseInt(lessonIdString, 10)` before sending.
 * Throws on demo ids ('demo-html') — those never hit the database.
 */
export function toDbLessonId(lessonId: string): number {
  const n = parseInt(lessonId, 10);
  if (!Number.isInteger(n)) throw new Error(`Not a database lesson id: ${lessonId}`);
  return n;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
