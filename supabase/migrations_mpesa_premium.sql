-- Run once in Supabase dashboard → SQL editor (project rlulmewvmhxgctonizas).
-- M-Pesa (Safaricom Daraja) premium purchases.
--
-- One row per STK Push attempt. The client may only ever READ its own rows:
-- every write goes through the `mpesa-push` / `mpesa-callback` Edge Functions
-- with the service role, because a learner who could insert `status = 'confirmed'`
-- would grant themselves premium. There is deliberately no authenticated
-- insert/update/delete policy here, and adding one reopens that hole.

create table if not exists public.mpesa_checkouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  phone text not null,
  plan text not null,
  amount_kes integer not null check (amount_kes > 0),
  period_days integer not null check (period_days > 0),
  checkout_request_id text unique,
  merchant_request_id text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'failed', 'expired')),
  result_code text,
  result_desc text,
  requested_at timestamptz not null default now(),
  settled_at timestamptz,
  period_ends timestamptz
);

alter table public.mpesa_checkouts enable row level security;

drop policy if exists "Users read own M-Pesa checkouts" on public.mpesa_checkouts;
create policy "Users read own M-Pesa checkouts"
  on public.mpesa_checkouts for select
  using (auth.uid() = user_id);

grant select on public.mpesa_checkouts to authenticated;
grant all on public.mpesa_checkouts to service_role;

create index if not exists mpesa_checkouts_user_time
  on public.mpesa_checkouts (user_id, requested_at desc);
create index if not exists mpesa_checkouts_pending
  on public.mpesa_checkouts (user_id, status, requested_at desc);

comment on table public.mpesa_checkouts is
  'Daraja STK Push attempts and outcomes. service_role writes only; amount and period are decided server-side.';
comment on column public.mpesa_checkouts.amount_kes is
  'Kenya shillings captured at initiation from the server price map, not from the client.';
comment on column public.mpesa_checkouts.period_ends is
  'Paid-through date. Premium lapses when no confirmed row for the user is still in date.';
