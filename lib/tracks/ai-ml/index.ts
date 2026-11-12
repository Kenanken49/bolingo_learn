/**
 * AI & ML Academy — tier registry.
 *
 * Three courses from one blueprint:
 *   aiml-explorer  ages 10–18, gamified foundations
 *   aiml-launcher  ages 19–25, maths → deployment
 *   aiml-leader    ages 26–40, enterprise strategy and verticals
 *
 * Each tier is 20 modules × 4 banks (notes, workshop, lab, quiz). The banks are
 * compiled from the authored module records so every note, question and test
 * traces back to one file that can be reviewed.
 */

import { buildTier } from './build';
import { EXPLORER_A } from './explorer-a';
import { EXPLORER_B } from './explorer-b';
import { EXPLORER_C } from './explorer-c';
import { LAUNCHER_A } from './launcher-a';
import { LAUNCHER_B } from './launcher-b';
import { LEADER_A } from './leader-a';
import { LEADER_B } from './leader-b';
import type { AiModule } from './build';

export type AiTierId = 'aiml-explorer' | 'aiml-launcher' | 'aiml-leader';

export const AI_ML_MODULES: Record<AiTierId, AiModule[]> = {
  'aiml-explorer': [...EXPLORER_A, ...EXPLORER_B, ...EXPLORER_C],
  'aiml-launcher': [...LAUNCHER_A, ...LAUNCHER_B],
  'aiml-leader': [...LEADER_A, ...LEADER_B],
};

export const AI_ML_COURSES = Object.fromEntries(
  Object.entries(AI_ML_MODULES).flatMap(([tier, modules]) =>
    Object.entries(buildTier(modules)).map(([id, lesson]) => [id, lesson])
  )
);

export const AI_ML_TIER_META: { id: AiTierId; name: string; icon: string; blurb: string; hours: string }[] = [
  {
    id: 'aiml-explorer',
    name: 'Course 7 · AI & ML Academy · Explorer',
    icon: '\u{1F9EA}',
    blurb: '20 modules × 10 submodules — data, regression, trees, vision, language and ethics, with a runnable lab each.',
    hours: '~40h',
  },
  {
    id: 'aiml-launcher',
    name: 'Course 8 · AI & ML Academy · Launcher',
    icon: '\u{1F4C8}',
    blurb: 'Maths, pipelines, ensembles, deep learning, MLOps and fine-tuning — portfolio-grade labs and interview prep.',
    hours: '~80h',
  },
  {
    id: 'aiml-leader',
    name: 'Course 9 · AI & ML Academy · Leader',
    icon: '\u{1F3DB}\uFE0F',
    blurb: 'Enterprise strategy, governance, cost and vertical playbooks — case studies an executive can defend.',
    hours: '~50h',
  },
];
