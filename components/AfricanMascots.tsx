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
import DuoOwl, { type OwlMood } from './DuoOwl';

/**
 * Bolingo mascot trio — proudly African, fully animated per scenario:
 *  - BINGO the Owl (blue): the emotional anchor. Celebrates wins, guilt-trips
 *    fading streaks, coaches first lessons.
 *  - LIVIA: warm Nigerian-style mentor (gele headwrap, beaded earrings,
 *    ankara dress). Greets newcomers, explains answers, celebrates with you.
 *  - ZORA: energetic young coder (fade haircut, kitenge-trim tee). Coaches
 *    lessons, hypes quizzes, mourns failed runs with you.
 *
 * <Mascot character mood size /> picks the right face for each outcome,
 * Duolingo-style: celebration on success, encouragement mid-way, guilt-trip
 * when the streak is in danger.
 */
export type MascotCharacter = 'bingo' | 'livia' | 'zora';
export type MascotMood = OwlMood;

const SKIN_LIVIA = '#7A4A2B';
const SKIN_ZORA = '#6B4423';
const HAIR = '#111827';
const GELE = '#FBBF24';
const GELE_DARK = '#D97706';
const ANKARA = '#EA580C';
const ZORA_TEE = '#16A34A';

function useMascotMotion(mood: MascotMood, s: number) {
  const bob = useSharedValue(0);
  const blink = useSharedValue(1);
  const wave = useSharedValue(0);
  const jump = useSharedValue(0);
  const sway = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(withSequence(withTiming(-s * 0.03, { duration: 900 }), withTiming(0, { duration: 900 })), -1, true);
    blink.value = withRepeat(
      withSequence(withTiming(1, { duration: 2700 }), withTiming(0.12, { duration: 90 }), withTiming(1, { duration: 140 })),
      -1,
      false
    );
    if (mood === 'party') {
      jump.value = withRepeat(
        withSequence(withSpring(-s * 0.14, { damping: 5, stiffness: 220 }), withSpring(0, { damping: 9, stiffness: 200 })),
        -1,
        false
      );
      wave.value = withRepeat(withSequence(withTiming(-18, { duration: 350 }), withTiming(18, { duration: 350 })), -1, true);
    } else if (mood === 'sad') {
      sway.value = withRepeat(withSequence(withTiming(-5, { duration: 800 }), withTiming(5, { duration: 800 })), -1, true);
    } else {
      wave.value = withRepeat(withSequence(withTiming(-12, { duration: 600 }), withTiming(12, { duration: 600 })), -1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, s]);
  return {
    bodyStyle: useAnimatedStyle(() => ({ transform: [{ translateY: bob.value + jump.value }, { rotate: `${sway.value * 0.5}deg` }] })),
    eyeStyle: useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] })),
    waveStyle: useAnimatedStyle(() => ({ transform: [{ rotate: `${wave.value}deg` }] })),
  };
}

function Face({
  skin,
  eye,
  pupil,
  eyeY,
  eyeLX,
  eyeRX,
  pupilDY,
  eyeStyle,
  happy,
  s,
}: {
  skin: string;
  eye: number;
  pupil: number;
  eyeY: number;
  eyeLX: number;
  eyeRX: number;
  pupilDY: number;
  // Animated blink style from useAnimatedStyle (typed loosely for web/native parity).
  eyeStyle: any;
  happy: boolean;
  s: number;
}) {
  void skin;
  return (
    <>
      <Reanimated.View style={[{ position: 'absolute', left: eyeLX, top: eyeY, width: eye, height: eye, borderRadius: eye / 2, backgroundColor: '#fff' }, eyeStyle]} />
      <Reanimated.View style={[{ position: 'absolute', left: eyeRX, top: eyeY, width: eye, height: eye, borderRadius: eye / 2, backgroundColor: '#fff' }, eyeStyle]} />
      <View style={{ position: 'absolute', left: eyeLX + (eye - pupil) / 2, top: eyeY + (eye - pupil) / 2 + pupilDY, width: pupil, height: pupil, borderRadius: pupil / 2, backgroundColor: '#111827' }} />
      <View style={{ position: 'absolute', left: eyeRX + (eye - pupil) / 2, top: eyeY + (eye - pupil) / 2 + pupilDY, width: pupil, height: pupil, borderRadius: pupil / 2, backgroundColor: '#111827' }} />
      {/* smile vs flat sad mouth */}
      <View
        style={{
          position: 'absolute',
          left: s * 0.5 - s * 0.11,
          top: eyeY + eye * 1.35,
          width: s * 0.22,
          height: s * 0.11,
          borderRadius: s * 0.055,
          borderBottomLeftRadius: happy ? s * 0.11 : 2,
          borderBottomRightRadius: happy ? s * 0.11 : 2,
          backgroundColor: happy ? '#7C2D12' : 'transparent',
          borderBottomWidth: happy ? 0 : 3,
          borderColor: '#3F2A1D',
        }}
      />
    </>
  );
}

/** LIVIA — mentor with golden gele, beaded puffs, cowrie earrings, ankara dress. */
export function Livia({ mood = 'happy', size = 96 }: { mood?: MascotMood; size?: number }) {
  const s = size;
  const happy = mood !== 'sad';
  const eye = s * 0.24;
  const pupil = s * 0.11;
  const eyeY = s * 0.42;
  const eyeLX = s * 0.2;
  const eyeRX = s * 0.56;
  const { bodyStyle, eyeStyle, waveStyle } = useMascotMotion(mood, s);
  return (
    <View accessibilityRole="image" accessibilityLabel={mood === 'sad' ? 'Livia looking concerned' : mood === 'party' ? 'Livia celebrating' : 'Livia smiling'} style={{ width: s, height: s * 1.15 }}>
      <Reanimated.View style={[{ width: s, height: s * 1.15 }, bodyStyle]}>
        {/* hair puffs with beads */}
        <View style={{ position: 'absolute', left: -s * 0.04, top: s * 0.1, width: s * 0.34, height: s * 0.34, borderRadius: s * 0.17, backgroundColor: HAIR }} />
        <View style={{ position: 'absolute', right: -s * 0.04, top: s * 0.1, width: s * 0.34, height: s * 0.34, borderRadius: s * 0.17, backgroundColor: HAIR }} />
        <View style={{ position: 'absolute', left: s * 0.04, top: s * 0.06, width: s * 0.1, height: s * 0.1, borderRadius: s * 0.05, backgroundColor: '#EF4444' }} />
        <View style={{ position: 'absolute', right: s * 0.04, top: s * 0.06, width: s * 0.1, height: s * 0.1, borderRadius: s * 0.05, backgroundColor: '#22C55E' }} />
        {/* gele headwrap */}
        <View style={{ position: 'absolute', left: s * 0.1, top: s * 0.02, width: s * 0.8, height: s * 0.3, borderRadius: s * 0.15, backgroundColor: GELE }} />
        <View style={{ position: 'absolute', left: s * 0.18, top: s * 0.08, width: s * 0.64, height: s * 0.08, borderRadius: s * 0.04, backgroundColor: GELE_DARK, opacity: 0.7 }} />
        <View style={{ position: 'absolute', left: s * 0.44, top: -s * 0.06, width: s * 0.12, height: s * 0.14, borderRadius: s * 0.03, backgroundColor: GELE_DARK, transform: [{ rotate: '18deg' }] }} />
        {/* face */}
        <View style={{ position: 'absolute', left: s * 0.14, top: s * 0.26, width: s * 0.72, height: s * 0.62, borderRadius: s * 0.3, backgroundColor: SKIN_LIVIA }} />
        <Face skin={SKIN_LIVIA} eye={eye} pupil={pupil} eyeY={eyeY} eyeLX={eyeLX} eyeRX={eyeRX} pupilDY={happy ? -pupil * 0.4 : pupil * 0.7} eyeStyle={eyeStyle} happy={happy} s={s} />
        {/* cowrie earrings */}
        <View style={{ position: 'absolute', left: s * 0.1, top: s * 0.68, width: s * 0.07, height: s * 0.07, borderRadius: s * 0.035, backgroundColor: '#FEF3C7', borderWidth: 2, borderColor: GELE_DARK }} />
        <View style={{ position: 'absolute', right: s * 0.1, top: s * 0.68, width: s * 0.07, height: s * 0.07, borderRadius: s * 0.035, backgroundColor: '#FEF3C7', borderWidth: 2, borderColor: GELE_DARK }} />
        {/* waving arm */}
        <Reanimated.View style={[{ position: 'absolute', right: -s * 0.02, top: s * 0.82, width: s * 0.14, height: s * 0.3, borderRadius: s * 0.07, backgroundColor: SKIN_LIVIA }, waveStyle]} />
        {/* ankara dress */}
        <View style={{ position: 'absolute', left: s * 0.2, top: s * 0.86, width: s * 0.6, height: s * 0.29, borderTopLeftRadius: s * 0.12, borderTopRightRadius: s * 0.12, backgroundColor: ANKARA, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', left: s * 0.08, top: s * 0.06, width: s * 0.12, height: s * 0.12, borderRadius: s * 0.06, backgroundColor: GELE }} />
          <View style={{ position: 'absolute', right: s * 0.08, top: s * 0.12, width: s * 0.1, height: s * 0.1, backgroundColor: '#fff', opacity: 0.85, transform: [{ rotate: '45deg' }] }} />
        </View>
        {/* bead necklace */}
        <View style={{ position: 'absolute', left: s * 0.32, top: s * 0.84, flexDirection: 'row', gap: s * 0.02 }}>
          {['#EF4444', '#FBBF24', '#22C55E'].map((c, i) => (
            <View key={i} style={{ width: s * 0.06, height: s * 0.06, borderRadius: s * 0.03, backgroundColor: c }} />
          ))}
        </View>
        {mood === 'party' ? (
          <View style={{ position: 'absolute', left: s * 0.5 - s * 0.14, top: -s * 0.2, width: 0, height: 0, borderLeftWidth: s * 0.14, borderRightWidth: s * 0.14, borderBottomWidth: s * 0.3, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#7C3AED', transform: [{ rotate: '8deg' }] }} />
        ) : null}
      </Reanimated.View>
    </View>
  );
}

/** ZORA — young coder with fade haircut, kitenge-trim tee, laptop sticker. */
export function Zora({ mood = 'happy', size = 96 }: { mood?: MascotMood; size?: number }) {
  const s = size;
  const happy = mood !== 'sad';
  const eye = s * 0.24;
  const pupil = s * 0.11;
  const eyeY = s * 0.4;
  const eyeLX = s * 0.2;
  const eyeRX = s * 0.56;
  const { bodyStyle, eyeStyle, waveStyle } = useMascotMotion(mood, s);
  return (
    <View accessibilityRole="image" accessibilityLabel={mood === 'sad' ? 'Zora looking down' : mood === 'party' ? 'Zora celebrating' : 'Zora grinning'} style={{ width: s, height: s * 1.15 }}>
      <Reanimated.View style={[{ width: s, height: s * 1.15 }, bodyStyle]}>
        {/* fade haircut */}
        <View style={{ position: 'absolute', left: s * 0.16, top: s * 0.04, width: s * 0.68, height: s * 0.34, borderRadius: s * 0.16, backgroundColor: HAIR }} />
        <View style={{ position: 'absolute', left: s * 0.24, top: s * 0.12, width: s * 0.52, height: s * 0.08, borderRadius: s * 0.04, backgroundColor: '#374151' }} />
        {/* face */}
        <View style={{ position: 'absolute', left: s * 0.14, top: s * 0.24, width: s * 0.72, height: s * 0.6, borderRadius: s * 0.3, backgroundColor: SKIN_ZORA }} />
        <Face skin={SKIN_ZORA} eye={eye} pupil={pupil} eyeY={eyeY} eyeLX={eyeLX} eyeRX={eyeRX} pupilDY={happy ? -pupil * 0.4 : pupil * 0.7} eyeStyle={eyeStyle} happy={happy} s={s} />
        {/* waving arm */}
        <Reanimated.View style={[{ position: 'absolute', left: -s * 0.02, top: s * 0.8, width: s * 0.14, height: s * 0.3, borderRadius: s * 0.07, backgroundColor: SKIN_ZORA }, waveStyle]} />
        {/* kitenge-trim tee */}
        <View style={{ position: 'absolute', left: s * 0.2, top: s * 0.82, width: s * 0.6, height: s * 0.33, borderTopLeftRadius: s * 0.12, borderTopRightRadius: s * 0.12, backgroundColor: ZORA_TEE }}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: s * 0.07, backgroundColor: GELE, borderTopLeftRadius: s * 0.12, borderTopRightRadius: s * 0.12 }} />
          <View style={{ position: 'absolute', left: s * 0.2, top: s * 0.13, width: s * 0.2, height: s * 0.12, borderRadius: s * 0.02, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: s * 0.12, height: s * 0.03, backgroundColor: ZORA_TEE, borderRadius: 2 }} />
            <View style={{ width: s * 0.08, height: s * 0.03, backgroundColor: ZORA_TEE, borderRadius: 2, marginTop: 2 }} />
          </View>
        </View>
        {mood === 'party' ? (
          <View style={{ position: 'absolute', right: s * 0.05, top: s * 0.0, width: s * 0.16, height: s * 0.16, borderRadius: s * 0.03, backgroundColor: '#7C3AED', transform: [{ rotate: '-12deg' }] }} />
        ) : null}
      </Reanimated.View>
    </View>
  );
}

/** Scenario picker: one face per outcome, Duolingo-style. */
export default function Mascot({
  character = 'bingo',
  mood = 'happy',
  size = 96,
}: {
  character?: MascotCharacter;
  mood?: MascotMood;
  size?: number;
}) {
  if (character === 'livia') return <Livia mood={mood} size={size} />;
  if (character === 'zora') return <Zora mood={mood} size={size} />;
  return <DuoOwl mood={mood} size={size} />;
}
