-- Consented audio/video transcription.
--
-- The transcript and its provenance live on the upload row so:
--   * a retry after an LLM or TTS failure reuses the transcript instead of
--     paying the provider a second time, and
--   * an operator can audit which provider/model transcribed a lesson and how
--     long the source recording was.
--
-- The existing "Users manage own uploads" row-level-security policy already
-- covers these columns, so no policy change is needed.
--
-- Apply once in the Supabase SQL editor. Fresh installs get the columns from
-- supabase/schema.sql. Deploy process-upload after applying this migration.

alter table public.user_uploads
  add column if not exists transcript text,
  add column if not exists transcript_provider text,
  add column if not exists transcript_model text,
  add column if not exists transcript_language text,
  add column if not exists transcript_duration_seconds numeric,
  add column if not exists transcribed_at timestamptz;
