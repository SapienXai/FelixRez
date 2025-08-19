-- Admin profiles to manage per-restaurant access

create table if not exists public.admin_profiles (
  id uuid primary key, -- should match auth.users.id
  full_name text,
  role text check (role in ('admin','manager','staff')) default 'staff',
  restaurant_id uuid references public.restaurants(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Basic trigger to keep updated_at fresh
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
    select 1 from pg_trigger
    where tgname = 'trg_admin_profiles_updated_at'
  ) then
    create trigger trg_admin_profiles_updated_at
    before update on public.admin_profiles
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- Index for fast lookup by restaurant
create index if not exists idx_admin_profiles_restaurant_id on public.admin_profiles(restaurant_id);

-- RLS
alter table public.admin_profiles enable row level security;

-- Allow authenticated users to read their own profile
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'admin_profiles' and policyname = 'Read own admin profile'
  ) then
    create policy "Read own admin profile" on public.admin_profiles
      for select using (auth.uid() = id);
  end if;
end $$;

-- Allow service role to manage profiles (service role bypasses RLS by default)
-- Optionally, allow admins to list all profiles (commented by default)
-- create policy "Admin list profiles" on public.admin_profiles
--   for select using (exists (
--     select 1 from public.admin_profiles ap
--     where ap.id = auth.uid() and ap.role = 'admin'
--   ));

comment on table public.admin_profiles is 'Admin users and their restaurant-scoped roles';
comment on column public.admin_profiles.role is 'admin=super admin (all restaurants) when restaurant_id is null; manager/staff must have restaurant_id';

