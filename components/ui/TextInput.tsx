import { forwardRef, type ComponentRef } from 'react';
import {
  StyleSheet,
  TextInput as RNTextInput,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from 'react-native';

import { ROBOTO_BOLD, ROBOTO_EXTRABOLD, ROBOTO_REGULAR, ROBOTO_SEMIBOLD } from './Text';

/**
 * Inputs are part of the type system too: search boxes, chat composers and
 * code fields otherwise fall back to the OS face while the labels around them
 * are Roboto. Same face matching as `Text`, same monospace escape hatch.
 */
type Props = TextInputProps & { className?: string };

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

function weightFor(styleWeight: TextStyle['fontWeight'] | undefined, className?: string): TextStyle['fontWeight'] | undefined {
  if (styleWeight) return styleWeight;
  const classes = ` ${className ?? ''} `;
  if (classes.includes(' font-black ')) return '900';
  if (classes.includes(' font-extrabold ')) return '800';
  if (classes.includes(' font-bold ')) return '700';
  if (classes.includes(' font-semibold ')) return '600';
  return undefined;
}

const TextInput = forwardRef<ComponentRef<typeof RNTextInput>, Props>(function TextInput(
  { style, className, ...rest },
  ref,
) {
  const flat = StyleSheet.flatten(style as StyleProp<TextStyle>) as TextStyle | undefined;
  const classes = ` ${className ?? ''} `;
  if (flat?.fontFamily || classes.includes(' font-mono ')) {
    return <RNTextInput ref={ref} className={className} style={style} {...rest} />;
  }
  const face = faceForWeight(weightFor(flat?.fontWeight, className));
  return (
    <RNTextInput
      ref={ref}
      className={className}
      style={[style, { fontFamily: face, fontWeight: '400' }]}
      {...rest}
    />
  );
});

export default TextInput;
