-- ============================================================================
-- Publish FSI 1 · Morning greetings
--
-- Run after supabase/drafts_swahili_fsi.sql. The generated draft is left
-- untouched so the transcript importer stays reproducible; this is the
-- editorial publication step.
--
-- Review note: the generated Q2 asked “Say ‘Hello.’ in Swahili” with Habari as
-- a distractor. Habari is also a valid greeting, so the question was ambiguous.
-- It is replaced here with a dialogue-completion question whose answer
-- (Jambo) is unambiguous in context.
--
-- Safe to re-run: the update only touches the unpublished row. Once published,
-- a re-run is a no-op and cannot overwrite later dashboard edits.
-- ============================================================================

do $$
begin
  if not exists (
    select 1
    from public.language_lessons
    where id = 'swahili-fsi-01' and course_id = 'swahili'
  ) then
    raise exception 'Run supabase/drafts_swahili_fsi.sql before publishing.';
  end if;
end
$$;

update public.language_lessons
set
  questions = jsonb_set(
    questions,
    '{1}',
    $question${
      "prompt": "Mutisya says “_____, bwana.” Which word completes his greeting?",
      "correctChain": ["Jambo"],
      "scrambledTokens": ["Jambo", "Habari", "Njema", "za"],
      "explain": "Mutisya opens with “Jambo, bwana.” — Hello, sir. Habari is also a greeting, but it is not the word in this line."
    }$question$::jsonb,
    true
  ),
  published = true,
  updated_at = now()
where id = 'swahili-fsi-01'
  and course_id = 'swahili'
  and published = false;
