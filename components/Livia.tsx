import { useEffect } from 'react';
import { View, Image } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { OwlMood } from './DuoOwl';
import { useClipFrames } from './mascotClips';
import AppIcon from './AppIcon';
import MascotClip from './MascotClip';

/**
 * LIVIA — the mentor.
 *
 * Her high-detail portrait (`assets/characters/livia-portrait.png`, source
 * SVG beside it) replaces the old in-code vector. The portrait keeps the
 * character's ankara print and warm palette while matching the new artwork.
 *
 * Moods are expressed through motion, not redrawn faces: happy breathes,
 * sad sways and cools its ring, party bounces under a crown badge. A Synfig
 * PNG sequence still wins whenever one exists, so a full clip can land later
 * without touching any call site.
 */

export type LiviaMood = OwlMood;

const LIVIA_PORTRAIT = require('../assets/characters/livia-portrait.png');

function useMentorMotion(mood: LiviaMood, size: number) {
  const bob = useSharedValue(0);
  const sway = useSharedValue(0);
  const pop = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(-size * 0.025, { duration: 1100 }),
        withTiming(0, { duration: 1100 }),
      ),
      -1,
      true,
    );

    if (mood === 'party') {
      pop.value = withRepeat(
        withSequence(
          withSpring(-size * 0.12, { damping: 5, stiffness: 220 }),
          withSpring(0, { damping: 9, stiffness: 200 }),
        ),
        -1,
        false,
      );
      sway.value = withRepeat(
        withSequence(withTiming(-4, { duration: 360 }), withTiming(4, { duration: 360 })),
        -1,
        true,
      );
    } else if (mood === 'sad') {
      pop.value = withTiming(0, { duration: 220 });
      sway.value = withRepeat(
        withSequence(withTiming(-2.5, { duration: 900 }), withTiming(2.5, { duration: 900 })),
        -1,
        true,
      );
    } else {
      pop.value = withTiming(0, { duration: 220 });
      sway.value = withRepeat(
        withSequence(withTiming(-1.5, { duration: 1000 }), withTiming(1.5, { duration: 1000 })),
        -1,
        true,
      );
    }
  }, [mood, size, bob, sway, pop]);

  return useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value + pop.value }, { rotate: `${sway.value}deg` }],
  }));
}

function labelFor(mood: LiviaMood): string {
  if (mood === 'sad') return 'Livia looking concerned';
  if (mood === 'party') return 'Livia celebrating';
  return 'Livia, your mentor';
}

export function LiviaPortrait({ mood = 'happy', size = 96 }: { mood?: LiviaMood; size?: number }) {
  const motion = useMentorMotion(mood, size);
  const ring = Math.max(2, Math.round(size * 0.05));

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={labelFor(mood)}
      style={{ width: size, height: size }}
    >
      <Reanimated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
            backgroundColor: '#DDD6FE',
            borderWidth: ring,
            borderColor: mood === 'sad' ? '#A78BFA' : '#C4B5FD',
          },
          motion,
        ]}
      >
        <Image source={LIVIA_PORTRAIT} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </Reanimated.View>

      {mood === 'party' ? (
        <View
          style={{
            position: 'absolute',
            right: -size * 0.02,
            top: -size * 0.04,
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: size * 0.2,
            backgroundColor: '#FBBF24',
            borderWidth: ring,
            borderColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name="crown" size={size * 0.22} color="#78350F" />
        </View>
      ) : null}
    </View>
  );
}

export default function Livia({ mood = 'happy', size = 96 }: { mood?: LiviaMood; size?: number }) {
  const { uris, fps } = useClipFrames('livia', mood);

  // A rendered Synfig clip (full body, transparent) outranks the portrait.
  if (uris.length > 0) {
    return (
      <MascotClip key={mood} uris={uris} fps={fps} width={size} height={size * 1.15} label={labelFor(mood)} />
    );
  }

  return <LiviaPortrait mood={mood} size={size} />;
}
