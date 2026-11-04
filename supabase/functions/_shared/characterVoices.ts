/**
 * Livia, Bingo and Zora — the studio voices behind the characters.
 *
 * The characters used to exist only as pacing on the device TTS engine. This
 * module gives each of them a real ElevenLabs voice plus the delivery settings
 * that make it sound like the character, and it is the single trust boundary
 * for the character voice endpoint: the function only ever synthesizes a voice
 * id that appears here.
 *
 * Keep this file dependency-free. Deno imports it, Node transpiles it for
 * `scripts/check-character-voices.cjs`, and the client imports the same tuning
 * so Settings can name the voice honestly. Never put an API key in it.
 */

export type CharacterId = 'livia' | 'bingo' | 'zora';

export interface CharacterVoice {
  id: CharacterId;
  /** Display name the learner knows. */
  name: string;
  /** ElevenLabs voice id. */
  voiceId: string;
  /** The ElevenLabs voice name, shown in Settings so the choice is verifiable. */
  studioName: string;
  /** Why this voice is the character, in one line. */
  note: string;
  /**
   * Multilingual v2: the only ElevenLabs model that covers every character's
   * teaching language (ES/FR/DE). Turbo v2.5 drops German pronunciation
   * quality on short phrases, which is the one thing a language mentor must
   * get right.
   */
  modelId: string;
  /** Consistency of delivery. Higher = steadier. */
  stability: number;
  similarityBoost: number;
  /** Style exaggeration. Higher = more performed, less neutral. */
  style: number;
  speed: number;
  useSpeakerBoost: boolean;
  /** Course languages this voice can actually speak. */
  languages: readonly string[];
}

/**
 * Swahili is not in the multilingual v2 model's language list. A Swahili line
 * stays on the device voice (and Livia's bundled Fliki takes) rather than being
 * read with English phonetics, which is worse than the honest robot voice.
 */
export const STUDIO_LANGUAGES: readonly string[] = ['en', 'es', 'fr', 'de'];

export const CHARACTER_VOICES: readonly CharacterVoice[] = Object.freeze([
  Object.freeze({
    id: 'livia' as CharacterId,
    name: 'Livia',
    voiceId: 'Xb7hH8MSUJpSbSDYk0k2',
    studioName: 'Alice — Clear, Engaging Educator',
    note: 'Warm and unhurried — she waits for every syllable.',
    modelId: 'eleven_multilingual_v2',
    // Language modelling wants the steadiest read: the learner is copying this
    // pronunciation, so variation is a teaching defect, not personality.
    stability: 0.62,
    similarityBoost: 0.82,
    style: 0.08,
    speed: 0.92,
    useSpeakerBoost: true,
    languages: STUDIO_LANGUAGES,
  }),
  Object.freeze({
    id: 'bingo' as CharacterId,
    name: 'Bingo',
    voiceId: 'iP95p4xoKVk53GoZ742B',
    studioName: 'Chris — Charming, Down-to-Earth',
    note: 'Bright and quick — he keeps the streak alive.',
    modelId: 'eleven_multilingual_v2',
    // The host carries excitement; a little instability is what makes a
    // congratulation land as celebration instead of a narrator reading it.
    stability: 0.38,
    similarityBoost: 0.75,
    style: 0.34,
    speed: 1.04,
    useSpeakerBoost: true,
    languages: STUDIO_LANGUAGES,
  }),
  Object.freeze({
    id: 'zora' as CharacterId,
    name: 'Zora',
    voiceId: 'XrExE9yKIg1WjnnlVkGX',
    studioName: 'Matilda — Knowledgeable, Professional',
    note: 'Brisk and practical — she talks you through the code.',
    modelId: 'eleven_multilingual_v2',
    // A build coach is clipped and precise: near-neutral style, a hair slower
    // than conversational so code identifiers stay intelligible.
    stability: 0.5,
    similarityBoost: 0.8,
    style: 0.2,
    speed: 0.98,
    useSpeakerBoost: true,
    languages: STUDIO_LANGUAGES,
  }),
]);

/**
 * Longest single line the character endpoint will synthesize. This is the
 * provider's own ceiling for `eleven_multilingual_v2` (10,000 characters per
 * request), not a product limit — a character may speak a whole paragraph.
 */
export const MAX_CHARACTER_LINE_CHARS = 10_000;

export function isCharacterId(value: unknown): value is CharacterId {
  return value === 'livia' || value === 'bingo' || value === 'zora';
}

/** Unknown ids return null: nothing outside the registry may reach TTS. */
export function characterVoice(id: unknown): CharacterVoice | null {
  if (!isCharacterId(id)) return null;
  return CHARACTER_VOICES.find((voice) => voice.id === id) ?? null;
}

/** Can this character speak this language on ElevenLabs? */
export function characterSpeaks(id: unknown, language: unknown): boolean {
  const voice = characterVoice(id);
  if (!voice) return false;
  const base = String(language ?? '')
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0];
  return !!base && voice.languages.includes(base);
}

export interface CharacterSpeechRequest {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

const API_ROOT = 'https://api.elevenlabs.io/v1';
export const CHARACTER_OUTPUT_FORMAT = 'mp3_44100_128';

/**
 * Build the ElevenLabs request for one character line. The text is trimmed and
 * length-checked here, not at the call sites, so no path can post an unbounded
 * body.
 */
export function buildCharacterSpeechRequest(
  voice: CharacterVoice,
  text: string,
  options: { apiKey: string; baseUrl?: string }
): CharacterSpeechRequest {
  if (!options.apiKey) throw new Error('Missing ElevenLabs API key.');
  const spoken = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!spoken) throw new Error('Nothing to say.');
  if (spoken.length > MAX_CHARACTER_LINE_CHARS) {
    throw new Error(
      `ElevenLabs accepts at most ${MAX_CHARACTER_LINE_CHARS} characters in one request.`
    );
  }
  const root = (options.baseUrl || API_ROOT).replace(/\/+$/, '');
  return {
    url: `${root}/text-to-speech/${voice.voiceId}?output_format=${CHARACTER_OUTPUT_FORMAT}`,
    headers: { 'xi-api-key': options.apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: {
      text: spoken,
      model_id: voice.modelId,
      voice_settings: {
        stability: voice.stability,
        similarity_boost: voice.similarityBoost,
        style: voice.style,
        use_speaker_boost: voice.useSpeakerBoost,
        speed: voice.speed,
      },
    },
  };
}

/**
 * Cache key: everything that changes the audio goes in, nothing else. Two
 * learners meeting the same line pay for it once, and retuning a character
 * (a settings change) produces a new key instead of serving the old delivery.
 */
export function characterLineKey(voice: CharacterVoice, text: string, language: string): string {
  const spoken = String(text ?? '').replace(/\s+/g, ' ').trim();
  return JSON.stringify([
    voice.voiceId,
    voice.modelId,
    voice.stability,
    voice.similarityBoost,
    voice.style,
    voice.speed,
    language,
    spoken,
  ]);
}
