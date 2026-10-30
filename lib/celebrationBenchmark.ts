/**
 * Frame-time statistics for the dev-only celebration benchmark.
 *
 * The benchmark samples the same rAF cadence the celebration's adaptive
 * quality check uses. It deliberately ignores the first 700ms (layout, font
 * rasterisation, Reanimated mount) and any gap over 200ms (a backgrounded tab),
 * so p50/p95 describe steady-state animation rather than startup or a phone
 * call interrupting the run.
 *
 * No React Native imports live here: the Node guard can execute this module
 * directly.
 */

/** Match the celebration's own settle window before it starts quality sampling. */
export const BENCHMARK_SETTLE_MS = 700;
/** Ignore backgrounded/stalled frames rather than reporting them as slow frames. */
export const BENCHMARK_STALL_MS = 200;

export interface FrameStats {
  /** Number of usable frame deltas. */
  samples: number;
  /** Median frame time, in milliseconds. */
  p50: number;
  /** 95th-percentile frame time, in milliseconds. */
  p95: number;
  mean: number;
  max: number;
  /** Mean-based frames per second; useful as a companion to the percentiles. */
  fps: number;
}

/** Linear-interpolated percentile over an ascending array. */
function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const rank = (sorted.length - 1) * (p / 100);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  const weight = rank - low;
  return sorted[low]! + (sorted[high]! - sorted[low]!) * weight;
}

/**
 * Summarise sampled frame deltas. Invalid deltas (zero, negative, NaN,
 * Infinity) and stalls at/above `BENCHMARK_STALL_MS` are discarded. Returns
 * null when nothing usable was captured, so the UI can say so instead of
 * showing a fake 0ms percentile.
 */
export function summarizeFrameTimes(
  frameTimes: readonly number[],
  options: { stallMs?: number } = {}
): FrameStats | null {
  const stallMs = options.stallMs ?? BENCHMARK_STALL_MS;
  const usable = frameTimes.filter(
    (dt) => Number.isFinite(dt) && dt > 0 && dt < stallMs
  );
  if (usable.length === 0) return null;

  const sorted = [...usable].sort((a, b) => a - b);
  const total = sorted.reduce((sum, dt) => sum + dt, 0);
  const mean = total / sorted.length;
  return {
    samples: sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    mean,
    max: sorted[sorted.length - 1]!,
    fps: mean > 0 ? 1000 / mean : 0,
  };
}
