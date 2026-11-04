import { useMemo, useState } from 'react';
import { Animated, PanResponder, View } from 'react-native';
import { item, type AvatarLook } from '../lib/avatar';

/**
 * Layered avatar with a 3D tilt: drag sideways to turn it. Each layer sits
 * at a different depth and shifts by a different amount (parallax), and the
 * whole figure rotates in perspective, so it reads as a solid figure on
 * every platform without a 3D engine. It springs back to face you on release.
 */
export default function Avatar3D({ look, size = 240, interactive = true }: { look: AvatarLook; size?: number; interactive?: boolean }) {
  const [tilt] = useState(() => new Animated.Value(0)); // -1 … 1
  const pan = useMemo(
    () =>
      PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => interactive && Math.abs(g.dx) > 4,
      onPanResponderMove: (_e, g) => tilt.setValue(Math.max(-1, Math.min(1, g.dx / (size * 0.6)))),
      onPanResponderRelease: () => Animated.spring(tilt, { toValue: 0, friction: 4, useNativeDriver: true }).start(),
      onPanResponderTerminate: () => Animated.spring(tilt, { toValue: 0, friction: 4, useNativeDriver: true }).start(),
      }),
    [interactive, size, tilt]
  );

  const s = size / 240;
  const skin = item(look.skin)?.color ?? '#8D5A3B';
  const outfit = item(look.outfit)?.color ?? '#FF8A3D';
  const hat = item(look.hat);
  const eyes = item(look.eyes);
  const backdrop = item(look.backdrop)?.color ?? '#4B2A8F';
  const rotateY = tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-28deg', '28deg'] });
  const shift = (depth: number) => tilt.interpolate({ inputRange: [-1, 1], outputRange: [-depth * s, depth * s] });
  const kente = look.outfit === 'fit-kente';

  return (
    <View
      {...(interactive ? pan.panHandlers : {})}
      accessibilityLabel="Your avatar. Drag sideways to turn it."
      style={{ width: size, height: size * 1.1, borderRadius: 28 * s, backgroundColor: backdrop, overflow: 'hidden', alignItems: 'center' }}
    >
      {/* Backdrop glow, far layer */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 30 * s,
          width: 200 * s,
          height: 200 * s,
          borderRadius: 100 * s,
          backgroundColor: 'rgba(255,255,255,0.12)',
          transform: [{ translateX: shift(-10) }],
        }}
      />
      <Animated.View style={{ flex: 1, width: '100%', alignItems: 'center', transform: [{ perspective: 600 }, { rotateY }] }}>
        {/* Floor shadow */}
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 14 * s,
            width: 130 * s,
            height: 18 * s,
            borderRadius: 60 * s,
            backgroundColor: 'rgba(0,0,0,0.3)',
            transform: [{ translateX: shift(-6) }, { scaleX: tilt.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.8, 1, 0.8] }) }],
          }}
        />
        {/* Body */}
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 24 * s,
            width: 120 * s,
            height: 112 * s,
            borderTopLeftRadius: 56 * s,
            borderTopRightRadius: 56 * s,
            borderBottomLeftRadius: 24 * s,
            borderBottomRightRadius: 24 * s,
            backgroundColor: outfit,
            overflow: 'hidden',
            transform: [{ translateX: shift(4) }],
          }}
        >
          {kente
            ? [0, 1, 2, 3].map((i) => (
                <View key={i} style={{ height: 14 * s, marginTop: 12 * s, backgroundColor: i % 2 ? '#F2C14E' : '#1E7B4F' }} />
              ))
            : null}
          {/* Side shading moves with the turn so the torso reads as round */}
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 40 * s,
              backgroundColor: 'rgba(0,0,0,0.18)',
              transform: [{ translateX: tilt.interpolate({ inputRange: [-1, 1], outputRange: [90 * s, -10 * s] }) }],
            }}
          />
        </Animated.View>
        {/* Neck */}
        <Animated.View
          style={{ position: 'absolute', bottom: 128 * s, width: 30 * s, height: 16 * s, backgroundColor: skin, transform: [{ translateX: shift(7) }] }}
        />
        {/* Head */}
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 138 * s,
            width: 90 * s,
            height: 90 * s,
            borderRadius: 45 * s,
            backgroundColor: skin,
            transform: [{ translateX: shift(10) }],
          }}
        >
          {/* Face features sit nearest, so they move the most */}
          <Animated.View style={{ flex: 1, transform: [{ translateX: shift(9) }] }}>
            {eyes?.id === 'eyes-shades' ? (
              <View style={{ position: 'absolute', top: 34 * s, left: 14 * s, right: 14 * s, height: 16 * s, borderRadius: 8 * s, backgroundColor: eyes.color }} />
            ) : (
              <>
                <View style={{ position: 'absolute', top: 36 * s, left: 24 * s, width: 10 * s, height: 12 * s, borderRadius: 6 * s, backgroundColor: eyes?.color ?? '#1A0F08' }} />
                <View style={{ position: 'absolute', top: 36 * s, right: 24 * s, width: 10 * s, height: 12 * s, borderRadius: 6 * s, backgroundColor: eyes?.color ?? '#1A0F08' }} />
              </>
            )}
            <View
              style={{
                position: 'absolute',
                bottom: 18 * s,
                alignSelf: 'center',
                width: 28 * s,
                height: 12 * s,
                borderBottomLeftRadius: 14 * s,
                borderBottomRightRadius: 14 * s,
                backgroundColor: '#1A0F08',
              }}
            />
          </Animated.View>
        </Animated.View>
        {/* Hat, nearest layer on top of the head */}
        {hat && hat.id !== 'hat-none' ? (
          <Animated.View
            style={{
              position: 'absolute',
              bottom: (hat.id === 'hat-grad' ? 214 : 210) * s,
              width: (hat.id === 'hat-grad' ? 110 : 84) * s,
              height: (hat.id === 'hat-crown' ? 30 : 22) * s,
              backgroundColor: hat.color,
              borderTopLeftRadius: hat.id === 'hat-cap' ? 40 * s : 4 * s,
              borderTopRightRadius: hat.id === 'hat-cap' ? 40 * s : 4 * s,
              borderBottomLeftRadius: 4 * s,
              borderBottomRightRadius: 4 * s,
              transform: [{ translateX: shift(12) }, { rotate: hat.id === 'hat-grad' ? '-4deg' : '0deg' }],
            }}
          >
            {hat.id === 'hat-crown' ? (
              <View style={{ position: 'absolute', top: -12 * s, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around' }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={{ width: 16 * s, height: 16 * s, backgroundColor: hat.color, transform: [{ rotate: '45deg' }] }} />
                ))}
              </View>
            ) : null}
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}
