/**
 * UI/UX Design Ecosystem — video masterclasses + publication guides.
 * Theory lessons live in lib/courses.ts (ux-*) and the Path curriculum;
 * this file powers the Design Hub: YouTube masterclasses for tool practice
 * and bundled foundational guides for offline reading.
 */

export interface DesignVideo {
  id: string;
  title: string;
  author: string;
  hours: number;
  url: string;
  topics: string[];
  builds: string[];
}

export const DESIGN_VIDEOS: DesignVideo[] = [
  {
    id: 'figma-6h',
    title: 'Learn Figma for UI/UX Design',
    author: 'Wish Naik · freeCodeCamp',
    hours: 6,
    // Verified via YouTube oEmbed: freeCodeCamp.org, "Learn Figma in 6
    // Hours – Full Course for 2026" (Wish Naik's course per freeCodeCamp
    // News, May 2026). Never a search URL — those land on random videos.
    url: 'https://www.youtube.com/watch?v=mT_Jjn8RJdo',
    topics: ['Auto-layout', 'Components', 'Constraints', 'Dynamic design assets', 'High-fidelity prototyping'],
    builds: ['Travel app', 'Food delivery layout', 'Car dealership website'],
  },
  {
    id: 'figma-10h',
    title: 'UI Design with Figma',
    author: 'Joseph Brendan · freeCodeCamp',
    hours: 10,
    // Verified via YouTube oEmbed: freeCodeCamp.org, "Figma Tutorial for
    // UI Design - Course for Beginners" (Joseph Brendan's 10-hour course
    // per freeCodeCamp News, Jan 2022).
    url: 'https://www.youtube.com/watch?v=jwCmIBJ8Jtc',
    topics: ['Design trees', 'Color styling systems', 'Typography scaling', "Jakob's Law of User UX"],
    builds: ['Design system from scratch', 'Styled component library', 'Full app mockup'],
  },
];

export interface DesignGuide {
  id: string;
  icon: string;
  title: string;
  blurb: string;
  minutes: number;
  body: string[];
}

export const DESIGN_GUIDES: DesignGuide[] = [
  {
    id: 'ux-vs-ui',
    icon: '⚖️',
    title: 'UX vs UI: the structural guide',
    blurb: 'How things work (UX logic) vs how things look (UI visuals) — and why developers need both.',
    minutes: 4,
    body: [
      'UX (user experience) is how things WORK: the flow from landing to checkout, whether users find what they need, and how it feels to get there. UI (user interface) is how things LOOK: colors, typography, spacing, buttons, icons.',
      'Think of a house: UX is the floor plan — where rooms sit, how you move between them. UI is the paint, fixtures, and finishes. A beautiful house with a maze layout still frustrates; a sensible layout with peeling paint still disappoints.',
      'As a developer you ship both whether you study design or not — every default style is a UI decision, every form order is a UX decision. Learning the vocabulary turns accidental choices into deliberate ones.',
      'Rule of thumb: fix UX first (can users complete the task?), then polish UI (does it feel clear and trustworthy?). Test with one real user before restyling — watching someone struggle for 30 seconds teaches more than any article.',
    ],
  },
  {
    id: 'wireframes',
    icon: '📐',
    title: 'Wireframes: think in boxes first',
    blurb: 'Low-fidelity skeletons that settle structure before anyone argues about colors.',
    minutes: 3,
    body: [
      'A wireframe is a grayscale skeleton of a screen: boxes for images, lines for text, X marks for media. No colors, no real copy, no polish — structure only.',
      'Why wireframe first: it is 10× cheaper to move a box than to rebuild a styled page. Teams align on layout and content priority before investing in visuals.',
      'Start on paper or a whiteboard: one rectangle per screen, label each block (nav, hero, proof, CTA, footer). Then go mid-fidelity in Figma with real spacing and alignment — still grayscale.',
      'Checklist for every wireframe: one clear primary action per screen, headline → supporting detail order, consistent margins, and thumb-reach placement for the main button on mobile.',
    ],
  },
  {
    id: 'user-flows',
    icon: '🔀',
    title: 'User flows: map the journey',
    blurb: 'Boxes and arrows that expose dead ends, loops, and drop-offs before you code them.',
    minutes: 3,
    body: [
      'A user flow maps every step between entry and goal: screens as boxes, decisions as diamonds, arrows as movement. Example: landing → signup → onboarding → first lesson → streak saved.',
      'Draw the happy path first, then the sad paths: wrong password, empty state, lost hearts, offline. Each sad path needs a designed recovery — not a dead end.',
      'Look for friction: steps that can be removed, choices that can be defaulted, and places users must remember something from two screens ago. Fewer steps + clearer cues = higher completion.',
      'Developer payoff: a flow doubles as your navigation spec. Every arrow is a route, every diamond is a conditional render, every box is a screen component.',
    ],
  },
  {
    id: 'sitemaps',
    icon: '🗺️',
    title: 'Sitemaps: structure the whole site',
    blurb: 'The bird-eye tree of pages that keeps navigation shallow and predictable.',
    minutes: 2,
    body: [
      'A sitemap is the hierarchy of every page: home at top, sections beneath, detail pages at the leaves. It answers "what exists and where does it live?" in one glance.',
      'Keep it shallow: users should reach anything in 3 taps or fewer. If a page sits 5 levels deep, promote it or merge it upward.',
      'Build it with the team before coding routes: each sitemap node becomes a route, each branch a nav section. Mismatches between sitemap and nav are the #1 source of "lost" pages.',
      'Revisit quarterly: dead pages accumulate like clutter. If analytics show nobody visits a branch, prune it or link it from where users actually go.',
    ],
  },
];
