/**
 * Provider-agnostic audio/video transcription.
 *
 * The upload path uses one of two provider shapes:
 *
 *   deepgram — POST a signed media URL to /v1/listen. This is the default for
 *              long recordings and video because Deepgram fetches the object
 *              itself (no ffmpeg in the Edge Function, no 25 MB ceiling).
 *   openai   — POST multipart bytes to /audio/transcriptions. Works with
 *              OpenAI and any OpenAI-compatible Whisper endpoint (Groq,
 *              self-hosted, ...), but only for clips under 25 MB.
 *
 * Keeping the request builder and response parser here means the Edge
 * Function cannot grow a second, drifting transcription path.
 * scripts/check-transcription-pipeline.cjs transpiles this module and runs it
 * against local stubs, so a provider API change fails a check instead of a
 * learner's upload.
 */

export const TRANSCRIPTION_PROVIDERS = ['deepgram', 'openai'] as const;
export type TranscriptionProvider = (typeof TRANSCRIPTION_PROVIDERS)[number];

/** Deepgram's documented per-request ceiling for pre-recorded media. */
export const DEEPGRAM_MAX_BYTES = 2_000_000_000;
/** OpenAI's documented file limit for /audio/transcriptions. */
export const OPENAI_MAX_BYTES = 25 * 1024 * 1024;
/**
 * Stop waiting for the provider before the Edge Function's own wall clock
 * (150 s free / 400 s paid) runs out, leaving room for the LLM curation call.
 */
export const DEFAULT_TRANSCRIBE_TIMEOUT_MS = 240_000;
/** A runaway provider response must not bloat the upload row. */
export const MAX_TRANSCRIPT_CHARS = 200_000;

export const DEEPGRAM_DEFAULT_BASE_URL = 'https://api.deepgram.com';
export const OPENAI_DEFAULT_BASE_URL = 'https://api.openai.com/v1';
export const DEEPGRAM_DEFAULT_MODEL = 'nova-3';
export const OPENAI_DEFAULT_MODEL = 'whisper-1';

export const TRANSCRIPTION_NOT_CONFIGURED_MESSAGE =
  'Audio/video transcription is not configured. Set DEEPGRAM_API_KEY (recommended for long audio and video) ' +
  'or TRANSCRIBE_API_KEY as a process-upload secret, then redeploy the function.';

export interface TranscriptionConfig {
  provider: TranscriptionProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  /** Optional BCP-47/ISO-639 hint; null means "detect the language". */
  language: string | null;
  /** Applied to the bytes we upload. URL sources are bounded by the provider. */
  maxBytes: number;
  timeoutMs: number;
}

export type TranscriptionSource =
  | { kind: 'url'; url: string }
  | { kind: 'file'; bytes: Uint8Array; fileName: string; contentType: string };

export interface TranscriptionRequest {
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  body: string | FormData;
}

export interface TranscriptionResult {
  text: string;
  language: string | null;
  durationSeconds: number | null;
  provider: TranscriptionProvider;
  model: string;
}

const AUDIO_VIDEO_EXTENSIONS =
  /\.(mp3|wav|m4a|ogg|oga|opus|aac|flac|webm|mp4|m4v|mov|mkv|avi|wmv|flv|3gp)$/i;

/** True only for the containers this pipeline can hand to a provider. */
export function isTranscribableMedia(fileName: string, mimeType?: string): boolean {
  if (mimeType && /^(audio|video)\//i.test(mimeType.trim())) return true;
  return AUDIO_VIDEO_EXTENSIONS.test(fileName.trim().split('?')[0] ?? '');
}

function trimmed(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function baseUrl(value: string | undefined, fallback: string): string {
  return (trimmed(value) || fallback).replace(/\/+$/, '');
}

function positiveInteger(value: string | undefined): number | null {
  const text = trimmed(value);
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

function isProvider(value: string): value is TranscriptionProvider {
  return (TRANSCRIPTION_PROVIDERS as readonly string[]).includes(value);
}

/**
 * Resolve the provider from the environment. An explicit TRANSCRIBE_PROVIDER
 * always wins (and fails loudly if its key is missing); otherwise the first
 * configured provider key is used so a fresh deployment with one secret works.
 */
export function transcriptionConfigFromEnv(
  env: Record<string, string | undefined>
): TranscriptionConfig {
  const requested = trimmed(env.TRANSCRIBE_PROVIDER).toLowerCase();
  let provider: TranscriptionProvider;

  if (requested) {
    if (!isProvider(requested)) {
      throw new Error(
        `TRANSCRIBE_PROVIDER must be one of ${TRANSCRIPTION_PROVIDERS.join(', ')} (got "${requested}").`
      );
    }
    provider = requested;
  } else if (trimmed(env.DEEPGRAM_API_KEY)) {
    provider = 'deepgram';
  } else if (trimmed(env.TRANSCRIBE_API_KEY) || trimmed(env.OPENAI_API_KEY)) {
    provider = 'openai';
  } else {
    throw new Error(TRANSCRIPTION_NOT_CONFIGURED_MESSAGE);
  }

  const language = trimmed(env.TRANSCRIBE_LANGUAGE) || null;
  const timeoutMs = positiveInteger(env.TRANSCRIBE_TIMEOUT_MS) ?? DEFAULT_TRANSCRIBE_TIMEOUT_MS;

  if (provider === 'deepgram') {
    const apiKey = trimmed(env.DEEPGRAM_API_KEY);
    if (!apiKey) {
      throw new Error('TRANSCRIBE_PROVIDER=deepgram but DEEPGRAM_API_KEY is not set.');
    }
    const maxBytes = DEEPGRAM_MAX_BYTES;
    return {
      provider,
      apiKey,
      baseUrl: baseUrl(env.TRANSCRIBE_BASE_URL, DEEPGRAM_DEFAULT_BASE_URL),
      model: trimmed(env.TRANSCRIBE_MODEL) || DEEPGRAM_DEFAULT_MODEL,
      language,
      maxBytes,
      timeoutMs,
    };
  }

  const apiKey = trimmed(env.TRANSCRIBE_API_KEY) || trimmed(env.OPENAI_API_KEY);
  if (!apiKey) {
    throw new Error('TRANSCRIBE_PROVIDER=openai but TRANSCRIBE_API_KEY (or OPENAI_API_KEY) is not set.');
  }
  return {
    provider,
    apiKey,
    baseUrl: baseUrl(env.TRANSCRIBE_BASE_URL, OPENAI_DEFAULT_BASE_URL),
    model: trimmed(env.TRANSCRIBE_MODEL) || OPENAI_DEFAULT_MODEL,
    language,
    maxBytes: positiveInteger(env.TRANSCRIBE_MAX_BYTES) ?? OPENAI_MAX_BYTES,
    timeoutMs,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function mediaTooLargeMessage(config: TranscriptionConfig, bytes: number): string {
  const alternative =
    config.provider === 'deepgram'
      ? 'Trim the recording before uploading it.'
      : 'Configure DEEPGRAM_API_KEY for signed-URL transcription of long audio and video.';
  return (
    `This recording is ${formatBytes(bytes)}; the ${config.provider} transcription limit is ` +
    `${formatBytes(config.maxBytes)}. ${alternative}`
  );
}

/** OpenAI's 4o transcription models reject verbose_json; whisper-1 supports it. */
function wantsVerboseJson(model: string): boolean {
  return !/^gpt-4o(-mini)?-transcribe$/i.test(model);
}

export function buildTranscriptionRequest(
  config: TranscriptionConfig,
  source: TranscriptionSource
): TranscriptionRequest {
  if (config.provider === 'deepgram') {
    if (source.kind !== 'url') {
      throw new Error(
        'Deepgram transcription needs a signed media URL so the provider can fetch the file directly.'
      );
    }
    const params = new URLSearchParams();
    params.set('model', config.model);
    params.set('smart_format', 'true');
    if (config.language) params.set('language', config.language);
    else params.set('detect_language', 'true');
    return {
      url: `${config.baseUrl}/v1/listen?${params.toString()}`,
      method: 'POST',
      headers: {
        Authorization: `Token ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: source.url }),
    };
  }

  if (source.kind !== 'file') {
    throw new Error(
      'The OpenAI transcription API needs the media bytes; a signed URL is only supported by Deepgram.'
    );
  }
  if (source.bytes.length > config.maxBytes) {
    throw new Error(mediaTooLargeMessage(config, source.bytes.length));
  }

  const form = new FormData();
  form.append('file', new Blob([source.bytes], { type: source.contentType }), source.fileName);
  form.append('model', config.model);
  form.append('response_format', wantsVerboseJson(config.model) ? 'verbose_json' : 'json');
  if (config.language) form.append('language', config.language);
  return {
    url: `${config.baseUrl}/audio/transcriptions`,
    method: 'POST',
    // No Content-Type: fetch adds the multipart boundary.
    headers: { Authorization: `Bearer ${config.apiKey}` },
    body: form,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function numeric(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null;
}

export function parseTranscriptionResponse(
  config: TranscriptionConfig,
  payload: unknown
): TranscriptionResult {
  const root = asRecord(payload);
  if (!root) {
    throw new Error(`${config.provider} returned a response that was not valid JSON.`);
  }

  if (config.provider === 'deepgram') {
    const results = asRecord(root.results);
    const channels = results?.channels;
    const channel = Array.isArray(channels) ? asRecord(channels[0]) : null;
    const alternatives = channel?.alternatives;
    const best = Array.isArray(alternatives) ? asRecord(alternatives[0]) : null;
    const text = typeof best?.transcript === 'string' ? best.transcript.trim() : '';
    if (!text) {
      throw new Error(
        'Deepgram returned an empty transcript. Check that the recording has audible speech, then retry.'
      );
    }
    const metadata = asRecord(root.metadata);
    return {
      text: text.slice(0, MAX_TRANSCRIPT_CHARS),
      language:
        typeof channel?.detected_language === 'string'
          ? channel.detected_language
          : config.language,
      durationSeconds: numeric(metadata?.duration),
      provider: config.provider,
      model: config.model,
    };
  }

  const text = typeof root.text === 'string' ? root.text.trim() : '';
  if (!text) {
    throw new Error(
      'The transcription provider returned an empty transcript. Check that the recording has audible speech, then retry.'
    );
  }
  return {
    text: text.slice(0, MAX_TRANSCRIPT_CHARS),
    language: typeof root.language === 'string' ? root.language : config.language,
    durationSeconds: numeric(root.duration),
    provider: config.provider,
    model: config.model,
  };
}

function providerErrorDetail(payload: unknown, raw: string, status: number): string {
  const root = asRecord(payload);
  const candidates = [root?.err_msg, root?.message, root?.detail, asRecord(root?.error)?.message, root?.error];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim().slice(0, 300);
  }
  return raw.trim().slice(0, 200) || `HTTP ${status}`;
}

/**
 * Run one transcription. Never returns a partial result: an unreachable
 * provider, a rejected key, a missing file or an empty transcript throws a
 * message that names the provider and what the operator can do next.
 */
export async function transcribeMedia(
  config: TranscriptionConfig,
  source: TranscriptionSource,
  fetchImpl: typeof fetch = fetch
): Promise<TranscriptionResult> {
  const request = buildTranscriptionRequest(config, source);
  let response: Response;
  try {
    response = await fetchImpl(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not reach the ${config.provider} transcription API: ${message}. ` +
        'The upload is unchanged; retry once the provider is reachable.'
    );
  }

  const raw = await response.text();
  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail = providerErrorDetail(payload, raw, response.status);
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `The ${config.provider} transcription key was rejected (${response.status}): ${detail}. ` +
          'Check the server secret, then redeploy process-upload.'
      );
    }
    if (response.status === 413) {
      throw new Error(
        `${config.provider} rejected this recording as too large (${response.status}): ${detail}. ` +
          'Trim it, or configure DEEPGRAM_API_KEY so long media can be transcribed by URL.'
      );
    }
    throw new Error(`${config.provider} transcription failed (${response.status}): ${detail}`);
  }

  return parseTranscriptionResponse(config, payload);
}
