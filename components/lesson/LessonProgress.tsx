import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { useNatural } from '../../lib/natural';
import { useTierStyle } from '../../lib/tierStyle';

/**
 * The lesson progress bar shared by every question player, restyled per life
 * stage: a thick, glossy bar for Explorers, a slim accent bar for Launchers and
 * a hairline for Climbers. `color` lets lab modes keep their own hue.
 */
export default function LessonProgress({ pct, color }: { pct: number; color?: string }) {
  const p = useNatural();
  const tier = useTierStyle();
  const [w] = useState(() => new Animated.Value(0));
  const clamped = Math.max(0, Math.min(100, pct));
  useEffect(() => {
    Animated.timing(w, { toValue: clamped, duration: tier.stage === 'climber' ? 200 : 400, useNativeDriver: false }).start();
  }, [clamped, w, tier.stage]);
  const height = tier.stage === 'explorer' ? 16 : tier.stage === 'launcher' ? 10 : 4;
  const fill = color ?? (tier.stage === 'explorer' ? '#22C55E' : tier.accent);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={{ width: '66%', height, borderRadius: height, overflow: 'hidden', backgroundColor: p.isDark ? '#334155' : '#E2E8F0' }}
    >
      <Animated.View
        style={{
          height: '100%',
          borderRadius: height,
          backgroundColor: fill,
          width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        }}
      >
        {tier.playful ? (
          <View style={{ position: 'absolute', left: 6, right: 6, top: 3, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' }} />
        ) : null}
      </Animated.View>
    </View>
  );
}
