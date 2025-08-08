-- Create core tables for Felix Reservation

-- Enable extensions used by Supabase projects (if available)
create extension if not exists pgcrypto;

-- Restaurants
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  cuisine text,
  hours text,
  atmosphere text,
  phone text,
  location text,
  media_type text check (media_type in ('slideshow','video')) default 'slideshow',
  created_at timestamptz not null default now()
);

-- Media per restaurant
create table if not exists public.restaurant_media (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  media_url text not null,
  media_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Notification settings
create table if not exists public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  email_notifications boolean not null default true,
  sms_notifications boolean not null default false,
  notification_emails text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (restaurant_id)
);

-- Optional: Reservations table (minimal)
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  party_size int not null check (party_size > 0),
  reservation_time timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);

-- RLS configuration (adjust as needed)
alter table public.restaurants enable row level security;
alter table public.restaurant_media enable row level security;
alter table public.notification_settings enable row level security;
alter table public.reservations enable row level security;

-- Basic public read policy for demo (tighten in production)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'restaurants' and policyname = 'Public read restaurants') then
    create policy "Public read restaurants" on public.restaurants for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'restaurant_media' and policyname = 'Public read media') then
    create policy "Public read media" on public.restaurant_media for select using (true);
  end if;
end $$;
