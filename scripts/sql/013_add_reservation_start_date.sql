-- Add an optional first bookable date for restaurant reservations

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS reservation_start_date date DEFAULT NULL;

COMMENT ON COLUMN public.restaurants.reservation_start_date IS
  'First date from which online reservations are accepted for this restaurant';
