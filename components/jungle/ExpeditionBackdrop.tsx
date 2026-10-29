import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Text from '../ui/Text';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useNatural } from '../../lib/natural';
import { JUNGLE, themeIndex, type JungleScreenKey } from '../../lib/jungle';

function Leaf({
  left,
  top,
  size,
  rotate,
  color,
  opacity,
}: {
  left: number | `${number}%`;
  top: number | `${number}%`;
  size: number;
  rotate: number;
  color: string;
  opacity: number;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left,
        top,
        width: size * 0.46,
        height: size,
        borderTopLeftRadius: size * 0.55,
        borderBottomRightRadius: size * 0.55,
        borderTopRightRadius: size * 0.12,
        borderBottomLeftRadius: size * 0.12,
        backgroundColor: color,
        opacity,
        transform: [{ rotate: `${rotate}deg` }],
      }}
    />
  );
}

function Vine({
  side,
  height,
  top,
  color,
  accent,
  leaves,
}: {
  side: 'left' | 'right';
  height: number;
  top: number;
  color: string;
  accent: string;
  leaves: number;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        ...(side === 'left' ? { left: '4%' as const } : { right: '4%' as const }),
        top,
        width: 1,
        height,
        backgroundColor: color,
        opacity: 0.45,
      }}
    >
      {Array.from({ length: leaves }).map((_, i) => (
        <Leaf
          key={i}
          left={side === 'left' ? 1 : -18}
          top={(height / (leaves + 1)) * (i + 1)}
          size={22 + (i % 3) * 10}
          rotate={side === 'left' ? 38 + i * 11 : -38 - i * 11}
          color={i % 2 === 0 ? accent : color}
          opacity={0.18 + (i % 3) * 0.05}
        />
      ))}
    </View>
  );
}

function Firefly({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  return (
    <View style={{ position: 'absolute', left: x, top: y, width: size * 3, height: size * 3, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: size * 3,
          height: size * 3,
          borderRadius: size * 1.5,
          backgroundColor: color,
          opacity: 0.09,
        }}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: 0.9,
          shadowRadius: size,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
    </View>
  );
}

/**
 * The shared jungle: true-black (or quantum-paper) canvas, layered canopy,
 * two accent lights, a resident bird, vines and drifting fireflies. Rendered
 * once behind the router, so every screen joins the same expedition while
 * its palette and species change with the route.
 */
export default function ExpeditionBackdrop({ screen }: { screen: JungleScreenKey }) {
  const p = useNatural();
  const { width, height } = useWindowDimensions();
  const theme = JUNGLE[screen];
  const idx = themeIndex(screen);
  const glow = useSharedValue(0.45);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(0.95, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.3, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [glow]);

  const fireflyStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const dark = p.isDark;
  const leafInk = dark ? '#0A2212' : '#B9D5B0';
  const base = dark ? '#010603' : '#F3F7EE';
  const canopySide = idx % 2 === 0 ? 'right' : 'left';
  const birdSide = idx % 3 === 0 ? 'left' : 'right';

  // Deterministic scatter: each habitat gets a different constellation.
  const fireflies = [
    { x: width * 0.1, y: height * 0.24, size: 3 },
    { x: width * 0.27, y: height * 0.48, size: 2 },
    { x: width * 0.82, y: height * 0.3, size: 2.5 },
    { x: width * 0.7, y: height * 0.62, size: 3 },
    { x: width * 0.18, y: height * 0.72, size: 2 },
    { x: width * 0.9, y: height * 0.78, size: 2 },
  ];

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { backgroundColor: base, overflow: 'hidden' }]}
    >
      {/* Habitat accent rule — the visual signature that changes per screen. */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: theme.accent,
          opacity: dark ? 0.72 : 0.45,
        }}
      />

      {/* Two soft accent lights: the clearing behind the content. */}
      <View
        style={{
          position: 'absolute',
          right: -width * 0.32,
          top: -height * 0.08,
          width: width * 0.9,
          height: width * 0.9,
          borderRadius: width * 0.45,
          backgroundColor: theme.accent,
          opacity: dark ? 0.07 : 0.08,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: -width * 0.18,
          top: -height * 0.02,
          width: width * 0.55,
          height: width * 0.55,
          borderRadius: width * 0.275,
          backgroundColor: theme.secondary,
          opacity: dark ? 0.05 : 0.07,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: -width * 0.4,
          bottom: -height * 0.16,
          width: width * 1.1,
          height: width * 1.1,
          borderRadius: width * 0.55,
          backgroundColor: theme.secondary,
          opacity: dark ? 0.045 : 0.06,
        }}
      />

      {/* Low mist: keeps the middle of the screen quiet. */}
      <View
        style={{
          position: 'absolute',
          left: -width * 0.2,
          top: height * 0.46,
          width: width * 1.4,
          height: height * 0.22,
          borderRadius: height * 0.11,
          backgroundColor: theme.accent,
          opacity: dark ? 0.018 : 0.03,
        }}
      />

      {/* Canopy crowns, hung from both top corners with habitat-coloured leaves. */}
      <View style={{ position: 'absolute', top: -34, ...(canopySide === 'right' ? { right: -26 } : { left: -26 }) }}>
        {[
          { x: 0, y: 10, s: 120, r: 18 },
          { x: 52, y: -8, s: 92, r: -24 },
          { x: 100, y: 34, s: 104, r: 42 },
          { x: 30, y: 86, s: 82, r: -58 },
          { x: 144, y: 88, s: 70, r: 66 },
        ].map((leaf, i) => (
          <Leaf
            key={i}
            left={leaf.x}
            top={leaf.y}
            size={leaf.s}
            rotate={leaf.r}
            color={i % 3 === 0 ? theme.canopy : leafInk}
            opacity={dark ? 0.8 - i * 0.07 : 0.34 - i * 0.03}
          />
        ))}
      </View>
      <View style={{ position: 'absolute', top: -18, ...(canopySide === 'left' ? { right: -18 } : { left: -18 }) }}>
        {[
          { x: 0, y: 0, s: 72, r: -32 },
          { x: 40, y: 54, s: 58, r: 28 },
          { x: -18, y: 72, s: 44, r: -10 },
        ].map((leaf, i) => (
          <Leaf
            key={i}
            left={leaf.x}
            top={leaf.y}
            size={leaf.s}
            rotate={leaf.r}
            color={leafInk}
            opacity={dark ? 0.5 : 0.24}
          />
        ))}
      </View>

      {/* Hanging vines frame the trail without crossing the content column. */}
      <Vine side="left" height={height * 0.42} top={-12} color={leafInk} accent={theme.accent} leaves={4} />
      <Vine side="right" height={height * 0.3} top={height * 0.18} color={leafInk} accent={theme.secondary} leaves={3} />

      {/* Resident bird: per-screen species, deliberately large and quiet. */}
      <View
        style={{
          position: 'absolute',
          top: height * 0.1,
          ...(birdSide === 'left' ? { left: -14 } : { right: -14 }),
          opacity: dark ? 0.17 : 0.2,
          transform: [{ rotate: birdSide === 'left' ? '-10deg' : '8deg' }],
        }}
      >
        <Text style={{ fontSize: Math.min(width * 0.4, 178), lineHeight: Math.min(width * 0.44, 196) }}>
          {theme.bird}
        </Text>
      </View>

      {/* Drifting fireflies: one shared breath, so the cost is one animation. */}
      <Animated.View style={[StyleSheet.absoluteFill, fireflyStyle]}>
        {fireflies.map((f, i) => (
          <Firefly
            key={i}
            x={f.x}
            y={(f.y + (idx * 37) % 90) % height}
            size={f.size}
            color={i % 3 === 0 ? theme.accent : theme.secondary}
          />
        ))}
      </Animated.View>

      {/* Expedition marker: names the habitat without adding chrome. */}
      <View style={{ position: 'absolute', bottom: 26, right: 18, alignItems: 'flex-end', opacity: 0.6 }}>
        <Text style={{ fontSize: 8, fontWeight: '800', letterSpacing: 2, color: theme.accent }}>
          {theme.habitat.toUpperCase()}
        </Text>
        <Text style={{ marginTop: 2, fontSize: 7, fontWeight: '700', letterSpacing: 1.4, color: dark ? p.muted : '#5A7256' }}>
          {theme.species.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}
