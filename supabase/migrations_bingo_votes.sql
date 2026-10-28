-- Run once in Supabase dashboard → SQL editor (project rlulmewvmhxgctonizas).
-- Creates the Bingo helpfulness-votes table for the self-hosted tutor guardrail.
create table if not exists public.bingo_votes (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_title text not null default '',
  prompt text not null default '',
  question_hash text not null default '',
  helpful boolean not null,
  created_at timestamptz not null default now(),
  unique (user_id, question_hash)
);

alter table public.bingo_votes enable row level security;

drop policy if exists "Users log and read own votes" on public.bingo_votes;
create policy "Users log and read own votes"
  on public.bingo_votes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant insert, select on public.bingo_votes to authenticated;
grant select on public.bingo_votes to service_role;

create index if not exists bingo_votes_hash_time on public.bingo_votes (question_hash, created_at desc);
