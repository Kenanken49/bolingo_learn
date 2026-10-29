import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { CELEBRATION, QUIZ_CORRECT, WRONG_CUE } from '../assets/sounds';
import { getRewardVolume, getSoundOn } from './preferences';

/**
 * Shared reward cues. The quiz engine keeps its own preloaded players for
 * latency, but applies the same persisted volume; this module owns the
 * results/chest celebration and exposes all three for the Settings auditions.
 * Respects the user's sound toggle; silent no-ops on failure.
 */
let quizPlayer: AudioPlayer | null = null;
let celebrationPlayer: AudioPlayer | null = null;
let wrongPlayer: AudioPlayer | null = null;

/** Warm the quiz players during a lesson so the first answer is instant.
 *  Safe to call repeatedly; does nothing while sound is off. */
export async function preloadRewardCues(): Promise<void> {
  try {
    if (!(await getSoundOn())) return;
    quizPlayer ??= createAudioPlayer(QUIZ_CORRECT);
    wrongPlayer ??= createAudioPlayer(WRONG_CUE);
  } catch {}
}

async function start(player: AudioPlayer | null, make: () => AudioPlayer): Promise<AudioPlayer | null> {
  if (!(await getSoundOn())) return player;
  const p = player ?? make();
  p.volume = await getRewardVolume();
  await p.seekTo(0);
  p.play();
  return p;
}

/** Per-answer reward — ~1.2s. */
export async function playQuizCorrect(): Promise<void> {
  try {
    quizPlayer = await start(quizPlayer, () => createAudioPlayer(QUIZ_CORRECT));
  } catch {}
}

/** Results screen and chest claims — 5.00s of real crowd applause. */
export async function playCelebration(): Promise<void> {
  try {
    celebrationPlayer = await start(celebrationPlayer, () => createAudioPlayer(CELEBRATION));
  } catch {}
}

/** Soft wooden correction — ~0.9s. */
export async function playWrong(): Promise<void> {
  try {
    wrongPlayer = await start(wrongPlayer, () => createAudioPlayer(WRONG_CUE));
  } catch {}
}

/** Settings auditions: silence whatever is still ringing before the next cue,
 *  so comparing two sounds never stacks them on top of each other. */
export async function stopRewardCues(): Promise<void> {
  for (const player of [quizPlayer, celebrationPlayer, wrongPlayer]) {
    try {
      player?.pause();
    } catch {}
  }
}
