import type { LifeStageId } from './lifeStage';

/**
 * The bottom menu per life stage, from the adaptive wireframes. Each tier
 * gets the destinations its reward loop runs through:
 *   Explorer — quest map, league, Squad Cup, avatar studio (WF-T1-01).
 *   Launcher — goal path, live study rooms, job match (WF-T2-01).
 *   Climber  — today's five minutes, commute audio, certificates (WF-T3-01).
 * Profile (which holds Settings and sign-in) is the last tab for everyone.
 * Shop stays reachable from the plan badge in the Learn header.
 *
 * Pure module: `scripts/check-adaptive-ai.cjs` runs it under Node and checks
 * every href is a real route.
 */
export interface MenuTab {
  label: string;
  /** AppIcon name. */
  icon: string;
  href: string;
}

const PROFILE: MenuTab = { label: 'Profile', icon: 'user', href: '/settings' };

/** Learners who haven't picked a stage keep the original four tabs. */
export const DEFAULT_TABS: MenuTab[] = [
  { label: 'Learn', icon: 'home', href: '/' },
  { label: 'Leagues', icon: 'trophy', href: '/leaderboard' },
  { label: 'Shop', icon: 'crown', href: '/paywall' },
  PROFILE,
];

export const TIER_TABS: Record<LifeStageId, MenuTab[]> = {
  explorer: [
    { label: 'Quests', icon: 'map', href: '/' },
    { label: 'Leagues', icon: 'trophy', href: '/leaderboard' },
    { label: 'Squad', icon: 'users', href: '/squad-cup' },
    { label: 'Avatar', icon: 'star', href: '/avatar' },
    PROFILE,
  ],
  launcher: [
    { label: 'Path', icon: 'target', href: '/' },
    { label: 'Rooms', icon: 'users', href: '/study-rooms' },
    { label: 'Jobs', icon: 'briefcase', href: '/jobs' },
    { label: 'Leagues', icon: 'trophy', href: '/leaderboard' },
    PROFILE,
  ],
  climber: [
    { label: 'Today', icon: 'home', href: '/' },
    { label: 'Listen', icon: 'headset', href: '/audiobooks' },
    { label: 'Certificates', icon: 'gradCap', href: '/certifications' },
    PROFILE,
  ],
};

export function tabsFor(stage: LifeStageId | null): MenuTab[] {
  return stage ? TIER_TABS[stage] : DEFAULT_TABS;
}

/** Whether `path` (from usePathname) is inside the tab. "/" only matches home. */
export function isTabActive(tab: MenuTab, path: string): boolean {
  if (tab.href === '/') return path === '/';
  return path === tab.href || path.startsWith(`${tab.href}/`);
}
