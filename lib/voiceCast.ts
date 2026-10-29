import { APP_SPEECH, speakAs, type Mentor, type PronounceResult } from './pronunciation';

/**
 * The three teaching voices, as a learner meets them before a lesson.
 *
 * Settings auditions through `auditionVoice()`, which calls the exact same
 * `speakAs()` the lessons use. That matters: the sample must go through the
 * real pronunciation path (gender-matched installed voice, character pacing,
 * human rate) or the preview would promise a sound the lessons never make.
 */
export interface CastMember {
  id: Mentor;
  name: string;
  role: string;
  /** One line of context under the name, so the play button has meaning. */
  blurb: string;
  /** Spoken verbatim by the lesson voice. */
  line: string;
}

export const VOICE_CAST: CastMember[] = [
  {
    id: 'livia',
    name: 'Livia',
    role: 'Language mentor',
    blurb: 'Warm and unhurried — she waits for every syllable.',
    line: "Hello, I'm Livia. Let's take this slowly: one word, then one sentence, until it sounds like yours.",
  },
  {
    id: 'bingo',
    name: 'Bingo',
    role: 'Lesson host',
    blurb: 'Bright and quick — he keeps the streak alive.',
    line: "Hey, Bingo here! Ready for today's lesson? Let's earn some XP and keep that streak glowing.",
  },
  {
    id: 'zora',
    name: 'Zora',
    role: 'Build coach',
    blurb: 'Brisk and practical — she talks you through the code.',
    line: "I'm Zora. Show me what you're building, and we'll fix it line by line — no fuss, no guessing.",
  },
];

/** Unknown ids can't reach the UI, but keep it total for callers. */
export function castMember(id: Mentor): CastMember {
  return VOICE_CAST.find((member) => member.id === id) ?? VOICE_CAST[0]!;
}

/**
 * Speak a character's sample line. Resolves when the utterance ends (or is
 * stopped by the next audition), with the engine's own result so the caller can
 * tell "no voice installed" apart from "played fine".
 */
export function auditionVoice(id: Mentor): Promise<PronounceResult> {
  const member = castMember(id);
  return speakAs({ character: member.id, text: member.line, language: APP_SPEECH });
}
