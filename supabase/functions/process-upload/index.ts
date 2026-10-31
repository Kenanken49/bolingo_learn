// Supabase Edge Function: process-upload
//
// Async pipeline: User Uploads -> Storage (user-materials) -> this function
//   1. Resolve the raw file in the `user-materials` bucket. Audio/video rows
//      must carry the content-rights attestation before this happens.
//   2. Extract text — plain text, PDF, photo OCR, or consented audio/video
//      transcription (Deepgram signed URL, or an OpenAI-compatible Whisper
//      endpoint for clips under 25 MB).
//   3. AI Curation Engine: send the text to a cost-effective LLM (DeepSeek-V3
//      default, GPT-4o-mini supported) with strict instructions to output a
//      JSON array of quiz elements (multiple-choice | drag-and-drop).
//   4. Insert a lesson (is_user_generated = true, tagged to the user) plus one
//      questions row per quiz element, linked via lessons.upload_source_id.
//   5. Synthesize the lesson into an audiobook (ElevenLabs or OpenAI TTS)
//      and store the MP3 back in Storage.
//   6. Freemium gate: free tier = text ≤1000 words + no elite TTS (the app
//      falls back to device-native expo-speech, $0); premium unlocks PDF,
//      photo scan, audio/video transcription, smart compilation, and elite
//      voices, capped at 100k billed words/month.
//   7. Flip user_uploads.status to `ready` (or `failed` with a logged error).
//
// Reliability model (big-book hardened):
//   - The handler validates + returns HTTP 202 immediately, continuing the
//     pipeline in the background via EdgeRuntime.waitUntil. The client polls
//     user_uploads until status flips — a full-book PDF + CPU-hosted LLM +
//     several TTS calls can take minutes, far past the request window.
//   - PDF text is capped (60k chars) before the LLM step; the LLM prompt is
//     capped at 8k chars so small self-hosted models don't crawl.
//   - LLM/TTS fetches carry timeouts so one slow call fails loudly instead
//     of hanging the row in `processing` forever.
//   - Segment TTS runs concurrently (Promise.allSettled), not sequentially.
//
// Invoke after upload (client calls this with { upload_id }), or wire a
// Supabase Storage webhook (object created in `user-materials`) to this endpoint.
// Deploy with: supabase functions deploy process-upload
//
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LLM_API_KEY,
//   TTS_API_KEY. Optional: LLM_BASE_URL (default DeepSeek), LLM_MODEL,
//   DEEPGRAM_API_KEY (recommended transcription provider; fetches a signed
//     URL, so long audio/video needs no download), or TRANSCRIBE_API_KEY for
//     an OpenAI-compatible /audio/transcriptions endpoint (≤25 MB). Optional:
//   TRANSCRIBE_PROVIDER (deepgram|openai), TRANSCRIBE_MODEL,
//   TRANSCRIBE_BASE_URL, TRANSCRIBE_LANGUAGE, TRANSCRIBE_MAX_BYTES,
//   TRANSCRIBE_TIMEOUT_MS. See docs/transcription.md.
//   TTS_PROVIDER (elevenlabs|openai, default elevenlabs),
//   TTS_MODEL_ID (eleven_multilingual_v2 for emotional nuance | eleven_turbo_v2_5 for speed),
//   TTS_VOICE_ID (ElevenLabs voice id), TTS_VOICE (OpenAI alloy|echo|fable|onyx|nova|shimmer),
//   TTS_OUTPUT_FORMAT, TTS_STABILITY, TTS_SIMILARITY_BOOST, TTS_STYLE,
//   TTS_SPEAKER_BOOST, OPENAI_BASE_URL. The values are validated by
//   ../_shared/audiobookVoice.ts; see docs/audiobook-voice.md.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { audiobookVoiceFromEnv, buildSpeechRequest } from '../_shared/audiobookVoice.ts';
import {
  CONTENT_RIGHTS_REQUIRED_MESSAGE,
  hasValidContentRightsAttestation,
  isMediaUpload,
} from '../_shared/contentRights.ts';
import {
  mediaTooLargeMessage,
  transcribeMedia,
  transcriptionConfigFromEnv,
  type TranscriptionResult,
  type TranscriptionSource,
} from '../_shared/transcription.ts';

// Browser (web export) invocations are cross-origin — answer preflights.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LLM_BASE_URL = Deno.env.get('LLM_BASE_URL') ?? 'https://api.deepseek.com/chat/completions';
const LLM_MODEL = Deno.env.get('LLM_MODEL') ?? 'deepseek-chat';
const OPENAI_BASE_URL = Deno.env.get('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1';

// Big-book bounds: full PDFs go through pdf-parse (memory-heavy), so cap the
// text before anything downstream sees it. Billing counts the capped text.
const MAX_EXTRACT_CHARS = 60000;
// Small self-hosted models (e.g. 1.5B on CPU) crawl on huge contexts —
// 3.5k chars is plenty for 4-5 quiz elements and ~2x faster than 8k.
const MAX_LLM_CHARS = 3500;

const CURRICULUM_PROMPT = `You are an elite educational structuralist designing bite-sized mobile lessons (2-5 minutes each, dead-time friendly). Analyze this uploaded text. Extract the top 2-3 core concepts only. Generate a TOTAL of 4-5 interactive quiz elements (mix multiple-choice and drag-and-drop) using this JSON schema: [{ "type": "multiple-choice" | "drag-and-drop", "prompt": "...", "options": ["...", "..."], "answer": "..." }]. Keep prompts short and mobile-friendly. Bolingo's mentors are Livia (female language mentor), Bingo (male owl tutor), and Zora (female build coach). When you invent an example learner or character, use one of them. Never replace the name of a real author, historical figure, public person, or a named person from the source: preserve it exactly, and never attribute invented words or actions to a real person. Return nothing but valid JSON.`;

interface QuizItem {
  type: 'multiple-choice' | 'drag-and-drop';
  prompt: string;
  options: string[];
  answer: string;
}

// Strictly validate the LLM payload against the quiz schema before it touches
// the database. Accepts a bare array or { "questions": [...] }.
function coerceQuiz(payload: unknown): QuizItem[] {
  const arr = Array.isArray(payload) ? payload : (payload as { questions?: unknown })?.questions;
  if (!Array.isArray(arr)) throw new Error('LLM did not return a JSON array.');
  return arr.map((q, i) => {
    const item = q as Record<string, unknown>;
    if (item.type !== 'multiple-choice' && item.type !== 'drag-and-drop') {
      throw new Error(`Question ${i}: type must be multiple-choice or drag-and-drop.`);
    }
    if (typeof item.prompt !== 'string' || !item.prompt) throw new Error(`Question ${i}: bad prompt.`);
    if (!Array.isArray(item.options) || !item.options.every((o) => typeof o === 'string')) {
      throw new Error(`Question ${i}: options must be a string array.`);
    }
    if (typeof item.answer !== 'string' || !item.answer) throw new Error(`Question ${i}: bad answer.`);
    return item as unknown as QuizItem;
  });
}

async function extractText(fileName: string, bytes: Uint8Array): Promise<string> {
  const lower = fileName.toLowerCase();
  // Text/Markdown: parsed directly as a string.
  if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.csv')) {
    const text = new TextDecoder().decode(bytes).trim();
    return text.length > MAX_EXTRACT_CHARS ? text.slice(0, MAX_EXTRACT_CHARS) : text;
  }
  // PDFs: lightweight text extraction via pdf-parse (npm: specifier works
  // in Supabase Edge Functions' Deno runtime).
  if (lower.endsWith('.pdf')) {
    const { default: pdfParse } = await import('npm:pdf-parse@1.1.1');
    const result = await pdfParse(bytes);
    const text = (result?.text ?? '').trim();
    if (!text) throw new Error('No extractable text found in PDF (scanned image?).');
    return text.length > MAX_EXTRACT_CHARS ? text.slice(0, MAX_EXTRACT_CHARS) : text;
  }
  // Photos/scans (Premium Scan): OCR via a vision-capable chat model.
  // The self-hosted 1.5B primary is text-only, so scans route to the
  // LLM_FALLBACK_* backend (e.g. Groq's free llama-4-scout vision).
  if (/\.(jpe?g|png|webp)$/.test(lower)) {
    return await transcribePhoto(bytes);
  }
  if (/\.(heic|heif)$/.test(lower)) {
    throw new Error('iPhone HEIC photos are not supported — open the photo, save/share it as JPG first, then scan it.');
  }
  // Media never reaches this function: processUpload routes it through
  // transcribeUpload() so the content-rights gate and transcript cache apply.
  // This branch is defensive, e.g. a link to a media file with no extension.
  if (/\.(mp3|wav|m4a|ogg|oga|opus|aac|flac|webm|mp4|m4v|mov|mkv|avi|wmv|flv|3gp)$/.test(lower)) {
    throw new Error('Audio/video must be transcribed before text extraction.');
  }
  throw new Error(`Unsupported file type: ${fileName}`);
}

const VISION_URL = Deno.env.get('LLM_FALLBACK_URL') ?? '';
const VISION_KEY = Deno.env.get('LLM_FALLBACK_KEY') ?? '';
const VISION_MODEL = Deno.env.get('LLM_FALLBACK_MODEL') ?? '';
// Phone photos at quality 0.7 land well under this; bigger means the
// learner should retake closer-up rather than pay OCR on a billboard.
const MAX_PHOTO_BYTES = 6_000_000;

function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(s);
}

function sniffMime(bytes: Uint8Array): string {
  if (bytes.length > 3 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) return 'image/png';
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length > 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  return 'image/jpeg';
}

async function transcribePhoto(bytes: Uint8Array): Promise<string> {
  if (!VISION_URL || !VISION_KEY) {
    throw new Error('Photo scanning is not wired up yet — set the LLM_FALLBACK_* vision secrets (e.g. Groq + a vision model) to enable Scan.');
  }
  if (bytes.length > MAX_PHOTO_BYTES) {
    throw new Error(`Photo is too large (~${(bytes.length / 1048576).toFixed(1)} MB) — retake it closer-up so the notes fill the frame (max 6 MB).`);
  }
  const res = await fetch(VISION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${VISION_KEY}` },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are an OCR engine. Transcribe every handwritten and printed word in the photo exactly, preserving line breaks and layout order. Return ONLY the transcription, no commentary, no markdown fences.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Transcribe this study-note photo:' },
            { type: 'image_url', image_url: { url: `data:${sniffMime(bytes)};base64,${bytesToBase64(bytes)}` } },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 2000,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Photo OCR failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  let content: string = data.choices?.[0]?.message?.content ?? '';
  // Reasoning-style vision models leak <think> blocks — strip them.
  content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (!content) {
    throw new Error('No readable text found in this photo — retake it sharper, with the notes filling the frame and good light.');
  }
  return content.length > MAX_EXTRACT_CHARS ? content.slice(0, MAX_EXTRACT_CHARS) : content;
}

async function generateQuizQuestions(rawText: string): Promise<QuizItem[]> {
  const apiKey = Deno.env.get('LLM_API_KEY') ?? '';
  if (!apiKey) throw new Error('Missing LLM_API_KEY secret.');
  const res = await fetch(LLM_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: CURRICULUM_PROMPT },
        { role: 'user', content: rawText.slice(0, MAX_LLM_CHARS) },
      ],
      temperature: 0.4,
    }),
    // A hung LLM must fail loudly, not park the row in `processing`.
    signal: AbortSignal.timeout(100_000),
  });
  if (!res.ok) throw new Error(`LLM request failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? '';
  const json = content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return coerceQuiz(JSON.parse(json));
}

const FREE_WORD_LIMIT = 1000;
const PREMIUM_MONTHLY_WORD_CAP = 100_000;

const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

async function synthesizeAudio(narration: string): Promise<Uint8Array> {
  const apiKey = Deno.env.get('TTS_API_KEY') ?? '';
  if (!apiKey) throw new Error('Missing TTS_API_KEY secret.');
  // Parse on every job so a bad deployment secret fails this TTS step with a
  // precise message, while the already-ready quiz stays usable.
  const config = audiobookVoiceFromEnv(Deno.env.toObject());
  const request = buildSpeechRequest(config, narration, { apiKey, baseUrl: OPENAI_BASE_URL });
  const res = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(request.body),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`${config.provider} TTS failed: ${res.status} ${await res.text()}`);
  return new Uint8Array(await res.arrayBuffer());
}

const MEDIA_CONTENT_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  aac: 'audio/aac',
  flac: 'audio/flac',
  webm: 'video/webm',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  wmv: 'video/x-ms-wmv',
  flv: 'video/x-flv',
  '3gp': 'video/3gpp',
};

function mediaContentType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  return MEDIA_CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

/**
 * Read an object's size from Storage metadata without downloading it. The
 * OpenAI path has a 25 MB ceiling, so checking first keeps a multi-GB video
 * out of Edge Function memory instead of downloading it just to reject it.
 * Returns null when the listing is unavailable; the post-download check in
 * the shared module still enforces the limit.
 */
async function storageObjectSize(
  supabase: ReturnType<typeof createClient>,
  filePath: string,
): Promise<number | null> {
  const slash = filePath.lastIndexOf('/');
  const dir = slash >= 0 ? filePath.slice(0, slash) : '';
  const name = filePath.slice(slash + 1);
  const { data, error } = await supabase.storage
    .from('user-materials')
    .list(dir, { limit: 100, search: name });
  if (error || !data) return null;
  const match = (data as Array<{ name?: string; metadata?: { size?: number } | null }>).find(
    (entry) => entry.name === name,
  );
  const size = match?.metadata?.size;
  return typeof size === 'number' && size > 0 ? size : null;
}

/**
 * Transcribe one consented media upload. The transcript is persisted on the
 * upload row before the LLM sees it, so a retry after an LLM/TTS failure does
 * not pay the provider a second time and produces the same text. Deepgram gets
 * a one-hour signed URL (no download of a multi-GB video); OpenAI-compatible
 * endpoints get the bytes and are bounded by their 25 MB limit.
 */
async function transcribeUpload(
  supabase: ReturnType<typeof createClient>,
  upload: Record<string, unknown>,
  filePath: string,
): Promise<{ text: string; result: TranscriptionResult | null }> {
  const cached = typeof upload.transcript === 'string' ? upload.transcript.trim() : '';
  if (cached) {
    console.log(`Reusing stored transcript for ${String(upload.file_name)} (${cached.length} chars).`);
    return { text: cached, result: null };
  }

  const config = transcriptionConfigFromEnv(Deno.env.toObject());
  const fileName = String(upload.file_name ?? 'upload');
  let source: TranscriptionSource;

  if (config.provider === 'deepgram') {
    const { data: signed, error: signError } = await supabase.storage
      .from('user-materials')
      .createSignedUrl(filePath, 3600);
    if (signError || !signed?.signedUrl) {
      throw new Error(
        `Could not create a temporary media link for transcription: ${signError?.message ?? 'unknown error'}`,
      );
    }
    source = { kind: 'url', url: signed.signedUrl };
  } else {
    // Reject an oversized recording from metadata before downloading it.
    const size = await storageObjectSize(supabase, filePath);
    if (size !== null && size > config.maxBytes) {
      throw new Error(mediaTooLargeMessage(config, size));
    }
    const { data: file, error: dlError } = await supabase.storage
      .from('user-materials')
      .download(filePath);
    if (dlError || !file) throw new Error(`Download failed for ${filePath}: ${dlError?.message}`);
    source = {
      kind: 'file',
      bytes: new Uint8Array(await file.arrayBuffer()),
      fileName,
      contentType: mediaContentType(fileName),
    };
  }

  const result = await transcribeMedia(config, source);
  const { error: persistError } = await supabase
    .from('user_uploads')
    .update({
      transcript: result.text,
      transcript_provider: result.provider,
      transcript_model: result.model,
      transcript_language: result.language,
      transcript_duration_seconds: result.durationSeconds,
      transcribed_at: new Date().toISOString(),
    })
    .eq('id', upload.id);
  if (persistError) console.warn('Transcript cache write skipped:', persistError.message);
  console.log(
    `Transcribed ${fileName}: ${result.text.length} chars via ${result.provider}/${result.model}`,
  );
  return { text: result.text, result };
}

type ProcessResult =
  | { ok: true; lesson_id: number; question_count: number; segment_count: number }
  | { ok: false; error: string };

// The full pipeline. Never rejects — every failure path flips the row to
// `failed` so the client never polls forever.
async function processUpload(
  supabase: ReturnType<typeof createClient>,
  uploadId: string,
): Promise<ProcessResult> {
  try {
    const { data: upload, error: fetchError } = await supabase
      .from('user_uploads')
      .select('*')
      .eq('id', uploadId)
      .single();
    if (fetchError || !upload) throw new Error(`Upload not found: ${uploadId}`);

    // Server-side gate: a media row must carry the same checklist attestation
    // the client collects. This also covers a storage webhook or a row inserted
    // directly into the table, not just the in-app upload button.
    if (isMediaUpload(upload.file_name) && !hasValidContentRightsAttestation(upload.rights_attestation)) {
      throw new Error(CONTENT_RIGHTS_REQUIRED_MESSAGE);
    }

    const filePath = `${upload.user_id}/${upload.file_name}`;

    const { data: owner } = await supabase
      .from('profiles')
      .select('is_premium,ai_words_used,ai_words_reset_at')
      .eq('id', upload.user_id)
      .single();
    const isPremium = (owner as { is_premium?: boolean } | null)?.is_premium === true;
    let aiUsed = (owner as { ai_words_used?: number } | null)?.ai_words_used ?? 0;
    const resetAt = new Date(
      (owner as { ai_words_reset_at?: string } | null)?.ai_words_reset_at ?? new Date(0).toISOString(),
    );
    if (Date.now() - resetAt.getTime() > 30 * 86400 * 1000) {
      aiUsed = 0;
      await supabase
        .from('profiles')
        .update({ ai_words_used: 0, ai_words_reset_at: new Date().toISOString() })
        .eq('id', upload.user_id);
    }

    const lower = upload.file_name.toLowerCase();
    const isText = lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.csv');
    if (!isPremium && !isText) {
      throw new Error(
        'Free tier supports text files only — upgrade to Premium for PDF, photo Scan, audio and video.',
      );
    }

    const media = isMediaUpload(upload.file_name);
    let text: string;
    let transcript: TranscriptionResult | null = null;
    if (media) {
      // Consent was re-checked above; transcription only runs after this point.
      const transcribed = await transcribeUpload(supabase, upload, filePath);
      text = transcribed.text;
      transcript = transcribed.result;
    } else {
      const { data: file, error: dlError } = await supabase.storage
        .from('user-materials')
        .download(filePath);
      if (dlError || !file) throw new Error(`Download failed for ${filePath}: ${dlError?.message}`);
      text = await extractText(upload.file_name, new Uint8Array(await file.arrayBuffer()));
    }
    const words = countWords(text);
    if (!isPremium && words > FREE_WORD_LIMIT) {
      throw new Error(`Free tier caps uploads at ${FREE_WORD_LIMIT} words (this file: ~${words}).`);
    }
    const billable = isPremium ? words : 0;
    if (isPremium && aiUsed + billable > PREMIUM_MONTHLY_WORD_CAP) {
      throw new Error(
        `Monthly AI budget used (${aiUsed.toLocaleString()}/${PREMIUM_MONTHLY_WORD_CAP.toLocaleString()} words).`,
      );
    }
    const quiz = await generateQuizQuestions(text);
    if (isPremium && billable > 0) {
      await supabase.from('profiles').update({ ai_words_used: aiUsed + billable }).eq('id', upload.user_id);
    }
    if (quiz.length === 0) throw new Error('LLM returned zero quiz elements.');

    // Lesson tagged to the uploading user; questions carry the same owner.
    // lessons.id is INTEGER (pre-existing table) — lesson.id flows through
    // as a number into questions.lesson_id, storage paths, and responses.
    const title = upload.file_name.replace(/\.[^.]+$/, '');
    // Keep the lesson's provenance with the lesson itself: a media lesson
    // records which provider/model produced its transcript, its language and
    // duration. The full transcript stays on the upload row.
    const transcriptInfo = media
      ? {
          chars: text.length,
          language: (upload.transcript_language as string | null) ?? transcript?.language ?? null,
          duration_seconds:
            (upload.transcript_duration_seconds as number | null) ??
            transcript?.durationSeconds ??
            null,
          provider: (upload.transcript_provider as string | null) ?? transcript?.provider ?? null,
          model: (upload.transcript_model as string | null) ?? transcript?.model ?? null,
        }
      : null;
    // Bite-sized: 4–5 questions ≈ 2–5 min dead-time session (matches curriculum minutes).
    const lessonContent = {
      title,
      question_count: quiz.length,
      questions: quiz,
      estimated_minutes: Math.max(2, Math.min(5, Math.ceil(quiz.length * 0.8))),
      ...(transcriptInfo ? { transcript: transcriptInfo } : {}),
    };
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .insert({
        title,
        language: 'en',
        level: 1,
        content: lessonContent,
        upload_source_id: upload.id,
        user_id: upload.user_id,
        is_user_generated: true,
      })
      .select('id')
      .single();
    if (lessonError || !lesson) throw new Error(`Lesson insert failed: ${lessonError?.message}`);

    const { error: questionsError } = await supabase.from('questions').insert(
      quiz.map((q) => ({
        lesson_id: lesson.id,
        user_id: upload.user_id,
        type: q.type,
        prompt: q.prompt,
        options: q.options,
        answer: q.answer,
      })),
    );
    if (questionsError) throw new Error(`Questions insert failed: ${questionsError.message}`);

    // STAGED READY: flip to ready immediately so the learner can open the
    // lesson in ~30-60s (PDF parse + one LLM call). Audio fills in after —
    // the old order held status in `processing` through 6 slow TTS calls,
    // which is why full books "took forever" even though the quiz was done.
    await supabase.from('user_uploads').update({ status: 'ready', error: null }).eq('id', upload.id);
    const earlyResult: ProcessResult = { ok: true, lesson_id: lesson.id, question_count: quiz.length, segment_count: 0 };

    // Audiobook engine (non-blocking): premium gets elite TTS — one full-mix
    // MP3 plus one segment MP3 per quiz element. Free tier skips server TTS;
    // the app narrates on-device via expo-speech at $0 cost. TTS failures
    // only skip audio — the lesson is already ready above.
    try {
      const fullNarration = isPremium ? quiz.map((q) => q.prompt).join('\n').slice(0, 4000) : '';
      let audioUrl: string | undefined;
      const segments: Array<{ question_id: string; prompt: string; audio_url: string }> = [];
      const jobs: Array<Promise<void>> = [];
      if (fullNarration) {
        jobs.push(
          (async () => {
            const mix = await synthesizeAudio(fullNarration);
            audioUrl = `${upload.user_id}/audio/${lesson.id}.mp3`;
            const { error: upError } = await supabase.storage
              .from('user-materials')
              .upload(audioUrl, mix, { contentType: 'audio/mpeg', upsert: true });
            if (upError) throw upError;
          })(),
        );
      }
      const { data: rows } = await supabase
        .from('questions')
        .select('id,prompt')
        .eq('lesson_id', lesson.id)
        .order('created_at');
      for (const [i, row] of (((rows ?? []) as Array<{ id: string; prompt: string }>)).entries()) {
        jobs.push(
          (async () => {
            const seg = await synthesizeAudio(row.prompt.slice(0, 1000));
            const segPath = `${upload.user_id}/audio/${lesson.id}/${i}.mp3`;
            const { error: segError } = await supabase.storage
              .from('user-materials')
              .upload(segPath, seg, { contentType: 'audio/mpeg', upsert: true });
            if (segError) throw segError;
            segments.push({ question_id: row.id, prompt: row.prompt, audio_url: segPath });
          })(),
        );
      }
      const settled = await Promise.allSettled(jobs);
      for (const r of settled) {
        if (r.status === 'rejected') console.warn('TTS job skipped:', r.reason);
      }
      if (audioUrl || segments.length > 0) {
        await supabase
          .from('lessons')
          .update({ content: { ...lessonContent, audio_url: audioUrl, segments } })
          .eq('id', lesson.id);
      }
      return { ok: true, lesson_id: lesson.id, question_count: quiz.length, segment_count: segments.length };
    } catch (ttsErr) {
      console.warn('Post-ready TTS skipped:', ttsErr);
      return earlyResult;
    }
  } catch (e) {
    console.error('process-upload failed:', e);
    // Persist the reason on the row (truncated) so the app can show WHY it
    // failed instead of a bare red dot — read it with:
    //   select file_name, status, error from user_uploads order by created_at desc limit 5;
    const reason = String(e && typeof e === 'object' && 'message' in e ? (e as { message: unknown }).message : e).slice(0, 500);
    try {
      await supabase.from('user_uploads').update({ status: 'failed', error: reason }).eq('id', uploadId);
    } catch {
      /* status flip is best-effort */
    }
    return { ok: false, error: String(e) };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) {
    return new Response('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY', { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  let uploadId: string | undefined;
  try {
    const body = await req.json();
    // Support direct invocation { upload_id } and Storage webhooks { record: { id, ... } }.
    uploadId = body.upload_id ?? body.record?.id;
    if (!uploadId) return new Response('Missing upload_id', { status: 400 });
  } catch {
    return new Response('Missing upload_id', { status: 400 });
  }

  const done = processUpload(supabase, uploadId);
  // Background the pipeline and acknowledge immediately: the client polls
  // user_uploads until ready. Big books take minutes — far past the
  // request/response window, which used to die and park rows in
  // `processing` forever.
  const rt = (globalThis as Record<string, unknown>).EdgeRuntime as
    | { waitUntil(p: Promise<unknown>): void }
    | undefined;
  if (rt && typeof rt.waitUntil === 'function') {
    rt.waitUntil(done);
    return new Response(JSON.stringify({ accepted: true, upload_id: uploadId }), {
      status: 202,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  // Local runtimes without EdgeRuntime: run inline and report the outcome.
  const result = await done;
  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
