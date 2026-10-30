#!/usr/bin/env node
/**
 * Full-lesson audiobook verification.
 *
 * Takes a *real* uploaded lesson (a `lessons` row created by process-upload,
 * linked to a ready `user_uploads` row), rebuilds the exact narration the
 * pipeline would send, and re-synthesizes:
 *
 *   1. the complete full mix (every prompt, joined like the Edge Function), and
 *   2. every segment (one MP3 per question row).
 *
 * with the licensed ElevenLabs voice from `.env.local` / the environment. The
 * shared `audiobookVoice.ts` builder is used, so this cannot drift from the
 * deployed function's request shape.
 *
 * This spends provider credits: one full-mix call plus one call per question.
 * Nothing is uploaded; MP3s and a manifest go to an ignored local directory.
 *
 * Usage:
 *   node scripts/verify-full-lesson-audio.cjs --list
 *   node scripts/verify-full-lesson-audio.cjs                       # newest ready upload
 *   node scripts/verify-full-lesson-audio.cjs --lesson 42
 *   node scripts/verify-full-lesson-audio.cjs --upload <uuid> --plan
 *   node scripts/verify-full-lesson-audio.cjs --lesson 42 --out ./.preview-audio/lesson-42
 *
 * Exit codes:
 *   0  every artifact synthesized, parsed as MP3, and passed the checks
 *   1  preflight, lesson selection, synthesis, or a check failed
 *   2  bad CLI usage
 */

'use strict';

/* global __dirname, Buffer, fetch -- Node 18+ provides these. */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const VOICE_CONFIG = path.join(ROOT, 'supabase', 'functions', '_shared', 'audiobookVoice.ts');
const DEFAULT_OUT_ROOT = path.join(ROOT, '.preview-audio');
const ENV_FILES = [path.join(ROOT, '.env'), path.join(ROOT, '.env.local')];

const FULL_MIX_LIMIT = 4000; // mirrors process-upload's slice(0, 4000)
const SEGMENT_LIMIT = 1000; // mirrors row.prompt.slice(0, 1000)
const MIN_MP3_BYTES = 1024;
const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

class UsageError extends Error {}

// --- environment ---------------------------------------------------------

/**
 * Minimal dotenv reader. Values are assigned to process.env and never logged.
 * Later files win, so `.env.local` overrides `.env`.
 */
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key] !== undefined && process.env[key] !== '') continue;
    let value = raw.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    process.env[key] = value;
  }
}

function loadEnv() {
  for (const file of ENV_FILES) loadEnvFile(file);
}

function envValue(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim() !== '') {
      return { name, value: value.trim() };
    }
  }
  return null;
}

function loadVoiceModule() {
  const source = fs.readFileSync(VOICE_CONFIG, 'utf8');
  const { outputText, diagnostics } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: VOICE_CONFIG,
    reportDiagnostics: true,
  });
  if (diagnostics && diagnostics.length > 0) {
    throw new Error(
      diagnostics
        .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
        .join('\n')
    );
  }
  const mod = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(mod.exports, require, mod);
  return mod.exports;
}

// --- CLI ----------------------------------------------------------------

function usage() {
  console.log(`Usage: node scripts/verify-full-lesson-audio.cjs [options]

Options:
  --lesson <id>           Verify this uploaded lesson id
  --upload <uuid>         Verify the lesson generated from this upload
  --list                  List recent uploaded lessons and exit
  --plan                  Show the lesson and TTS jobs without spending credits
  --out <dir>             Write MP3s and manifest here
                          (default: ./.preview-audio/lesson-<id>-<timestamp>)
  --concurrency <n>       Parallel TTS requests, 1-3 (default: 1)
  --allow-default-voice   Allow the built-in placeholder voice (demo only)
  --json                  Print a machine-readable result
  --help                  Show this message

The voice is read from TTS_* (or ELEVENLABS_API_KEY for local use) in .env /
.env.local and must match the licensed voice configured in the deployment.`);
}

function parseArgs(argv) {
  const options = {
    lesson: null,
    upload: null,
    list: false,
    plan: false,
    out: null,
    concurrency: 1,
    allowDefaultVoice: false,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--lesson' || arg === '--upload' || arg === '--out' || arg === '--concurrency') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new UsageError(`${arg} needs a value.`);
      if (arg === '--lesson') {
        const id = Number(value);
        if (!Number.isInteger(id) || id <= 0) throw new UsageError('--lesson must be a positive integer.');
        options.lesson = id;
      } else if (arg === '--upload') {
        options.upload = value;
      } else if (arg === '--out') {
        options.out = value;
      } else {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 1 || n > 3) {
          throw new UsageError('--concurrency must be 1, 2 or 3.');
        }
        options.concurrency = n;
      }
      i += 1;
    } else if (arg === '--list') options.list = true;
    else if (arg === '--plan') options.plan = true;
    else if (arg === '--allow-default-voice') options.allowDefaultVoice = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new UsageError(`Unknown option "${arg}". Use --help for usage.`);
  }
  return options;
}

// --- Supabase REST ------------------------------------------------------

function createSupabase() {
  const url = envValue('SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_URL');
  const key = envValue('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
  if (!url) {
    throw new Error('SUPABASE_URL is missing. Add it to .env (server-side only).');
  }
  if (!key) {
    throw new Error(
      'SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is missing. ' +
        'Uploaded lessons are private, so the verifier needs a server key to read them.'
    );
  }
  const base = url.value.replace(/\/+$/, '');

  async function request(pathAndQuery, init = {}) {
    const response = await fetch(`${base}${pathAndQuery}`, {
      ...init,
      headers: {
        apikey: key.value,
        Authorization: `Bearer ${key.value}`,
        Accept: 'application/json',
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(30_000),
    });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!response.ok) {
      const detail =
        body && typeof body === 'object' && body.message
          ? body.message
          : typeof body === 'string'
            ? body.slice(0, 300)
            : `HTTP ${response.status}`;
      throw new Error(`Supabase query failed (${response.status}): ${detail}`);
    }
    return body;
  }

  return {
    async listLessons(limit = 25) {
      const query = new URLSearchParams({
        select: 'id,title,created_at,content,upload_source_id,user_id',
        is_user_generated: 'eq.true',
        upload_source_id: 'not.is.null',
        order: 'created_at.desc',
        limit: String(limit),
      });
      return request(`/rest/v1/lessons?${query}`);
    },
    async lesson(id) {
      const query = new URLSearchParams({
        select: 'id,title,created_at,content,upload_source_id,user_id',
        id: `eq.${id}`,
        limit: '1',
      });
      const rows = await request(`/rest/v1/lessons?${query}`);
      return rows?.[0] ?? null;
    },
    async uploads(ids) {
      if (ids.length === 0) return [];
      const query = new URLSearchParams({
        select: 'id,file_name,status,created_at',
        id: `in.(${ids.join(',')})`,
      });
      return request(`/rest/v1/user_uploads?${query}`);
    },
    async lessonFromUpload(uploadId) {
      const query = new URLSearchParams({
        select: 'id,title,created_at,content,upload_source_id,user_id',
        upload_source_id: `eq.${uploadId}`,
        order: 'created_at.desc',
        limit: '1',
      });
      const rows = await request(`/rest/v1/lessons?${query}`);
      return rows?.[0] ?? null;
    },
    async questions(lessonId) {
      const query = new URLSearchParams({
        select: 'id,prompt,created_at',
        lesson_id: `eq.${lessonId}`,
        order: 'created_at.asc',
      });
      return request(`/rest/v1/questions?${query}`);
    },
  };
}

// --- lesson selection ---------------------------------------------------

function storedSegments(lesson) {
  const segments = lesson?.content?.segments;
  return Array.isArray(segments) ? segments : [];
}

function storedQuizPrompts(lesson) {
  const questions = lesson?.content?.questions;
  if (!Array.isArray(questions)) return [];
  return questions
    .map((q) => (q && typeof q.prompt === 'string' ? q.prompt : null))
    .filter((prompt) => typeof prompt === 'string' && prompt.trim() !== '');
}

function hasStoredAudio(lesson) {
  return Boolean(lesson?.content?.audio_url) && storedSegments(lesson).length > 0;
}

async function resolveLesson(supabase, options) {
  if (options.lesson) {
    const lesson = await supabase.lesson(options.lesson);
    if (!lesson) throw new Error(`Lesson ${options.lesson} was not found.`);
    if (!lesson.upload_source_id) {
      throw new Error(
        `Lesson ${options.lesson} is built-in curriculum, not an uploaded lesson. ` +
          'Pick a row created by process-upload (--list shows them).'
      );
    }
    return lesson;
  }

  const lessons = await supabase.listLessons();
  if (options.upload) {
    const lesson = await supabase.lessonFromUpload(options.upload);
    if (!lesson) throw new Error(`No generated lesson exists for upload ${options.upload}.`);
    return lesson;
  }

  const uploads = await supabase.uploads(lessons.map((l) => l.upload_source_id));
  const byId = new Map(uploads.map((u) => [u.id, u]));
  const withUpload = lessons.map((lesson) => ({ lesson, upload: byId.get(lesson.upload_source_id) ?? null }));
  const ready = withUpload.filter((row) => row.upload?.status === 'ready');

  if (options.list) {
    if (withUpload.length === 0) {
      console.log('No uploaded lessons found. Generate one from My Uploads first.');
      return null;
    }
    console.log('Recent uploaded lessons (newest first):');
    for (const { lesson, upload } of withUpload) {
      const parts = [
        `#${lesson.id}`,
        `upload=${upload?.status ?? 'missing'}`,
        `questions=${Array.isArray(lesson.content?.questions) ? lesson.content.questions.length : '?'}`,
        `audio=${hasStoredAudio(lesson) ? `yes (${storedSegments(lesson).length} segments)` : 'no'}`,
        `"${String(lesson.title).slice(0, 48)}"`,
      ];
      console.log(`  ${parts.join('  ')}`);
    }
    return null;
  }

  if (ready.length === 0) {
    const statuses = withUpload.map(({ lesson, upload }) => `#${lesson.id} upload=${upload?.status ?? 'missing'}`);
    throw new Error(
      `No uploaded lesson with a ready upload was found. ${statuses.length ? `Candidates: ${statuses.join(', ')}` : ''}`.trim()
    );
  }

  const preferred = ready.find((row) => hasStoredAudio(row.lesson));
  const chosen = preferred ?? ready[0];
  if (!preferred) {
    console.warn(
      '[warn] the newest ready lesson has no stored audio manifest; ' +
        'verifying its synthesis anyway (an earlier TTS run may have been skipped or failed).'
    );
  }
  return chosen.lesson;
}

// --- narration ----------------------------------------------------------

function buildJobs(lesson, questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error(`Lesson ${lesson.id} has no question rows, so there is no narration to synthesize.`);
  }
  // Keep the stored prompt verbatim: process-upload joins and slices the raw
  // strings, so trimming here would verify slightly different narration.
  const prompts = questions.map((q) => (typeof q.prompt === 'string' ? q.prompt : ''));
  const empty = prompts.findIndex((p) => !p.trim());
  if (empty >= 0) throw new Error(`Question ${questions[empty].id} has an empty prompt.`);

  const combined = prompts.join('\n');
  const fullNarration = combined.slice(0, FULL_MIX_LIMIT);
  // Walk the same joined string the Edge Function slices so a prompt that is
  // merely truncated at the boundary is not mistaken for a fully included one
  // (a short prompt can also be a substring of a longer one).
  const included = [];
  const missing = [];
  let cursor = 0;
  for (const prompt of prompts) {
    if (cursor + prompt.length <= FULL_MIX_LIMIT) included.push(prompt);
    else missing.push(prompt);
    cursor += prompt.length + 1; // + the joining newline
  }

  const jobs = [
    {
      kind: 'full-mix',
      label: 'full mix',
      file: 'full-mix.mp3',
      text: fullNarration,
      chars: fullNarration.length,
    },
  ];
  questions.forEach((question, index) => {
    jobs.push({
      kind: 'segment',
      index,
      questionId: question.id,
      label: `segment ${index + 1}/${questions.length}`,
      file: `segments/${String(index + 1).padStart(2, '0')}.mp3`,
      text: prompts[index].slice(0, SEGMENT_LIMIT),
      chars: Math.min(prompts[index].length, SEGMENT_LIMIT),
    });
  });

  return {
    jobs,
    narration: {
      promptCount: prompts.length,
      combinedChars: combined.length,
      fullMixChars: fullNarration.length,
      fullMixTruncated: combined.length > FULL_MIX_LIMIT,
      promptsIncluded: included.length,
      missingPrompts: missing.map((p) => p.slice(0, 80)),
    },
  };
}

function compareStoredManifest(lesson, questions) {
  const stored = storedQuizPrompts(lesson);
  const live = questions.map((q) => String(q.prompt).trim());
  const storedSegmentsList = storedSegments(lesson);
  return {
    storedAudioUrl: Boolean(lesson?.content?.audio_url),
    storedSegmentCount: storedSegmentsList.length,
    storedQuizCount: stored.length,
    questionCount: live.length,
    segmentCountMatches: storedSegmentsList.length === live.length,
    quizOrderMatches: stored.length === live.length && stored.every((p, i) => p === live[i]),
    storedSegmentPromptsMatch:
      storedSegmentsList.length === live.length &&
      storedSegmentsList.every((s, i) => String(s?.prompt ?? '').trim() === live[i]),
  };
}

// --- MP3 parsing --------------------------------------------------------

const MPEG1_LAYER3_BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const MPEG2_LAYER3_BITRATES = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const SAMPLE_RATES = {
  1: [44100, 48000, 32000],
  2: [22050, 24000, 16000],
  2.5: [11025, 12000, 8000],
};

/**
 * Walk MPEG audio frames and return duration + frame count. Works for CBR and
 * VBR (it sums real frame durations rather than dividing bytes by bitrate).
 * Returns nulls instead of throwing so the caller can report a bad payload.
 */
function parseMp3(bytes) {
  if (!bytes || bytes.length < 4) return { frames: 0, seconds: 0 };
  let offset = 0;

  // ID3v2 header: "ID3" + version/revision/flags + syncsafe size.
  if (bytes.length >= 10 && bytes.subarray(0, 3).toString('ascii') === 'ID3') {
    const size =
      ((bytes[6] & 0x7f) << 21) |
      ((bytes[7] & 0x7f) << 14) |
      ((bytes[8] & 0x7f) << 7) |
      (bytes[9] & 0x7f);
    offset = 10 + size;
    if (bytes[5] & 0x10) offset += 10; // footer
  }

  let frames = 0;
  let seconds = 0;
  let resyncs = 0;

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff || (bytes[offset + 1] & 0xe0) !== 0xe0) {
      offset += 1;
      resyncs += 1;
      continue;
    }
    const versionBits = (bytes[offset + 1] >> 3) & 0x03;
    const layerBits = (bytes[offset + 1] >> 1) & 0x03;
    const bitrateIndex = (bytes[offset + 2] >> 4) & 0x0f;
    const sampleRateIndex = (bytes[offset + 2] >> 2) & 0x03;
    const padding = (bytes[offset + 2] >> 1) & 0x01;

    const version = versionBits === 3 ? 1 : versionBits === 2 ? 2 : versionBits === 0 ? 2.5 : null;
    const isLayer3 = layerBits === 1;
    if (!version || !isLayer3) {
      offset += 1;
      resyncs += 1;
      continue;
    }
    if (bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) {
      offset += 1;
      resyncs += 1;
      continue;
    }
    const sampleRate = SAMPLE_RATES[version][sampleRateIndex];
    const bitrate =
      version === 1 ? MPEG1_LAYER3_BITRATES[bitrateIndex] : MPEG2_LAYER3_BITRATES[bitrateIndex];
    if (!sampleRate || !bitrate) {
      offset += 1;
      resyncs += 1;
      continue;
    }
    const samplesPerFrame = version === 1 ? 1152 : 576;
    const frameBytes =
      Math.floor(((samplesPerFrame / 8) * bitrate * 1000) / sampleRate) + padding;
    if (frameBytes <= 4) {
      offset += 1;
      resyncs += 1;
      continue;
    }
    frames += 1;
    seconds += samplesPerFrame / sampleRate;
    offset += frameBytes;
  }

  return { frames, seconds, resyncs };
}

function assertPlayableMp3(bytes, label) {
  if (!bytes || bytes.length < MIN_MP3_BYTES) {
    throw new Error(`${label}: provider returned ${bytes ? bytes.length : 0} bytes, expected an MP3.`);
  }
  const id3 = bytes.subarray(0, 3).toString('ascii') === 'ID3';
  const frameSync = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  if (!id3 && !frameSync) {
    throw new Error(`${label}: response does not start with an MP3 header.`);
  }
  const parsed = parseMp3(bytes);
  if (!parsed.frames || !(parsed.seconds > 0.2)) {
    throw new Error(
      `${label}: could not find playable MPEG frames (${parsed.frames} frames, ${parsed.seconds.toFixed(2)}s).`
    );
  }
  return parsed;
}

// --- ElevenLabs preflight ----------------------------------------------

async function elevenLabsGet(apiKey, resource, timeoutMs = 20_000) {
  const response = await fetch(`${ELEVENLABS_API}${resource}`, {
    headers: { 'xi-api-key': apiKey, Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { ok: response.ok, status: response.status, data, text };
}

async function preflightVoice(apiKey, config) {
  const voice = await elevenLabsGet(apiKey, `/voices/${encodeURIComponent(config.voiceId)}`);
  if (!voice.ok) {
    const detail =
      voice.data?.detail?.message ||
      voice.data?.detail ||
      (voice.text ? voice.text.slice(0, 200) : `HTTP ${voice.status}`);
    throw new Error(
      `The configured voice ${config.voiceId} is not accessible with this key ` +
        `(${voice.status}: ${detail}). Check that the key belongs to the workspace that owns the voice.`
    );
  }

  let quota = null;
  try {
    const sub = await elevenLabsGet(apiKey, '/user/subscription');
    if (sub.ok && sub.data && typeof sub.data.character_limit === 'number') {
      const used = Number(sub.data.character_count) || 0;
      quota = {
        used,
        limit: sub.data.character_limit,
        remaining: sub.data.character_limit - used,
      };
    }
  } catch {
    // Quota is advisory; the voice lookup is the hard gate.
  }

  return {
    voiceName: voice.data?.name ?? '(unnamed)',
    voiceCategory: voice.data?.category ?? null,
    quota,
  };
}

async function synthesize(voiceModule, config, job, apiKey) {
  const request = voiceModule.buildSpeechRequest(config, job.text, {
    apiKey,
    baseUrl: process.env.OPENAI_BASE_URL,
  });
  const response = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(request.body),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`${job.label}: TTS failed (${response.status}): ${detail}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const parsed = assertPlayableMp3(bytes, job.label);
  return {
    bytes,
    frames: parsed.frames,
    seconds: parsed.seconds,
    resyncs: parsed.resyncs ?? 0,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  };
}

// --- main ---------------------------------------------------------------

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatSeconds(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return minutes > 0 ? `${minutes}m ${rest.toFixed(1)}s` : `${rest.toFixed(1)}s`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  loadEnv();

  const voice = loadVoiceModule();
  const config = voice.audiobookVoiceFromEnv(process.env);
  const apiKeyRef = envValue('TTS_API_KEY', 'ELEVENLABS_API_KEY');
  if (!apiKeyRef) {
    throw new Error(
      'No TTS key found. Set TTS_API_KEY (deployment name) or ELEVENLABS_API_KEY in .env.local.'
    );
  }
  if (config.provider !== 'elevenlabs') {
    throw new Error(
      `The licensed audiobook voice is ElevenLabs, but TTS_PROVIDER resolves to "${config.provider}". ` +
        'Set TTS_PROVIDER=elevenlabs for this verification.'
    );
  }
  if (
    !options.allowDefaultVoice &&
    config.voiceId === voice.AUDIOBOOK_VOICE_DEFAULTS.voiceId
  ) {
    throw new Error(
      'TTS_VOICE_ID is the built-in placeholder voice, not the licensed voice. ' +
        'Set the licensed id in .env.local (the same value as the deployment secret), ' +
        'or pass --allow-default-voice for a demo-only run.'
    );
  }

  const supabase = createSupabase();
  const lesson = await resolveLesson(supabase, options);
  if (!lesson) return; // --list printed its table

  const uploads = await supabase.uploads([lesson.upload_source_id]);
  const upload = uploads[0] ?? null;
  if (upload && upload.status !== 'ready') {
    throw new Error(
      `Upload ${upload.id} for lesson ${lesson.id} is "${upload.status}", not ready. ` +
        'Only a fully processed upload counts as a real lesson.'
    );
  }

  const questions = await supabase.questions(lesson.id);
  const { jobs, narration } = buildJobs(lesson, questions);
  const manifestChecks = compareStoredManifest(lesson, questions);
  const warnings = [];
  if (!manifestChecks.quizOrderMatches) {
    warnings.push(
      'The stored quiz prompt order differs from the question rows; the full mix may read in a different order than the original run.'
    );
  }
  if (manifestChecks.storedAudioUrl && !manifestChecks.segmentCountMatches) {
    warnings.push(
      `Stored audio has ${manifestChecks.storedSegmentCount} segment(s) but the lesson now has ${manifestChecks.questionCount} question(s); the stored manifest is stale.`
    );
  }
  if (narration.fullMixTruncated) {
    warnings.push(
      `The full mix is capped at ${FULL_MIX_LIMIT} characters, so ${narration.missingPrompts.length} prompt(s) fall outside it.`
    );
  }

  const totalChars = jobs.reduce((sum, job) => sum + job.chars, 0);
  const outDir = options.out
    ? path.resolve(process.cwd(), options.out)
    : path.join(DEFAULT_OUT_ROOT, `lesson-${lesson.id}-${Date.now()}`);

  console.log('Full-lesson audiobook verification');
  console.log(`  lesson:        #${lesson.id} "${String(lesson.title).slice(0, 70)}"`);
  console.log(`  upload:        ${lesson.upload_source_id}${upload ? ` (${upload.status} ${upload.file_name})` : ' (row missing)'}`);
  console.log(`  questions:     ${questions.length}`);
  console.log(`  stored audio:  ${manifestChecks.storedAudioUrl ? 'manifest present' : 'no manifest'}, ${manifestChecks.storedSegmentCount} segment(s)`);
  console.log(`  provider:      ${config.provider}`);
  console.log(`  model:         ${config.modelId}`);
  console.log(`  voice id:      ${config.voiceId}`);
  console.log(`  voice key:     ${apiKeyRef.name}`);
  console.log(`  narration:     ${narration.fullMixChars} chars full mix, ${narration.promptCount} segment(s), ${totalChars} chars total`);
  console.log(`  output:        ${outDir}`);
  for (const warning of warnings) console.warn(`[warn] ${warning}`);

  if (options.plan) {
    console.log('\nPlanned jobs (no credits spent):');
    for (const job of jobs) console.log(`  - ${job.label}: ${job.chars} chars -> ${job.file}`);
    if (options.json) {
      console.log(
        JSON.stringify(
          { ok: true, planned: true, lessonId: lesson.id, jobs: jobs.map(({ text, ...rest }) => rest), narration, warnings },
          null,
          2
        )
      );
    }
    return;
  }

  const preflight = await preflightVoice(apiKeyRef.value, config);
  console.log(`  voice name:    ${preflight.voiceName}${preflight.voiceCategory ? ` (${preflight.voiceCategory})` : ''}`);
  if (preflight.quota) {
    console.log(
      `  credits:       ${preflight.quota.remaining.toLocaleString()} remaining of ${preflight.quota.limit.toLocaleString()}`
    );
    if (preflight.quota.remaining < totalChars) {
      throw new Error(
        `Not enough character credits for this run: need ${totalChars}, have ${preflight.quota.remaining}. ` +
          'Reduce the lesson or top up the workspace.'
      );
    }
  }

  fs.mkdirSync(outDir, { recursive: true });
  const results = new Array(jobs.length);
  const errors = [];
  let cursor = 0;

  async function worker() {
    for (;;) {
      const index = cursor++;
      if (index >= jobs.length) return;
      const job = jobs[index];
      console.log(`[..] synthesizing ${job.label} (${job.chars} chars)…`);
      try {
        const result = await synthesize(voice, config, job, apiKeyRef.value);
        const file = path.join(outDir, job.file);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, result.bytes);
        results[index] = {
          kind: job.kind,
          index: job.kind === 'segment' ? job.index : null,
          questionId: job.questionId ?? null,
          label: job.label,
          chars: job.chars,
          file: path.relative(outDir, file).split(path.sep).join('/'),
          bytes: result.bytes.length,
          seconds: Number(result.seconds.toFixed(2)),
          frames: result.frames,
          sha256: result.sha256,
        };
        console.log(
          `[ok] ${job.label}: ${formatBytes(result.bytes.length)}, ${formatSeconds(result.seconds)}, sha256 ${result.sha256.slice(0, 12)}`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(message);
        console.error(`[FAIL] ${message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(options.concurrency, jobs.length) }, worker));

  const artifacts = results.filter(Boolean);
  const fullMix = artifacts.find((a) => a.kind === 'full-mix') ?? null;
  const segments = artifacts.filter((a) => a.kind === 'segment');
  const checks = {
    everyJobSucceeded: errors.length === 0 && artifacts.length === jobs.length,
    fullMixSynthesized: Boolean(fullMix),
    allSegmentsSynthesized: segments.length === jobs.length - 1,
    allMp3sPlayable: artifacts.every((a) => a.frames > 0 && a.seconds > 0.2),
    licensedVoiceUsed: config.voiceId !== voice.AUDIOBOOK_VOICE_DEFAULTS.voiceId,
    voiceAccessible: true,
    fullMixCoversAllPrompts: narration.missingPrompts.length === 0,
  };
  const ok = errors.length === 0 && artifacts.length === jobs.length && checks.allMp3sPlayable;
  const longestSegment = segments.reduce((max, a) => (a.seconds > max ? a.seconds : max), 0);

  const manifest = {
    tool: 'verify-full-lesson-audio',
    generatedAt: new Date().toISOString(),
    ok,
    checks,
    lesson: {
      id: lesson.id,
      title: lesson.title,
      uploadId: lesson.upload_source_id,
      fileName: upload?.file_name ?? null,
      uploadStatus: upload?.status ?? null,
      questionCount: questions.length,
    },
    voice: {
      provider: config.provider,
      modelId: config.modelId,
      voiceId: config.voiceId,
      voiceName: preflight.voiceName,
      outputFormat: config.outputFormat,
      settings: {
        stability: config.stability,
        similarityBoost: config.similarityBoost,
        style: config.style,
        useSpeakerBoost: config.useSpeakerBoost,
      },
      keyName: apiKeyRef.name,
      credits: preflight.quota,
    },
    narration,
    storedManifest: manifestChecks,
    totals: {
      requestedChars: totalChars,
      artifacts: artifacts.length,
      expectedArtifacts: jobs.length,
      bytes: artifacts.reduce((sum, a) => sum + a.bytes, 0),
      audioSeconds: Number(artifacts.reduce((sum, a) => sum + a.seconds, 0).toFixed(2)),
      longestSegmentSeconds: Number(longestSegment.toFixed(2)),
    },
    artifacts,
    errors,
    warnings,
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log('\nSummary');
  for (const [name, passed] of Object.entries(checks)) {
    console.log(`  ${passed ? '[ok]  ' : '[FAIL]'} ${name}`);
  }
  console.log(
    `  artifacts: ${artifacts.length}/${jobs.length} (${formatBytes(manifest.totals.bytes)} total, ${formatSeconds(manifest.totals.audioSeconds)} of audio)`
  );
  console.log(`  manifest:  ${path.join(outDir, 'manifest.json')}`);

  if (options.json) {
    console.log(JSON.stringify(manifest, null, 2));
  }

  if (!ok) {
    console.error(`\n[FAIL] ${errors.length} job(s) failed${errors.length ? `; first: ${errors[0]}` : ''}`);
    process.exitCode = 1;
    return;
  }
  console.log('\n[ok] full mix and every segment synthesized with the licensed voice.');
}

main().catch((error) => {
  if (error instanceof UsageError) {
    console.error(`[usage] ${error.message}`);
    process.exitCode = 2;
    return;
  }
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
