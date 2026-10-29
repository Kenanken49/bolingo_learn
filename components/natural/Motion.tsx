import type { ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

/** Gentle entrance used across the home screen; delays create the stagger. */
export function FadeUp({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(430).delay(delay)} style={style}>
      {children}
    </Animated.View>
  );
}

export function Fade({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View entering={FadeIn.duration(500).delay(delay)} style={style}>
      {children}
    </Animated.View>
  );
}
