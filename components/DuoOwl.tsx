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
 * BINGO the Kea — Bolingo's forward-facing mountain-parrot anchor
 * (pure views, no assets). Plumage drawn from the kea reference:
 * olive-brown head, emerald wings with bronze scallops, orange-red
 * underwing flash, teal-blue tail tips, long curved dark beak.
 * African styling kept: Maasai bead necklace.
 * Fully animated per scenario:
 *  - happy: gentle breathing bob + blinking eyes + blush + greeting wing wave
 *  - sad: drooped posture, swaying guilt-trip, animated tear
 *  - party: jumping celebration with spin, party hat + confetti
 */

export type OwlMood = 'happy' | 'sad' | 'party';

// Kea plumage
const OLIVE = '#6F6040';
const OLIVE_DARK = '#4A4230';
const EMERALD = '#2E9E6B';
const WING = '#1F7A52';
const BRONZE = '#C09A3E';
const FLASH = '#E4572E';
const TAIL_BLUE = '#3B82C4';
const BELLY_KEA = '#E4D9BC';
const BEAK_DARK = '#2E2A26';
const FEET = '#57534E';
// Maasai beads
const BEAD_RED = '#EF4444';
const BEAD_YELLOW = '#FBBF24';
const BEAD_GREEN = '#22C55E';

export default function DuoOwl({ mood = 'happy', size = 96 }: { mood?: OwlMood; size?: number }) {
  const s = size;
  const eye = s * 0.32;
  const pupil = s * 0.14;
  const eyeY = s * 0.3;
  const eyeLX = s * 0.14;
  const eyeRX = s * 0.54;
  const pupilDY = mood === 'sad' ? pupil * 0.9 : -pupil * 0.5;
  // Long curved beak hangs below the eyes; mood mouths sit beneath it.
  const beakTop = eyeY + eye * 0.92;
  const beakH = s * 0.2;
  const mouthTop = beakTop + beakH + s * 0.015;

  // Idle breathing bob
  const bob = useSharedValue(0);
  // Blink: eyes squash vertically every ~3s
  const blink = useSharedValue(1);
  // Guilt sway for sad / celebration jump for party / greeting wave for happy
  const sway = useSharedValue(0);
  const jump = useSharedValue(0);
  const spin = useSharedValue(0);
  const wave = useSharedValue(0);
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
    } else {
      // happy: right wing lifts in a friendly greeting wave
      wave.value = withRepeat(withSequence(withTiming(30, { duration: 550 }), withTiming(0, { duration: 550 })), -1, true);
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
    transform: [{ rotate: mood === 'party' ? `${24 - spin.value * 2}deg` : mood === 'sad' ? '-12deg' : `${-12 + wave.value}deg` }],
  }));

  // Bronze scallop dots shared by both wings.
  const scallops = [0.06, 0.2, 0.34];

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={mood === 'sad' ? 'Bingo the kea looking sad' : mood === 'party' ? 'Bingo the kea celebrating' : 'Bingo the kea, happy'}
      style={{ width: s, height: s * 1.08 }}
    >
      <Reanimated.View style={[{ width: s, height: s * 1.08 }, bodyStyle]}>
        {/* tail tips peeking below the body */}
        <View
          style={{
            position: 'absolute',
            left: s * 0.12,
            top: s * 0.88,
            width: s * 0.16,
            height: s * 0.22,
            borderRadius: s * 0.08,
            backgroundColor: TAIL_BLUE,
            transform: [{ rotate: '14deg' }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            right: s * 0.12,
            top: s * 0.88,
            width: s * 0.16,
            height: s * 0.22,
            borderRadius: s * 0.08,
            backgroundColor: TAIL_BLUE,
            transform: [{ rotate: '-14deg' }],
          }}
        />
        {/* wings — emerald with bronze scallops + orange underwing flash */}
        <Reanimated.View
          style={[
            {
              position: 'absolute',
              left: -s * 0.06,
              top: s * 0.42,
              width: s * 0.17,
              height: s * 0.44,
              borderRadius: s * 0.085,
              backgroundColor: WING,
              overflow: 'hidden',
            },
            wingLStyle,
          ]}
        >
          <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: s * 0.05, backgroundColor: FLASH, opacity: 0.9 }} />
          {scallops.map((t, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: s * 0.03,
                top: s * 0.44 * t + s * 0.03,
                width: s * 0.07,
                height: s * 0.07,
                borderRadius: s * 0.035,
                backgroundColor: BRONZE,
                opacity: 0.9,
              }}
            />
          ))}
        </Reanimated.View>
        <Reanimated.View
          style={[
            {
              position: 'absolute',
              right: -s * 0.06,
              top: s * 0.42,
              width: s * 0.17,
              height: s * 0.44,
              borderRadius: s * 0.085,
              backgroundColor: WING,
              overflow: 'hidden',
            },
            wingRStyle,
          ]}
        >
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: s * 0.05, backgroundColor: FLASH, opacity: 0.9 }} />
          {scallops.map((t, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                right: s * 0.03,
                top: s * 0.44 * t + s * 0.03,
                width: s * 0.07,
                height: s * 0.07,
                borderRadius: s * 0.035,
                backgroundColor: BRONZE,
                opacity: 0.9,
              }}
            />
          ))}
        </Reanimated.View>
        {/* body — kea emerald */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: s * 0.06,
            width: s,
            height: s,
            borderRadius: s * 0.5,
            backgroundColor: EMERALD,
          }}
        />
        {/* head cap — olive-brown, forward facing */}
        <View
          style={{
            position: 'absolute',
            left: s * 0.09,
            top: 0,
            width: s * 0.82,
            height: s * 0.74,
            borderRadius: s * 0.37,
            backgroundColor: OLIVE,
          }}
        />
        {/* ruffled crown tuft */}
        <View
          style={{
            position: 'absolute',
            left: s * 0.5 - s * 0.05,
            top: -s * 0.035,
            width: s * 0.1,
            height: s * 0.1,
            backgroundColor: OLIVE_DARK,
            transform: [{ rotate: '45deg' }],
            borderRadius: 2,
          }}
        />
        {/* belly with bronze scallops */}
        <View
          style={{
            position: 'absolute',
            left: s * 0.2,
            top: s * 0.52,
            width: s * 0.6,
            height: s * 0.52,
            borderRadius: s * 0.3,
            backgroundColor: BELLY_KEA,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: s * 0.1,
              top: s * 0.08,
              width: s * 0.11,
              height: s * 0.11,
              borderRadius: s * 0.055,
              backgroundColor: BRONZE,
              opacity: 0.85,
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: s * 0.1,
              top: s * 0.22,
              width: s * 0.09,
              height: s * 0.09,
              borderRadius: s * 0.045,
              backgroundColor: BRONZE,
              opacity: 0.85,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: s * 0.24,
              bottom: s * 0.05,
              width: s * 0.1,
              height: s * 0.1,
              borderRadius: s * 0.05,
              backgroundColor: FLASH,
              opacity: 0.8,
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
        {/* expressive brows: raised to party, worried when sad */}
        <View
          style={{
            position: 'absolute',
            left: eyeLX - s * 0.02,
            top: eyeY - s * 0.1,
            width: eye * 0.95,
            height: s * 0.05,
            borderRadius: s * 0.025,
            backgroundColor: OLIVE_DARK,
            transform: [{ rotate: mood === 'sad' ? '20deg' : mood === 'party' ? '-10deg' : '0deg' }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: eyeRX + eye * 0.05 - s * 0.02,
            top: eyeY - s * 0.1,
            width: eye * 0.95,
            height: s * 0.05,
            borderRadius: s * 0.025,
            backgroundColor: OLIVE_DARK,
            transform: [{ rotate: mood === 'sad' ? '-20deg' : mood === 'party' ? '10deg' : '0deg' }],
          }}
        />
        {/* long curved kea beak */}
        <View
          style={{
            position: 'absolute',
            left: s * 0.5 - s * 0.08,
            top: beakTop,
            width: s * 0.16,
            height: beakH,
            borderRadius: s * 0.08,
            backgroundColor: BEAK_DARK,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: s * 0.5 - s * 0.045,
            top: beakTop + beakH - s * 0.055,
            width: s * 0.09,
            height: s * 0.07,
            borderRadius: s * 0.035,
            backgroundColor: '#4A4440',
          }}
        />
        {/* mood mouth beneath the beak: open party grin / sad frown / smile */}
        {mood === 'party' ? (
          <View
            style={{
              position: 'absolute',
              left: s * 0.5 - s * 0.11,
              top: mouthTop,
              width: s * 0.22,
              height: s * 0.15,
              borderRadius: s * 0.075,
              backgroundColor: '#7F1D1D',
              overflow: 'hidden',
            }}
          >
            <View style={{ width: '100%', height: '38%', backgroundColor: '#fff' }} />
            <View style={{ alignSelf: 'center', width: '52%', height: '30%', borderRadius: s * 0.03, backgroundColor: '#F87171', marginTop: s * 0.015 }} />
          </View>
        ) : mood === 'sad' ? (
          <View
            style={{
              position: 'absolute',
              left: s * 0.5 - s * 0.09,
              top: mouthTop,
              width: s * 0.18,
              height: s * 0.09,
              borderRadius: s * 0.045,
              borderTopWidth: 4,
              borderColor: OLIVE_DARK,
            }}
          />
        ) : (
          <View
            style={{
              position: 'absolute',
              left: s * 0.5 - s * 0.1,
              top: mouthTop,
              width: s * 0.2,
              height: s * 0.1,
              borderRadius: s * 0.05,
              borderBottomWidth: 4,
              borderColor: OLIVE_DARK,
            }}
          />
        )}
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
            backgroundColor: FEET,
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
            backgroundColor: FEET,
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
