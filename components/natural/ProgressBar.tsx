import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useNatural } from '../../lib/natural';

/** Soft progress bar that eases to its new value instead of snapping. */
export default function ProgressBar({
  value,
  tone,
  track,
  height = 6,
}: {
  value: number;
  tone?: string;
  track?: string;
  height?: number;
}) {
  const p = useNatural();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.max(0, Math.min(1, value)), {
      duration: 750,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, progress]);

  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={{ height, borderRadius: 99, overflow: 'hidden', backgroundColor: track ?? p.surfaceAlt }}>
      <Animated.View style={[{ height: '100%', borderRadius: 99, backgroundColor: tone ?? p.moss }, fill]} />
    </View>
  );
}
