-- Store browser push subscriptions for admin users.
-- Run this in the Supabase SQL editor after generating VAPID keys.

create table if not exists public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.admin_profiles(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_push_subscriptions_user_id
  on public.admin_push_subscriptions(user_id);

create index if not exists idx_admin_push_subscriptions_restaurant_id
  on public.admin_push_subscriptions(restaurant_id);

alter table public.admin_push_subscriptions enable row level security;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_push_subscriptions'
      and policyname = 'Read own push subscriptions'
  ) then
    create policy "Read own push subscriptions" on public.admin_push_subscriptions
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_push_subscriptions'
      and policyname = 'Manage own push subscriptions'
  ) then
    create policy "Manage own push subscriptions" on public.admin_push_subscriptions
      for all using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_admin_push_subscriptions_updated_at'
  ) then
    create trigger trg_admin_push_subscriptions_updated_at
    before update on public.admin_push_subscriptions
    for each row execute function public.set_updated_at();
  end if;
end $$;
