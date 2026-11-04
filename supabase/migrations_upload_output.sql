-- Run once in Supabase dashboard → SQL editor (project rlulmewvmhxgctonizas).
-- What an upload produces: a complete audiobook, quiz nodes, or both.
--
-- `process-upload` reads this server-side when a file lands, so the choice is
-- the learner's stored preference, not something a client can pass per upload.
--
--   both      — full-length narration of the upload + 4-5 quiz nodes (default)
--   audiobook — full-length narration only; the lesson carries no questions
--   nodes     — quiz nodes only; no TTS spend
--
-- A book-length upload is narrated up to MAX_EXTRACT_CHARS (60k characters,
-- roughly 40 minutes) in ordered parts, because every TTS provider caps a
-- single request.

alter table public.profiles
  add column if not exists upload_output text not null default 'both';

alter table public.profiles
  drop constraint if exists profiles_upload_output_check;

alter table public.profiles
  add constraint profiles_upload_output_check
  check (upload_output in ('both', 'nodes', 'audiobook'));

comment on column public.profiles.upload_output is
  'What an upload produces: both = audiobook + quiz nodes, audiobook = narration only, nodes = quiz nodes only.';
