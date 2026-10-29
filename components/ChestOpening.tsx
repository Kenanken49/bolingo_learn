import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import Text from './ui/Text';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNatural } from '../lib/natural';
import { getHapticsOn } from '../lib/preferences';

/**
 * Chest ceremony, phase one: the chest lands, rattles, the lid lifts and the
 * gold light bursts. It calls `onOpened` once at the end so the caller can hand
 * the screen to the five-second <Celebration /> storm with no cross-fade or
 * overlap. Timings are one shared clock, so the hand-off lands on the frame
 * the lid finishes opening rather than on a stack of independent timers.
 *
 *   chest === 'opening' ? <ChestOpening title={unit.title} onOpened={startStorm} /> : null
 */

/** Lid fully open + light burst. The storm starts on this frame. */
export const CHEST_OPEN_MS = 1080;
const LID_AT = 0.56;

const CHEST_W = 208;
const BODY_H = 118;
const LID_H = 58;

const SPARKS = 14;

interface Spark {
  left: number;
  size: number;
  drift: number;
  delay: number;
  color: string;
}

function SparkDot({
  spark,
  progress,
  color,
}: {
  spark: Spark;
  progress: SharedValue<number>;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const local = (progress.value - spark.delay) / (1 - spark.delay + 0.0001);
    const t = Math.max(0, Math.min(1, local));
    const rise = t * (110 + spark.size * 2);
    return {
      transform: [
        { translateY: -rise },
        { translateX: Math.sin(t * 5 + spark.delay * 9) * spark.drift },
        { scale: 1 - t * 0.45 },
      ],
      opacity: t === 0 || t === 1 ? 0 : Math.min(1, t * 3) * (1 - t),
    };
  });
  return (
    <Reanimated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: spark.left,
          bottom: BODY_H + 6,
          width: spark.size,
          height: spark.size,
          borderRadius: spark.size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export default function ChestOpening({
  title,
  rewardLabel,
  onOpened,
}: {
  title: string;
  /** The rolled payout, e.g. "+10 gems". Revealed as the lid lifts. */
  rewardLabel?: string;
  onOpened: () => void;
}) {
  const p = useNatural();
  // Entrance is a spring so the chest has weight; the ceremony itself is one
  // linear clock so the hand-off timing never drifts with the spring.
  const pop = useSharedValue(0);
  const clock = useSharedValue(0);
  const opened = useRef(false);

  const sparks = useMemo<Spark[]>(
    () =>
      Array.from({ length: SPARKS }, (_, i) => ({
        left: 24 + (((i * 977 + 331) % 1000) / 1000) * (CHEST_W - 48),
        size: 4 + (((i * 613) % 3) / 3) * 5,
        drift: 10 + ((i * 449) % 26),
        delay: 0.56 + ((i * 271) % 100) / 820,
        color: i % 3 === 0 ? p.honeySoft : i % 3 === 1 ? p.honey : p.sand,
      })),
    [p.honey, p.honeySoft, p.sand]
  );

  useEffect(() => {
    pop.value = withSpring(1, { damping: 11, stiffness: 180 });
    clock.value = withTiming(1, { duration: CHEST_OPEN_MS, easing: Easing.linear });

    const thump = setTimeout(() => {
      void getHapticsOn()
        .then((on) => (on ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) : null))
        .catch(() => {});
    }, Math.round(CHEST_OPEN_MS * LID_AT) + 40);

    const handoff = setTimeout(() => {
      if (opened.current) return;
      opened.current = true;
      onOpened();
    }, CHEST_OPEN_MS);

    return () => {
      clearTimeout(thump);
      clearTimeout(handoff);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(clock.value, [0, 0.12], [0, 1], 'clamp'),
  }));

  const chestStyle = useAnimatedStyle(() => {
    // Rattle: three decaying shakes while the lock works loose.
    const shakeStart = 0.2;
    const shakeEnd = LID_AT;
    const inShake = clock.value > shakeStart && clock.value < shakeEnd;
    const shakeT = inShake ? (clock.value - shakeStart) / (shakeEnd - shakeStart) : 0;
    const shake = inShake ? Math.sin(shakeT * Math.PI * 6) * 5 * (1 - shakeT) : 0;
    const burst = interpolate(clock.value, [shakeEnd, 0.94], [0, 1], 'clamp');
    return {
      opacity: interpolate(clock.value, [0.9, 1], [1, 0.15], 'clamp'),
      transform: [
        { translateY: interpolate(pop.value, [0, 1], [26, 0]) },
        { translateX: shake },
        { scale: interpolate(pop.value, [0, 1], [0.82, 1]) + burst * 0.05 },
        { rotate: `${shake * 0.6}deg` },
      ],
    };
  });

  const lidStyle = useAnimatedStyle(() => {
    const open = interpolate(clock.value, [LID_AT, 0.78], [0, 1], 'clamp');
    // Lift + tilt rather than a sideways hinge: reads as a lid thrown back.
    return {
      transform: [
        { translateY: -30 * open },
        { rotate: `${-20 * open}deg` },
        { scaleY: 1 - open * 0.42 },
      ],
      opacity: interpolate(clock.value, [0.94, 1], [1, 0], 'clamp'),
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const open = interpolate(clock.value, [LID_AT, 0.82], [0, 1], 'clamp');
    return {
      opacity: open * 0.55,
      transform: [{ scale: 0.55 + open * 0.85 }],
    };
  });

  const ringStyle = useAnimatedStyle(() => {
    const open = interpolate(clock.value, [LID_AT + 0.04, 0.98], [0, 1], 'clamp');
    return {
      opacity: open * 0.6,
      transform: [{ scale: 0.6 + open * 1.3 }],
    };
  });

  const beamStyle = useAnimatedStyle(() => {
    const open = interpolate(clock.value, [LID_AT, 0.72], [0, 1], 'clamp');
    return {
      opacity: open * 0.5,
      transform: [{ scaleY: 0.2 + open * 0.8 }, { scaleX: 0.7 + open * 0.5 }],
    };
  });

  const mouthStyle = useAnimatedStyle(() => {
    const open = interpolate(clock.value, [LID_AT, LID_AT + 0.12], [0, 1], 'clamp');
    return { opacity: open };
  });

  const captionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(clock.value, [0, 0.16, 0.9, 1], [0, 1, 1, 0], 'clamp'),
    transform: [{ translateY: interpolate(clock.value, [0, 0.16], [6, 0], 'clamp') }],
  }));

  // The payout lands with the light: hidden until the lid is up, then it pops.
  const rewardStyle = useAnimatedStyle(() => {
    const reveal = interpolate(clock.value, [LID_AT + 0.02, 0.8], [0, 1], 'clamp');
    return {
      opacity: reveal,
      transform: [{ translateY: interpolate(reveal, [0, 1], [10, 0]) }, { scale: 0.86 + reveal * 0.14 }],
    };
  });

  return (
    <Reanimated.View
      testID="chest-opening"
      accessible
      accessibilityLabel={`Opening the chest for ${title}`}
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 60 }}
    >
      <Reanimated.View
        style={[
          { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
          { backgroundColor: p.isDark ? '#000000' : '#0B0B14' },
          scrimStyle,
        ]}
      />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Reanimated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: 320,
              height: 320,
              borderRadius: 160,
              backgroundColor: p.honey,
              opacity: 0.3,
            },
            glowStyle,
          ]}
        />
        <Reanimated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: 220,
              height: 220,
              borderRadius: 110,
              borderWidth: 2,
              borderColor: p.honeySoft,
            },
            ringStyle,
          ]}
        />

        <Reanimated.View style={[{ width: CHEST_W, alignItems: 'center' }, chestStyle]}>
          <Reanimated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                bottom: BODY_H + LID_H - 22,
                width: 96,
                height: 150,
                borderRadius: 48,
                backgroundColor: p.honeySoft,
                opacity: 0.4,
              },
              beamStyle,
            ]}
          />

          {/* Lid */}
          <Reanimated.View
            style={[
              {
                width: CHEST_W,
                height: LID_H,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                borderBottomLeftRadius: 4,
                borderBottomRightRadius: 4,
                backgroundColor: '#6B4222',
                borderWidth: 1,
                borderColor: '#8C5A2B',
                overflow: 'hidden',
              },
              lidStyle,
            ]}
          >
            <View style={{ marginTop: 9, marginHorizontal: 14, height: 3, borderRadius: 2, backgroundColor: 'rgba(255, 214, 122, 0.35)' }} />
            <View style={{ marginTop: 8, marginHorizontal: 26, height: 2, borderRadius: 2, backgroundColor: 'rgba(0, 0, 0, 0.25)' }} />
            <View
              style={{
                position: 'absolute',
                left: CHEST_W / 2 - 46,
                top: 22,
                width: 92,
                height: 10,
                borderRadius: 4,
                backgroundColor: p.honey,
                opacity: 0.9,
              }}
            />
          </Reanimated.View>

          {/* Body */}
          <View
            style={{
              width: CHEST_W,
              height: BODY_H,
              borderBottomLeftRadius: 18,
              borderBottomRightRadius: 18,
              borderTopLeftRadius: 2,
              borderTopRightRadius: 2,
              backgroundColor: '#4A2C15',
              borderWidth: 1,
              borderColor: '#7A4A22',
              overflow: 'hidden',
            }}
          >
            <Reanimated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  left: 8,
                  right: 8,
                  top: 0,
                  height: 24,
                  borderBottomLeftRadius: 6,
                  borderBottomRightRadius: 6,
                  backgroundColor: p.honeySoft,
                },
                mouthStyle,
              ]}
            />
            <View
              style={{
                position: 'absolute',
                left: 40,
                top: 0,
                bottom: 0,
                width: 12,
                backgroundColor: p.honey,
                opacity: 0.85,
              }}
            />
            <View
              style={{
                position: 'absolute',
                right: 40,
                top: 0,
                bottom: 0,
                width: 12,
                backgroundColor: p.honey,
                opacity: 0.85,
              }}
            />
            <View style={{ marginTop: 56, marginHorizontal: 10, height: 2, backgroundColor: 'rgba(0, 0, 0, 0.28)' }} />
            <View style={{ marginTop: 18, marginHorizontal: 10, height: 2, backgroundColor: 'rgba(0, 0, 0, 0.22)' }} />
          </View>

          {/* Lock plate sits on the seam, in front of both halves. */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: BODY_H - 30,
              width: 42,
              height: 44,
              borderRadius: 8,
              backgroundColor: p.honey,
              borderWidth: 2,
              borderColor: '#8A6200',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ width: 9, height: 12, borderRadius: 5, backgroundColor: '#241505' }} />
            <View style={{ marginTop: 2, width: 3, height: 9, borderRadius: 2, backgroundColor: '#241505' }} />
          </View>

          {sparks.map((spark, i) => (
            <SparkDot key={i} spark={spark} progress={clock} color={spark.color} />
          ))}
        </Reanimated.View>

        <Reanimated.View
          style={[
            { position: 'absolute', bottom: 96, alignItems: 'center', paddingHorizontal: 32 },
            captionStyle,
          ]}
        >
          <View
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: p.isDark ? '#5C4A12' : '#F2D98E',
              backgroundColor: p.isDark ? '#1B1608' : '#FFF7DE',
              paddingHorizontal: 14,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '900',
                letterSpacing: 1.6,
                textTransform: 'uppercase',
                color: p.honey,
              }}
            >
              Unit chest
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={{ marginTop: 8, fontSize: 15, fontWeight: '800', color: p.isDark ? '#F7F7FF' : '#0B0B14' }}
          >
            {title}
          </Text>
          {rewardLabel ? (
            <Reanimated.Text
              numberOfLines={1}
              style={[
                { marginTop: 6, fontSize: 22, fontWeight: '900', color: p.honey, letterSpacing: 0.2 },
                rewardStyle,
              ]}
            >
              {rewardLabel}
            </Reanimated.Text>
          ) : null}
        </Reanimated.View>
      </View>
    </Reanimated.View>
  );
}
