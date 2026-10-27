import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { CORRECT_CHIME, WRONG_BUZZ } from '../assets/sounds';
import { getSoundOn } from './preferences';

/**
 * Shared audio cues (the signature "ding"): the same crisp chimes the quiz
 * engine plays, reusable from any screen — level-ups, chest claims, streak
 * saves. Respects the user's sound toggle; silent no-ops on failure.
 */
let correctPlayer: AudioPlayer | null = null;
let wrongPlayer: AudioPlayer | null = null;

async function play(player: AudioPlayer | null, make: () => AudioPlayer): Promise<AudioPlayer> {
  const p = player ?? make();
  await p.seekTo(0);
  p.play();
  return p;
}

export async function playCorrect(): Promise<void> {
  try {
    if (!(await getSoundOn())) return;
    correctPlayer = await play(correctPlayer, () => createAudioPlayer(CORRECT_CHIME));
  } catch {}
}

export async function playWrong(): Promise<void> {
  try {
    if (!(await getSoundOn())) return;
    wrongPlayer = await play(wrongPlayer, () => createAudioPlayer(WRONG_BUZZ));
  } catch {}
}
