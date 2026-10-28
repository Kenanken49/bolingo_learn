/**
 * Kiki v3 persistence: device-first, Supabase-synced, never blocking.
 *
 * Guests keep a full local brain (AsyncStorage). Signed-in learners sync it
 * to public.kiki_profiles (best-effort upsert, throttled) so the 40-dim
 * profile follows them across devices. Every failure path falls back to
 * memory — the lesson never waits for the brain.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { blankState, recordAttempt, type ItemFeatures, type KikiState, type SkillId } from './kiki';

const KEY = 'kiki-v3';
const REMOTE_THROTTLE_MS = 15_000;

let state: KikiState = blankState();
let userId: string | null = null;
let lastRemoteSave = 0;

async function readLocal(): Promise<KikiState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KikiState;
    if (!parsed || typeof parsed !== 'object' || !parsed.skills) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeLocal(): Promise<void> {
  try {
    state.savedAt = Date.now();
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* memory-only */
  }
}

async function readRemote(uid: string): Promise<KikiState | null> {
  try {
    const { data, error } = await supabase
      .from('kiki_profiles')
      .select('vector,updated_at')
      .eq('user_id', uid)
      .maybeSingle();
    if (error || !data) return null;
    const v = (data as { vector?: unknown }).vector as KikiState | null;
    return v && typeof v === 'object' && (v as KikiState).skills ? (v as KikiState) : null;
  } catch {
    return null;
  }
}

async function writeRemote(uid: string): Promise<void> {
  try {
    await supabase.from('kiki_profiles').upsert({
      user_id: uid,
      vector: state,
      updated_at: new Date().toISOString(),
    });
    lastRemoteSave = Date.now();
  } catch {
    /* next throttle window retries */
  }
}

/** Load the brain for this user (null = guest). Newest wins: local vs remote. */
export async function loadKiki(uid: string | null): Promise<void> {
  userId = uid;
  try {
    const local = await readLocal();
    if (local) state = local;
    if (uid) {
      const remote = await readRemote(uid);
      const remoteAt = (remote?.savedAt ?? 0) as number;
      const localAt = (local?.savedAt ?? 0) as number;
      if (remote && remoteAt >= localAt) state = remote;
      if (!remote) void writeRemote(uid);
    }
  } catch {
    /* blank brain */
  }
}

export function getKikiState(): KikiState {
  return state;
}

/** Grade one attempt through Kiki v3 (prediction + update + throttled sync). */
export function kikiAttempt(skill: SkillId, key: string, correct: boolean, f?: ItemFeatures): { p: number } {
  const out = recordAttempt(state, skill, key, correct, Date.now(), f);
  void writeLocal();
  if (userId && Date.now() - lastRemoteSave > REMOTE_THROTTLE_MS) void writeRemote(userId);
  return out;
}

/** Flush pending state now (call on lesson finish). */
export async function flushKiki(): Promise<void> {
  await writeLocal();
  if (userId) await writeRemote(userId);
}
