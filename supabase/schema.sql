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
  add column if not exists gems integer not null default 0,
  add column if not exists streak_freezes integer not null default 0,
  add column if not exists ai_words_used integer not null default 0,
  add column if not exists ai_words_reset_at timestamptz not null default now();

-- Google OAuth import: display name + profile photo shown across the app.
alter table public.profiles add column if not exists avatar_url text;

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
  error text,
  rights_attestation jsonb,
  rights_attested_at timestamptz,
  transcript text,
  transcript_provider text,
  transcript_model text,
  transcript_language text,
  transcript_duration_seconds numeric,
  transcribed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.user_uploads add column if not exists error text;
alter table public.user_uploads
  add column if not exists rights_attestation jsonb,
  add column if not exists rights_attested_at timestamptz,
  add column if not exists transcript text,
  add column if not exists transcript_provider text,
  add column if not exists transcript_model text,
  add column if not exists transcript_language text,
  add column if not exists transcript_duration_seconds numeric,
  add column if not exists transcribed_at timestamptz;

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

-- Legacy course-importer columns are NOT NULL on pre-existing installs and
-- `created_at` has no default there, which made every process-upload lesson
-- insert fail. Generated lessons have no legacy course/material link. Fresh
-- installs never create those legacy columns, so relax only the ones present.
do $$
declare
  legacy_column text;
begin
  foreach legacy_column in array array['course_id', 'material_id', 'ord', 'generator', 'payload'] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'lessons' and column_name = legacy_column
    ) then
      execute format('alter table public.lessons alter column %I drop not null', legacy_column);
    end if;
  end loop;
end $$;

alter table public.lessons alter column created_at set default now();

-- Delete flow: removing an upload must remove its generated lesson nodes
-- (questions cascade from lessons). The bare REFERENCES default blocks the
-- delete whenever a partial pipeline left a lesson behind a `failed` row.
alter table public.lessons drop constraint if exists lessons_upload_source_id_fkey;
alter table public.lessons
  add constraint lessons_upload_source_id_fkey foreign key (upload_source_id) references public.user_uploads (id) on delete cascade;

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

-- Authenticated users can delete their own raw files (powers the 🗑
-- buttons in My uploads — without this, storage.remove() 400s and the
-- file lingers even after its queue row is gone).
drop policy if exists "Users delete own raw files" on storage.objects;
create policy "Users delete own raw files"
  on storage.objects for delete
  using (
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

-- ---------------------------------------------------------------------------
-- Dynamic Leaderboards: weekly XP in competitive leagues of 30.
-- ---------------------------------------------------------------------------
-- One row per XP award (written by completeLesson — best-effort, never
-- blocks the lesson flow). The weekly board aggregates the current calendar
-- week (Monday reset) so no scheduled job is needed for correctness; the
-- app caches get_weekly_leaderboard() results for 1 hour client-side, which
-- is what keeps this cheap instead of a heavy query on every Path render.
-- If pg_cron is available, optionally materialize for extra scale:
--   select cron.schedule('refresh-weekly-board', '0 * * * *',
--     'refresh materialized view concurrently public.mv_weekly_xp');
create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  xp integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists xp_events_user_time on public.xp_events (user_id, created_at desc);
create index if not exists xp_events_time on public.xp_events (created_at desc);

alter table public.xp_events enable row level security;

drop policy if exists "Users log own xp" on public.xp_events;
create policy "Users log own xp"
  on public.xp_events for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users read own xp events" on public.xp_events;
create policy "Users read own xp events"
  on public.xp_events for select
  using (auth.uid() = user_id);

-- Ranked board: one row per active user, rank() over weekly XP, grouped
-- into leagues of 30 (league 1 = top 30). SECURITY DEFINER so any signed-in
-- user can read the public board without per-row access to xp_events.
create or replace function public.get_weekly_leaderboard(p_limit int default 300)
returns table (user_id uuid, username text, weekly_xp bigint, rank bigint, league int)
language sql stable security definer set search_path = public
as $$
  with weekly as (
    select e.user_id, sum(e.xp)::bigint as weekly_xp
    from public.xp_events e
    where e.created_at >= date_trunc('week', now())
    group by e.user_id
  )
  select w.user_id,
         coalesce(p.username, 'Learner') as username,
         w.weekly_xp,
         (rank() over (order by w.weekly_xp desc))::bigint as rank,
         (((rank() over (order by w.weekly_xp desc)) - 1) / 30 + 1)::int as league
  from weekly w
  join public.profiles p on p.id = w.user_id
  order by w.weekly_xp desc
  limit p_limit;
$$;

grant execute on function public.get_weekly_leaderboard(int) to authenticated;

-- ---------------------------------------------------------------------------
-- Spaced Repetition System (SRS): per-user memory state per quiz item.
-- ---------------------------------------------------------------------------
-- Every graded answer upserts one row keyed by `<lessonId>:<index>` with a
-- question snapshot (so Daily Review needs no bank lookups) plus SM-2
-- scheduling fields. getDueItems() pulls whatever is due for a 5-card,
-- ~2-minute review session; correct answers stretch the interval, wrong
-- answers send the card back to relearning (due tomorrow).
create table if not exists public.srs_cards (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_key text not null,
  prompt text not null default '',
  correct_chain jsonb not null default '[]'::jsonb,
  options jsonb not null default '[]'::jsonb,
  lesson_title text not null default '',
  ease numeric not null default 2.5,
  interval_days integer not null default 0,
  reps integer not null default 0,
  lapses integer not null default 0,
  due_at timestamptz not null default now(),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, item_key)
);

create index if not exists srs_cards_due on public.srs_cards (user_id, due_at);

alter table public.srs_cards enable row level security;

drop policy if exists "Users manage own srs cards" on public.srs_cards;
create policy "Users manage own srs cards"
  on public.srs_cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Community: follow-model friendships + high-five kudos.
-- Applied live 2026-10-27 (tables, policies, grants, helpers below).
-- ---------------------------------------------------------------------------
create table if not exists public.friendships (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

alter table public.friendships enable row level security;

drop policy if exists "Users manage own friendships" on public.friendships;
create policy "Users manage own friendships"
  on public.friendships for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.kudos (
  id bigint generated always as identity primary key,
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.kudos enable row level security;

drop policy if exists "Users send kudos" on public.kudos;
create policy "Users send kudos"
  on public.kudos for insert
  with check (auth.uid() = from_user);

drop policy if exists "Users see involved kudos" on public.kudos;
create policy "Users see involved kudos"
  on public.kudos for select
  using (auth.uid() = from_user or auth.uid() = to_user);

-- Friends can read each other's weekly XP for the Friends board.
drop policy if exists "Users read friends xp events" on public.xp_events;
create policy "Users read friends xp events"
  on public.xp_events for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships f
      where f.user_id = auth.uid() and f.friend_id = xp_events.user_id
    )
  );

-- Least-privilege username search (returns id + username only, no xp/premium).
create or replace function public.search_users_by_name(prefix text)
returns table (user_id uuid, username text)
language sql security definer set search_path = public
as $$ select id, username from public.profiles where username ilike prefix || '%' and username is not null limit 10 $$;
grant execute on function public.search_users_by_name(text) to authenticated;

-- One-round-trip Friends board (friends + kudos received).
create or replace function public.get_friends()
returns table (user_id uuid, username text, kudos_count bigint)
language sql security definer set search_path = public
as $$
  select p.id, p.username, count(k.id)
  from public.friendships f
  join public.profiles p on p.id = f.friend_id
  left join public.kudos k on k.to_user = f.friend_id
  where f.user_id = auth.uid()
  group by p.id, p.username
$$;
grant execute on function public.get_friends() to authenticated;

grant all on public.friendships, public.kudos to anon, authenticated;
grant usage, select on sequence public.kudos_id_seq to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Core Curriculum catalog: 7 certification tracks × 5 projects.
-- (Structure lives here so fresh installs get it; the same DDL is mirrored
-- at the top of supabase/seed_certifications.sql, which additionally inserts
-- the 35 rows. Both files are safe to re-run. The app ALSO bundles this
-- catalog in lib/certifications.ts so the path, project runner, and offline
-- play work without a round-trip — keep all three in sync.)
-- ---------------------------------------------------------------------------
create table if not exists public.certification_tracks (
  id text primary key,
  name text not null,
  icon text not null default '',
  blurb text not null default '',
  skills jsonb not null default '[]'::jsonb
);

create table if not exists public.certification_projects (
  id text primary key,
  track_id text not null references public.certification_tracks (id) on delete cascade,
  position integer not null default 0,
  title text not null,
  skills jsonb not null default '[]'::jsonb,
  brief jsonb not null default '[]'::jsonb,
  starter_code text not null default '',
  stories jsonb not null default '[]'::jsonb,
  xp integer not null default 50
);

alter table public.certification_tracks enable row level security;
alter table public.certification_projects enable row level security;

drop policy if exists "Anyone can read tracks" on public.certification_tracks;
create policy "Anyone can read tracks"
  on public.certification_tracks for select using (true);

drop policy if exists "Anyone can read cert projects" on public.certification_projects;
create policy "Anyone can read cert projects"
  on public.certification_projects for select using (true);

-- RLS policies alone are not enough: the API roles need table grants.
grant select on public.certification_tracks, public.certification_projects to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Kiki v3 brain: per-learner adaptive profile (10 skills x 4 facets),
-- exercise difficulties, and half-life memory state as one JSON vector.
-- Owner-only: the anon probe correctly gets permission-denied; signed-in
-- learners read/write their own row via the policy below.
-- ---------------------------------------------------------------------------
create table if not exists public.kiki_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  vector jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.kiki_profiles enable row level security;

drop policy if exists "Users manage own kiki profile" on public.kiki_profiles;
create policy "Users manage own kiki profile"
  on public.kiki_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant all on public.kiki_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Kiki v3 analytics: one row per graded attempt (signed-in learners only).
-- Guests stay device-local (no row). Powers scripts/kiki-calibrate.cjs:
-- calibration bins, per-type (MCQ/BUILD) predicted-vs-actual, Brier score,
-- and the empirical guess floor that validates GUESS_MCQ / GUESS_BUILD.
-- Missing rows are expected (offline / guest play) — the calibrator reports
-- coverage and refuses verdicts below n=100 per type.
-- ---------------------------------------------------------------------------
create table if not exists public.kiki_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  skill text not null,
  item_key text not null,
  is_build boolean not null default false,
  chain_len integer not null default 1,
  difficulty double precision not null,
  predicted_p double precision not null,
  correct boolean not null,
  created_at timestamptz not null default now()
);

alter table public.kiki_attempts enable row level security;

drop policy if exists "Users log and read own attempts" on public.kiki_attempts;
create policy "Users log and read own attempts"
  on public.kiki_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant insert, select on public.kiki_attempts to authenticated;
-- Read-only service key for scripts/kiki-calibrate.cjs (bypasses RLS but
-- still needs an explicit table grant — without this the script gets 42501).
grant select on public.kiki_attempts to service_role;

create index if not exists kiki_attempts_user_time on public.kiki_attempts (user_id, created_at desc);
create index if not exists kiki_attempts_type_time on public.kiki_attempts (is_build, created_at desc);

-- ---------------------------------------------------------------------------
-- Bingo helpfulness votes: 👍👎 on Ask Bingo / Explain answers (signed-in).
-- Lets the platform learn which lesson+prompt contexts the small self-hosted
-- model fumbles so those can route to the Kamusi or a stronger brain.
-- One vote per learner per context+question hash (upsert); guests stay local.
-- ---------------------------------------------------------------------------
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
