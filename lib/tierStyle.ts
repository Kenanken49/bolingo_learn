import { LIFE_STAGES, type LifeStageId } from './lifeStage';
import { useLifeStageSnapshot } from './lifeStageStore';

/**
 * Visual tokens per life stage, so one screen can look playful at 12,
 * clean at 22 and minimal at 34. Read through `useTierStyle()`; learners
 * with no stage yet get the Explorer look (the guest default).
 */
export interface TierStyle {
  stage: LifeStageId;
  accent: string;
  /** Path node diameter (active node is +12). */
  nodeSize: number;
  /** Corner radius as a fraction of node size (0.5 = circle). */
  nodeRound: number;
  /** Chunky 3D bottom edge on buttons and nodes. */
  depth: number;
  /** Horizontal wiggle of the path; 0 = straight column. */
  wind: number;
  /** Show mascots and START bubbles. */
  playful: boolean;
  /** Tab labels shown under icons. */
  tabLabels: boolean;
}

export const TIER_STYLES: Record<LifeStageId, TierStyle> = {
  explorer: { stage: 'explorer', accent: LIFE_STAGES.explorer.ux.accent, nodeSize: 64, nodeRound: 0.5, depth: 5, wind: 1, playful: true, tabLabels: true },
  launcher: { stage: 'launcher', accent: LIFE_STAGES.launcher.ux.accent, nodeSize: 56, nodeRound: 0.5, depth: 3, wind: 0.6, playful: false, tabLabels: true },
  climber: { stage: 'climber', accent: LIFE_STAGES.climber.ux.accent, nodeSize: 46, nodeRound: 0.3, depth: 0, wind: 0, playful: false, tabLabels: false },
};

export function useTierStyle(): TierStyle {
  return TIER_STYLES[useLifeStageSnapshot() ?? 'explorer'];
}
