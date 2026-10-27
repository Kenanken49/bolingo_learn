/**
 * Curriculum model — merges freeCodeCamp's Responsive Web Design v9 module
 * structure (lessons → workshops → labs → review → quiz → certification
 * project) onto Duolingo-style path units. Each block routes into the
 * existing quiz engine; unknown lessonIds fall back to demo questions.
 */

export type BlockKind = 'lesson' | 'workshop' | 'lab' | 'review' | 'quiz' | 'project';

export interface CurriculumBlock {
  id: string;
  kind: BlockKind;
  title: string;
  blurb: string;
  minutes: number;
  xp: number;
  /** quiz route lessonId + title */
  lessonId: string;
  lessonTitle: string;
}

export interface CurriculumUnit {
  id: string;
  section: string;
  title: string;
  goal: string;
  color: string;
  icon: string;
  blocks: CurriculumBlock[];
}

export const KIND_META: Record<BlockKind, { label: string; icon: string; color: string }> = {
  lesson: { label: 'Lesson', icon: '\u{1F4D6}', color: 'bg-sky-100 text-sky-700' },
  workshop: { label: 'Workshop', icon: '\u{1F6E0}\uFE0F', color: 'bg-blue-100 text-blue-700' },
  lab: { label: 'Lab', icon: '\u{1F9EA}', color: 'bg-purple-100 text-purple-700' },
  review: { label: 'Review', icon: '\u{1F4DD}', color: 'bg-amber-100 text-amber-700' },
  quiz: { label: 'Quiz', icon: '\u{1F3C6}', color: 'bg-green-100 text-green-700' },
  project: { label: 'Project', icon: '\u{1F3D7}\uFE0F', color: 'bg-orange-100 text-orange-700' },
};

export const CURRICULUM: CurriculumUnit[] = [
  {
    id: 'html-foundations',
    section: 'Section 1 · HTML',
    title: 'HTML Foundations',
    goal: 'Describe pages with semantic tags',
    color: 'bg-green-500',
    icon: '\u{1F310}',
    blocks: [
      {
        id: 'hf-lesson-tags',
        kind: 'lesson',
        title: 'Basic HTML tags',
        blurb: 'Theory first: paragraphs, headings, and nesting — with live examples.',
        minutes: 10,
        xp: 10,
        lessonId: 'demo-html',
        lessonTitle: 'HTML Basics',
      },
      {
        id: 'hf-workshop-page',
        kind: 'workshop',
        title: 'Build a paragraph step by step',
        blurb: 'Guided build: assemble a real paragraph element token by token.',
        minutes: 15,
        xp: 20,
        lessonId: 'demo-html',
        lessonTitle: 'HTML Basics',
      },
      {
        id: 'hf-lab-tags',
        kind: 'lab',
        title: 'Lab: tag user stories',
        blurb: 'Solo practice: satisfy the tag checklist without guidance.',
        minutes: 15,
        xp: 20,
        lessonId: 'demo-html',
        lessonTitle: 'HTML Basics',
      },
      {
        id: 'hf-quiz',
        kind: 'quiz',
        title: 'HTML quiz',
        blurb: 'Check understanding before moving on — 80% to pass.',
        minutes: 5,
        xp: 30,
        lessonId: 'demo-html',
        lessonTitle: 'HTML Basics',
      },
    ],
  },
  {
    id: 'code-foundations',
    section: 'Section 1 · JavaScript',
    title: 'Code Foundations',
    goal: 'Declare data with const and let',
    color: 'bg-blue-500',
    icon: '\u{1F4BB}',
    blocks: [
      {
        id: 'cf-lesson-const',
        kind: 'lesson',
        title: 'Constants with const',
        blurb: 'Theory: why constants beat loose variables.',
        minutes: 10,
        xp: 10,
        lessonId: 'demo-code',
        lessonTitle: 'Code Basics',
      },
      {
        id: 'cf-workshop-div',
        kind: 'workshop',
        title: 'Wrap content in containers',
        blurb: 'Guided build: nest a paragraph inside a div.',
        minutes: 15,
        xp: 20,
        lessonId: 'demo-code',
        lessonTitle: 'Code Basics',
      },
      {
        id: 'cf-lab-nesting',
        kind: 'lab',
        title: 'Lab: nesting user stories',
        blurb: 'Solo practice: build the full div > p chain.',
        minutes: 15,
        xp: 20,
        lessonId: 'demo-code',
        lessonTitle: 'Code Basics',
      },
      {
        id: 'cf-quiz',
        kind: 'quiz',
        title: 'Code quiz',
        blurb: 'Mixed check: keywords plus full assembly.',
        minutes: 5,
        xp: 30,
        lessonId: 'demo-code',
        lessonTitle: 'Code Basics',
      },
    ],
  },
  {
    id: 'responsive-layout',
    section: 'Section 2 · CSS',
    title: 'Responsive Layout',
    goal: 'Make pages adapt to any screen',
    color: 'bg-purple-500',
    icon: '\u{1F4D0}',
    blocks: [
      {
        id: 'rl-lesson-flex',
        kind: 'lesson',
        title: 'Flexbox essentials',
        blurb: 'Theory: rows, columns, and wrapping.',
        minutes: 10,
        xp: 10,
        lessonId: 'demo-code',
        lessonTitle: 'Code Basics',
      },
      {
        id: 'rl-review',
        kind: 'review',
        title: 'Module review',
        blurb: 'All concepts in one page — study sheet for the quiz.',
        minutes: 5,
        xp: 10,
        lessonId: 'demo-html',
        lessonTitle: 'HTML Basics',
      },
      {
        id: 'rl-quiz',
        kind: 'quiz',
        title: 'Layout quiz',
        blurb: 'Final check for this unit.',
        minutes: 5,
        xp: 30,
        lessonId: 'demo-code',
        lessonTitle: 'Code Basics',
      },
      {
        id: 'rl-project',
        kind: 'project',
        title: 'Certification project: tribute page',
        blurb: 'Capstone: assemble a full page from scratch.',
        minutes: 30,
        xp: 50,
        lessonId: 'demo-html',
        lessonTitle: 'Tribute Page Project',
      },
    ],
  },
];

/** Flatten all blocks for progress lookups. */
export const ALL_BLOCKS: CurriculumBlock[] = CURRICULUM.flatMap((u) => u.blocks);

export function blockByLessonId(lessonId: string): CurriculumBlock | undefined {
  return ALL_BLOCKS.find((b) => b.lessonId === lessonId);
}
