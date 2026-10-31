import { useEffect, useRef } from 'react';
import type { AudioStatus } from 'expo-audio';

/** Surfaces that can audition the bundled Premium narrator. */
export type NarratorSampleSurface = 'paywall' | 'settings';

export const NARRATOR_SAMPLE_LOG_PREFIX = '[NarratorSample]';

/**
 * Development-only deep-link hook used by the on-device playback test. The
 * route calls the same toggle as the Play button, so the test still exercises
 * the screen's real audio path without depending on an accessibility dumper.
 */
export function narratorAuditRequested(value: string | string[] | undefined): boolean {
  const requested = Array.isArray(value) ? value[0] : value;
  return __DEV__ && requested === '1';
}

/**
 * Records one line per playback run once the bundled player has actually
 * advanced. `scripts/test-narrator-sample-device.cjs` reads this from
 * `adb logcat` so a device test proves decoded playback on both surfaces, not
 * just that a Play button was tapped or a label changed.
 *
 * Development only: release builds stay silent.
 */
export function useNarratorSampleProbe(surface: NarratorSampleSurface, status: AudioStatus) {
  const logged = useRef(false);

  useEffect(() => {
    if (!status.playing) {
      // A pause or a finished run arms the probe for the next play.
      logged.current = false;
      return;
    }
    if (logged.current || status.currentTime < 0.25) return;

    logged.current = true;
    if (!__DEV__) return;

    console.log(
      `${NARRATOR_SAMPLE_LOG_PREFIX} surface=${surface} event=playing ` +
        `position=${status.currentTime.toFixed(2)} duration=${status.duration.toFixed(2)} ` +
        'source=bundled'
    );
  }, [surface, status.currentTime, status.duration, status.playing]);
}
