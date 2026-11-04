-- Run once in Supabase dashboard → SQL editor (project rlulmewvmhxgctonizas).
-- Learner-selectable audiobook narrators.
--
-- `narrator_voice` stores the ElevenLabs voice id a Premium learner picked in
-- Settings → Audiobook narrator. `process-upload` reads it server-side when it
-- generates that learner's full mix and segments.
--
-- There is deliberately no CHECK listing the allowed ids. The allow-list lives
-- in code (`NARRATOR_VOICES` in
-- `supabase/functions/_shared/audiobookVoice.ts`) and is re-applied at
-- generation time: a value that is not on the list is ignored and the
-- deployment's `TTS_VOICE_ID` narrator is used instead. That keeps the trust
-- boundary in one place — a learner who writes a foreign id into their own
-- profile row through the existing "Users manage own profile" policy cannot
-- make the pipeline synthesize with a voice the deployment has not cleared.
--
-- NULL means "no choice yet", which is the state for every existing account.

alter table public.profiles
  add column if not exists narrator_voice text;

comment on column public.profiles.narrator_voice is
  'ElevenLabs narrator chosen by the learner; NULL falls back to the deployment TTS_VOICE_ID.';
