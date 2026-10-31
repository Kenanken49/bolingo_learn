# Consented audio/video transcription → lessons

Premium learners can upload an audio or video recording and get a lesson from
it, exactly like a PDF: `process-upload` transcribes the recording, the curator
LLM turns the transcript into quiz elements, and the normal audiobook/TTS step
narrates the result.

Media is special in one respect — it carries a voice, a performance and often a
publisher's recording. It is therefore gated by the content-rights checklist in
[docs/content-rights.md](content-rights.md) **before** the file is downloaded or
sent to a transcription provider.

## Pipeline

1. The AI Sandbox picker offers PDF, text, image, audio and video on Premium.
   Audio/video picks show the four content-rights declarations; the upload
   button stays locked until every one is true.
2. [lib/uploads.ts](../lib/uploads.ts) refuses a media upload without a
   complete attestation and stores it on `user_uploads.rights_attestation`
   (plus `rights_attested_at`).
3. `process-upload` re-checks the attestation server-side — a storage webhook
   or a row inserted directly into `user_uploads` cannot skip the gate — then
   enforces the Premium and monthly-word limits.
4. The recording is transcribed:
   - **Deepgram (recommended):** the function creates a one-hour signed URL for
     the private object and posts it to `POST /v1/listen`. Deepgram fetches the
     object itself, so no multi-GB video is downloaded into the Edge Function.
   - **OpenAI-compatible:** the function reads the object's size from Storage
     metadata first, so an oversized recording fails with the limit instead of
     being downloaded, then posts the bytes multipart to
     `/audio/transcriptions`. Limited to 25 MB per request.
5. The transcript is written to the upload row (`transcript`,
   `transcript_provider`, `transcript_model`, `transcript_language`,
   `transcript_duration_seconds`, `transcribed_at`) **before** curation. A
   retry after an LLM or TTS failure reuses it instead of paying the provider
   again.
6. The existing curator produces the lesson and questions. A media lesson's
   `content.transcript` records the provider, model, language, duration and
   character count; the full transcript stays on the private upload row.
7. Premium TTS narrates the lesson. Free accounts cannot upload media at all,
   so transcription spend is always behind the paywall.

## Provider configuration

Only one provider is needed. An explicit `TRANSCRIBE_PROVIDER` wins; otherwise
the function picks Deepgram when `DEEPGRAM_API_KEY` is set, then an
OpenAI-compatible provider when `TRANSCRIBE_API_KEY` (or `OPENAI_API_KEY`) is
set.

| Variable | Default | Notes |
| --- | --- | --- |
| `DEEPGRAM_API_KEY` | — | Enables the signed-URL provider. Recommended for audio and video. |
| `TRANSCRIBE_PROVIDER` | inferred | `deepgram` or `openai`. |
| `TRANSCRIBE_API_KEY` | — | Key for an OpenAI-compatible transcription endpoint. |
| `TRANSCRIBE_BASE_URL` | provider default | `https://api.deepgram.com` or `https://api.openai.com/v1`. Point it at Groq (`https://api.groq.com/openai/v1`) or a self-hosted Whisper server if you prefer. |
| `TRANSCRIBE_MODEL` | `nova-3` / `whisper-1` | Deepgram `nova-3`; OpenAI `whisper-1` (verbose JSON, duration and language). `gpt-4o-transcribe` / `gpt-4o-mini-transcribe` only return `json`, so duration is absent. |
| `TRANSCRIBE_LANGUAGE` | detect | Optional language hint. Deepgram uses `detect_language=true` when unset; set a code to force one language. |
| `TRANSCRIBE_MAX_BYTES` | 25 MB (OpenAI) | Only applies to uploaded bytes. Deepgram's URL path is bounded by its own 2 GB ceiling. |
| `TRANSCRIBE_TIMEOUT_MS` | `240000` | Must leave room for the curator LLM under the Edge Function wall clock. |

OpenAI's `whisper-1` is deprecated with a shutdown announced for 26 February
2027. Either move that deployment to `TRANSCRIBE_MODEL`/`TRANSCRIBE_BASE_URL`
before then, or use Deepgram (the recommended path for this pipeline). Deepgram
accepts audio and common video containers (mp4/webm/mov); for very large video
it recommends extracting the audio track first, but the signed-URL path does
not require ffmpeg in this project.

## Cost and runtime limits

- **Premium only.** Free tier remains text-only (≤1,000 words).
- **Monthly cap.** Transcript words count toward the existing 100,000-word
  `profiles.ai_words_used` budget, like PDF text.
- **Provider ceilings:** 2 GB per request for Deepgram, 25 MB for the
  OpenAI-compatible upload path.
- **Function wall clock.** Supabase caps an Edge Function at 150 s (free) /
  400 s (paid), and `EdgeRuntime.waitUntil` does not extend it. Transcription,
  the curator LLM and the lesson insert share that budget. Keep clips short
  (roughly 20 minutes of speech or less) and set `TRANSCRIBE_TIMEOUT_MS` below
  the remaining budget — for a free project, `120000`. Longer media needs a
  provider callback plus a queue (not implemented here); the bound is
  deliberately visible rather than silently truncating a transcript.
- **Retries.** A stored transcript is reused, so the transcription provider is
  not charged twice. The monthly word counter follows the normal curation run,
  as it already does for re-run text/PDF uploads.
- **Signed URLs** expire after one hour. They are never logged or returned to
  the client.

## Setup

1. Apply the transcript columns once (SQL editor):

   ```bash
   supabase/migrations_transcription.sql
   ```

   Fresh installs get them from [`supabase/schema.sql`](../supabase/schema.sql).

2. Set one provider as an Edge Function secret — never in the app bundle and
   never with an `EXPO_PUBLIC_` prefix:

   ```bash
   supabase secrets set DEEPGRAM_API_KEY=<key>
   # or
   supabase secrets set TRANSCRIBE_API_KEY=<key> TRANSCRIBE_BASE_URL=https://api.groq.com/openai/v1 TRANSCRIBE_MODEL=whisper-large-v3
   ```

3. Deploy the function with the voice preflight gate:

   ```bash
   npm run deploy:process-upload
   ```

   If the configured audiobook voice is a cloned/professional voice, set
   `TTS_CONSENT_RECORD` to a completed, active record first; see
   [audiobook-voice.md](audiobook-voice.md#cloned-voice-consent-record).

4. In the app, sign in as Premium, open **AI Sandbox**, pick an owned clip,
   tick all four rights items and upload. The uploads screen shows
   **transcribing…** while the provider works, then **ready** with **Open
   lesson**. If the function is unreachable the row flips to **failed** with the
   reason and a Retry button; Retry reuses the stored transcript when one
   exists.

## Failure messages

| Message | Meaning / fix |
| --- | --- |
| `Audio/video transcription is not configured…` | No provider secret on `process-upload`. Set `DEEPGRAM_API_KEY` or `TRANSCRIBE_API_KEY`, then redeploy. |
| `Content-rights confirmation is required…` | The row has no complete attestation (old upload or direct insert). Delete it and re-upload through the AI Sandbox. |
| `The <provider> transcription key was rejected (401/403)` | Wrong key or wrong workspace. Rotate the secret and redeploy. |
| `This recording is X MB; the openai transcription limit is 25.0 MB` | Trim/split the clip, or configure Deepgram for URL transcription. |
| `…returned an empty transcript` | No audible speech (or unsupported codec). Check the file and retry. |
| `Could not create a temporary media link…` | Storage/service-role problem; the upload is unchanged. |

## Checks

```bash
npm run check:transcription
# also part of npm test
```

The check transpiles the real shared module and runs it against local HTTP
stubs: Deepgram signed-URL requests (model, smart formatting, language
detection, `Token` auth, JSON URL body), OpenAI multipart requests (file, model,
`verbose_json`), success parsing, 401 and size-limit failures, empty
transcripts, provider inference and missing-key config errors. It also asserts
the Edge Function gates attestation before transcription, checks the object
size before downloading for the 25 MB path, caches the transcript columns, and
that the UI, schema, migration, env example and this document stay wired
together. No network call is made and no credits are spent.
