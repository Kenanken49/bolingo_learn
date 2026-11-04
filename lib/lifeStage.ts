/**
 * Adaptive UI/UX engine — one app, three life stages.
 *
 * A 10-year-old and a 40-year-old should not get the same home screen. The
 * learner picks an age (or a stage directly) once; every adaptive surface
 * then reads a single `StageProfile` instead of branching on age itself.
 *
 * Pure module: no React Native imports, so `scripts/check-adaptive-ai.cjs`
 * runs it under Node. Persistence lives in `lib/lifeStageStore.ts`.
 */

export type LifeStageId = 'explorer' | 'launcher' | 'climber';

/** Inclusive age band the stage is designed for. */
export const MIN_AGE = 10;
export const MAX_AGE = 40;

/** Something a stage hub can show. `status` keeps unfinished ideas honest. */
export interface HubItem {
  id: string;
  title: string;
  blurb: string;
  icon: string;
  /** Route that exists today; omitted for items not built yet. */
  href?: string;
  status: 'live' | 'soon';
}

export interface StageProfile {
  id: LifeStageId;
  /** Tier number from the blueprint (1–3). */
  tier: 1 | 2 | 3;
  name: string;
  ages: [number, number];
  tagline: string;
  focus: string[];
  /** How the UI behaves for this stage. */
  ux: {
    /** Streaks, chests, confetti, mascots front and centre. */
    gamification: 'high' | 'medium' | 'low';
    /** Card density: roomy for kids, compact for busy adults. */
    density: 'roomy' | 'balanced' | 'compact';
    /** Default lesson length in minutes when the learner hasn't chosen one. */
    sessionMinutes: number;
    /** Audio-first: surface listen-only modes for commutes. */
    audioFirst: boolean;
    /** Celebration animations after a lesson. */
    celebrations: boolean;
    /** Accent colour (hex) for stage-specific surfaces. */
    accent: string;
  };
  /** Ordered items for the stage hub on the home screen. */
  hub: HubItem[];
  /** Onboarding goal ids (lib/onboarding.ts GOALS) to suggest first. */
  suggestedGoals: string[];
}

export const LIFE_STAGES: Record<LifeStageId, StageProfile> = {
  explorer: {
    id: 'explorer',
    tier: 1,
    name: 'Gamified Explorer',
    ages: [10, 18],
    tagline: 'School subjects as quests. Earn XP, open chests, beat your friends.',
    focus: ['School curriculum (STEM, languages)', 'Test prep', 'Foundational skills'],
    ux: {
      gamification: 'high',
      density: 'roomy',
      sessionMinutes: 10,
      audioFirst: false,
      celebrations: true,
      accent: '#F59E0B',
    },
    hub: [
      { id: 'questline', title: 'Story questline', blurb: 'Follow the Path. Every unit is a chapter with a boss quiz at the end.', icon: 'map', href: '/', status: 'live' },
      { id: 'league', title: 'Weekly league', blurb: 'Climb the XP league against learners like you.', icon: 'trophy', href: '/leaderboard', status: 'live' },
      { id: 'labs', title: 'STEM labs', blurb: 'Hands-on coding and Linux labs that run on your device.', icon: 'flask', href: '/labs', status: 'live' },
      { id: 'tournaments', title: 'Squad Cup', blurb: 'Live team quiz battles with a private squad code.', icon: 'zap', href: '/squad-cup', status: 'live' },
      { id: 'avatars', title: 'Avatar studio', blurb: 'Dress a 3D-tilt avatar with items you earn by learning.', icon: 'user', href: '/avatar', status: 'live' },
    ],
    suggestedGoals: ['lang', 'rwd', 'code'],
  },
  launcher: {
    id: 'launcher',
    tier: 2,
    name: 'Career Launcher',
    ages: [19, 25],
    tagline: 'University support, first-job skills and a portfolio you can show.',
    focus: ['University supplements', 'First-time job skills', 'Portfolios', 'Professional networking'],
    ux: {
      gamification: 'medium',
      density: 'balanced',
      sessionMinutes: 15,
      audioFirst: false,
      celebrations: true,
      accent: '#0EA5E9',
    },
    hub: [
      { id: 'certs', title: 'Certifications', blurb: 'Structured tracks that end in a certificate.', icon: 'medal', href: '/certifications', status: 'live' },
      { id: 'portfolio', title: 'Portfolio projects', blurb: 'Build real projects in the labs to show employers.', icon: 'briefcase', href: '/labs', status: 'live' },
      { id: 'uploads', title: 'Study from your notes', blurb: 'Turn lecture notes into lessons and revision packs.', icon: 'upload', href: '/uploads', status: 'live' },
      { id: 'rooms', title: 'Live study rooms', blurb: 'Drop into a room and focus with peers on one shared timer.', icon: 'users', href: '/study-rooms', status: 'live' },
      { id: 'jobs', title: 'Job marketplace', blurb: 'Roles matched to the certifications you have earned.', icon: 'briefcase', href: '/jobs', status: 'live' },
    ],
    suggestedGoals: ['code', 'rwd', 'linux'],
  },
  climber: {
    id: 'climber',
    tier: 3,
    name: 'Career Ladder Climber',
    ages: [26, 40],
    tagline: 'Bite-sized reskilling that fits around work. Listen on the commute.',
    focus: ['Professional reskilling', 'Management training', 'Executive certificates', 'Productivity'],
    ux: {
      gamification: 'low',
      density: 'compact',
      sessionMinutes: 5,
      audioFirst: true,
      celebrations: false,
      accent: '#10B981',
    },
    hub: [
      { id: 'audio', title: 'Commute mode', blurb: 'Audio-only lessons and audiobooks. No screen needed.', icon: 'headset', href: '/audiobooks', status: 'live' },
      { id: 'certs', title: 'Professional certificates', blurb: 'Pick up a credential in 5-minute sessions.', icon: 'gradCap', href: '/certifications', status: 'live' },
      { id: 'roleplay', title: 'Workplace roleplay', blurb: 'Practise real conversations with an AI partner.', icon: 'chat', href: '/roleplay', status: 'live' },
      { id: 'management', title: 'Management track', blurb: 'Leadership and team-management micro-courses.', icon: 'users', status: 'soon' },
    ],
    suggestedGoals: ['code', 'linux', 'lang'],
  },
};

export const LIFE_STAGE_ORDER: LifeStageId[] = ['explorer', 'launcher', 'climber'];

export function isLifeStageId(value: unknown): value is LifeStageId {
  return value === 'explorer' || value === 'launcher' || value === 'climber';
}

/**
 * Map an age to a stage. Ages outside 10–40 clamp to the nearest stage so
 * a 9-year-old or a 45-year-old still gets a sensible default; bad input
 * returns null so the caller asks again.
 */
export function stageForAge(age: number): LifeStageId | null {
  if (!Number.isFinite(age) || age < 5 || age > 120) return null;
  const a = Math.floor(age);
  if (a <= 18) return 'explorer';
  if (a <= 25) return 'launcher';
  return 'climber';
}

/** Parse a typed age ("17", " 23 ") into a stage. */
export function stageForAgeInput(raw: string): LifeStageId | null {
  const trimmed = raw.trim();
  if (!/^\d{1,3}$/.test(trimmed)) return null;
  return stageForAge(Number(trimmed));
}

export function stageProfile(id: LifeStageId | null | undefined): StageProfile {
  return LIFE_STAGES[isLifeStageId(id) ? id : 'launcher'];
}

/** Hub items that already exist in the app (route present). */
export function liveHubItems(id: LifeStageId): HubItem[] {
  return LIFE_STAGES[id].hub.filter((item) => item.status === 'live' && !!item.href);
}
