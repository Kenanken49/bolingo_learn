import { useEffect } from 'react';
import { View } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/**
 * BINGO the Owl — Bolingo's blue emotional anchor (pure views, no assets).
 * African styling: kitenge-pattern belly + Maasai bead necklace.
 * Fully animated per scenario:
 *  - happy: gentle breathing bob + blinking eyes + blush
 *  - sad: drooped posture, swaying guilt-trip, animated tear
 *  - party: jumping celebration with spin, party hat + confetti
 */
export type OwlMood = 'happy' | 'sad' | 'party';

const BLUE = '#3B82F6';
const DARK = '#1D4ED8';
const BELLY = '#DBEAFE';
const BEAK = '#F59E0B';
// Kitenge accent triangles + Maasai beads
const KITENGE = '#F97316';
const BEAD_RED = '#EF4444';
const BEAD_YELLOW = '#FBBF24';
const BEAD_GREEN = '#22C55E';

export default function DuoOwl({ mood = 'happy', size = 96 }: { mood?: OwlMood; size?: number }) {
  const s = size;
  const eye = s * 0.34;
  const pupil = s * 0.15;
  const eyeY = s * 0.3;
  const eyeLX = s * 0.13;
  const eyeRX = s * 0.53;
  const pupilDY = mood === 'sad' ? pupil * 0.9 : -pupil * 0.5;

  // Idle breathing bob
  const bob = useSharedValue(0);
  // Blink: eyes squash vertically every ~3s
  const blink = useSharedValue(1);
  // Guilt sway for sad / celebration jump for party
  const sway = useSharedValue(0);
  const jump = useSharedValue(0);
  const spin = useSharedValue(0);
  // Tear drop falls and fades
  const tear = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(withSequence(withTiming(-s * 0.04, { duration: 900 }), withTiming(0, { duration: 900 })), -1, true);
    blink.value = withRepeat(
      withSequence(withTiming(1, { duration: 2700 }), withTiming(0.12, { duration: 90 }), withTiming(1, { duration: 140 })),
      -1,
      false
    );
    if (mood === 'sad') {
      sway.value = withRepeat(withSequence(withTiming(-6, { duration: 700 }), withTiming(6, { duration: 700 })), -1, true);
      tear.value = withRepeat(withSequence(withTiming(0, { duration: 400 }), withTiming(1, { duration: 1100 })), -1, false);
    } else if (mood === 'party') {
      jump.value = withRepeat(
        withSequence(
          withSpring(-s * 0.16, { damping: 5, stiffness: 220 }),
          withSpring(0, { damping: 9, stiffness: 200 })
        ),
        -1,
        false
      );
      spin.value = withRepeat(withSequence(withTiming(-6, { duration: 500 }), withTiming(6, { duration: 500 })), -1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, s]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value + jump.value }, { rotate: `${spin.value * 0.4}deg` }],
  }));
  const eyeStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const swayStyle = useAnimatedStyle(() => ({ transform: [{ translateX: sway.value }] }));
  const tearStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tear.value * s * 0.12 }],
    opacity: 1 - tear.value * 0.4,
  }));
  const wingLStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: mood === 'party' ? `${-24 + spin.value * 2}deg` : '12deg' }],
  }));
  const wingRStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: mood === 'party' ? `${24 - spin.value * 2}deg` : '-12deg' }],
  }));

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={mood === 'sad' ? 'Bingo the owl looking sad' : mood === 'party' ? 'Bingo the owl celebrating' : 'Bingo the owl, happy'}
      style={{ width: s, height: s * 1.08 }}
    >
      <Reanimated.View style={[{ width: s, height: s * 1.08 }, bodyStyle]}>
        {/* wings (flap harder when celebrating) */}
        <Reanimated.View
          style={[
            {
              position: 'absolute',
              left: -s * 0.06,
              top: s * 0.42,
              width: s * 0.16,
              height: s * 0.44,
              borderRadius: s * 0.08,
              backgroundColor: DARK,
            },
            wingLStyle,
          ]}
        />
        <Reanimated.View
          style={[
            {
              position: 'absolute',
              right: -s * 0.06,
              top: s * 0.42,
              width: s * 0.16,
              height: s * 0.44,
              borderRadius: s * 0.08,
              backgroundColor: DARK,
            },
            wingRStyle,
          ]}
        />
        {/* body — Bingo blue */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: s * 0.06,
            width: s,
            height: s,
            borderRadius: s * 0.5,
            backgroundColor: BLUE,
          }}
        />
        {/* belly with kitenge triangles */}
        <View
          style={{
            position: 'absolute',
            left: s * 0.2,
            top: s * 0.52,
            width: s * 0.6,
            height: s * 0.52,
            borderRadius: s * 0.3,
            backgroundColor: BELLY,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: s * 0.08,
              top: s * 0.06,
              width: s * 0.12,
              height: s * 0.12,
              backgroundColor: KITENGE,
              transform: [{ rotate: '45deg' }],
              opacity: 0.85,
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: s * 0.08,
              top: s * 0.2,
              width: s * 0.1,
              height: s * 0.1,
              borderRadius: s * 0.05,
              backgroundColor: BEAD_GREEN,
              opacity: 0.9,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: s * 0.22,
              bottom: s * 0.04,
              width: s * 0.09,
              height: s * 0.09,
              backgroundColor: BEAD_RED,
              transform: [{ rotate: '45deg' }],
              opacity: 0.85,
            }}
          />
        </View>
        {/* eyes (blink) */}
        <Reanimated.View
          style={[
            {
              position: 'absolute',
              left: eyeLX,
              top: eyeY,
              width: eye,
              height: eye,
              borderRadius: eye / 2,
              backgroundColor: '#fff',
            },
            eyeStyle,
          ]}
        />
        <Reanimated.View
          style={[
            {
              position: 'absolute',
              left: eyeRX,
              top: eyeY,
              width: eye,
              height: eye,
              borderRadius: eye / 2,
              backgroundColor: '#fff',
            },
            eyeStyle,
          ]}
        />
        {/* pupils */}
        <View
          style={{
            position: 'absolute',
            left: eyeLX + (eye - pupil) / 2,
            top: eyeY + (eye - pupil) / 2 + pupilDY,
            width: pupil,
            height: pupil,
            borderRadius: pupil / 2,
            backgroundColor: '#1c1c1e',
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: eyeRX + (eye - pupil) / 2,
            top: eyeY + (eye - pupil) / 2 + pupilDY,
            width: pupil,
            height: pupil,
            borderRadius: pupil / 2,
            backgroundColor: '#1c1c1e',
          }}
        />
        {/* sparkle in pupils when happy */}
        {mood !== 'sad' ? (
          <>
            <View
              style={{
                position: 'absolute',
                left: eyeLX + (eye - pupil) / 2 + pupil * 0.12,
                top: eyeY + (eye - pupil) / 2 + pupilDY + pupil * 0.1,
                width: pupil * 0.32,
                height: pupil * 0.32,
                borderRadius: pupil * 0.16,
                backgroundColor: '#fff',
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: eyeRX + (eye - pupil) / 2 + pupil * 0.12,
                top: eyeY + (eye - pupil) / 2 + pupilDY + pupil * 0.1,
                width: pupil * 0.32,
                height: pupil * 0.32,
                borderRadius: pupil * 0.16,
                backgroundColor: '#fff',
              }}
            />
          </>
        ) : null}
        {/* guilty tear (animated fall) */}
        {mood === 'sad' ? (
          <Reanimated.View
            style={[
              {
                position: 'absolute',
                left: eyeRX + eye * 0.32,
                top: eyeY + eye * 1.02,
                width: s * 0.09,
                height: s * 0.13,
                borderRadius: s * 0.05,
                backgroundColor: '#7DD3FC',
              },
              tearStyle,
            ]}
          />
        ) : null}
        {/* blush when happy */}
        {mood !== 'sad' ? (
          <>
            <View
              style={{
                position: 'absolute',
                left: eyeLX - s * 0.02,
                top: eyeY + eye * 0.95,
                width: s * 0.14,
                height: s * 0.09,
                borderRadius: s * 0.05,
                backgroundColor: '#FDA4AF',
                opacity: 0.8,
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: eyeRX + eye * 0.88,
                top: eyeY + eye * 0.95,
                width: s * 0.14,
                height: s * 0.09,
                borderRadius: s * 0.05,
                backgroundColor: '#FDA4AF',
                opacity: 0.8,
              }}
            />
          </>
        ) : null}
        {/* beak */}
        <View
          style={{
            position: 'absolute',
            left: s * 0.5 - s * 0.055,
            top: eyeY + eye * (mood === 'sad' ? 0.92 : 1.02),
            width: s * 0.11,
            height: s * 0.11,
            borderRadius: 3,
            backgroundColor: BEAK,
            transform: [{ rotate: '45deg' }],
          }}
        />
        {/* Maasai bead necklace */}
        <View style={{ position: 'absolute', left: s * 0.28, top: s * 0.86, flexDirection: 'row', gap: s * 0.03 }}>
          {[BEAD_RED, BEAD_YELLOW, BEAD_GREEN, BEAD_YELLOW, BEAD_RED].map((c, i) => (
            <View key={i} style={{ width: s * 0.07, height: s * 0.07, borderRadius: s * 0.035, backgroundColor: c }} />
          ))}
        </View>
        {/* party hat */}
        {mood === 'party' ? (
          <>
            <View
              style={{
                position: 'absolute',
                left: s * 0.5 - s * 0.16,
                top: -s * 0.24,
                width: 0,
                height: 0,
                borderLeftWidth: s * 0.16,
                borderRightWidth: s * 0.16,
                borderBottomWidth: s * 0.34,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderBottomColor: '#7C3AED',
                transform: [{ rotate: '8deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: s * 0.5 - s * 0.055,
                top: -s * 0.3,
                width: s * 0.11,
                height: s * 0.11,
                borderRadius: s * 0.06,
                backgroundColor: '#FBBF24',
              }}
            />
          </>
        ) : null}
        {/* feet */}
        <View
          style={{
            position: 'absolute',
            left: s * 0.2,
            top: s * 0.98,
            width: s * 0.22,
            height: s * 0.09,
            borderRadius: s * 0.045,
            backgroundColor: BEAK,
          }}
        />
        <View
          style={{
            position: 'absolute',
            right: s * 0.2,
            top: s * 0.98,
            width: s * 0.22,
            height: s * 0.09,
            borderRadius: s * 0.045,
            backgroundColor: BEAK,
          }}
        />
      </Reanimated.View>
      {/* guilt-trip sway wrapper for the sad face */}
      {mood === 'sad' ? <Reanimated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, swayStyle]} pointerEvents="none" /> : null}
      {/* confetti dots when celebrating */}
      {mood === 'party' ? (
        <>
          {[
            { left: -s * 0.12, top: s * 0.1, c: BEAD_RED },
            { left: s * 1.0, top: s * 0.05, c: BEAD_YELLOW },
            { left: -s * 0.06, top: -s * 0.12, c: BEAD_GREEN },
            { left: s * 0.95, top: -s * 0.15, c: '#7C3AED' },
          ].map((d, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: d.left,
                top: d.top,
                width: s * 0.08,
                height: s * 0.08,
                borderRadius: s * 0.04,
                backgroundColor: d.c,
              }}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}
