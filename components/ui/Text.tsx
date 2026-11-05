import { forwardRef, type ComponentRef } from 'react';
import {
  StyleSheet,
  Text as RNText,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { useNatural } from '../../lib/natural';
import { useLifeStageSnapshot } from '../../lib/lifeStageStore';
import { faceFor } from '../../lib/tierType';

/**
 * Each life stage speaks its own typeface (lib/tierType.ts): Baloo 2 for
 * Explorers, Bricolage + Schibsted Grotesk for Launchers, Fraunces + Instrument
 * Sans for Climbers. Roboto remains the boot fallback face.
 *
 * React Native has no global font-family (each Text paints its own), so every
 * screen renders through this primitive. It picks the Roboto face that matches
 * the requested weight, and neutralises fontWeight afterwards so browsers and
 * iOS don't synthesise a second fake-bold on top of the real face.
 *
 * Escape hatches: an explicit `fontFamily` in `style` (e.g. the code editor's
 * monospace) and the `font-mono` utility class are left untouched.
 */
export const ROBOTO_REGULAR = 'Roboto_400Regular';
export const ROBOTO_SEMIBOLD = 'Roboto_600SemiBold';
export const ROBOTO_BOLD = 'Roboto_700Bold';
export const ROBOTO_EXTRABOLD = 'Roboto_800ExtraBold';

type Props = TextProps & { className?: string; onPhoto?: boolean };

type BaseProps = Props & { halo?: TextStyle };

/** A dark halo for labels that sit directly on the expedition photograph. */
const PHOTO_HALO: TextStyle = {
  textShadowColor: 'rgba(0, 0, 0, 0.92)',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 7,
};

function faceForWeight(weight: TextStyle['fontWeight'] | undefined): string {
  switch (weight) {
    case '600':
      return ROBOTO_SEMIBOLD;
    case '700':
    case 'bold':
      return ROBOTO_BOLD;
    case '800':
    case '900':
    case 'black':
      return ROBOTO_EXTRABOLD;
    default:
      return ROBOTO_REGULAR;
  }
}

/** Class weights live on the string until NativeWind resolves them, so read
 *  the utility names directly before deciding which face to load. */
function weightFor(styleWeight: TextStyle['fontWeight'] | undefined, className?: string): TextStyle['fontWeight'] | undefined {
  if (styleWeight) return styleWeight;
  const classes = ` ${className ?? ''} `;
  if (classes.includes(' font-black ')) return '900';
  if (classes.includes(' font-extrabold ')) return '800';
  if (classes.includes(' font-bold ')) return '700';
  if (classes.includes(' font-semibold ')) return '600';
  if (classes.includes(' font-duo ')) return '800';
  return undefined;
}

/** Large NativeWind text sizes, so class-styled headings get the display face. */
function sizeFromClass(classes: string): number | undefined {
  if (/ text-(2xl|3xl|4xl|5xl) /.test(classes)) return 24;
  if (classes.includes(' text-xl ')) return 20;
  if (classes.includes(' text-lg ')) return 18;
  return undefined;
}

const BaseText = forwardRef<ComponentRef<typeof RNText>, BaseProps>(function BaseText(
  { style, className, halo, onPhoto: _onPhoto, ...rest },
  ref,
) {
  const stage = useLifeStageSnapshot();
  const flat = StyleSheet.flatten(style as StyleProp<TextStyle>) as TextStyle | undefined;
  const classes = ` ${className ?? ''} `;
  // Monospace is intentional: code, diffs and chips keep their own face.
  if (flat?.fontFamily || classes.includes(' font-mono ')) {
    return <RNText ref={ref} className={className} style={[style, halo]} {...rest} />;
  }
  const roboto = faceForWeight(weightFor(flat?.fontWeight, className));
  // No stage yet: the original Roboto look, matching the original palette.
  const numeric = roboto === ROBOTO_EXTRABOLD ? 800 : roboto === ROBOTO_BOLD ? 700 : roboto === ROBOTO_SEMIBOLD ? 600 : 400;
  const face = stage ? faceFor(stage, numeric, flat?.fontSize ?? sizeFromClass(classes)) : roboto;
  return (
    <RNText
      ref={ref}
      className={className}
      style={[style, { fontFamily: face, fontWeight: '400' }, halo]}
      {...rest}
    />
  );
});

/**
 * Text that floats directly on the expedition photograph. It picks up a dark
 * halo in dark mode so dim labels survive bright foliage; the light canvas
 * washes the photo to paper, so it needs no halo there.
 */
const PhotoText = forwardRef<ComponentRef<typeof RNText>, Props>(function PhotoText(
  { onPhoto: _onPhoto, ...rest },
  ref,
) {
  const p = useNatural();
  return <BaseText ref={ref} {...rest} halo={p.isDark ? PHOTO_HALO : undefined} />;
});

const Text = forwardRef<ComponentRef<typeof RNText>, Props>(function Text({ onPhoto, ...rest }, ref) {
  if (onPhoto) return <PhotoText ref={ref} {...rest} />;
  return <BaseText ref={ref} {...rest} />;
});

export default Text;
