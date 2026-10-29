import { useTheme } from './theme';

/**
 * QD-OLED palette — true-black canvas with quantum-dot cyan, amber, magenta,
 * violet, and red. Light is a cool "quantum paper" companion, not a different
 * brand. Single source of truth for the hand-styled home screen; NativeWind
 * classes still cover legacy screens.
 */
export interface NaturalPalette {
  isDark: boolean;
  bg: string;
  surface: string;
  surfaceAlt: string;
  line: string;
  ink: string;
  muted: string;
  moss: string;
  mossSoft: string;
  mossDeep: string;
  honey: string;
  honeySoft: string;
  clay: string;
  berry: string;
  teal: string;
  sand: string;
  stone: string;
}

const LIGHT: NaturalPalette = {
  isDark: false,
  bg: '#F4F5FA',
  surface: '#FFFFFF',
  surfaceAlt: '#ECEDF6',
  line: '#DCDDE9',
  ink: '#0B0B14',
  muted: '#6C6C86',
  // Quantum-dot accents, darkened for readable contrast on light surfaces.
  moss: '#0089A8',
  mossSoft: '#00A9CC',
  mossDeep: '#003A47',
  honey: '#B36B00',
  honeySoft: '#D48A00',
  clay: '#D6008A',
  berry: '#D1002E',
  teal: '#6D35E6',
  sand: '#E7E8F4',
  stone: '#8A8AA0',
};

const DARK: NaturalPalette = {
  isDark: true,
  bg: '#000000',
  surface: '#06060A',
  surfaceAlt: '#0E0E16',
  line: '#1E1E2C',
  ink: '#F7F7FF',
  muted: '#9B9BB2',
  // QD-OLED primaries: cyan (done), amber (active), magenta/clay, red/berry,
  // violet/teal. Pure black stays black because OLED pixels are off.
  moss: '#00E5FF',
  mossSoft: '#7DF9FF',
  mossDeep: '#003A47',
  honey: '#FFC400',
  honeySoft: '#FFE066',
  clay: '#FF2DAA',
  berry: '#FF3B5C',
  teal: '#8B5CFF',
  sand: '#EDEDF8',
  stone: '#74748A',
};

export function useNatural(): NaturalPalette {
  const [theme] = useTheme();
  return theme === 'dark' ? DARK : LIGHT;
}
