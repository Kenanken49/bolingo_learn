import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import Reanimated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { OwlMood } from './DuoOwl';

/**
 * BINGO — the purple owl.
 *
 * Rendered from the supplied flat SVG at 2x, cropped to the artwork
 * (468×446), so it stays crisp on every screen without adding a native SVG
 * module (no dev-client rebuild).
 * Moods are pre-rendered expression frames:
 *   happy  → supplied artwork
 *   blink  → eyes closed for 130ms every ~3.4s
 *   sad    → downcast pupils + a tear, slow sway
 *   party  → open beak + tongue, springy jump
 *
 * Art lives in assets/characters/bingo-owl (source.svg plus the exported
 * PNGs). Re-export there if the design changes; no call sites need edits.
 */

const HAPPY = require('../assets/characters/bingo-owl/bingo-happy.png');
const BLINK = require('../assets/characters/bingo-owl/bingo-blink.png');
const SAD = require('../assets/characters/bingo-owl/bingo-sad.png');
const PARTY = require('../assets/characters/bingo-owl/bingo-party.png');

const RATIO = 446 / 468;

export default function BingoOwl({ mood = 'happy', size = 96 }: { mood?: OwlMood; size?: number }) {
  const [blinking, setBlinking] = useState(false);
  const bob = useSharedValue(0);
  const jump = useSharedValue(0);
  const sway = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(withTiming(-size * 0.02, { duration: 1100 }), withTiming(0, { duration: 1100 })),
      -1,
      true
    );
    if (mood === 'party') {
      jump.value = withRepeat(
        withSequence(
          withSpring(-size * 0.12, { damping: 5, stiffness: 220 }),
          withSpring(0, { damping: 9, stiffness: 200 })
        ),
        -1,
        false
      );
    } else {
      jump.value = withTiming(0, { duration: 180 });
    }
    if (mood === 'sad') {
      sway.value = withRepeat(
        withSequence(withTiming(-4, { duration: 900 }), withTiming(4, { duration: 900 })),
        -1,
        true
      );
    } else {
      sway.value = withTiming(0, { duration: 180 });
    }
    return () => {
      cancelAnimation(bob);
      cancelAnimation(jump);
      cancelAnimation(sway);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, size]);

  // Blink only the neutral face; sad/party hold their expression.
  useEffect(() => {
    if (mood !== 'happy') {
      setBlinking(false);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      setBlinking(true);
      timer = setTimeout(() => {
        setBlinking(false);
        timer = setTimeout(loop, 3400);
      }, 130);
    };
    timer = setTimeout(loop, 2600);
    return () => clearTimeout(timer);
  }, [mood]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value + jump.value }, { rotate: `${sway.value}deg` }],
  }));

  const source = mood === 'sad' ? SAD : mood === 'party' ? PARTY : blinking ? BLINK : HAPPY;
  const label =
    mood === 'sad' ? 'Bingo the owl looking sad' : mood === 'party' ? 'Bingo the owl celebrating' : 'Bingo the owl';

  return (
    <Reanimated.View
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[{ width: size, height: size * RATIO }, style]}
    >
      <Image source={source} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
    </Reanimated.View>
  );
}
