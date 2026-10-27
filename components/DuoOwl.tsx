import { View } from 'react-native';

/**
 * Bolingo's owl mascot (pure views, no image assets): the emotional anchor
 * of the app. Moods drive the loop — happy greets, party celebrates wins
 * and level-ups, sad guilt-trips when the streak is in danger.
 */
export type OwlMood = 'happy' | 'sad' | 'party';

const GREEN = '#58CC02';
const DARK = '#46A302';
const BELLY = '#8EE000';
const BEAK = '#FF9600';

export default function DuoOwl({ mood = 'happy', size = 96 }: { mood?: OwlMood; size?: number }) {
  const s = size;
  const eye = s * 0.34;
  const pupil = s * 0.15;
  const eyeY = s * 0.3;
  const eyeLX = s * 0.13;
  const eyeRX = s * 0.53;
  // Pupils look up when happy/celebrating, droop when guilty.
  const pupilDY = mood === 'sad' ? pupil * 0.9 : -pupil * 0.5;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={mood === 'sad' ? 'Sad owl' : mood === 'party' ? 'Celebrating owl' : 'Happy owl'}
      style={{ width: s, height: s * 1.08 }}
    >
      {/* wings */}
      <View
        style={{
          position: 'absolute',
          left: -s * 0.06,
          top: s * 0.42,
          width: s * 0.16,
          height: s * 0.44,
          borderRadius: s * 0.08,
          backgroundColor: DARK,
          transform: [{ rotate: '12deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: -s * 0.06,
          top: s * 0.42,
          width: s * 0.16,
          height: s * 0.44,
          borderRadius: s * 0.08,
          backgroundColor: DARK,
          transform: [{ rotate: '-12deg' }],
        }}
      />
      {/* body */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: s * 0.06,
          width: s,
          height: s,
          borderRadius: s * 0.5,
          backgroundColor: GREEN,
        }}
      />
      {/* belly */}
      <View
        style={{
          position: 'absolute',
          left: s * 0.2,
          top: s * 0.52,
          width: s * 0.6,
          height: s * 0.52,
          borderRadius: s * 0.3,
          backgroundColor: BELLY,
        }}
      />
      {/* eyes */}
      <View
        style={{
          position: 'absolute',
          left: eyeLX,
          top: eyeY,
          width: eye,
          height: eye,
          borderRadius: eye / 2,
          backgroundColor: '#fff',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: eyeRX,
          top: eyeY,
          width: eye,
          height: eye,
          borderRadius: eye / 2,
          backgroundColor: '#fff',
        }}
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
      {/* guilty tear */}
      {mood === 'sad' ? (
        <View
          style={{
            position: 'absolute',
            left: eyeRX + eye * 0.32,
            top: eyeY + eye * 1.02,
            width: s * 0.09,
            height: s * 0.13,
            borderRadius: s * 0.05,
            backgroundColor: '#7DD3FC',
          }}
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
    </View>
  );
}
