import { useEffect, useState } from 'react';
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

/**
 * ZORA — the build coach.
 *
 * Her portrait (`assets/characters/zora-portrait.png`) replaces the old
 * in-code vector and follows the Figma frame's rust headwrap, berry/pink
 * kitenge and gold jewellery on a QD-OLED black-plum ground.
 *
 * Moods are motion, not redrawn faces: happy breathes, sad sways under a
 * violet ring, party bounces under a cyan crown badge. A Synfig PNG sequence
 * still wins whenever one exists, so a full clip can land later without
 * touching any call site.
 */

export type ZoraMood = OwlMood;

const ZORA_PORTRAIT = require('../assets/characters/zora-portrait.png');

function useBuildCoachMotion(mood: ZoraMood, size: number) {
  const bob = useSharedValue(0);
  const sway = useSharedValue(0);
  const pop = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(-size * 0.025, { duration: 1000 }),
        withTiming(0, { duration: 1000 }),
      ),
      -1,
      true,
    );

    if (mood === 'party') {
      pop.value = withRepeat(
        withSequence(
          withSpring(-size * 0.13, { damping: 5, stiffness: 220 }),
          withSpring(0, { damping: 9, stiffness: 200 }),
        ),
        -1,
        false,
      );
      sway.value = withRepeat(
        withSequence(withTiming(-4, { duration: 340 }), withTiming(4, { duration: 340 })),
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
        withSequence(withTiming(-1.5, { duration: 1050 }), withTiming(1.5, { duration: 1050 })),
        -1,
        true,
      );
    }
  }, [mood, size, bob, sway, pop]);

  return useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value + pop.value }, { rotate: `${sway.value}deg` }],
  }));
}

function labelFor(mood: ZoraMood): string {
  if (mood === 'sad') return 'Zora looking concerned';
  if (mood === 'party') return 'Zora celebrating';
  return 'Zora, your build coach';
}

export function ZoraPortrait({ mood = 'happy', size = 96 }: { mood?: ZoraMood; size?: number }) {
  const motion = useBuildCoachMotion(mood, size);
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
            backgroundColor: '#12000C',
            borderWidth: ring,
            borderColor: mood === 'sad' ? '#8B5CFF' : mood === 'party' ? '#00E5FF' : '#FF2DAA',
          },
          motion,
        ]}
      >
        <Image source={ZORA_PORTRAIT} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
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
            backgroundColor: '#00E5FF',
            borderWidth: ring,
            borderColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name="crown" size={size * 0.22} color="#00232E" />
        </View>
      ) : null}
    </View>
  );
}

export default function Zora({ mood = 'happy', size = 96 }: { mood?: ZoraMood; size?: number }) {
  const { uris, fps } = useClipFrames('zora', mood);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    if (uris.length < 2) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % uris.length), Math.round(1000 / Math.max(1, fps)));
    return () => clearInterval(id);
  }, [mood, uris.length, fps]);

  // A rendered Synfig clip (full body, transparent) outranks the portrait.
  if (uris.length > 0) {
    return (
      <Image
        source={{ uri: uris[frame] }}
        accessibilityRole="image"
        accessibilityLabel={labelFor(mood)}
        style={{ width: size, height: size * 1.15 }}
        resizeMode="contain"
      />
    );
  }

  return <ZoraPortrait mood={mood} size={size} />;
}
