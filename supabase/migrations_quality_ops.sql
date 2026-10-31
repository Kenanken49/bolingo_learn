-- Bolingo Learn — quality operations, telemetry and the engineer agent.
--
-- Run once in the Supabase SQL editor (or `supabase db push`) after schema.sql.
-- Safe to re-run: tables are IF NOT EXISTS, policies are dropped first, seeds
-- use ON CONFLICT DO NOTHING, and every function is CREATE OR REPLACE.
--
-- Security model:
--   * The owner is identified by the verified JWT email bolingolearn@pm.me,
--     claims is_admin once through claim_founder_admin(), and cannot be
--     self-promoted by editing a profile row (guard trigger below).
--   * telemetry_events is append-only for clients; only admins can read it.
--   * feature_flags / quality_settings are public-readable config, admin-writable.
--   * reports, approvals and the notification outbox are admin-readable; the
--     service role (edge functions, CI) is the only writer.
--   * Service-role calls are accepted by is_admin() for server-side jobs.

-- ---------------------------------------------------------------------------
-- Owner access
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
      or coalesce(auth.role() = 'service_role', false);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

/**
 * One-time founder claim. The email comes from the signed Supabase JWT, not
 * from a request body, so only the verified owner can run it successfully.
 */
create or replace function public.claim_founder_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  -- Read the authoritative auth row, not a client-supplied value: the email
  -- must match the owner and must already be confirmed.
  if not exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and lower(u.email) = 'bolingolearn@pm.me'
      and u.email_confirmed_at is not null
  ) then
    return false;
  end if;
  -- The guard trigger allows exactly this transaction-local write.
  perform set_config('bolingo.admin_write', 'on', true);
  update public.profiles set is_admin = true where id = auth.uid();
  perform set_config('bolingo.admin_write', 'off', true);
  return found;
end;
$$;

revoke all on function public.claim_founder_admin() from public;
grant execute on function public.claim_founder_admin() to authenticated;

/**
 * RLS lets a learner update their own profile row, so is_admin needs a column
 * guard: without this, any signed-in learner could PATCH is_admin=true.
 */
create or replace function public.guard_profile_admin_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    if coalesce(current_setting('bolingo.admin_write', true), '') = 'on' then
      return new;
    end if;
    if coalesce(auth.role() = 'service_role', false) then
      return new;
    end if;
    if public.is_admin() then
      return new;
    end if;
    raise exception 'is_admin is managed by the owner console' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_admin_flag on public.profiles;
create trigger profiles_guard_admin_flag
  before update on public.profiles
  for each row execute function public.guard_profile_admin_flag();

-- ---------------------------------------------------------------------------
-- Published quality runs (CI + local gate runner)
-- ---------------------------------------------------------------------------
create table if not exists public.quality_runs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  commit_sha text,
  branch text,
  environment text not null default 'ci',
  status text not null check (status in ('passed', 'failed', 'warn')),
  duration_ms integer,
  summary jsonb not null default '{}'::jsonb,
  gates jsonb not null default '[]'::jsonb,
  source text
);

alter table public.quality_runs enable row level security;

drop policy if exists "Admins read quality runs" on public.quality_runs;
create policy "Admins read quality runs"
  on public.quality_runs for select
  using (public.is_admin());

grant select on public.quality_runs to authenticated;
grant all on public.quality_runs to service_role;
grant usage, select on sequence public.quality_runs_id_seq to service_role;

create index if not exists quality_runs_created on public.quality_runs (created_at desc);
create index if not exists quality_runs_status on public.quality_runs (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Anonymous telemetry (append-only, bounded, admin-readable)
-- ---------------------------------------------------------------------------
create table if not exists public.telemetry_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  occurred_at timestamptz not null default now(),
  session_id text not null check (char_length(session_id) between 4 and 80),
  user_id uuid references auth.users (id) on delete set null,
  event text not null check (char_length(event) between 1 and 80),
  properties jsonb not null default '{}'::jsonb check (pg_column_size(properties) <= 8192),
  app_version text,
  platform text,
  duration_ms integer,
  ok boolean not null default true
);

alter table public.telemetry_events enable row level security;

drop policy if exists "Clients append telemetry" on public.telemetry_events;
create policy "Clients append telemetry"
  on public.telemetry_events for insert
  to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "Admins read telemetry" on public.telemetry_events;
create policy "Admins read telemetry"
  on public.telemetry_events for select
  using (public.is_admin());

grant insert on public.telemetry_events to anon, authenticated;
grant select on public.telemetry_events to authenticated;
grant all on public.telemetry_events to service_role;
grant usage, select on sequence public.telemetry_events_id_seq to service_role;

create index if not exists telemetry_events_created on public.telemetry_events (created_at desc);
create index if not exists telemetry_events_event_created on public.telemetry_events (event, created_at desc);
create index if not exists telemetry_events_session on public.telemetry_events (session_id, created_at desc);

-- Daily aggregates for the dashboard and ad-hoc operator queries.
create or replace view public.v_telemetry_daily
with (security_invoker = true)
as
select
  date_trunc('day', created_at)::date as day,
  event,
  count(*)::bigint as events,
  count(distinct session_id)::bigint as sessions,
  percentile_cont(0.95) within group (order by duration_ms)
    filter (where duration_ms is not null) as p95_duration_ms
from public.telemetry_events
group by 1, 2;

grant select on public.v_telemetry_daily to authenticated;

-- Experiment exposure -> conversion, for every event that carries
-- { experiment, variant } in properties.
create or replace view public.v_experiment_results
with (security_invoker = true)
as
select
  properties ->> 'experiment' as experiment,
  coalesce(properties ->> 'variant', 'unknown') as variant,
  count(*) filter (where event = 'experiment_exposed')::bigint as exposures,
  count(*) filter (where event = 'experiment_converted')::bigint as conversions,
  case
    when count(*) filter (where event = 'experiment_exposed') > 0 then
      round(
        100.0 * count(*) filter (where event = 'experiment_converted')
          / count(*) filter (where event = 'experiment_exposed'),
        2
      )
    else 0
  end as conversion_pct
from public.telemetry_events
where properties ? 'experiment'
  and created_at > now() - interval '90 days'
group by 1, 2;

grant select on public.v_experiment_results to authenticated;

-- ---------------------------------------------------------------------------
-- Feature flags (remote config + A/B assignment)
-- ---------------------------------------------------------------------------
create table if not exists public.feature_flags (
  key text primary key check (key ~ '^[a-z0-9_]{2,64}$'),
  name text not null,
  description text not null default '',
  type text not null check (type in ('release', 'experiment', 'ops')),
  enabled boolean not null default false,
  rollout_pct integer not null default 0 check (rollout_pct between 0 and 100),
  variants jsonb not null default '[]'::jsonb,
  metric text,
  hypothesis text,
  guardrail text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.feature_flags enable row level security;

drop policy if exists "Anyone reads feature flags" on public.feature_flags;
create policy "Anyone reads feature flags"
  on public.feature_flags for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins update feature flags" on public.feature_flags;
create policy "Admins update feature flags"
  on public.feature_flags for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.feature_flags to anon, authenticated;
grant update on public.feature_flags to authenticated;
grant all on public.feature_flags to service_role;

insert into public.feature_flags
  (key, name, description, type, enabled, rollout_pct, variants, metric, hypothesis, guardrail)
values
  (
    'quality_dashboard',
    'Owner quality console',
    'Shows the Quality & Operations console in Settings for the platform owner.',
    'release',
    true,
    100,
    $$[{"key":"on","weight":100,"label":"On"}]$$::jsonb,
    'admin_console_opened',
    'A visible quality console increases the share of releases that carry a published gate run.',
    null
  ),
  (
    'paywall_value_badge',
    'Paywall value framing',
    'A/B test: a factual value badge above the Premium plan versus the current plan card alone.',
    'experiment',
    true,
    100,
    $$[{"key":"control","weight":50,"label":"Current plan card"},{"key":"value_badge","weight":50,"label":"Value badge"}]$$::jsonb,
    'premium_checkout_started',
    'Naming the four concrete Premium outcomes beside the price lifts checkout starts without reducing completion.',
    'premium_purchase_failed'
  ),
  (
    'review_cap',
    'Daily review cap',
    'Remote config for how many due cards a Daily Review serves (default 5).',
    'ops',
    true,
    100,
    $$[{"key":"5","weight":100,"label":"5 cards"}]$$::jsonb,
    'review_completed',
    null,
    null
  ),
  (
    'engineer_auto_guardrails',
    'Engineer auto-guardrails',
    'Allows the engineer agent to pause experiment rollouts when reliability floors are breached, and to record the action for approval review.',
    'ops',
    true,
    100,
    $$[{"key":"on","weight":100,"label":"On"}]$$::jsonb,
    'guardrail_actions',
    null,
    null
  )
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Operator settings (single row)
-- ---------------------------------------------------------------------------
create table if not exists public.quality_settings (
  id text primary key default 'default' check (id = 'default'),
  notify_email text not null default 'bolingolearn@pm.me',
  agent_enabled boolean not null default true,
  auto_guardrails boolean not null default true,
  crash_free_floor numeric(5, 2) not null default 99.00,
  p95_latency_ceiling_ms integer not null default 2500,
  min_sessions_for_guardrail integer not null default 50,
  retention_days integer not null default 90,
  release_freeze boolean not null default false,
  premium_price_usd numeric(6, 2) not null default 7.70,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.quality_settings (id) values ('default') on conflict (id) do nothing;

alter table public.quality_settings enable row level security;

drop policy if exists "Admins read quality settings" on public.quality_settings;
create policy "Admins read quality settings"
  on public.quality_settings for select
  using (public.is_admin());

drop policy if exists "Admins update quality settings" on public.quality_settings;
create policy "Admins update quality settings"
  on public.quality_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, update on public.quality_settings to authenticated;
grant all on public.quality_settings to service_role;

-- ---------------------------------------------------------------------------
-- Engineer reports, approvals and notification outbox
-- ---------------------------------------------------------------------------
create table if not exists public.engineering_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  trigger text not null default 'manual' check (trigger in ('manual', 'schedule', 'guardrail')),
  model text,
  via text,
  status text not null default 'unknown' check (status in ('healthy', 'watch', 'critical', 'unknown')),
  health_score integer,
  summary text not null default '',
  findings jsonb not null default '[]'::jsonb,
  experiments jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  duration_ms integer,
  created_by uuid references auth.users (id) on delete set null
);

alter table public.engineering_reports enable row level security;

drop policy if exists "Admins read engineering reports" on public.engineering_reports;
create policy "Admins read engineering reports"
  on public.engineering_reports for select
  using (public.is_admin());

grant select on public.engineering_reports to authenticated;
grant all on public.engineering_reports to service_role;

create index if not exists engineering_reports_created on public.engineering_reports (created_at desc);

create table if not exists public.engineering_approvals (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.engineering_reports (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  severity text not null default 'medium' check (severity in ('critical', 'high', 'medium', 'low')),
  area text not null default 'platform',
  rationale text not null default '',
  proposed_change text not null default '',
  action jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'applied', 'auto_applied', 'failed')),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  apply_result jsonb,
  email_status text
);

alter table public.engineering_approvals enable row level security;

drop policy if exists "Admins read engineering approvals" on public.engineering_approvals;
create policy "Admins read engineering approvals"
  on public.engineering_approvals for select
  using (public.is_admin());

drop policy if exists "Admins update engineering approvals" on public.engineering_approvals;
create policy "Admins update engineering approvals"
  on public.engineering_approvals for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, update on public.engineering_approvals to authenticated;
grant all on public.engineering_approvals to service_role;

create index if not exists engineering_approvals_status on public.engineering_approvals (status, created_at desc);

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null default 'engineering_approval',
  recipient text not null default 'bolingolearn@pm.me',
  subject text not null default '',
  body text not null default '',
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'skipped')),
  provider text,
  provider_id text,
  error text,
  sent_at timestamptz,
  report_id uuid references public.engineering_reports (id) on delete set null,
  approval_id uuid references public.engineering_approvals (id) on delete set null
);

alter table public.notification_outbox enable row level security;

drop policy if exists "Admins read notifications" on public.notification_outbox;
create policy "Admins read notifications"
  on public.notification_outbox for select
  using (public.is_admin());

grant select on public.notification_outbox to authenticated;
grant all on public.notification_outbox to service_role;

create index if not exists notification_outbox_created on public.notification_outbox (created_at desc);

-- ---------------------------------------------------------------------------
-- Dashboard aggregate (one round trip, admin-only)
-- ---------------------------------------------------------------------------
create or replace function public.quality_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sessions bigint := 0;
  v_error_sessions bigint := 0;
  v_p95 double precision;
  v_learners jsonb;
  v_engagement jsonb;
  v_reliability jsonb;
  v_revenue jsonb;
  v_content jsonb;
  v_experiments jsonb;
  v_latest_run jsonb;
  v_pending int := 0;
begin
  if not public.is_admin() then
    raise exception 'owner access required' using errcode = '42501';
  end if;

  select
    count(distinct session_id) filter (where event = 'session_start'),
    count(distinct session_id) filter (
      where event = 'error' and properties ->> 'fatal' = 'true'
    ),
    percentile_cont(0.95) within group (order by duration_ms)
      filter (where duration_ms is not null)
  into v_sessions, v_error_sessions, v_p95
  from public.telemetry_events
  where created_at > now() - interval '7 days';

  select jsonb_build_object(
    'total', (select count(*) from public.profiles),
    'premium', (select count(*) from public.profiles where is_premium),
    'new_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'active_7d', (select count(*) from public.profiles where last_activity_at > now() - interval '7 days')
  ) into v_learners;

  select jsonb_build_object(
    'lessons_completed_7d',
      (select count(*) from public.lesson_completions where completed_at > now() - interval '7 days'),
    'active_learners_7d',
      (select count(distinct user_id) from public.lesson_completions where completed_at > now() - interval '7 days'),
    'lesson_starts_7d',
      (select count(*) from public.telemetry_events where event = 'lesson_started' and created_at > now() - interval '7 days'),
    'quiz_submissions_7d',
      (select count(*) from public.telemetry_events where event = 'quiz_submitted' and created_at > now() - interval '7 days'),
    'completion_rate_pct',
      (
        select case
          when count(*) filter (where event = 'lesson_started') > 0 then
            round(
              100.0 * count(*) filter (where event = 'lesson_completed')
                / count(*) filter (where event = 'lesson_started'),
              1
            )
          else null
        end
        from public.telemetry_events
        where event in ('lesson_started', 'lesson_completed')
          and created_at > now() - interval '7 days'
      )
  ) into v_engagement;

  select jsonb_build_object(
    'sessions_7d', coalesce(v_sessions, 0),
    'error_sessions_7d', coalesce(v_error_sessions, 0),
    'crash_free_pct',
      case
        when coalesce(v_sessions, 0) > 0 then
          round(100.0 * greatest(0, v_sessions - v_error_sessions) / v_sessions, 1)
        else null
      end,
    'p95_latency_ms', case when v_p95 is null then null else round(v_p95::numeric) end
  ) into v_reliability;

  select jsonb_build_object(
    'premium_active', count(*),
    'mrr_estimate_usd',
      round(
        count(*) * coalesce(
          (select premium_price_usd from public.quality_settings where id = 'default'),
          7.70
        ),
        2
      )
  ) into v_revenue
  from public.profiles
  where is_premium;

  select jsonb_build_object(
    'db_lessons', (select count(*) from public.lessons),
    'db_questions', (select count(*) from public.questions),
    'telemetry_events_7d',
      (select count(*) from public.telemetry_events where created_at > now() - interval '7 days')
  ) into v_content;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'experiment', experiment,
        'variant', variant,
        'exposures', exposures,
        'conversions', conversions,
        'conversion_pct', conversion_pct
      ) order by experiment, variant
    ),
    '[]'::jsonb
  )
  into v_experiments
  from (
    select
      properties ->> 'experiment' as experiment,
      coalesce(properties ->> 'variant', 'unknown') as variant,
      count(*) filter (where event = 'experiment_exposed')::int as exposures,
      count(*) filter (where event = 'experiment_converted')::int as conversions,
      case
        when count(*) filter (where event = 'experiment_exposed') > 0 then
          round(
            100.0 * count(*) filter (where event = 'experiment_converted')
              / count(*) filter (where event = 'experiment_exposed'),
            2
          )
        else 0
      end as conversion_pct
    from public.telemetry_events
    where properties ? 'experiment'
      and created_at > now() - interval '90 days'
    group by 1, 2
  ) experiment_rows;

  select jsonb_build_object(
    'status', status,
    'created_at', created_at,
    'commit_sha', commit_sha,
    'branch', branch,
    'duration_ms', duration_ms,
    'summary', summary
  )
  into v_latest_run
  from public.quality_runs
  order by created_at desc
  limit 1;

  select count(*) into v_pending
  from public.engineering_approvals
  where status = 'pending';

  return jsonb_build_object(
    'generated_at', now(),
    'learners', v_learners,
    'engagement', v_engagement,
    'reliability', v_reliability,
    'revenue', v_revenue,
    'content', v_content,
    'experiments', v_experiments,
    'latest_run', v_latest_run,
    'approvals_pending', coalesce(v_pending, 0)
  );
end;
$$;

revoke all on function public.quality_overview() from public;
grant execute on function public.quality_overview() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Retention
-- ---------------------------------------------------------------------------
create or replace function public.prune_telemetry()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer;
  v_deleted integer;
begin
  if not public.is_admin()
     and coalesce(auth.role() = 'service_role', false) is false
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'owner access required' using errcode = '42501';
  end if;
  select retention_days into v_days from public.quality_settings where id = 'default';
  delete from public.telemetry_events
  where created_at < now() - make_interval(days => greatest(7, coalesce(v_days, 90)));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.prune_telemetry() from public;
grant execute on function public.prune_telemetry() to authenticated, service_role;

-- Optional daily retention job (enable pg_cron first):
--   select cron.schedule(
--     'bolingo-prune-telemetry',
--     '0 3 * * *',
--     $$select public.prune_telemetry()$$
--   );
