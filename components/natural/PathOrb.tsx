import { useEffect } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import Text from '../ui/Text';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import AppIcon, { type AppIconName } from '../AppIcon';
import { useNatural } from '../../lib/natural';

export type OrbState = 'completed' | 'active' | 'locked' | 'processing' | 'failed';

/**
 * Natural path orb: moss when done, glowing honey when active, dashed stone
 * when locked. The active orb breathes; gift nodes bob while claimable.
 */
export default function PathOrb({
  state,
  icon,
  label,
  sub,
  onPress,
  offset = 0,
  delay = 0,
  testID,
}: {
  state: OrbState;
  icon: AppIconName;
  label: string;
  sub?: string;
  onPress?: () => void;
  offset?: number;
  delay?: number;
  testID?: string;
}) {
  const p = useNatural();
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0);
  const bob = useSharedValue(0);

  useEffect(() => {
    if (state === 'active') {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) })
        ),
        -1
      );
      glow.value = withRepeat(
        withSequence(withTiming(0.14, { duration: 1300 }), withTiming(0.5, { duration: 1300 })),
        -1
      );
    } else {
      pulse.value = withTiming(1, { duration: 240 });
      glow.value = withTiming(0, { duration: 240 });
    }
  }, [state, pulse, glow]);

  useEffect(() => {
    if (icon === 'gift' && state === 'active') {
      bob.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
    } else {
      bob.value = withTiming(0, { duration: 240 });
    }
  }, [icon, state, bob]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }, { translateY: bob.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const size = state === 'active' ? 72 : 60;
  const locked = state === 'locked';
  const interactive = !!onPress && !locked && state !== 'processing';
  const iconSize = state === 'active' ? 28 : 24;

  const face =
    state === 'completed'
      ? { backgroundColor: p.moss, borderWidth: 1, borderColor: p.mossSoft, borderBottomWidth: 3, borderBottomColor: 'rgba(0,0,0,0.22)' }
      : state === 'active'
        ? { backgroundColor: p.honey, borderWidth: 1, borderColor: p.honeySoft, borderBottomWidth: 4, borderBottomColor: 'rgba(0,0,0,0.22)' }
        : state === 'processing'
          ? { backgroundColor: p.surfaceAlt, borderWidth: 1, borderColor: p.line }
          : state === 'failed'
            ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: p.berry }
            : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: p.stone, borderStyle: 'dashed' as const };

  const iconColor =
    state === 'completed' ? '#10150D' : state === 'active' ? '#241806' : state === 'failed' ? p.berry : p.stone;

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(delay)}
      style={{ alignItems: 'center', transform: [{ translateX: offset }], maxWidth: 190 }}
    >
      {state === 'active' ? (
        <View
          style={{
            marginBottom: 3,
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderRadius: 9,
            backgroundColor: p.sand,
            shadowColor: '#000',
            shadowOpacity: p.isDark ? 0.5 : 0.12,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 3,
          }}
        >
          <Text style={{ fontSize: 9.5, fontWeight: '900', letterSpacing: 1.5, color: '#1B160D' }}>START</Text>
        </View>
      ) : null}

      <Animated.View style={orbStyle}>
        {state === 'active' ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: -11,
                top: -11,
                right: -11,
                bottom: -11,
                borderRadius: 50,
                borderWidth: 1.5,
                borderColor: p.honey,
              },
              glowStyle,
            ]}
          />
        ) : null}
        <Pressable
          disabled={!interactive}
          onPress={onPress}
          accessibilityRole={interactive ? 'button' : 'text'}
          accessibilityLabel={`${label}: ${state}${sub ? `, ${sub}` : ''}`}
          accessibilityState={{ disabled: locked }}
          testID={testID}
          style={({ pressed }) => ({
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.88 : 1,
            ...(state === 'active'
              ? {
                  shadowColor: p.honey,
                  shadowOpacity: p.isDark ? 0.45 : 0.3,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 6,
                }
              : {}),
            ...face,
          })}
        >
          {state === 'processing' ? (
            <ActivityIndicator color={p.moss} />
          ) : locked ? (
            <AppIcon name="lock" size={iconSize - 2} color={p.stone} />
          ) : (
            <AppIcon name={icon} size={iconSize} color={iconColor} />
          )}
        </Pressable>
      </Animated.View>

      <Text
        numberOfLines={2}
        style={{
          marginTop: 7,
          textAlign: 'center',
          fontSize: 12.5,
          fontWeight: '800',
          color: locked ? p.muted : state === 'failed' ? p.berry : p.ink,
        }}
      >
        {label}
      </Text>
      {sub ? (
        <Text
          numberOfLines={2}
          style={{ textAlign: 'center', fontSize: 10.5, fontWeight: '600', color: state === 'failed' ? p.berry : p.muted }}
        >
          {sub}
        </Text>
      ) : null}
    </Animated.View>
  );
}
