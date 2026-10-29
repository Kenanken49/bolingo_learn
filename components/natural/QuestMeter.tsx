import { useEffect } from 'react';
import { View, Pressable } from 'react-native';
import Text from '../ui/Text';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import AppIcon from '../AppIcon';
import { useNatural } from '../../lib/natural';
import ProgressBar from './ProgressBar';

const DOTS = 12;

function RadialDot({
  index,
  progress,
  lit,
  unlit,
}: {
  index: number;
  progress: SharedValue<number>;
  lit: string;
  unlit: string;
}) {
  const angle = (-90 + index * (360 / DOTS)) * (Math.PI / 180);
  const cx = 24 + 19 * Math.cos(angle);
  const cy = 24 + 19 * Math.sin(angle);
  const style = useAnimatedStyle(() => {
    const l = Math.max(0, Math.min(1, progress.value * DOTS - index));
    return {
      opacity: 0.35 + 0.65 * l,
      transform: [{ scale: 0.7 + 0.3 * l }],
      backgroundColor: interpolateColor(l, [0, 1], [unlit, lit]),
    };
  });
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: cx - 2, top: cy - 2, width: 4, height: 4, borderRadius: 2 },
        style,
      ]}
    />
  );
}

/**
 * Daily quest card: a twelve-dot sunburst that blooms moss when the day is
 * won, plus the streak count. One tap opens the next lesson.
 */
export default function QuestMeter({
  done,
  streak,
  minutes,
  onPress,
}: {
  done: boolean;
  streak: number;
  minutes: number;
  onPress?: () => void;
}) {
  const p = useNatural();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(done ? 1 : 0, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [done, progress]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`Daily quest: ${done ? 'complete' : 'not complete'}, ${streak} day streak`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 11,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: p.line,
        backgroundColor: p.surface,
        opacity: pressed ? 0.94 : 1,
      })}
    >
      <View style={{ width: 48, height: 48 }}>
        {Array.from({ length: DOTS }).map((_, i) => (
          <RadialDot key={i} index={i} progress={progress} lit={p.moss} unlit={p.line} />
        ))}
        <View
          style={{
            position: 'absolute',
            left: 7,
            top: 7,
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: p.surfaceAlt,
          }}
        >
          <AppIcon name={done ? 'checkCircle' : 'flame'} size={16} color={done ? p.moss : p.honey} />
        </View>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '800', color: p.ink }}>
          Daily quest
        </Text>
        <Text style={{ fontSize: 11, color: p.muted, fontWeight: '600', marginTop: 1 }}>
          {done ? 'Quest complete · streak protected' : `1 lesson · ${minutes} min goal`}
        </Text>
        <View style={{ marginTop: 6 }}>
          <ProgressBar value={done ? 1 : 0} height={4} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <AppIcon name="flame" size={15} color={p.honey} />
        <Text style={{ fontSize: 12.5, fontWeight: '800', color: p.honey }}>
          {streak}
        </Text>
      </View>
    </Pressable>
  );
}
