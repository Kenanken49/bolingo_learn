import type { LifeStageId } from './lifeStage';

/**
 * Typefaces per life stage, matching the adaptive wireframes:
 *   Explorer  — Baloo 2 everywhere (rounded, friendly).
 *   Launcher  — Bricolage Grotesque headings, Schibsted Grotesk body.
 *   Climber   — Fraunces headings, Instrument Sans body.
 * Font keys are the names registered with useFonts in the root layout.
 */
export const TIER_FONTS = {
  explorer: { 400: 'Baloo2_400Regular', 600: 'Baloo2_600SemiBold', 700: 'Baloo2_700Bold', 800: 'Baloo2_800ExtraBold', display: 'Baloo2_800ExtraBold' },
  launcher: { 400: 'SchibstedGrotesk_400Regular', 600: 'SchibstedGrotesk_600SemiBold', 700: 'SchibstedGrotesk_700Bold', 800: 'SchibstedGrotesk_800ExtraBold', display: 'BricolageGrotesque_800ExtraBold' },
  climber: { 400: 'InstrumentSans_400Regular', 600: 'InstrumentSans_600SemiBold', 700: 'InstrumentSans_700Bold', 800: 'InstrumentSans_700Bold', display: 'Fraunces_600SemiBold' },
} as const;

/** Text at or above this size, set bold, uses the tier's display face. */
export const DISPLAY_MIN_SIZE = 17;

export function faceFor(stage: LifeStageId, weight: 400 | 600 | 700 | 800, size: number | undefined): string {
  const f = TIER_FONTS[stage];
  if (weight >= 700 && (size ?? 0) >= DISPLAY_MIN_SIZE) return f.display;
  return f[weight];
}
