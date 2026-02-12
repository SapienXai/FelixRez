-- Track which admin user created a reservation

alter table public.reservations
  add column if not exists booked_by_user_id uuid references public.admin_profiles(id) on delete set null;

create index if not exists idx_reservations_booked_by_user_id
  on public.reservations(booked_by_user_id);
