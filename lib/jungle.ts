/**
 * BOLINGO — JUNGLE EXPEDITION
 *
 * One bioluminescent rainforest, fifteen habitats. Every screen owns a bird
 * and a quantum-dot accent pair so the product feels like a single expedition
 * with distinct camps along the trail, not a set of unrelated pages.
 *
 * The backdrop is decorative only: no data, no network, no new dependency.
 */

export type JungleScreenKey =
  | 'trail'
  | 'river'
  | 'glade'
  | 'ridge'
  | 'market'
  | 'lagoon'
  | 'camp'
  | 'basecamp'
  | 'summit'
  | 'trailhead'
  | 'falls'
  | 'grove'
  | 'hollow'
  | 'temple'
  | 'spring';

export interface JungleTheme {
  key: JungleScreenKey;
  /** Emoji is intentional: it renders as a full-colour bird on native + web. */
  bird: string;
  species: string;
  habitat: string;
  /** Main quantum-dot accent for glows, rules and active states. */
  accent: string;
  /** Companion accent for the second light source. */
  secondary: string;
  /** Deep leaf tint used in the dark canopy. */
  canopy: string;
  tagline: string;
}

export const JUNGLE: Record<JungleScreenKey, JungleTheme> = {
  trail: {
    key: 'trail',
    bird: '🦜',
    species: 'Kea',
    habitat: 'Canopy Trail',
    accent: '#B6FF00',
    secondary: '#00E5FF',
    canopy: '#0B2408',
    tagline: 'Follow the fireflies to your next lesson.',
  },
  river: {
    key: 'river',
    bird: '🐦',
    species: 'Kingfisher',
    habitat: 'River Run',
    accent: '#00E5FF',
    secondary: '#7CFFB2',
    canopy: '#042027',
    tagline: 'Dive clean, answer sharp, keep the current.',
  },
  glade: {
    key: 'glade',
    bird: '🦚',
    species: 'Bird of Paradise',
    habitat: 'Victory Glade',
    accent: '#FF2DAA',
    secondary: '#FFC400',
    canopy: '#260018',
    tagline: 'The clearing is yours. Make it loud.',
  },
  ridge: {
    key: 'ridge',
    bird: '🦅',
    species: 'Harpy Eagle',
    habitat: 'Emerald Ridge',
    accent: '#B6FF00',
    secondary: '#8B5CFF',
    canopy: '#12200A',
    tagline: 'Climb the league. The ridge remembers.',
  },
  market: {
    key: 'market',
    bird: '🦜',
    species: 'Hornbill',
    habitat: 'Word Market',
    accent: '#FFC400',
    secondary: '#FF7A00',
    canopy: '#241A04',
    tagline: 'Every word is a trade. Collect the rare ones.',
  },
  lagoon: {
    key: 'lagoon',
    bird: '🦩',
    species: 'Crane',
    habitat: 'Design Lagoon',
    accent: '#FF2DAA',
    secondary: '#00E5FF',
    canopy: '#260019',
    tagline: 'Build interfaces the rainforest would keep.',
  },
  camp: {
    key: 'camp',
    bird: '🦉',
    species: 'Lyrebird',
    habitat: 'Campfire Circle',
    accent: '#FF7A00',
    secondary: '#FF2DAA',
    canopy: '#261203',
    tagline: 'Find your voice around the fire.',
  },
  basecamp: {
    key: 'basecamp',
    bird: '🕊️',
    species: 'Nightjar',
    habitat: 'Basecamp',
    accent: '#8B5CFF',
    secondary: '#00E5FF',
    canopy: '#150A29',
    tagline: 'Tune the expedition to the way you learn.',
  },
  summit: {
    key: 'summit',
    bird: '🦚',
    species: 'Peacock',
    habitat: 'Summit Pass',
    accent: '#FFC400',
    secondary: '#8B5CFF',
    canopy: '#241D04',
    tagline: 'Unlock the whole mountain.',
  },
  trailhead: {
    key: 'trailhead',
    bird: '🐦',
    species: 'Sunbird',
    habitat: 'Trailhead Gate',
    accent: '#FF2DAA',
    secondary: '#FFC400',
    canopy: '#260015',
    tagline: 'One sign-in, and the trail stays yours.',
  },
  falls: {
    key: 'falls',
    bird: '🕊️',
    species: 'Swift',
    habitat: 'Mistfall',
    accent: '#00E5FF',
    secondary: '#B6FF00',
    canopy: '#042026',
    tagline: 'Drop a file. Watch the mist turn it into a lesson.',
  },
  grove: {
    key: 'grove',
    bird: '🦜',
    species: 'Quetzal',
    habitat: "Scholar's Grove",
    accent: '#7CFF6B',
    secondary: '#FF2DAA',
    canopy: '#0A240D',
    tagline: 'Read the grove. Then walk it.',
  },
  hollow: {
    key: 'hollow',
    bird: '🐦',
    species: 'Woodpecker',
    habitat: "Builder's Hollow",
    accent: '#FF7A00',
    secondary: '#B6FF00',
    canopy: '#261203',
    tagline: 'Ship something the forest can stand on.',
  },
  temple: {
    key: 'temple',
    bird: '🦩',
    species: 'Ibis',
    habitat: 'Sun Temple',
    accent: '#FFC400',
    secondary: '#FF3B5C',
    canopy: '#241A04',
    tagline: 'Proof you crossed the whole trail.',
  },
  spring: {
    key: 'spring',
    bird: '🐦',
    species: 'Hummingbird',
    habitat: 'Heart Spring',
    accent: '#FF2DAA',
    secondary: '#7CFF6B',
    canopy: '#260018',
    tagline: 'Refill, then fly again.',
  },
};

export const JUNGLE_KEYS = Object.keys(JUNGLE) as JungleScreenKey[];

/** Expo Router pathname → the habitat that owns that screen. */
export function themeForPath(pathname: string | null | undefined): JungleTheme {
  const path = pathname ?? '/';
  if (path === '/' || path === '') return JUNGLE.trail;
  if (path.includes('/quiz')) return JUNGLE.river;
  if (path.includes('/results')) return JUNGLE.glade;
  if (path.includes('/leaderboard')) return JUNGLE.ridge;
  if (path.includes('/dictionary')) return JUNGLE.market;
  if (path.includes('/design')) return JUNGLE.lagoon;
  if (path.includes('/roleplay')) return JUNGLE.camp;
  if (path.includes('/settings')) return JUNGLE.basecamp;
  if (path.includes('/paywall')) return JUNGLE.summit;
  if (path.includes('/auth')) return JUNGLE.trailhead;
  if (path.includes('/uploads')) return JUNGLE.falls;
  if (path.includes('/curriculum')) return JUNGLE.grove;
  if (path.includes('/project')) return JUNGLE.hollow;
  if (path.includes('/certifications')) return JUNGLE.temple;
  if (path.includes('/refill')) return JUNGLE.spring;
  return JUNGLE.trail;
}

/** Stable 0–14 index, used to vary the canopy layout per habitat. */
export function themeIndex(key: JungleScreenKey): number {
  return Math.max(0, JUNGLE_KEYS.indexOf(key));
}
