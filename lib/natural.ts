import { useTheme } from './theme';
import { useLifeStageSnapshot } from './lifeStageStore';
import type { LifeStageId } from './lifeStage';

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

/**
 * Life-stage palettes from the adaptive wireframes. Same roles as above, so
 * every screen re-themes without changes: moss = done/primary, honey =
 * active/CTA (always carries dark ink), clay/berry = warm/alert, teal = info.
 *   Explorer — night-violet quest board, sunrise gold, lagoon green.
 *   Launcher — warm paper, ink, focus blue, ledger green.
 *   Climber  — stone paper, forest ink, sage and brass.
 * Learners without a stage keep the original QD-OLED palette.
 */
export const TIER_PALETTES: Record<LifeStageId, { light: NaturalPalette; dark: NaturalPalette }> = {
  explorer: {
    light: { isDark: false, bg: '#F6F1FF', surface: '#FFFFFF', surfaceAlt: '#EEE6FF', line: '#DCCEF7', ink: '#24134C', muted: '#6B5A96', moss: '#1C9E7C', mossSoft: '#38C6A0', mossDeep: '#24134C', honey: '#FFC94D', honeySoft: '#FFDB80', clay: '#E0662A', berry: '#E0335F', teal: '#2C8FD6', sand: '#FFF0C7', stone: '#9286B5' },
    dark: { isDark: true, bg: '#170C33', surface: '#24134C', surfaceAlt: '#2E1A5E', line: '#3D2A75', ink: '#FFF6EA', muted: '#C9BCE8', moss: '#38C6A0', mossSoft: '#7FE3C6', mossDeep: '#170C33', honey: '#FFC94D', honeySoft: '#FFE08A', clay: '#FF8A3D', berry: '#FF4F7B', teal: '#4FD8FF', sand: '#FFF6EA', stone: '#8C7FB8' },
  },
  launcher: {
    light: { isDark: false, bg: '#F3EFE7', surface: '#FFFFFF', surfaceAlt: '#E9E2D4', line: '#D5CEC1', ink: '#161A22', muted: '#5B6170', moss: '#0F9D7A', mossSoft: '#2BD67B', mossDeep: '#161A22', honey: '#F2C14E', honeySoft: '#F7D885', clay: '#E0663A', berry: '#C8342A', teal: '#3B6CF6', sand: '#EDE7DC', stone: '#8B8F99' },
    dark: { isDark: true, bg: '#12151C', surface: '#1A1F29', surfaceAlt: '#222837', line: '#2C3342', ink: '#EDE7DC', muted: '#9AA1B2', moss: '#2BD67B', mossSoft: '#7BE8AE', mossDeep: '#161A22', honey: '#F2C14E', honeySoft: '#F7D885', clay: '#E0663A', berry: '#FF5A5A', teal: '#6F95FF', sand: '#EDE7DC', stone: '#6E7587' },
  },
  climber: {
    light: { isDark: false, bg: '#EEEAE1', surface: '#F8F6F1', surfaceAlt: '#E4DFD4', line: '#D4CFC3', ink: '#1E241F', muted: '#6A7268', moss: '#4F8A6C', mossSoft: '#6FA58A', mossDeep: '#1E241F', honey: '#C9B37E', honeySoft: '#DCCB9F', clay: '#A85B37', berry: '#A8373A', teal: '#3F6F5C', sand: '#E8E2D6', stone: '#8A9187' },
    dark: { isDark: true, bg: '#141714', surface: '#1C201C', surfaceAlt: '#242924', line: '#2F362F', ink: '#EEEAE1', muted: '#9AA597', moss: '#8FBFA5', mossSoft: '#B5D6C3', mossDeep: '#1E241F', honey: '#C9B37E', honeySoft: '#DCCB9F', clay: '#D08A5E', berry: '#E06A6A', teal: '#6FA58A', sand: '#E8E2D6', stone: '#737C71' },
  },
};

export function useNatural(): NaturalPalette {
  const [theme] = useTheme();
  const stage = useLifeStageSnapshot();
  if (stage) return TIER_PALETTES[stage][theme === 'dark' ? 'dark' : 'light'];
  return theme === 'dark' ? DARK : LIGHT;
}
