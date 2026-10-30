import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { SWAHILI_CLIPS, type SwahiliClip } from '../assets/audio/swahili/clips';

/**
 * Natural, human-sounding Swahili for Livia's phrase lessons.
 *
 * Clips are generated ahead of time by `scripts/generate-fliki-swahili.cjs`
 * and bundled with the app, so playback needs no key, no network and no
 * per-play credit. A phrase without a clip returns `false` and the caller
 * keeps its existing on-device TTS path.
 *
 * The same normalized key is used by the generator: case, punctuation and
 * whitespace do not change which clip is selected.
 */

const NORMAL_RATE = 0.9;
const SLOW_RATE = 0.68;

function phraseKey(text: string): string {
  return text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function naturalSwahiliClip(text: string): SwahiliClip | null {
  const key = phraseKey(text);
  return key ? SWAHILI_CLIPS[key] ?? null : null;
}

export function hasNaturalSwahili(text: string): boolean {
  return naturalSwahiliClip(text) !== null;
}

let player: AudioPlayer | null = null;
let loadedSource: number | null = null;

function playerFor(clip: SwahiliClip): AudioPlayer | null {
  if (!player) {
    player = createAudioPlayer(clip.source);
    loadedSource = clip.source;
    return player;
  }
  if (loadedSource !== clip.source) {
    player.replace(clip.source);
    loadedSource = clip.source;
  }
  return player;
}

/**
 * Play a bundled clip. Returns false when this phrase has no natural take, so
 * the caller can fall back to the device voice rather than going silent.
 */
export async function playNaturalSwahili(
  text: string,
  options: { slow?: boolean } = {}
): Promise<boolean> {
  const clip = naturalSwahiliClip(text);
  if (!clip) return false;
  try {
    const audio = playerFor(clip);
    if (!audio) return false;
    audio.shouldCorrectPitch = true;
    audio.setPlaybackRate(options.slow ? SLOW_RATE : NORMAL_RATE, 'high');
    await audio.seekTo(0);
    audio.play();
    return true;
  } catch {
    return false;
  }
}

/** Stop a natural clip before any other voice takes over. */
export async function stopNaturalSwahili(): Promise<void> {
  if (!player) return;
  try {
    player.pause();
  } catch {
    // A released player can throw during teardown; nothing to recover.
  }
}
