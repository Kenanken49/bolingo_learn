// Supabase Edge Function: process-upload
//
// Async pipeline: User Uploads -> Storage (user-materials) -> this function
//   1. Download the raw file from the `user-materials` bucket.
//   2. Extract text (plain text now; PDF/audio are extension points).
//   3. AI Curation Engine: send the text to a cost-effective LLM (DeepSeek-V3
//      default, GPT-4o-mini supported) with strict instructions to output a
//      JSON array of quiz elements (multiple-choice | drag-and-drop).
//   4. Insert a lesson (is_user_generated = true, tagged to the user) plus one
//      questions row per quiz element, linked via lessons.upload_source_id.
//   5. Synthesize the lesson into an audiobook (ElevenLabs or OpenAI TTS)
//      and store the MP3 back in Storage.
//   6. Freemium gate: free tier = text ≤1000 words + no elite TTS (the app
//      falls back to device-native expo-speech, $0); premium unlocks
//      PDF/audio, smart compilation, and elite voices, capped at
//      100k billed words/month.
//   7. Flip user_uploads.status to `ready` (or `failed` with a logged error).
//
// Invoke after upload (client calls this with { upload_id }), or wire a
// Supabase Storage webhook (object created in `user-materials`) to this endpoint.
// Deploy with: supabase functions deploy process-upload
//
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LLM_API_KEY,
//   TTS_API_KEY. Optional: LLM_BASE_URL (default DeepSeek), LLM_MODEL,
//   TTS_PROVIDER (elevenlabs|openai, default elevenlabs),
//   TTS_MODEL_ID (eleven_multilingual_v2 for emotional nuance | eleven_turbo_v2_5 for speed),
//   TTS_VOICE_ID (ElevenLabs voice id), TTS_VOICE (OpenAI alloy|shimmer|onyx),
//   OPENAI_BASE_URL.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LLM_BASE_URL = Deno.env.get('LLM_BASE_URL') ?? 'https://api.deepseek.com/chat/completions';
const LLM_MODEL = Deno.env.get('LLM_MODEL') ?? 'deepseek-chat';
const TTS_PROVIDER = Deno.env.get('TTS_PROVIDER') ?? 'elevenlabs';
const TTS_MODEL_ID = Deno.env.get('TTS_MODEL_ID') ?? 'eleven_multilingual_v2';
const TTS_VOICE = Deno.env.get('TTS_VOICE') ?? 'alloy';
const OPENAI_BASE_URL = Deno.env.get('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1';

const CURRICULUM_PROMPT = `You are an elite educational structuralist. Analyze this uploaded text. Extract the top 5 core programming concepts or language vocabulary terms. For each concept, generate exactly 3 interactive quiz elements using the following JSON schema: [{ "type": "multiple-choice" | "drag-and-drop", "prompt": "...", "options": ["...", "..."], "answer": "..." }]. Return nothing but valid JSON.`;

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
    return new TextDecoder().decode(bytes);
  }
  // PDFs: lightweight text extraction via pdf-parse (npm: specifier works
  // in Supabase Edge Functions' Deno runtime).
  if (lower.endsWith('.pdf')) {
    const { default: pdfParse } = await import('npm:pdf-parse@1.1.1');
    const result = await pdfParse(bytes);
    const text = (result?.text ?? '').trim();
    if (!text) throw new Error('No extractable text found in PDF (scanned image?).');
    return text;
  }
  // Phase 2 extension point: transcribe audio (e.g. Whisper) before the LLM
  // step. Failing loudly keeps uploads honest.
  if (/\.(mp3|wav|m4a|ogg|webm)$/.test(lower)) {
    throw new Error('Audio transcription is not wired up yet (Phase 2). Upload .txt/.md/.pdf for now.');
  }
  throw new Error(`Unsupported file type: ${fileName}`);
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
        { role: 'user', content: rawText.slice(0, 12000) },
      ],
      temperature: 0.4,
    }),
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
  if (TTS_PROVIDER === 'openai') {
    const res = await fetch(`${OPENAI_BASE_URL}/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'tts-1', input: narration.slice(0, 4000), voice: TTS_VOICE }),
    });
    if (!res.ok) throw new Error(`OpenAI TTS failed: ${res.status} ${await res.text()}`);
    return new Uint8Array(await res.arrayBuffer());
  }
  // Default: ElevenLabs.
  const voiceId = Deno.env.get('TTS_VOICE_ID') ?? '21m00Tcm4TlvDq8ikWAM';
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({ text: narration.slice(0, 4000), model_id: TTS_MODEL_ID }),
  });
  if (!res.ok) throw new Error(`ElevenLabs TTS failed: ${res.status} ${await res.text()}`);
  return new Uint8Array(await res.arrayBuffer());
}

serve(async (req: Request) => {
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

    const { data: upload, error: fetchError } = await supabase
      .from('user_uploads')
      .select('*')
      .eq('id', uploadId)
      .single();
    if (fetchError || !upload) throw new Error(`Upload not found: ${uploadId}`);

    const filePath = `${upload.user_id}/${upload.file_name}`;
    const { data: file, error: dlError } = await supabase.storage.from('user-materials').download(filePath);
    if (dlError || !file) throw new Error(`Download failed for ${filePath}: ${dlError?.message}`);

    const { data: owner } = await supabase
      .from('profiles')
      .select('is_premium,ai_words_used,ai_words_reset_at')
      .eq('id', upload.user_id)
      .single();
    const isPremium = (owner as { is_premium?: boolean } | null)?.is_premium === true;
    let aiUsed = (owner as { ai_words_used?: number } | null)?.ai_words_used ?? 0;
    const resetAt = new Date(
      (owner as { ai_words_reset_at?: string } | null)?.ai_words_reset_at ?? new Date(0).toISOString()
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
      throw new Error('Free tier supports text files only — upgrade to Premium for PDF & audio.');
    }

    const text = await extractText(upload.file_name, new Uint8Array(await file.arrayBuffer()));
    const words = countWords(text);
    if (!isPremium && words > FREE_WORD_LIMIT) {
      throw new Error(`Free tier caps uploads at ${FREE_WORD_LIMIT} words (this file: ~${words}).`);
    }
    const billable = isPremium ? words : 0;
    if (isPremium && aiUsed + billable > PREMIUM_MONTHLY_WORD_CAP) {
      throw new Error(
        `Monthly AI budget used (${aiUsed.toLocaleString()}/${PREMIUM_MONTHLY_WORD_CAP.toLocaleString()} words).`
      );
    }
    const quiz = await generateQuizQuestions(text);
    if (isPremium && billable > 0) {
      await supabase.from('profiles').update({ ai_words_used: aiUsed + billable }).eq('id', upload.user_id);
    }
    if (quiz.length === 0) throw new Error('LLM returned zero quiz elements.');

    // Lesson tagged to the uploading user; questions carry the same owner.
    const title = upload.file_name.replace(/\.[^.]+$/, '');
    const lessonContent = { title, question_count: quiz.length, questions: quiz };
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
      }))
    );
    if (questionsError) throw new Error(`Questions insert failed: ${questionsError.message}`);

    // Audiobook engine: premium gets elite TTS (ElevenLabs/OpenAI) — one
    // full-mix MP3 plus one segment MP3 per quiz element for block
    // highlighting. Free tier skips server TTS entirely; the app narrates
    // on-device via expo-speech at $0 cost.
    const fullNarration = isPremium ? quiz.map((q) => q.prompt).join('\n').slice(0, 4000) : '';
    let audioUrl: string | undefined;
    const segments: Array<{ question_id: string; prompt: string; audio_url: string }> = [];
    if (fullNarration) {
      const mix = await synthesizeAudio(fullNarration);
      audioUrl = `${upload.user_id}/audio/${lesson.id}.mp3`;
      const { error: upError } = await supabase.storage
        .from('user-materials')
        .upload(audioUrl, mix, { contentType: 'audio/mpeg', upsert: true });
      if (upError) throw new Error(`Audio upload failed: ${upError.message}`);
    }

    const { data: rows } = await supabase
      .from('questions')
      .select('id,prompt')
      .eq('lesson_id', lesson.id)
      .order('created_at');
    for (const [i, row] of ((rows ?? []) as Array<{ id: string; prompt: string }>).entries()) {
      try {
        const seg = await synthesizeAudio(row.prompt.slice(0, 1000));
        const segPath = `${upload.user_id}/audio/${lesson.id}/${i}.mp3`;
        const { error: segError } = await supabase.storage
          .from('user-materials')
          .upload(segPath, seg, { contentType: 'audio/mpeg', upsert: true });
        if (segError) throw segError;
        segments.push({ question_id: row.id, prompt: row.prompt, audio_url: segPath });
      } catch (segErr) {
        console.warn(`Segment ${i} TTS failed, skipping:`, segErr);
      }
    }
    await supabase
      .from('lessons')
      .update({ content: { ...lessonContent, audio_url: audioUrl, segments } })
      .eq('id', lesson.id);

    await supabase.from('user_uploads').update({ status: 'ready' }).eq('id', upload.id);
    return new Response(
      JSON.stringify({ ok: true, lesson_id: lesson.id, question_count: quiz.length, segment_count: segments.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('process-upload failed:', e);
    if (uploadId) {
      await supabase.from('user_uploads').update({ status: 'failed' }).eq('id', uploadId);
    }
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
