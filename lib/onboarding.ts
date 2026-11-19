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
 * - Quiz/diamonds intros: contextual coach marks shown exactly once, at the
 *   moment the user first meets the mechanic.
 * - Pending guest result: a guest's first-lesson XP waiting to be saved to
 *   their account when they sign up.
 */

const K_GOAL = 'bolingo.goal';
const K_ONBOARDED = 'bolingo.onboarded';
const K_QUIZ_INTRO = 'bolingo.quizIntroSeen';
const K_QUIZ_INTRO_LANG = 'bolingo.quizIntroSeen.lang';
const K_DIAMONDS_INTRO = 'bolingo.diamondsIntroSeen';
const K_PENDING = 'bolingo.pendingGuestResult';

export const GOALS = [
  { id: 'rwd', label: 'Responsive Web Design', icon: 'globe' },
  { id: 'code', label: 'Programming Languages', icon: 'code' },
  { id: 'linux', label: 'Learn Linux OS', icon: 'linux' },
  { id: 'lang', label: 'Learn Languages', icon: 'chat' },
  { id: 'explore', label: 'Explore', icon: 'eye' },
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
  if (g === 'rwd' || g === 'code' || g === 'linux' || g === 'lang' || g === 'explore') return g;
  // Migrate legacy goals from the 3-option picker.
  if (g === 'websites' || g === 'style') return 'rwd';
  return null;
}

export async function setGoal(goal: GoalId): Promise<void> {
  await set(K_GOAL, goal);
}

export function goalLabel(goal: GoalId | null): string {
  return GOALS.find((g) => g.id === goal)?.label ?? 'Explore';
}

/** Maps an onboarding goal to its Duo-style course on the Path. */
export function goalToCourse(goal: GoalId | null): string | null {
  if (goal === 'rwd') return 'rwd';
  if (goal === 'code') return 'certs';
  if (goal === 'linux') return 'linux';
  if (goal === 'lang') return 'lang';
  return null;
}

export async function hasOnboarded(): Promise<boolean> {
  return (await get(K_ONBOARDED)) === '1';
}

export async function markOnboarded(): Promise<void> {
  await set(K_ONBOARDED, '1');
}

/** Coach marks are per track: Zora introduces code lessons, Livia introduces
 *  language lessons, so a learner meets the right guide in each domain. */
export type QuizTrack = 'code' | 'lang';

export async function hasSeenQuizIntro(track: QuizTrack = 'code'): Promise<boolean> {
  return (await get(track === 'lang' ? K_QUIZ_INTRO_LANG : K_QUIZ_INTRO)) === '1';
}

export async function markQuizIntroSeen(track: QuizTrack = 'code'): Promise<void> {
  await set(track === 'lang' ? K_QUIZ_INTRO_LANG : K_QUIZ_INTRO, '1');
}

export async function hasSeenDiamondsIntro(): Promise<boolean> {
  return (await get(K_DIAMONDS_INTRO)) === '1';
}

export async function markDiamondsIntroSeen(): Promise<void> {
  await set(K_DIAMONDS_INTRO, '1');
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

/** Play-first entry: first uncompleted block inside the goal's course. Falls
 *  back to the global next-up when the goal is Explore or its course is done. */
export function firstBlockForGoal(goal: GoalId | null, completed: Set<string>): CurriculumBlock | null {
  const course = goalToCourse(goal);
  if (course) {
    for (const unit of CURRICULUM) {
      if (unit.course !== course) continue;
      for (const b of unit.blocks) {
        if (!completed.has(b.lessonId) && !completed.has(b.id)) return b;
      }
    }
  }
  return nextUpBlock(completed);
}
