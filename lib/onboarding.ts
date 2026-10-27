import AsyncStorage from '@react-native-async-storage/async-storage';
import { CURRICULUM, type CurriculumBlock } from './curriculum';
import { completeLesson } from './progress';

/**
 * Inverted-onboarding + micro-onboarding state (all on-device, works for
 * guests before they ever create an account).
 *
 * - Goal: picked on first run, personalizes the Up-next card.
 * - Onboarded: flipped once a guest starts/finishes their first lesson —
 *   the "play first" half of play-first-profile-second.
 * - Quiz/hearts intros: contextual coach marks shown exactly once, at the
 *   moment the user first meets the mechanic.
 * - Pending guest result: a guest's first-lesson XP waiting to be saved to
 *   their account when they sign up.
 */

const K_GOAL = 'bolingo.goal';
const K_ONBOARDED = 'bolingo.onboarded';
const K_QUIZ_INTRO = 'bolingo.quizIntroSeen';
const K_HEARTS_INTRO = 'bolingo.heartsIntroSeen';
const K_PENDING = 'bolingo.pendingGuestResult';

export const GOALS = [
  { id: 'websites', icon: '🌐', label: 'Build websites' },
  { id: 'style', icon: '🎨', label: 'Style pages' },
  { id: 'explore', icon: '👀', label: 'Just exploring' },
] as const;

export type GoalId = (typeof GOALS)[number]['id'];

async function get(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function set(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {}
}

export async function getGoal(): Promise<GoalId | null> {
  const g = await get(K_GOAL);
  return g === 'websites' || g === 'style' || g === 'explore' ? g : null;
}

export async function setGoal(goal: GoalId): Promise<void> {
  await set(K_GOAL, goal);
}

export function goalLabel(goal: GoalId | null): string {
  return GOALS.find((g) => g.id === goal)?.label ?? 'Learn to code';
}

export async function hasOnboarded(): Promise<boolean> {
  return (await get(K_ONBOARDED)) === '1';
}

export async function markOnboarded(): Promise<void> {
  await set(K_ONBOARDED, '1');
}

export async function hasSeenQuizIntro(): Promise<boolean> {
  return (await get(K_QUIZ_INTRO)) === '1';
}

export async function markQuizIntroSeen(): Promise<void> {
  await set(K_QUIZ_INTRO, '1');
}

export async function hasSeenHeartsIntro(): Promise<boolean> {
  return (await get(K_HEARTS_INTRO)) === '1';
}

export async function markHeartsIntroSeen(): Promise<void> {
  await set(K_HEARTS_INTRO, '1');
}

/** A guest's unsaved first-lesson result (XP rescue on signup). */
export interface PendingGuestResult {
  lessonId: string;
  title: string;
  xpEarned: number;
  at: number;
}

export async function savePendingGuestResult(r: PendingGuestResult): Promise<void> {
  await set(K_PENDING, JSON.stringify(r));
}

export async function getPendingGuestResult(): Promise<PendingGuestResult | null> {
  try {
    const raw = await get(K_PENDING);
    if (!raw) return null;
    const r = JSON.parse(raw) as PendingGuestResult;
    // Stale after 7 days — a week-old guest XP should not surprise anyone.
    if (!r || Date.now() - r.at > 7 * 86400 * 1000) return null;
    return r;
  } catch {
    return null;
  }
}

export async function clearPendingGuestResult(): Promise<void> {
  try {
    await AsyncStorage.removeItem(K_PENDING);
  } catch {}
}

/**
 * Profile-second payoff: move a guest's stashed first-lesson XP onto their
 * new account (best-effort — a failed rescue never blocks sign-in).
 * Returns the claimed result so callers can celebrate it.
 */
export async function claimPendingGuestResult(userId: string): Promise<PendingGuestResult | null> {
  const pending = await getPendingGuestResult();
  if (!pending || pending.xpEarned <= 0) return null;
  try {
    await completeLesson(userId, pending.xpEarned, pending.lessonId);
  } catch {
    return null;
  }
  await clearPendingGuestResult();
  return pending;
}

/**
 * Snake-UI guidance: the single next thing to do — the first uncompleted
 * block across the curriculum in path order. Null when everything is done.
 */
export function nextUpBlock(completed: Set<string>): CurriculumBlock | null {
  for (const unit of CURRICULUM) {
    for (const b of unit.blocks) {
      if (!completed.has(b.lessonId) && !completed.has(b.id)) return b;
    }
  }
  return null;
}
