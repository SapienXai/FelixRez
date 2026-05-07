-- Add date-specific time windows that are unavailable for online reservations

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS reservation_blocked_intervals jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.restaurants.reservation_blocked_intervals IS
  'Unavailable reservation windows, e.g. [{"date":"2026-05-09","start_time":"21:00","end_time":"24:00","message":"Fully booked between 21:00 - 24:00"}]';
