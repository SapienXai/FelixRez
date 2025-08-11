-- Add reservation settings fields to restaurants table

-- Add reservation configuration fields
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS reservation_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS allowed_days_of_week integer[] DEFAULT '{1,2,3,4,5,6,7}', -- 1=Monday, 7=Sunday
ADD COLUMN IF NOT EXISTS opening_time time DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS closing_time time DEFAULT '22:00',
ADD COLUMN IF NOT EXISTS time_slot_duration integer DEFAULT 30, -- minutes
ADD COLUMN IF NOT EXISTS advance_booking_days integer DEFAULT 30, -- how many days in advance
ADD COLUMN IF NOT EXISTS min_advance_hours integer DEFAULT 2, -- minimum hours in advance
ADD COLUMN IF NOT EXISTS max_party_size integer DEFAULT 12,
ADD COLUMN IF NOT EXISTS min_party_size integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS blocked_dates date[] DEFAULT '{}', -- specific dates to block
ADD COLUMN IF NOT EXISTS special_hours jsonb DEFAULT '{}'; -- special hours for specific dates

-- Add comments for clarity
COMMENT ON COLUMN public.restaurants.reservation_enabled IS 'Whether reservations are enabled for this restaurant';
COMMENT ON COLUMN public.restaurants.allowed_days_of_week IS 'Array of allowed days (1=Monday, 7=Sunday)';
COMMENT ON COLUMN public.restaurants.opening_time IS 'Daily opening time';
COMMENT ON COLUMN public.restaurants.closing_time IS 'Daily closing time';
COMMENT ON COLUMN public.restaurants.time_slot_duration IS 'Duration of each time slot in minutes';
COMMENT ON COLUMN public.restaurants.advance_booking_days IS 'Maximum days in advance for booking';
COMMENT ON COLUMN public.restaurants.min_advance_hours IS 'Minimum hours in advance for booking';
COMMENT ON COLUMN public.restaurants.max_party_size IS 'Maximum party size allowed';
COMMENT ON COLUMN public.restaurants.min_party_size IS 'Minimum party size allowed';
COMMENT ON COLUMN public.restaurants.blocked_dates IS 'Array of blocked dates (holidays, maintenance, etc.)';
COMMENT ON COLUMN public.restaurants.special_hours IS 'Special hours for specific dates in JSON format {"2024-12-25": {"opening_time": "12:00", "closing_time": "18:00"}}';

-- Add constraints
ALTER TABLE public.restaurants 
ADD CONSTRAINT check_time_slot_duration CHECK (time_slot_duration > 0 AND time_slot_duration <= 240),
ADD CONSTRAINT check_advance_booking_days CHECK (advance_booking_days >= 0 AND advance_booking_days <= 365),
ADD CONSTRAINT check_min_advance_hours CHECK (min_advance_hours >= 0 AND min_advance_hours <= 168),
ADD CONSTRAINT check_party_size_range CHECK (min_party_size > 0 AND max_party_size >= min_party_size),
ADD CONSTRAINT check_opening_closing_time CHECK (opening_time < closing_time),
ADD CONSTRAINT check_allowed_days CHECK (array_length(allowed_days_of_week, 1) > 0 AND allowed_days_of_week <@ '{1,2,3,4,5,6,7}');