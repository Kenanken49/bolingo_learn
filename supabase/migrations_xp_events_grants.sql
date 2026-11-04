-- Weekly leaderboard: let learners log their own XP and read their own events.
--
-- The xp_events table was created with row level security and correct policies,
-- but no table privileges for `authenticated`. PostgREST checks table grants
-- before RLS, so every insert from lib/progress.ts returned 403 and the board
-- stayed empty. Policies still scope rows to their owner and to friends.
grant select, insert on public.xp_events to authenticated;

-- The board itself is served by a SECURITY DEFINER function, so it can read
-- every learner's rows; only the execute grant needs to exist.
grant execute on function public.get_weekly_leaderboard(int) to authenticated;
