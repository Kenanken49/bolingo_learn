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
  { id: 'html', name: 'Course 1 · Complete HTML', icon: '\u{1F310}', blurb: 'Duolingo path style — ⚡ bite-sized 2–5 min nodes, streaks, chests.' },
  { id: 'rwd', name: 'Course 2 · Responsive Web Design', icon: '\u{1F4D0}', blurb: 'freeCodeCamp style — ⚡ bite-sized 2–5 min lessons, workshops, labs, exam.' },
  { id: 'design', name: 'Course 3 · UI/UX Design for Developers', icon: '\u{1F3A8}', blurb: 'Design ecosystem — ⚡ bite-sized theory, Figma masterclasses, guides hub.' },
  { id: 'lang', name: 'Course 4 · World Languages & Chess', icon: '\u{1F30D}', blurb: 'Duolingo style — ⚡ bite-sized greetings, sentence building, chess basics.' },
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
        minutes: 3,
        xp: 10,
        lessonId: 'html-tags',
        lessonTitle: 'Basic HTML tags',
      },
      {
        id: 'hf-workshop-page',
        kind: 'workshop',
        title: 'Build a paragraph step by step',
        blurb: 'Guided build: assemble a real paragraph element token by token.',
        minutes: 4,
        xp: 20,
        lessonId: 'html-workshop-1',
        lessonTitle: 'Paragraph workshop',
      },
      {
        id: 'hf-lab-tags',
        kind: 'lab',
        title: 'Lab: tag user stories',
        blurb: 'Solo practice: satisfy the tag checklist without guidance.',
        minutes: 5,
        xp: 20,
        lessonId: 'html-lab-1',
        lessonTitle: 'Tag lab',
      },
      {
        id: 'hf-quiz',
        kind: 'quiz',
        title: 'HTML quiz',
        blurb: 'Check understanding before moving on — 80% to pass.',
        minutes: 2,
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
        minutes: 3,
        xp: 10,
        lessonId: 'html-links',
        lessonTitle: 'Links and images',
      },
      {
        id: 'he-workshop-attrs',
        kind: 'workshop',
        title: 'Attributes workshop',
        blurb: 'Guided build: src, ids, and labels step by step.',
        minutes: 4,
        xp: 20,
        lessonId: 'html-workshop-2',
        lessonTitle: 'Attributes workshop',
      },
      {
        id: 'he-lab-lists',
        kind: 'lab',
        title: 'Lab: lists',
        blurb: 'User stories: bullets, numbers, and full list builds.',
        minutes: 5,
        xp: 20,
        lessonId: 'html-lab-2',
        lessonTitle: 'Lists lab',
      },
      {
        id: 'he-quiz',
        kind: 'quiz',
        title: 'Elements quiz',
        blurb: 'Checkpoint: links, images, attributes, and lists.',
        minutes: 2,
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
        minutes: 3,
        xp: 10,
        lessonId: 'css-selectors',
        lessonTitle: 'CSS selectors',
      },
      {
        id: 'cf-workshop-box',
        kind: 'workshop',
        title: 'Box model workshop',
        blurb: 'Guided build: content, padding, border, margin.',
        minutes: 4,
        xp: 20,
        lessonId: 'css-workshop-1',
        lessonTitle: 'Box model workshop',
      },
      {
        id: 'cf-lab-style',
        kind: 'lab',
        title: 'Lab: style stories',
        blurb: 'Solo styling: one rule per story, right selector each time.',
        minutes: 5,
        xp: 20,
        lessonId: 'css-lab-1',
        lessonTitle: 'Style lab',
      },
      {
        id: 'cf-quiz',
        kind: 'quiz',
        title: 'CSS quiz',
        blurb: 'Checkpoint: selectors, declarations, and the box model.',
        minutes: 2,
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
        minutes: 3,
        xp: 10,
        lessonId: 'css-flexbox',
        lessonTitle: 'Flexbox essentials',
      },
      {
        id: 'rl-quiz',
        kind: 'quiz',
        title: 'Layout quiz',
        blurb: 'Final check: flexbox axes, direction, responsive thinking.',
        minutes: 2,
        xp: 30,
        lessonId: 'css-quiz-2',
        lessonTitle: 'Layout quiz',
      },
      {
        id: 'rl-project',
        kind: 'project',
        title: 'Certification project: tribute page',
        blurb: 'Capstone: heading, image list, and centered style from scratch.',
        minutes: 5,
        xp: 50,
        lessonId: 'rwd-project',
        lessonTitle: 'Tribute Page Project',
      },
    ],
  },
  {
    id: 'design-foundations',
    course: 'design',
    section: 'Section 1 · Design',
    title: 'Design Foundations',
    goal: 'Make interfaces readable, ordered, and human',
    color: 'bg-pink-500',
    icon: '\u{1F3A8}',
    blocks: [
      {
        id: 'df-lesson-hierarchy',
        kind: 'lesson',
        title: 'Visual hierarchy & contrast',
        blurb: 'Theory: ordering the eye and guaranteeing readability.',
        minutes: 3,
        xp: 10,
        lessonId: 'ux-hierarchy',
        lessonTitle: 'Visual hierarchy & contrast',
      },
      {
        id: 'df-workshop-scaling',
        kind: 'workshop',
        title: 'Scaling & alignment workshop',
        blurb: 'Guided build: grid rules, spacing scale, shared edges.',
        minutes: 4,
        xp: 20,
        lessonId: 'ux-scaling',
        lessonTitle: 'Scaling & alignment workshop',
      },
      {
        id: 'df-lab-centered',
        kind: 'lab',
        title: 'Lab: user-centered design',
        blurb: 'Solo practice: Fitts, Hick, and Jakob in code.',
        minutes: 5,
        xp: 20,
        lessonId: 'ux-user-centered',
        lessonTitle: 'User-centered design lab',
      },
      {
        id: 'df-quiz',
        kind: 'quiz',
        title: 'Design fundamentals quiz',
        blurb: 'Checkpoint: hierarchy, contrast, grids, behavior.',
        minutes: 2,
        xp: 30,
        lessonId: 'ux-quiz',
        lessonTitle: 'Design fundamentals quiz',
      },
      {
        id: 'df-project',
        kind: 'project',
        title: 'Capstone: accessible redesign',
        blurb: 'Rebuild a flat page with hierarchy, contrast, and 44px targets.',
        minutes: 5,
        xp: 50,
        lessonId: 'ux-redesign',
        lessonTitle: 'Accessible Redesign Project',
      },
    ],
  },
  {
    id: 'world-languages',
    course: 'lang',
    section: 'Section 1 · Languages & Chess',
    title: 'World Languages & Chess',
    goal: 'Greet the world — and mate the king',
    color: 'bg-teal-500',
    icon: '\u{1F30D}',
    blocks: [
      {
        id: 'wl-spanish',
        kind: 'lesson',
        title: 'Spanish basics',
        blurb: 'Greetings, gratitude, gender — ¡hola!',
        minutes: 4,
        xp: 20,
        lessonId: 'spanish-basics',
        lessonTitle: 'Spanish Basics',
      },
      {
        id: 'wl-french',
        kind: 'lesson',
        title: 'French basics',
        blurb: 'Bonjour, merci, and sentence building.',
        minutes: 4,
        xp: 20,
        lessonId: 'french-basics',
        lessonTitle: 'French Basics',
      },
      {
        id: 'wl-german',
        kind: 'lesson',
        title: 'German basics',
        blurb: 'Hallo, danke, and capitalised nouns.',
        minutes: 4,
        xp: 20,
        lessonId: 'german-basics',
        lessonTitle: 'German Basics',
      },
      {
        id: 'wl-swahili',
        kind: 'lesson',
        title: 'Swahili basics',
        blurb: 'Habari, asante, karibu — karibu sana!',
        minutes: 4,
        xp: 20,
        lessonId: 'swahili-basics',
        lessonTitle: 'Swahili Basics',
      },
      {
        id: 'wl-chess',
        kind: 'lesson',
        title: 'Chess basics',
        blurb: 'Duolingo Chess style: pieces, moves, notation.',
        minutes: 5,
        xp: 30,
        lessonId: 'chess-basics',
        lessonTitle: 'Chess Basics',
      },
    ],
  },
];

/** Flatten all blocks for progress lookups. */
export const ALL_BLOCKS: CurriculumBlock[] = CURRICULUM.flatMap((u) => u.blocks);

export function blockByLessonId(lessonId: string): CurriculumBlock | undefined {
  return ALL_BLOCKS.find((b) => b.lessonId === lessonId);
}
