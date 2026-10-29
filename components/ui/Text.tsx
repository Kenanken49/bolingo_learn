import { forwardRef, type ComponentRef } from 'react';
import {
  StyleSheet,
  Text as RNText,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from 'react-native';

/**
 * The platform speaks one typeface: Roboto.
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

type Props = TextProps & { className?: string };

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

const Text = forwardRef<ComponentRef<typeof RNText>, Props>(function Text(
  { style, className, ...rest },
  ref,
) {
  const flat = StyleSheet.flatten(style as StyleProp<TextStyle>) as TextStyle | undefined;
  const classes = ` ${className ?? ''} `;
  // Monospace is intentional: code, diffs and chips keep their own face.
  if (flat?.fontFamily || classes.includes(' font-mono ')) {
    return <RNText ref={ref} className={className} style={style} {...rest} />;
  }
  const face = faceForWeight(weightFor(flat?.fontWeight, className));
  return (
    <RNText
      ref={ref}
      className={className}
      style={[style, { fontFamily: face, fontWeight: '400' }]}
      {...rest}
    />
  );
});

export default Text;
