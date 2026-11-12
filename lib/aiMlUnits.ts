/**
 * AI & ML Academy — learning-path units.
 *
 * The blueprint is 3 tiers × 20 modules. Each tier becomes four units of five
 * modules, and each module contributes four sequential blocks:
 *
 *   notes → workshop → lab → quiz
 *
 * Blocks are ordered by dependency: you read the ten submodule notes, build the
 * workshop steps, run the lab, then prove mastery. Locking is handled by the
 * existing sequential path in src/app/index.tsx, so nothing here needs new
 * state.
 */

import type { CurriculumBlock, CurriculumUnit } from './curriculum';
import { AI_ML_MODULES, AI_ML_TIER_META, type AiTierId } from './tracks/ai-ml';

const CHUNKS: { title: string; goal: string }[] = [
  { title: 'Weeks 1–2 · Foundations', goal: 'The concepts everything later depends on.' },
  { title: 'Weeks 3–4 · Core Models', goal: 'Fit, compare and evaluate real models.' },
  { title: 'Weeks 5–6 · Modern Systems', goal: 'Deep learning, language, generation and agents.' },
  { title: 'Weeks 7–8 · Scale & Delivery', goal: 'Ship it, measure it, defend it.' },
];

const COLORS: Record<AiTierId, string> = {
  'aiml-explorer': 'bg-violet-500',
  'aiml-launcher': 'bg-cyan-500',
  'aiml-leader': 'bg-amber-600',
};

const SECTION: Record<AiTierId, string> = {
  'aiml-explorer': 'Course 7 · AI & ML Academy · Explorer',
  'aiml-launcher': 'Course 8 · AI & ML Academy · Launcher',
  'aiml-leader': 'Course 9 · AI & ML Academy · Leader',
};

function moduleBlocks(moduleId: string, title: string, goal: string, workshopTitle: string): CurriculumBlock[] {
  return [
    {
      id: `${moduleId}-b-notes`,
      kind: 'lesson',
      title,
      blurb: goal,
      minutes: 5,
      xp: 20,
      lessonId: `${moduleId}-notes`,
      lessonTitle: `${title} — notes`,
    },
    {
      id: `${moduleId}-b-workshop`,
      kind: 'workshop',
      title: workshopTitle,
      blurb: 'Guided: build the decisions in order, one step at a time.',
      minutes: 4,
      xp: 20,
      lessonId: `${moduleId}-workshop`,
      lessonTitle: `${workshopTitle} — workshop`,
    },
    {
      id: `${moduleId}-b-lab`,
      kind: 'lab',
      title: `${title} · lab`,
      blurb: 'Runnable: write the function and pass real assertions.',
      minutes: 10,
      xp: 30,
      lessonId: `${moduleId}-lab`,
      lessonTitle: `${title} — lab`,
    },
    {
      id: `${moduleId}-b-quiz`,
      kind: 'quiz',
      title: `${title} · quiz`,
      blurb: 'Mastery check: 80% first-try, including a typed production task.',
      minutes: 5,
      xp: 40,
      lessonId: `${moduleId}-quiz`,
      lessonTitle: `${title} — quiz`,
    },
  ];
}

export const AI_ML_UNITS: CurriculumUnit[] = AI_ML_TIER_META.flatMap((tier) => {
  const modules = AI_ML_MODULES[tier.id];
  const units: CurriculumUnit[] = [];
  for (let start = 0; start < modules.length; start += 5) {
    const slice = modules.slice(start, start + 5);
    const index = start / 5;
    const chunk = CHUNKS[index] ?? { title: `Modules ${start + 1}–${start + slice.length}`, goal: tier.blurb };
    units.push({
      id: `${tier.id}-u${index + 1}`,
      course: tier.id,
      section: SECTION[tier.id],
      title: chunk.title,
      goal: chunk.goal,
      color: COLORS[tier.id],
      icon: tier.icon,
      blocks: slice.flatMap((mod) =>
        moduleBlocks(mod.id, mod.title, mod.goal, mod.workshop.title)
      ),
    });
  }
  return units;
});

/** Every AI/ML lesson id — used by the gate and by docs to count coverage. */
export const AI_ML_LESSON_IDS = AI_ML_UNITS.flatMap((unit) =>
  unit.blocks.filter((block) => block.kind !== 'project').map((block) => block.lessonId)
);
