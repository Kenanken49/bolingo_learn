-- Run once in Supabase dashboard → SQL editor.
-- Diamonds replace hearts: a failed lesson (mastery not cleared) costs one
-- diamond; wrong answers are free. The `diamonds` balance lives beside the
-- old `hearts` columns so this is safe to run before every device updates —
-- the app reads and writes `diamonds` only.
--
--   diamonds              — remaining lesson attempts (starts at 5)
--   diamonds_refilled_at  — stamps when the balance drops below max; one
--                            diamond regenerates every 4 hours from it

alter table public.profiles
  add column if not exists diamonds integer not null default 5,
  add column if not exists diamonds_refilled_at timestamptz not null default now();

-- One-time backfill: carry each learner's remaining hearts balance over to
-- diamonds, so nobody wakes up poorer on update day. Guards on the old
-- column so this stays re-runnable on installs that never had hearts.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'hearts'
  ) then
    execute 'update public.profiles set diamonds = hearts';
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'hearts_refilled_at'
    ) then
      execute 'update public.profiles set diamonds_refilled_at = hearts_refilled_at';
    end if;
  end if;
end $$;

comment on column public.profiles.diamonds is
  'Lesson attempts remaining: a failed lesson costs one, wrong answers are free. Regen is one per 4h from diamonds_refilled_at.';
