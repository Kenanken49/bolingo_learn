import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import Text from '../../../components/ui/Text';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AppIcon from '../../../components/AppIcon';
import Celebration, { FULL_CELEBRATION_MS } from '../../../components/Celebration';
import { useNatural } from '../../../lib/natural';
import {
  BENCHMARK_SETTLE_MS,
  BENCHMARK_STALL_MS,
  summarizeFrameTimes,
  type FrameStats,
} from '../../../lib/celebrationBenchmark';

interface StatProps {
  label: string;
  value: string;
  unit: string;
  note: string;
  color: string;
  line: string;
  surface: string;
  ink: string;
  muted: string;
}

function Stat({ label, value, unit, note, color, line, surface, ink, muted }: StatProps) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 140,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: line,
        backgroundColor: surface,
        padding: 14,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
        <Text style={{ fontSize: 32, fontWeight: '800', color: ink }}>{value}</Text>
        <Text style={{ marginLeft: 3, fontSize: 12, fontWeight: '800', color: muted }}>{unit}</Text>
      </View>
      <Text style={{ marginTop: 2, fontSize: 11, lineHeight: 15, fontWeight: '600', color: muted }}>
        {note}
      </Text>
    </View>
  );
}

function BenchmarkContent() {
  const p = useNatural();
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<FrameStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const samples = useRef<number[]>([]);

  const start = () => {
    if (running) return;
    if (typeof globalThis.requestAnimationFrame !== 'function') {
      setError('requestAnimationFrame is unavailable in this runtime.');
      return;
    }
    samples.current = [];
    setStats(null);
    setError(null);
    setRunning(true);
  };

  const finish = useCallback(() => {
    setRunning(false);
    const next = summarizeFrameTimes(samples.current);
    if (!next) {
      setError('No usable frames were captured. Keep the app in the foreground and run again.');
    }
    setStats(next);
  }, []);

  useEffect(() => {
    if (!running) return;

    samples.current = [];
    let handle = 0;
    let first = 0;
    let last = 0;

    const tick = (now: number) => {
      if (!first) first = now;
      // Match the celebration's own settle window: the first 700ms are mount
      // cost (layout, fonts, Reanimated setup), not steady-state animation.
      if (last > 0 && now - first >= BENCHMARK_SETTLE_MS) {
        const dt = now - last;
        // A backgrounded tab or a 200ms+ stall is not a slow animation frame.
        if (dt > 0 && dt < BENCHMARK_STALL_MS) samples.current.push(dt);
      }
      last = now;
      handle = globalThis.requestAnimationFrame(tick);
    };

    handle = globalThis.requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [running]);

  const state = running ? 'measuring' : error ? 'error' : stats ? 'complete' : 'idle';
  const metrics = [
    {
      label: 'p50 FRAME',
      value: stats ? stats.p50.toFixed(1) : '—',
      unit: 'ms',
      note: 'Typical steady-state frame',
      color: p.moss,
    },
    {
      label: 'p95 FRAME',
      value: stats ? stats.p95.toFixed(1) : '—',
      unit: 'ms',
      note: 'Slow-tail frame',
      color: p.honey,
    },
    {
      label: 'MEAN',
      value: stats ? stats.mean.toFixed(1) : '—',
      unit: 'ms',
      note: 'Average frame time',
      color: p.teal,
    },
    {
      label: 'MAX',
      value: stats ? stats.max.toFixed(1) : '—',
      unit: 'ms',
      note: 'Slowest accepted frame',
      color: p.berry,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView
        contentContainerStyle={{
          width: '100%',
          maxWidth: 620,
          alignSelf: 'center',
          paddingHorizontal: 20,
          paddingTop: 52,
          paddingBottom: 48,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.replace('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Back to Settings"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <AppIcon name="chevBack" size={16} color={p.moss} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: p.moss }}>Settings</Text>
          </View>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 }}>
          <View
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: p.honey,
              backgroundColor: p.isDark ? '#241A00' : '#FFF6D8',
              paddingHorizontal: 9,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{ fontSize: 9, fontWeight: '800', letterSpacing: 1.2, color: p.honey }}
            >
              DEV ONLY
            </Text>
          </View>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: p.muted }}>
            PERFORMANCE LAB
          </Text>
        </View>

        <Text style={{ marginTop: 10, fontSize: 30, fontWeight: '800', color: p.ink }}>
          Celebration benchmark
        </Text>
        <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 21, fontWeight: '600', color: p.muted }}>
          Runs the real five-second storm, not a copy. Frame deltas are sampled after the
          700ms mount settle, then reduced to p50 and p95 when the celebration ends.
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
          {metrics.map((metric) => (
            <Stat
              key={metric.label}
              label={metric.label}
              value={metric.value}
              unit={metric.unit}
              note={metric.note}
              color={metric.color}
              line={p.line}
              surface={p.surface}
              ink={p.ink}
              muted={p.muted}
            />
          ))}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: p.line,
            backgroundColor: p.surfaceAlt,
            paddingHorizontal: 14,
            paddingVertical: 11,
          }}
        >
          <View>
            <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 1.2, color: p.muted }}>
              FRAME SAMPLES
            </Text>
            <Text style={{ marginTop: 1, fontSize: 15, fontWeight: '800', color: p.ink }}>
              {stats ? stats.samples : '—'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 1.2, color: p.muted }}>
              AVERAGE FPS
            </Text>
            <Text style={{ marginTop: 1, fontSize: 15, fontWeight: '800', color: p.ink }}>
              {stats ? stats.fps.toFixed(1) : '—'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 1.2, color: p.muted }}>
              STATE
            </Text>
            <Text
              style={{
                marginTop: 1,
                fontSize: 12,
                fontWeight: '800',
                letterSpacing: 0.6,
                color:
                  state === 'measuring'
                    ? p.honey
                    : state === 'complete'
                      ? p.moss
                      : state === 'error'
                        ? p.berry
                        : p.stone,
              }}
            >
              {state.toUpperCase()}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={start}
          disabled={running}
          accessibilityRole="button"
          accessibilityLabel={running ? 'Measuring celebration frames' : 'Run celebration benchmark'}
          style={({ pressed }) => ({
            marginTop: 18,
            alignItems: 'center',
            borderRadius: 16,
            borderBottomWidth: pressed && !running ? 0 : 4,
            borderBottomColor: p.honey,
            backgroundColor: running ? p.line : p.honey,
            paddingVertical: 15,
            opacity: running ? 0.65 : 1,
            transform: [{ translateY: pressed && !running ? 3 : 0 }],
          })}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '800',
              letterSpacing: 0.8,
              color: p.isDark ? '#1A1300' : '#FFFDF8',
            }}
          >
            {running ? 'MEASURING…' : stats ? 'RUN AGAIN' : 'RUN BENCHMARK'}
          </Text>
        </Pressable>

        {error ? (
          <Text
            style={{
              marginTop: 12,
              fontSize: 12,
              lineHeight: 18,
              fontWeight: '700',
              color: p.berry,
            }}
          >
            {error}
          </Text>
        ) : null}

        <View
          style={{
            marginTop: 20,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: p.line,
            backgroundColor: p.surface,
            padding: 14,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: p.ink }}>How to read it</Text>
          <Text
            style={{
              marginTop: 4,
              fontSize: 11.5,
              lineHeight: 18,
              fontWeight: '600',
              color: p.muted,
            }}
          >
            p50 is the frame a learner feels as “normal”; p95 is the slow tail that reads as
            stutter. Keep the app foregrounded, let the full five seconds finish, and run a
            profile/release build for device numbers — a dev JS bundle adds overhead.
          </Text>
          <Text style={{ marginTop: 7, fontSize: 10.5, fontWeight: '700', color: p.stone }}>
            Settle {BENCHMARK_SETTLE_MS}ms · discard ≥{BENCHMARK_STALL_MS}ms · 42-ribbon storm
          </Text>
        </View>

        <Text style={{ marginTop: 14, fontSize: 10, fontWeight: '700', color: p.stone }}>
          /dev/celebration-benchmark · hidden outside development builds
        </Text>
      </ScrollView>

      {running ? <Celebration duration={FULL_CELEBRATION_MS} onDone={finish} /> : null}
      <StatusBar style={p.isDark ? 'light' : 'dark'} />
    </View>
  );
}

/**
 * The file route exists in production bundles, but the screen itself is a
 * redirect there. Keeping the check at the route boundary means no benchmark
 * state, rAF sampler or celebration can mount in a shipped build.
 */
export default function CelebrationBenchmarkRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <BenchmarkContent />;
}
