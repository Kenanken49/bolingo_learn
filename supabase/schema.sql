-- Bolingo Learn: Supabase schema (integer-keyed lessons edition).
-- Run in Supabase SQL editor or via supabase db push. Safe to re-run:
-- tables use IF NOT EXISTS, columns use ADD COLUMN IF NOT EXISTS, and
-- every policy is dropped before creation.
--
-- NOTE: `public.lessons` is pre-existing with an INTEGER primary key (kept
-- as-is, rows preserved). All bolingo tables reference it with integer
-- lesson ids — at the app boundary convert route strings with parseInt
-- (see lib/progress / quiz screen). never ALTER lessons.id to uuid:
-- integers cannot cast to uuid in Postgres.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  xp integer not null default 0,
  streak_count integer not null default 0,
  last_activity_at timestamptz,
  is_premium boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Habit-loop counters: hearts gate the quiz loop, hearts_refilled_at drives
-- the 4-hour loss-aversion wait.
alter table public.profiles
  add column if not exists hearts integer not null default 5,
  add column if not exists hearts_refilled_at timestamptz not null default now(),
  add column if not exists ai_words_used integer not null default 0,
  add column if not exists ai_words_reset_at timestamptz not null default now();

-- Users can read/update only their own profile.
drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Pre-existing integer-keyed lessons table: create only when missing
-- (fresh installs), then ensure every column the app needs exists.
create table if not exists public.lessons (
  id integer primary key generated always as identity,
  created_at timestamptz not null default now()
);

-- Personalized uploads: track user files stored in Supabase Storage.
-- (Created BEFORE the lessons alterations below, which FK-reference it.)
create table if not exists public.user_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  file_name varchar(255) not null,
  file_url text not null,
  status varchar(50) not null default 'processing',
  created_at timestamptz not null default now()
);

alter table public.user_uploads enable row level security;

-- Users can manage only their own uploads.
drop policy if exists "Users manage own uploads" on public.user_uploads;
create policy "Users manage own uploads"
  on public.user_uploads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Ensure every column the app needs exists on the (possibly pre-existing)
-- integer-keyed lessons table. Link generated lessons back to the upload.
alter table public.lessons
  add column if not exists title text not null default 'Untitled lesson',
  add column if not exists language text not null default 'en',
  add column if not exists level integer not null default 1,
  add column if not exists content jsonb not null default '{}'::jsonb,
  add column if not exists upload_source_id uuid references public.user_uploads (id),
  add column if not exists user_id uuid references public.profiles (id) on delete cascade,
  add column if not exists is_user_generated boolean not null default false;

alter table public.lessons enable row level security;

-- Lessons are readable by authenticated users.
drop policy if exists "Authenticated users read lessons" on public.lessons;
create policy "Authenticated users read lessons"
  on public.lessons for select
  using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Async curriculum pipeline: User Uploads -> Storage (user-materials) -> Edge Function
-- ---------------------------------------------------------------------------
-- Raw file bucket. Files are stored at <user_id>/<file_name> so Storage RLS
-- can scope access per user. The process-upload Edge Function (service role)
-- reads new objects, generates the JSON curriculum via LLM, synthesizes
-- audio via a TTS provider, and flips user_uploads.status to ready/failed.
insert into storage.buckets (id, name, public)
  values ('user-materials', 'user-materials', false)
  on conflict (id) do nothing;

-- Authenticated users can upload into their own folder.
drop policy if exists "Users upload own raw files" on storage.objects;
create policy "Users upload own raw files"
  on storage.objects for insert
  with check (
    bucket_id = 'user-materials'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can read their own raw files.
drop policy if exists "Users read own raw files" on storage.objects;
create policy "Users read own raw files"
  on storage.objects for select
  using (
    bucket_id = 'user-materials'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Generated audiobooks live next to the source: <user_id>/audio/<lesson_id>.mp3
-- (same bucket, same per-user policies above cover read/write by path).

-- ---------------------------------------------------------------------------
-- AI Curation Engine (Text-to-Gamification)
-- ---------------------------------------------------------------------------
-- One row per interactive quiz element produced by the LLM.
-- lesson_id is INTEGER to match the pre-existing lessons(id) key.
-- (App column is `prompt`; if your client code says `question_text`, rename
-- it to `prompt` or alias on read.)
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id integer references public.lessons (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  type text not null check (type in ('multiple-choice', 'drag-and-drop')),
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  answer text not null,
  created_at timestamptz not null default now()
);

alter table public.questions enable row level security;

-- Users manage only their own generated questions.
drop policy if exists "Users manage own questions" on public.questions;
create policy "Users manage own questions"
  on public.questions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Learning Path progress: which lesson nodes a user has completed.
-- lesson_id is text (not an FK) so built-in path nodes ('demo-html', …)
-- and integer DB lessons share one completion record (route params stay
-- strings; convert with parseInt only at the questions/lessons boundary).
-- ---------------------------------------------------------------------------
create table if not exists public.lesson_completions (
  user_id uuid references public.profiles (id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.lesson_completions enable row level security;

drop policy if exists "Users manage own completions" on public.lesson_completions;
create policy "Users manage own completions"
  on public.lesson_completions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
