-- Golf Practice Tracker: one row per user holding their whole app state.
-- Run once in Supabase → SQL Editor → New query.

create table if not exists public.app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security: each signed-in user can only see and change their own row.
alter table public.app_state enable row level security;

drop policy if exists "Read own state" on public.app_state;
create policy "Read own state" on public.app_state
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Insert own state" on public.app_state;
create policy "Insert own state" on public.app_state
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Update own state" on public.app_state;
create policy "Update own state" on public.app_state
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
