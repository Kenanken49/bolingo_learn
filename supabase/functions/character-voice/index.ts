// Supabase Edge Function: character-voice.
//
// One studio line for Livia, Bingo or Zora. The app asks for a line, this
// function answers with a playable URL: the first request for a line
// synthesizes it on ElevenLabs and stores the MP3, every later request (any
// learner, any retry) returns a signed URL to the cached clip.
//
// Why this exists: the characters used to be device TTS only, so every lesson
// prompt sounded like the phone. A per-line endpoint keeps that honest — the
// client still falls back to the device voice on any failure, so a missing key,
// a provider outage or a Swahili line never leaves a learner in silence.
//
// Deploy with: supabase functions deploy character-voice
// Requires: TTS_API_KEY (the same secret the audiobook pipeline uses; an
// older deployment may only have ELEVENLABS_API_KEY, which is also accepted).
//
// Cost shape: one synthesis per unique (voice, tuning, language, text). Cache
// hits are free, so the bill is bounded by distinct lesson lines, not plays.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildCharacterSpeechRequest,
  characterLineKey,
  characterSpeaks,
  characterVoice,
  MAX_CHARACTER_LINE_CHARS,
} from '../_shared/characterVoices.ts';

const API_ROOT = Deno.env.get('ELEVENLABS_BASE_URL') || 'https://api.elevenlabs.io/v1';
const BUCKET = 'user-materials';
const SIGNED_URL_SECONDS = 3600;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/** Cache paths are content-addressed, so a retune writes a new object. */
function cachePath(character: string, key: string): string {
  return `character-audio/${character}/${key}.mp3`;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const apiKey = Deno.env.get('TTS_API_KEY') ?? Deno.env.get('ELEVENLABS_API_KEY') ?? '';
    const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!supabaseUrl || !serviceKey) return json({ error: 'Server is not configured.' }, 500);
    if (!jwt) return json({ error: 'Sign in to hear the characters.', fallback: true }, 401);

    const supabase = createClient(supabaseUrl, serviceKey);
    const {
      data: { user },
    } = await supabase.auth.getUser(jwt);
    if (!user) return json({ error: 'Sign in to hear the characters.', fallback: true }, 401);

    const payload = (await req.json().catch(() => ({}))) as {
      character?: unknown;
      text?: unknown;
      language?: unknown;
    };

    const voice = characterVoice(payload.character);
    if (!voice) return json({ error: 'Unknown character.', fallback: true }, 400);

    const text = String(payload.text ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return json({ error: 'Nothing to say.', fallback: true }, 400);
    if (text.length > MAX_CHARACTER_LINE_CHARS) {
      return json({ error: 'That line is too long for a character clip.', fallback: true }, 400);
    }

    const language = String(payload.language ?? 'en')
      .trim()
      .toLowerCase()
      .split(/[-_]/)[0];
    // Swahili (and anything outside the model's list) stays on the device
    // voice. Answering "fallback" instead of an error keeps that a normal,
    // expected outcome rather than a broken request.
    if (!characterSpeaks(voice.id, language)) {
      return json({ fallback: true, reason: 'language', character: voice.id, language }, 200);
    }

    const key = await sha256Hex(characterLineKey(voice, text, language));
    const path = cachePath(voice.id, key);

    // Cached clip: a signed URL is the whole answer, no bytes move.
    const { data: cached } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
    if (cached?.signedUrl) {
      return json({
        url: cached.signedUrl,
        character: voice.id,
        voice: voice.studioName,
        cached: true,
      });
    }

    if (!apiKey) return json({ error: 'Character voice is not configured.', fallback: true }, 503);

    const request = buildCharacterSpeechRequest(voice, text, { apiKey, baseUrl: API_ROOT });
    const response = await fetch(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('character-voice synthesis failed', response.status, detail.slice(0, 300));
      return json({ error: 'The studio voice is unavailable right now.', fallback: true }, 502);
    }

    const audio = new Uint8Array(await response.arrayBuffer());
    if (audio.byteLength === 0) return json({ error: 'Empty audio.', fallback: true }, 502);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, audio, { contentType: 'audio/mpeg', upsert: true });
    if (uploadError) {
      // A storage failure must not lose the audio the learner already paid for.
      console.warn('character-voice cache write failed', uploadError.message);
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_SECONDS);
    if (signError || !signed?.signedUrl) {
      console.warn('character-voice signing failed', signError?.message);
      return json({ error: 'Could not prepare the clip.', fallback: true }, 502);
    }

    return json({
      url: signed.signedUrl,
      character: voice.id,
      voice: voice.studioName,
      cached: false,
      chars: text.length,
    });
  } catch (error) {
    console.error('character-voice failed', error instanceof Error ? error.message : error);
    return json({ error: 'Could not prepare the clip.', fallback: true }, 500);
  }
});
