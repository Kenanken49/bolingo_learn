/**
 * Curriculum model — merges freeCodeCamp's Responsive Web Design v9 module
 * structure (lessons → workshops → labs → review → quiz → certification
 * project) onto Duolingo-style path units. Every block points at a real
 * lesson bank in lib/courses.ts — no demo placeholders.
 */

export type BlockKind = 'lesson' | 'workshop' | 'lab' | 'review' | 'quiz' | 'project';

export interface CurriculumBlock {
  id: string;
  kind: BlockKind;
  title: string;
  blurb: string;
  minutes: number;
  xp: number;
  /** quiz route lessonId + title — must match a key in lib/courses.ts */
  lessonId: string;
  lessonTitle: string;
}

export interface CurriculumUnit {
  id: string;
  /** Groups units under a Duo-style course header on the Path */
  course: string;
  section: string;
  title: string;
  goal: string;
  color: string;
  icon: string;
  blocks: CurriculumBlock[];
}

export const COURSES_META = [
  { id: 'html', name: 'Course 1 · Complete HTML', icon: '\u{1F310}', blurb: 'Duolingo path style — nodes, streaks, chests.' },
  { id: 'rwd', name: 'Course 2 · Responsive Web Design', icon: '\u{1F4D0}', blurb: 'freeCodeCamp style — lessons, workshops, labs, exam.' },
];

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
    course: 'html',
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
        lessonId: 'html-tags',
        lessonTitle: 'Basic HTML tags',
      },
      {
        id: 'hf-workshop-page',
        kind: 'workshop',
        title: 'Build a paragraph step by step',
        blurb: 'Guided build: assemble a real paragraph element token by token.',
        minutes: 15,
        xp: 20,
        lessonId: 'html-workshop-1',
        lessonTitle: 'Paragraph workshop',
      },
      {
        id: 'hf-lab-tags',
        kind: 'lab',
        title: 'Lab: tag user stories',
        blurb: 'Solo practice: satisfy the tag checklist without guidance.',
        minutes: 15,
        xp: 20,
        lessonId: 'html-lab-1',
        lessonTitle: 'Tag lab',
      },
      {
        id: 'hf-quiz',
        kind: 'quiz',
        title: 'HTML quiz',
        blurb: 'Check understanding before moving on — 80% to pass.',
        minutes: 5,
        xp: 30,
        lessonId: 'html-quiz-1',
        lessonTitle: 'HTML quiz',
      },
    ],
  },
  {
    id: 'html-elements',
    course: 'html',
    section: 'Section 2 · HTML',
    title: 'Links, Images & Lists',
    goal: 'Connect pages and structure content',
    color: 'bg-blue-500',
    icon: '\u{1F517}',
    blocks: [
      {
        id: 'he-lesson-links',
        kind: 'lesson',
        title: 'Links and images',
        blurb: 'Anchors, attributes, and void elements — with accessibility built in.',
        minutes: 10,
        xp: 10,
        lessonId: 'html-links',
        lessonTitle: 'Links and images',
      },
      {
        id: 'he-workshop-attrs',
        kind: 'workshop',
        title: 'Attributes workshop',
        blurb: 'Guided build: src, ids, and labels step by step.',
        minutes: 15,
        xp: 20,
        lessonId: 'html-workshop-2',
        lessonTitle: 'Attributes workshop',
      },
      {
        id: 'he-lab-lists',
        kind: 'lab',
        title: 'Lab: lists',
        blurb: 'User stories: bullets, numbers, and full list builds.',
        minutes: 15,
        xp: 20,
        lessonId: 'html-lab-2',
        lessonTitle: 'Lists lab',
      },
      {
        id: 'he-quiz',
        kind: 'quiz',
        title: 'Elements quiz',
        blurb: 'Checkpoint: links, images, attributes, and lists.',
        minutes: 5,
        xp: 30,
        lessonId: 'html-quiz-2',
        lessonTitle: 'Elements quiz',
      },
    ],
  },
  {
    id: 'css-foundations',
    course: 'rwd',
    section: 'Section 1 · CSS',
    title: 'CSS Foundations',
    goal: 'Style pages with rules and boxes',
    color: 'bg-purple-500',
    icon: '\u{1F3A8}',
    blocks: [
      {
        id: 'cf-lesson-selectors',
        kind: 'lesson',
        title: 'CSS selectors',
        blurb: 'Theory: rules, selectors, declarations — the styling skeleton.',
        minutes: 10,
        xp: 10,
        lessonId: 'css-selectors',
        lessonTitle: 'CSS selectors',
      },
      {
        id: 'cf-workshop-box',
        kind: 'workshop',
        title: 'Box model workshop',
        blurb: 'Guided build: content, padding, border, margin.',
        minutes: 15,
        xp: 20,
        lessonId: 'css-workshop-1',
        lessonTitle: 'Box model workshop',
      },
      {
        id: 'cf-lab-style',
        kind: 'lab',
        title: 'Lab: style stories',
        blurb: 'Solo styling: one rule per story, right selector each time.',
        minutes: 15,
        xp: 20,
        lessonId: 'css-lab-1',
        lessonTitle: 'Style lab',
      },
      {
        id: 'cf-quiz',
        kind: 'quiz',
        title: 'CSS quiz',
        blurb: 'Checkpoint: selectors, declarations, and the box model.',
        minutes: 5,
        xp: 30,
        lessonId: 'css-quiz-1',
        lessonTitle: 'CSS quiz',
      },
    ],
  },
  {
    id: 'responsive-layout',
    course: 'rwd',
    section: 'Section 2 · CSS',
    title: 'Responsive Layout',
    goal: 'Make pages adapt to any screen',
    color: 'bg-orange-500',
    icon: '\u{1F4D0}',
    blocks: [
      {
        id: 'rl-lesson-flex',
        kind: 'lesson',
        title: 'Flexbox essentials',
        blurb: 'Theory: rows, columns, axes, and gaps.',
        minutes: 10,
        xp: 10,
        lessonId: 'css-flexbox',
        lessonTitle: 'Flexbox essentials',
      },
      {
        id: 'rl-quiz',
        kind: 'quiz',
        title: 'Layout quiz',
        blurb: 'Final check: flexbox axes, direction, responsive thinking.',
        minutes: 5,
        xp: 30,
        lessonId: 'css-quiz-2',
        lessonTitle: 'Layout quiz',
      },
      {
        id: 'rl-project',
        kind: 'project',
        title: 'Certification project: tribute page',
        blurb: 'Capstone: heading, image list, and centered style from scratch.',
        minutes: 30,
        xp: 50,
        lessonId: 'rwd-project',
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
