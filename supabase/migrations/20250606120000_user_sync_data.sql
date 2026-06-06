create table if not exists public.user_sync_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_sync_data enable row level security;

drop policy if exists "Users read own sync data" on public.user_sync_data;
create policy "Users read own sync data"
  on public.user_sync_data for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own sync data" on public.user_sync_data;
create policy "Users insert own sync data"
  on public.user_sync_data for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own sync data" on public.user_sync_data;
create policy "Users update own sync data"
  on public.user_sync_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
