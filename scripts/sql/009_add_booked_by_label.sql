-- Allow custom "booked by" text for service list output

alter table public.reservations
  add column if not exists booked_by_label text;
