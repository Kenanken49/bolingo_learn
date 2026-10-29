import { useEffect, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Live celebration: colorful ribbons keep pouring for `duration`, then vanish.
 * Mount it on a win (lesson results, chest claim) and let it unmount itself via
 * onDone — zero timers in the caller.
 *
 * Each ribbon loops on its own cycle while one shared clock runs, so the long
 * version stays dense without mounting hundreds of views. The full duration
 * matches the five-second applause; the default is the quick burst.
 *
 * Quality is adaptive: 42 animated views are free on a flagship and can drag a
 * low-end Android under 30fps, so the storm samples its own frame times and
 * thins the ribbon count when the frame budget is blown. The shared clock is never
 * touched, so trimming particles cannot shorten the five seconds or break the
 * audio sync. Removing the tail of the array is seamless — each ribbon is seeded
 * by index, so survivors keep their exact position, colour and fall phase.
 *
 *   {burst && <Celebration duration={FULL_CELEBRATION_MS} onDone={...} />}
 */

/** Must match the mastered results/chest cue in assets/audio/celebration.wav. */
export const FULL_CELEBRATION_MS = 5000;
const RIBBON_COLORS = [
  '#00E5FF', '#FFC400', '#FF2DAA', '#8B5CFF', '#00E676',
  '#FF3B5C', '#B6FF00', '#00D1FF', '#F56193', '#E9B845',
];

const DEFAULT_DURATION = 1000;
const MIN_RIBBONS = 16;
/** A frame over two vsyncs at 60Hz: the storm is running below ~30fps. */
const LONG_FRAME_MS = 32;
/** More than half the window is long frames — sustained, not a GC blip. */
const SLOW_FRAME_RATIO = 0.5;
/** Ignore stalls longer than this: a backgrounded tab, not a slow frame. */
const STALL_MS = 200;
/** Ignore the mount spike: 42 first frames of layout cost are not steady state. */
const SETTLE_MS = 700;
const SAMPLE_FRAMES = 30;
/** Two cuts take 42 → 29 → 20; beyond that the storm stops reading as confetti. */
const MAX_REDUCTIONS = 2;

interface Ribbon {
  left: number;
  w: number;
  h: number;
  color: string;
  rot: number;
  drift: number;
  phase: number;
  cycle: number;
  offset: number;
}

function Piece({
  r,
  height,
  progress,
  duration,
}: {
  r: Ribbon;
  height: number;
  progress: SharedValue<number>;
  duration: number;
}) {
  const style = useAnimatedStyle(() => {
    // One shared clock, one private fall cycle per ribbon. Offsets spread the
    // first wave down the screen immediately; the differing cycles keep the
    // long version from pulsing on a single obvious beat.
    const elapsed = (progress.value * duration) / 1000;
    const local = ((elapsed + r.offset) % r.cycle) / r.cycle;
    const fall = local * (height + 160);
    const sway = Math.sin(local * Math.PI * 2 + r.phase) * r.drift;
    const cycleFade = local > 0.78 ? Math.max(0, 1 - (local - 0.78) / 0.22) : 1;
    // Lay the last ~400ms down gently instead of cutting the storm dead.
    const exit = progress.value > 0.92 ? (1 - progress.value) / 0.08 : 1;
    return {
      transform: [{ translateY: -120 + fall }, { translateX: sway }, { rotate: `${r.rot + local * 540}deg` }],
      opacity: cycleFade * exit,
    };
  });
  return (
    <Reanimated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: r.left,
          top: 0,
          width: r.w,
          height: r.h,
          borderRadius: 2,
          backgroundColor: r.color,
        },
        style,
      ]}
    />
  );
}

export default function Celebration({
  onDone,
  count = 42,
  duration = DEFAULT_DURATION,
}: {
  onDone: () => void;
  count?: number;
  duration?: number;
}) {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);
  // Ribbon budget for this run. Starts at the requested count and only ever
  // steps down, so the storm never oscillates between qualities mid-fall.
  const [liveCount, setLiveCount] = useState(count);

  useEffect(() => {
    if (typeof globalThis.requestAnimationFrame !== 'function') return;
    const floor = Math.min(MIN_RIBBONS, count);
    let handle = 0;
    let first = 0;
    let last = 0;
    let cuts = 0;
    const samples: number[] = [];

    const tick = (now: number) => {
      if (!first) first = now;
      if (last > 0 && now - first >= SETTLE_MS) {
        const dt = now - last;
        if (dt > 0 && dt < STALL_MS) samples.push(dt);
      }
      last = now;
      if (samples.length >= SAMPLE_FRAMES) {
        // Ratio of genuinely long frames, not the mean: a fast device that
        // stutters once per GC still has a low mean, and a 120Hz panel would
        // otherwise look slow next to a 60Hz one. Only a sustained majority of
        // >32ms frames means the storm itself is too heavy.
        const long = samples.reduce((n, dt) => n + (dt > LONG_FRAME_MS ? 1 : 0), 0);
        const ratio = long / samples.length;
        samples.length = 0;
        if (ratio >= SLOW_FRAME_RATIO && cuts < MAX_REDUCTIONS) {
          cuts += 1;
          setLiveCount((n) => Math.max(floor, Math.round(n * 0.7)));
        }
      }
      // Call through globalThis: an unbound rAF reference throws in browsers.
      handle = globalThis.requestAnimationFrame(tick);
    };

    handle = globalThis.requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
    // The budget and floor are fixed for the life of one storm.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ribbons = useMemo<Ribbon[]>(
    () =>
      Array.from({ length: liveCount }, (_, i) => {
        // 0.72–1.68s per fall: short enough to read as confetti, varied enough
        // that five seconds of it never looks like a metronome.
        const cycle = 0.72 + (((i * 733) % 97) / 100);
        return {
          left: (((i * 9973 + 7919) % 1000) / 1000) * width,
          w: 6 + (((i * 613) % 7) / 7) * 7,
          h: 10 + (((i * 877) % 9) / 9) * 10,
          color: RIBBON_COLORS[i % RIBBON_COLORS.length],
          rot: ((i * 331) % 360) - 180,
          drift: 18 + ((i * 449) % 30),
          phase: ((i * 557) % 628) / 100,
          cycle,
          offset: (((i * 479) % 1000) / 1000) * cycle,
        };
      }),
    [liveCount, width]
  );

  useEffect(() => {
    progress.value = withDelay(
      60,
      withTiming(1, { duration, easing: Easing.linear }, (done) => {
        if (done) runOnJS(onDone)();
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  return (
    <Reanimated.View
      testID="celebration-burst"
      accessibilityLabel={`${ribbons.length} ribbons`}
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 60 }}
    >
      {ribbons.map((r, i) => (
        <Piece key={i} r={r} height={height} progress={progress} duration={duration} />
      ))}
    </Reanimated.View>
  );
}
