/**
 * The audiobook voice, in one place.
 *
 * This module is the only place that decides which provider, model, voice and
 * MP3 format an audiobook uses. The Edge Function reads it from deployment
 * secrets, the local preview command reads the same env names, and
 * `scripts/check-audiobook-voice.cjs` exercises the validation without making
 * a network call.
 *
 * Keep this file dependency-free: it is imported by Deno (Supabase Edge
 * Functions) and transpiled by Node for the checks. Never put a TTS API key in
 * it — keys stay in Edge Function secrets / `.env.local` and never reach the
 * app bundle.
 */

export type TtsProvider = 'elevenlabs' | 'openai';
export type OpenAiVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
/** MP3 only: the pipeline stores `.mp3` objects with `audio/mpeg`. */
export type Mp3OutputFormat =
  | 'mp3_44100_128'
  | 'mp3_44100_192'
  | 'mp3_22050_32'
  | 'mp3_44100_64'
  | 'mp3_44100_96';

export interface AudiobookVoiceConfig {
  provider: TtsProvider;
  /** ElevenLabs model id, or OpenAI `tts-1` / `tts-1-hd` / `gpt-4o-mini-tts`. */
  modelId: string;
  /** ElevenLabs voice id. Ignored by the OpenAI provider. */
  voiceId: string;
  /** OpenAI voice. Ignored by the ElevenLabs provider. */
  openaiVoice: OpenAiVoice;
  outputFormat: Mp3OutputFormat;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
  /** Short, deliberately non-secret lines used by the preview command. */
  preview: {
    fullMix: string;
    segment: string;
  };
}

export interface SpeechRequest {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

export const MAX_TTS_CHARS = 4000;
export const MAX_PREVIEW_FULL_MIX_CHARS = 400;
export const MAX_PREVIEW_SEGMENT_CHARS = 240;

const PROVIDERS: readonly TtsProvider[] = ['elevenlabs', 'openai'];
const OPENAI_VOICES: readonly OpenAiVoice[] = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
const OPENAI_MODELS: readonly string[] = ['tts-1', 'tts-1-hd', 'gpt-4o-mini-tts'];
const MP3_FORMATS: readonly Mp3OutputFormat[] = [
  'mp3_44100_128',
  'mp3_44100_192',
  'mp3_22050_32',
  'mp3_44100_64',
  'mp3_44100_96',
];

/**
 * ElevenLabs' stock demo voice. It is the sound of an unconfigured account, so
 * the preflight and the lesson verifier refuse to certify a run that uses it.
 */
export const STOCK_DEMO_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export const AUDIOBOOK_VOICE_DEFAULTS = Object.freeze({
  provider: 'elevenlabs' as TtsProvider,
  modelId: 'eleven_turbo_v2_5',
  /** George — "Warm, Captivating Storyteller" (British English, narrative). */
  voiceId: 'JBFqnCBsd6RMkjVDRZzb',
  openaiVoice: 'alloy' as OpenAiVoice,
  outputFormat: 'mp3_44100_128' as Mp3OutputFormat,
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0,
  useSpeakerBoost: true,
  preview: Object.freeze({
    fullMix:
      'Welcome to Bolingo Learn. This is the audiobook voice: calm, clear and unhurried. Listen once, then we will begin the lesson.',
    segment: 'Habari yako! Mimi ni Livia. Leo tunajifunza Kiswahili pamoja.',
  }),
});

export interface NarratorVoice {
  /** ElevenLabs voice id — the only value that may reach `TTS_VOICE_ID`. */
  id: string;
  /** What the app calls the narrator. */
  name: string;
  /** One line of character, in the voice's own words, for the picker. */
  blurb: string;
  /** Short tag shown under the name, e.g. "British · male". */
  tag: string;
}

/**
 * The narrators a Premium learner can choose between.
 *
 * This list is the whole trust boundary for a learner's choice: the Edge
 * Function only ever swaps in an id that appears here, so a tampered
 * `profiles.narrator_voice` cannot point the pipeline at an arbitrary voice.
 * Every entry has to be a voice the deployment holds rights to and that
 * `npm run audio:preflight` finds in the key's workspace — a Voice Library id
 * is unusable until it has been added to the account's profile.
 */
export const NARRATOR_VOICES: readonly NarratorVoice[] = Object.freeze([
  Object.freeze({
    id: 'JBFqnCBsd6RMkjVDRZzb',
    name: 'George',
    blurb: 'Warm, captivating storyteller — the classic audiobook read, unhurried and easy to follow.',
    tag: 'British · male',
  }),
  Object.freeze({
    id: 'Xb7hH8MSUJpSbSDYk0k2',
    name: 'Alice',
    blurb: 'Clear, engaging educator — bright and articulate, made for study guides and non-fiction.',
    tag: 'British · female',
  }),
  Object.freeze({
    id: 'pFZP5JQG7iQjIQuC4Bku',
    name: 'Lily',
    blurb: 'Velvety actress — confident, dramatic pacing that carries long chapters.',
    tag: 'British · female',
  }),
  Object.freeze({
    id: 'nPczCjzI2devNBz1zQrb',
    name: 'Brian',
    blurb: 'Deep, resonant and comforting — a steady voice for dense material.',
    tag: 'American · male',
  }),
  Object.freeze({
    id: 'onwK4e9ZLuTAKqWW03F9',
    name: 'Daniel',
    blurb: 'Steady broadcaster — formal and even, like a well-read reference book.',
    tag: 'British · male',
  }),
  Object.freeze({
    id: 'ezWcjzmShLr2IarIA07u',
    name: 'Mohammed',
    blurb: 'Kiswahili local — the natural narrator for Swahili material.',
    tag: 'Swahili · male',
  }),
]);

/** The narrator a learner picked, or null when the value is unknown. */
export function narratorVoice(choice: unknown): NarratorVoice | null {
  if (typeof choice !== 'string') return null;
  const wanted = choice.trim();
  return NARRATOR_VOICES.find((voice) => voice.id === wanted) ?? null;
}

/** Display name for a stored voice id — the default narrator answers for anything unknown. */
export function narratorName(choice: unknown): string {
  const voice = narratorVoice(choice);
  if (voice) return voice.name;
  const fallback = NARRATOR_VOICES.find((voice) => voice.id === AUDIOBOOK_VOICE_DEFAULTS.voiceId);
  return fallback?.name ?? 'the studio narrator';
}

/**
 * Point a validated deployment config at a learner's chosen narrator. An absent
 * or unknown choice leaves the operator's `TTS_VOICE_ID` in charge, so the
 * picker can never break a lesson whose owner never used it.
 */
export function withNarrator(
  config: AudiobookVoiceConfig,
  choice: unknown
): AudiobookVoiceConfig {
  const voice = narratorVoice(choice);
  return voice && voice.id !== config.voiceId ? Object.freeze({ ...config, voiceId: voice.id }) : config;
}

export class AudiobookVoiceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AudiobookVoiceConfigError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertKnownKeys(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new AudiobookVoiceConfigError(
        `Unknown ${label} key "${key}". Known keys: ${allowed.join(', ')}.`
      );
    }
  }
}

function readString(value: unknown, fallback: string, label: string): string {
  if (value === undefined) return fallback;
  if (typeof value !== 'string') {
    throw new AudiobookVoiceConfigError(`${label} must be a string.`);
  }
  const trimmed = value.trim();
  if (!trimmed) throw new AudiobookVoiceConfigError(`${label} must not be empty.`);
  return trimmed;
}

function readNumber(value: unknown, fallback: number, label: string): number {
  if (value === undefined) return fallback;
  if (typeof value === 'string' && value.trim() === '') return fallback;
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : NaN;
  if (!Number.isFinite(number)) {
    throw new AudiobookVoiceConfigError(`${label} must be a finite number between 0 and 1.`);
  }
  if (number < 0 || number > 1) {
    throw new AudiobookVoiceConfigError(`${label} must be between 0 and 1 (received ${number}).`);
  }
  return number;
}

function readBoolean(value: unknown, fallback: boolean, label: string): boolean {
  if (value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') return false;
  }
  throw new AudiobookVoiceConfigError(`${label} must be true or false.`);
}

/**
 * Parse a complete or partial configuration, filling only absent fields with
 * defaults. An explicitly invalid value is never silently replaced — that is
 * how a typo in a deployment secret becomes a clear startup error instead of a
 * voice that sounds wrong for every lesson.
 */
export function parseAudiobookVoiceConfig(raw?: unknown): AudiobookVoiceConfig {
  if (raw !== undefined && raw !== null && !isRecord(raw)) {
    throw new AudiobookVoiceConfigError('Audiobook voice config must be an object.');
  }
  const record = (raw ?? {}) as Record<string, unknown>;
  assertKnownKeys(
    record,
    [
      'provider',
      'modelId',
      'voiceId',
      'openaiVoice',
      'outputFormat',
      'stability',
      'similarityBoost',
      'style',
      'useSpeakerBoost',
      'preview',
    ],
    'audiobook voice config'
  );

  const provider = readString(record.provider, AUDIOBOOK_VOICE_DEFAULTS.provider, 'provider').toLowerCase();
  if (!PROVIDERS.includes(provider as TtsProvider)) {
    throw new AudiobookVoiceConfigError(`provider must be one of: ${PROVIDERS.join(', ')}.`);
  }
  const typedProvider = provider as TtsProvider;

  const defaultModel = typedProvider === 'openai' ? 'tts-1' : AUDIOBOOK_VOICE_DEFAULTS.modelId;
  const modelId = readString(record.modelId, defaultModel, 'modelId');
  if (typedProvider === 'openai' && !OPENAI_MODELS.includes(modelId)) {
    throw new AudiobookVoiceConfigError(
      `OpenAI modelId must be one of: ${OPENAI_MODELS.join(', ')}.`
    );
  }
  if (typedProvider === 'elevenlabs' && !/^eleven_[a-z0-9_]+$/i.test(modelId)) {
    throw new AudiobookVoiceConfigError(
      'ElevenLabs modelId must look like eleven_multilingual_v2 or eleven_turbo_v2_5.'
    );
  }

  const voiceId = readString(record.voiceId, AUDIOBOOK_VOICE_DEFAULTS.voiceId, 'voiceId');
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(voiceId)) {
    throw new AudiobookVoiceConfigError(
      'voiceId must be a provider voice id (10–64 letters, digits, hyphens or underscores).'
    );
  }

  const openaiVoice = readString(
    record.openaiVoice,
    AUDIOBOOK_VOICE_DEFAULTS.openaiVoice,
    'openaiVoice'
  ).toLowerCase();
  if (!OPENAI_VOICES.includes(openaiVoice as OpenAiVoice)) {
    throw new AudiobookVoiceConfigError(`openaiVoice must be one of: ${OPENAI_VOICES.join(', ')}.`);
  }

  const outputFormat = readString(
    record.outputFormat,
    AUDIOBOOK_VOICE_DEFAULTS.outputFormat,
    'outputFormat'
  );
  if (!MP3_FORMATS.includes(outputFormat as Mp3OutputFormat)) {
    throw new AudiobookVoiceConfigError(
      `outputFormat must be one of: ${MP3_FORMATS.join(', ')} (the pipeline stores MP3).`
    );
  }

  const stability = readNumber(record.stability, AUDIOBOOK_VOICE_DEFAULTS.stability, 'stability');
  const similarityBoost = readNumber(
    record.similarityBoost,
    AUDIOBOOK_VOICE_DEFAULTS.similarityBoost,
    'similarityBoost'
  );
  const style = readNumber(record.style, AUDIOBOOK_VOICE_DEFAULTS.style, 'style');
  const useSpeakerBoost = readBoolean(
    record.useSpeakerBoost,
    AUDIOBOOK_VOICE_DEFAULTS.useSpeakerBoost,
    'useSpeakerBoost'
  );

  if (record.preview !== undefined && !isRecord(record.preview)) {
    throw new AudiobookVoiceConfigError('preview must be an object with fullMix and segment strings.');
  }
  const previewRecord = (record.preview ?? {}) as Record<string, unknown>;
  assertKnownKeys(previewRecord, ['fullMix', 'segment'], 'preview');
  const fullMix = readString(
    previewRecord.fullMix,
    AUDIOBOOK_VOICE_DEFAULTS.preview.fullMix,
    'preview.fullMix'
  );
  if (fullMix.length > MAX_PREVIEW_FULL_MIX_CHARS) {
    throw new AudiobookVoiceConfigError(
      `preview.fullMix must be ${MAX_PREVIEW_FULL_MIX_CHARS} characters or fewer (received ${fullMix.length}).`
    );
  }
  const segment = readString(
    previewRecord.segment,
    AUDIOBOOK_VOICE_DEFAULTS.preview.segment,
    'preview.segment'
  );
  if (segment.length > MAX_PREVIEW_SEGMENT_CHARS) {
    throw new AudiobookVoiceConfigError(
      `preview.segment must be ${MAX_PREVIEW_SEGMENT_CHARS} characters or fewer (received ${segment.length}).`
    );
  }

  return Object.freeze({
    provider: typedProvider,
    modelId,
    voiceId,
    openaiVoice: openaiVoice as OpenAiVoice,
    outputFormat: outputFormat as Mp3OutputFormat,
    stability,
    similarityBoost,
    style,
    useSpeakerBoost,
    preview: Object.freeze({ fullMix, segment }),
  });
}

/**
 * Read the same names the Edge Function receives from Supabase secrets.
 * Empty strings are treated as unset so a blank secret cannot fail a deploy.
 */
export function audiobookVoiceFromEnv(env: Record<string, string | undefined>): AudiobookVoiceConfig {
  const value = (key: string): string | undefined => {
    const raw = env[key];
    return typeof raw === 'string' && raw.trim() !== '' ? raw : undefined;
  };
  return parseAudiobookVoiceConfig({
    provider: value('TTS_PROVIDER'),
    modelId: value('TTS_MODEL_ID'),
    voiceId: value('TTS_VOICE_ID'),
    openaiVoice: value('TTS_VOICE'),
    outputFormat: value('TTS_OUTPUT_FORMAT'),
    stability: value('TTS_STABILITY'),
    similarityBoost: value('TTS_SIMILARITY_BOOST'),
    style: value('TTS_STYLE'),
    useSpeakerBoost: value('TTS_SPEAKER_BOOST'),
    preview: {
      fullMix: value('TTS_PREVIEW_FULL_MIX'),
      segment: value('TTS_PREVIEW_SEGMENT'),
    },
  });
}

/** Keep the exact request shape in one place so previews cannot drift. */
export function clipSpeechText(text: string): string {
  if (typeof text !== 'string') throw new Error('Speech text must be a string.');
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Speech text must not be empty.');
  return trimmed.slice(0, MAX_TTS_CHARS);
}

export function buildSpeechRequest(
  config: AudiobookVoiceConfig,
  text: string,
  options: { apiKey: string; baseUrl?: string }
): SpeechRequest {
  const apiKey = options.apiKey?.trim();
  if (!apiKey) throw new Error('A TTS API key is required to build a speech request.');
  const input = clipSpeechText(text);

  if (config.provider === 'openai') {
    const baseUrl = (options.baseUrl?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '');
    return {
      url: `${baseUrl}/audio/speech`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: {
        model: config.modelId,
        input,
        voice: config.openaiVoice,
        response_format: 'mp3',
      },
    };
  }

  return {
    url: `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(config.voiceId)}?output_format=${encodeURIComponent(config.outputFormat)}`,
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
      Accept: 'audio/mpeg',
    },
    body: {
      text: input,
      model_id: config.modelId,
      voice_settings: {
        stability: config.stability,
        similarity_boost: config.similarityBoost,
        style: config.style,
        use_speaker_boost: config.useSpeakerBoost,
      },
    },
  };
}
