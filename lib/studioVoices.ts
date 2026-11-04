import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { supabase } from './supabase';
import {
  characterSpeaks,
  characterVoice,
  type CharacterId,
} from '../supabase/functions/_shared/characterVoices';

/**
 * Studio voices for Livia, Bingo and Zora.
 *
 * The lesson path is still `speakAs()` in `lib/pronunciation.ts`; this module
 * installs itself into it as an optional first attempt. Everything here is
 * best-effort and reversible:
 *
 *  - unsupported language (Swahili) → no request at all, device voice speaks;
 *  - missing function, no network, signed-out, provider outage → the device
 *    voice speaks after at most three failed requests in the session;
 *  - a line already cached server-side is a signed URL, so a repeat play costs
 *    nothing and starts almost immediately.
 *
 * The clip is content-addressed by character + tuning + language + text, so a
 * cached URL is safe to reuse for the life of the signature.
 */

/** Signed URLs live an hour; refresh well inside that so a long lesson never stalls. */
const URL_TTL_MS = 50 * 60 * 1000;
/** After this many consecutive failures, stop trying for the rest of the session. */
const MAX_CONSECUTIVE_FAILURES = 3;

type CachedLine = { url: string; at: number };

const urls = new Map<string, CachedLine>();
let consecutiveFailures = 0;
let player: AudioPlayer | null = null;
let currentSource: string | null = null;
let playToken = 0;

export interface StudioLineRequest {
  character: CharacterId;
  text: string;
  /** Base language of the line: en / es / fr / de / sw. */
  language: string;
  slow: boolean;
}

export function studioVoicesAvailable(): boolean {
  return consecutiveFailures < MAX_CONSECUTIVE_FAILURES;
}

function keyFor(request: StudioLineRequest): string {
  return `${request.character}|${request.language}|${request.text}`;
}

function baseLanguage(value: string): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0] ?? '';
}

async function fetchLineUrl(request: StudioLineRequest): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('character-voice', {
    body: {
      character: request.character,
      text: request.text,
      language: baseLanguage(request.language),
    },
  });
  if (error) return null;
  const url = (data as { url?: unknown } | null)?.url;
  return typeof url === 'string' && url ? url : null;
}

function releasePlayer(): void {
  if (!player) return;
  try {
    player.pause();
  } catch {
    // A released player can throw during teardown; nothing to recover.
  }
}

/**
 * One line of evidence per character line, only in development builds. The
 * device test reads these from `adb logcat` to tell a studio clip from a
 * silent fallback — the only honest way to know which voice a device heard.
 */
function trace(character: string, outcome: string): void {
  if (!__DEV__) return;
  console.log(`[CharacterVoice] ${character} ${outcome}`);
}

/** Stop a studio clip — called when any other voice takes over. */
export function stopStudioLine(): void {
  playToken += 1;
  releasePlayer();
}

/**
 * Wait for the current clip to finish. Resolves true when it played to the end,
 * false when it was interrupted or failed. The timer is a safety net for a
 * player that never reports `didJustFinish` (e.g. a dropped connection mid-clip).
 */
function waitForEnd(audio: AudioPlayer, token: number, text: string, rate: number): Promise<boolean> {
  const words = text.split(/\s+/).filter(Boolean).length;
  const budget = Math.min(30_000, Math.max(1_500, (words * 420 + 900) / Math.max(0.5, rate)));
  return new Promise((resolve) => {
    let settled = false;
    // "It did not throw" is not "it was heard". A browser that blocks autoplay
    // leaves the player sitting at 0:00 with no error, so the timeout may only
    // count as a success once playback was actually observed. Otherwise the
    // caller would report a studio voice it never played and the learner gets
    // silence instead of the device-voice fallback.
    let started = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        subscription.remove();
      } catch {
        // Listener already gone.
      }
      resolve(ok && token === playToken);
    };
    const timer = setTimeout(() => finish(started), budget);
    const subscription = audio.addListener('playbackStatusUpdate', (status) => {
      if (status.playing || status.currentTime > 0) started = true;
      if (token !== playToken) finish(false);
      else if (status.didJustFinish) finish(true);
    });
  });
}

/**
 * Play one character line from ElevenLabs. Returns the studio voice's name on a
 * completed play, or null when the caller should fall back to the device voice.
 * Never throws: a character line going silent is worse than a robot voice.
 */
export async function playStudioLine(request: StudioLineRequest): Promise<string | null> {
  const voice = characterVoice(request.character);
  if (!voice) return null;
  if (!characterSpeaks(voice.id, request.language)) {
    trace(voice.id, `fallback language=${baseLanguage(request.language)}`);
    return null;
  }
  if (!studioVoicesAvailable()) {
    trace(voice.id, 'fallback circuit-open');
    return null;
  }

  const key = keyFor(request);
  const cached = urls.get(key);
  let url = cached && Date.now() - cached.at < URL_TTL_MS ? cached.url : null;

  if (!url) {
    const startedAt = Date.now();
    try {
      url = await fetchLineUrl(request);
    } catch {
      url = null;
    }
    if (!url) {
      consecutiveFailures += 1;
      trace(voice.id, `fallback request-failed failures=${consecutiveFailures}`);
      return null;
    }
    consecutiveFailures = 0;
    urls.set(key, { url, at: Date.now() });
    trace(voice.id, `studio ${voice.studioName} cache=miss ${Date.now() - startedAt}ms`);
  } else {
    trace(voice.id, `studio ${voice.studioName} cache=hit`);
  }

  try {
    const token = playToken + 1;
    playToken = token;
    if (!player) {
      player = createAudioPlayer({ uri: url });
      currentSource = url;
    } else if (currentSource !== url) {
      player.replace({ uri: url });
      currentSource = url;
    }
    player.shouldCorrectPitch = true;
    player.setPlaybackRate(request.slow ? 0.7 : 1, 'high');
    await player.seekTo(0);
    player.play();
    const playStartedAt = Date.now();
    const finished = await waitForEnd(player, token, request.text, request.slow ? 0.7 : 1);
    trace(voice.id, finished ? `played ${Date.now() - playStartedAt}ms` : 'fallback playback-never-started');
    return finished ? voice.studioName : null;
  } catch {
    // A stale signed URL, a codec issue or a torn-down player: fall back once,
    // and let the next request re-fetch rather than replaying a broken URL.
    urls.delete(key);
    releasePlayer();
    consecutiveFailures += 1;
    trace(voice.id, `fallback player-error failures=${consecutiveFailures}`);
    return null;
  }
}
