import { LIFE_STAGES, type LifeStageId } from './lifeStage';

/**
 * Course allocation + screen transitions per learning space.
 *
 * The dashboard keeps one literal IA (Sidebar/Home/Explore/…), but WHAT it
 * shows first and WHERE it sends each tier comes from here — never from
 * invented content. Space ids match LifeStage ids 1:1
 * (explorer 10–18, launcher 19–25, climber 26–40).
 *
 * Pure module (no React Native imports) so scripts/check-adaptive-ai.cjs
 * runs it under Node.
 */

export type SpaceId = LifeStageId;

/** Priority order of COURSES_META ids (lib/curriculum.ts) per space. */
export const SPACE_COURSE_ORDER: Record<SpaceId, string[]> = {
  // Tier 1 Gamified Explorer: languages first (playful pace), then creative
  // web building, then the heavier pro tracks last.
  explorer: ['aiml-explorer', 'lang', 'html', 'design', 'rwd', 'linux', 'certs', 'aiml-launcher', 'aiml-leader'],
  // Tier 2 Career Launcher: the full shelf in catalog order — university
  // supplements + first-job skills side by side.
  launcher: ['aiml-launcher', 'html', 'rwd', 'design', 'lang', 'certs', 'linux', 'aiml-explorer', 'aiml-leader'],
  // Tier 3 Career Ladder Climber: credentials first, bite-sized; languages
  // (long ongoing courses) last.
  climber: ['aiml-leader', 'certs', 'linux', 'rwd', 'design', 'html', 'lang', 'aiml-explorer', 'aiml-launcher'],
};

/** Certification tracks before language courses for climbers only. */
export function certsFirst(space: SpaceId): boolean {
  return space === 'climber';
}

/** Sort course ids by the space allocation; unknown ids sink to the end. */
export function orderCourseIds(ids: string[], space: SpaceId): string[] {
  const order = SPACE_COURSE_ORDER[space];
  return [...ids].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib);
  });
}

/** Session length, audio-first and celebration flags — mirrors lifeStage UX. */
export function spaceUx(space: SpaceId) {
  return LIFE_STAGES[space].ux;
}

/**
 * Primary destinations per tier — every href is a registered route in
 * src/app. The dashboard shell keeps its literal nav; hubs, schedule cards
 * and the Explore careers card steer each tier through THESE routes:
 *   Explorer — quest map, league, Squad Cup, avatar studio.
 *   Launcher — goal path, live study rooms, job marketplace, leagues.
 *   Climber  — today's five minutes, commute audio, certificates.
 */
export const SPACE_TRANSITIONS: Record<SpaceId, { label: string; href: string }[]> = {
  explorer: [
    { label: 'Quests', href: '/' },
    { label: 'Leagues', href: '/leaderboard' },
    { label: 'Squad', href: '/squad-cup' },
    { label: 'Avatar', href: '/avatar' },
  ],
  launcher: [
    { label: 'Path', href: '/' },
    { label: 'Rooms', href: '/study-rooms' },
    { label: 'Jobs', href: '/jobs' },
    { label: 'Leagues', href: '/leaderboard' },
  ],
  climber: [
    { label: 'Today', href: '/' },
    { label: 'Listen', href: '/audiobooks' },
    { label: 'Certificates', href: '/certifications' },
  ],
};

export function transitionsFor(space: SpaceId): { label: string; href: string }[] {
  return SPACE_TRANSITIONS[space];
}
