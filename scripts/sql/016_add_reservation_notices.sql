-- Add date-range notices shown during online reservation without blocking booking

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS reservation_notices jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.restaurants.reservation_notices IS
  'Date-range reservation notices, e.g. [{"start_date":"2026-05-26","end_date":"2026-05-29","title":"Holiday Notice","message":"Daily reservation limits apply during the holiday.","active":true}]';
