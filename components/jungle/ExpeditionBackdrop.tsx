import { useEffect } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useNatural } from '../../lib/natural';
import type { JungleScreenKey } from '../../lib/jungle';

/**
 * The backdrop is the reference photography itself: full-bleed, ungraded,
 * unblurred and unshaded, so the frame matches the source image pixel for
 * pixel. Only the transform animates — a slow Ken Burns dolly — which never
 * alters the photograph, and `cover` keeps its aspect intact from phone to 4K.
 */
const PLATES = {
  creek: require('../../assets/jungle/creek.png'),
  falls: require('../../assets/jungle/falls.png'),
} as const;

/** Water habitats get the waterfall; the rest of the trail walks the creek. */
function plateFor(screen: JungleScreenKey): keyof typeof PLATES {
  return screen === 'falls' || screen === 'river' || screen === 'spring' ? 'falls' : 'creek';
}

export default function ExpeditionBackdrop({ screen }: { screen: JungleScreenKey }) {
  const p = useNatural();
  const { width, height } = useWindowDimensions();
  const plate = plateFor(screen);
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = 0;
    drift.value = withRepeat(
      withTiming(1, { duration: 44000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [drift]);

  // Overscan by 14% so the pan never reveals an edge at any aspect ratio.
  const plateStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1.14 + drift.value * 0.08 },
      { translateX: (drift.value - 0.5) * width * 0.05 },
      { translateY: (0.5 - drift.value) * height * 0.03 },
    ],
  }));

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { backgroundColor: p.isDark ? '#010603' : '#F3F7EE', overflow: 'hidden' }]}
    >
      <Animated.View
        key={plate}
        entering={FadeIn.duration(900)}
        exiting={FadeOut.duration(500)}
        style={[StyleSheet.absoluteFill, plateStyle]}
      >
        <Image
          source={PLATES[plate]}
          resizeMode="cover"
          fadeDuration={0}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
      {/* Light canvas only: a paper wash keeps dark ink legible over the photo. */}
      {!p.isDark && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F3F7EE', opacity: 0.72 }]} />
      )}
      {/* Header/footer veils only: the body of the photograph stays untouched. */}
      <LinearGradient
        colors={
          p.isDark
            ? ['rgba(1,6,3,0.78)', 'rgba(1,6,3,0.4)', 'rgba(1,6,3,0)']
            : ['rgba(243,247,238,0.94)', 'rgba(243,247,238,0.62)', 'rgba(243,247,238,0)']
        }
        locations={[0, 0.46, 1]}
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: Math.min(height * 0.46, 420) }}
      />
      <LinearGradient
        colors={
          p.isDark
            ? ['rgba(1,6,3,0)', 'rgba(1,6,3,0.55)']
            : ['rgba(243,247,238,0)', 'rgba(243,247,238,0.88)']
        }
        pointerEvents="none"
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: Math.min(height * 0.22, 200) }}
      />
    </View>
  );
}
