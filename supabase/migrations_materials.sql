-- Material detection + revision packs.
--
-- The upload pipeline now classifies what landed (book / notes / article /
-- transcript) before it spends money on narration or curation, and builds a
-- revision pack for the memorization techniques (active recall, spaced
-- repetition, flashcards, chunking, mind map, memory palace, teach-it).
--
-- Apply with the Supabase SQL editor or: supabase db push (with the CLI linked).

alter table public.user_uploads
  add column if not exists material_kind text,
  add column if not exists material_analysis jsonb;

comment on column public.user_uploads.material_kind is
  'book | notes | article | transcript | unknown — decided by _shared/materialKind.ts';
comment on column public.user_uploads.material_analysis is
  'The classifier verdict: kind, confidence, words, chapters, signals.';

create table if not exists public.revision_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  upload_id uuid references public.user_uploads (id) on delete cascade,
  lesson_id integer,
  kind text not null default 'unknown',
  title text not null default 'Revision pack',
  pack jsonb not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists revision_packs_user_idx on public.revision_packs (user_id, created_at desc);
create index if not exists revision_packs_upload_idx on public.revision_packs (upload_id);
-- One pack per upload: re-running the pipeline replaces it instead of stacking
-- duplicates in "My uploads".
create unique index if not exists revision_packs_upload_unique on public.revision_packs (upload_id);

alter table public.revision_packs enable row level security;

drop policy if exists "revision_packs read own" on public.revision_packs;
create policy "revision_packs read own" on public.revision_packs
  for select using (auth.uid() = user_id);

drop policy if exists "revision_packs delete own" on public.revision_packs;
create policy "revision_packs delete own" on public.revision_packs
  for delete using (auth.uid() = user_id);

-- Writes come from the Edge Function with the service role, so no insert or
-- update policy is granted to clients on purpose: a learner cannot fabricate a
-- pack, and cannot rewrite the one the pipeline produced.

-- Privileges are explicit: creating a table does not grant anything on it, and
-- without these the Edge Function's own service-role queries fail with 42501 —
-- which looks exactly like "the pack was never generated".
grant select on public.revision_packs to authenticated;
grant all on public.revision_packs to service_role;
