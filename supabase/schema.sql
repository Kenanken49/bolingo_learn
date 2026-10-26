-- Bolingo Learn: initial Supabase schema
-- Run in Supabase SQL editor or via supabase db push.
--
-- If you get: foreign key "questions_lesson_id_fkey" cannot be implemented
-- (uuid vs integer), a leftover `lessons` table from another project exists.
-- Check it with the diagnostic below; if it is empty/unused, drop it, then
-- re-run this file:
--
--   select column_name, data_type from information_schema.columns
--     where table_schema = 'public' and table_name = 'lessons';
--   select count(*) from public.lessons;
--   -- only if the shape is wrong AND the rows don't matter:
--   drop table if exists public.lessons cascade;

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
create policy "Users manage own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  language text not null default 'en',
  level integer not null default 1,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.lessons enable row level security;

-- Lessons are readable by authenticated users.
create policy "Authenticated users read lessons"
  on public.lessons for select
  using (auth.role() = 'authenticated');

-- Personalized uploads: track user files stored in Supabase Storage.
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
create policy "Users manage own uploads"
  on public.user_uploads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Link generated lessons back to the uploaded source file.
alter table public.lessons
  add column if not exists upload_source_id uuid references public.user_uploads (id);

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
create policy "Users upload own raw files"
  on storage.objects for insert
  with check (
    bucket_id = 'user-materials'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can read their own raw files.
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
-- Lessons generated from a user's upload are tagged to that user.
alter table public.lessons
  add column if not exists user_id uuid references public.profiles (id) on delete cascade,
  add column if not exists is_user_generated boolean not null default false;

-- One row per interactive quiz element produced by the LLM.
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references public.lessons (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  type text not null check (type in ('multiple-choice', 'drag-and-drop')),
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  answer text not null,
  created_at timestamptz not null default now()
);

alter table public.questions enable row level security;

-- Users manage only their own generated questions.
create policy "Users manage own questions"
  on public.questions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Learning Path progress: which lesson nodes a user has completed.
-- lesson_id is text (not a UUID FK) so built-in path nodes ('demo-html', …)
-- and generated UUID lessons share one completion record.
-- ---------------------------------------------------------------------------
create table if not exists public.lesson_completions (
  user_id uuid references public.profiles (id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.lesson_completions enable row level security;

create policy "Users manage own completions"
  on public.lesson_completions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
