-- Add reservation areas functionality to support multiple dining areas per restaurant
-- Each restaurant can have multiple areas (Beach, Deck, Terrace, Salon, etc.)
-- Each area has its own availability settings and time slots

-- Create reservation_areas table
CREATE TABLE IF NOT EXISTS public.reservation_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL, -- 'Beach', 'Deck', 'Terrace', 'Salon', etc.
  description text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0, -- For ordering areas in UI
  
  -- Time and availability settings (inherits from restaurant if null)
  opening_time time DEFAULT NULL, -- If null, uses restaurant's opening_time
  closing_time time DEFAULT NULL, -- If null, uses restaurant's closing_time
  time_slot_duration integer DEFAULT NULL, -- If null, uses restaurant's time_slot_duration
  
  -- Booking constraints (inherits from restaurant if null)
  max_party_size integer DEFAULT NULL, -- If null, uses restaurant's max_party_size
  min_party_size integer DEFAULT NULL, -- If null, uses restaurant's min_party_size
  advance_booking_days integer DEFAULT NULL, -- If null, uses restaurant's advance_booking_days
  min_advance_hours integer DEFAULT NULL, -- If null, uses restaurant's min_advance_hours
  
  -- Day and date availability (inherits from restaurant if null)
  allowed_days_of_week integer[] DEFAULT NULL, -- If null, uses restaurant's allowed_days_of_week
  blocked_dates date[] DEFAULT '{}', -- Area-specific blocked dates
  special_hours jsonb DEFAULT '{}', -- Area-specific special hours
  
  -- Capacity management
  max_concurrent_reservations integer DEFAULT NULL, -- Max reservations at same time slot
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure unique area names per restaurant
  UNIQUE(restaurant_id, name)
);

-- Add reservation_area_id to reservations table
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS reservation_area_id uuid REFERENCES public.reservation_areas(id) ON DELETE SET NULL;

-- Add comments for clarity
COMMENT ON TABLE public.reservation_areas IS 'Dining areas within restaurants (Beach, Deck, Terrace, etc.)';
COMMENT ON COLUMN public.reservation_areas.name IS 'Area name (Beach, Deck, Terrace, Salon, etc.)';
COMMENT ON COLUMN public.reservation_areas.is_active IS 'Whether this area is currently accepting reservations';
COMMENT ON COLUMN public.reservation_areas.display_order IS 'Order for displaying areas in UI (lower numbers first)';
COMMENT ON COLUMN public.reservation_areas.opening_time IS 'Area opening time (inherits from restaurant if null)';
COMMENT ON COLUMN public.reservation_areas.closing_time IS 'Area closing time (inherits from restaurant if null)';
COMMENT ON COLUMN public.reservation_areas.max_concurrent_reservations IS 'Maximum reservations allowed at the same time slot';
COMMENT ON COLUMN public.reservations.reservation_area_id IS 'The specific area within the restaurant for this reservation';

-- Add constraints
ALTER TABLE public.reservation_areas 
ADD CONSTRAINT check_area_time_slot_duration CHECK (time_slot_duration IS NULL OR (time_slot_duration > 0 AND time_slot_duration <= 240)),
ADD CONSTRAINT check_area_advance_booking_days CHECK (advance_booking_days IS NULL OR (advance_booking_days >= 0 AND advance_booking_days <= 365)),
ADD CONSTRAINT check_area_min_advance_hours CHECK (min_advance_hours IS NULL OR (min_advance_hours >= 0 AND min_advance_hours <= 168)),
ADD CONSTRAINT check_area_party_size_range CHECK (
  (min_party_size IS NULL AND max_party_size IS NULL) OR
  (min_party_size IS NOT NULL AND max_party_size IS NOT NULL AND min_party_size > 0 AND max_party_size >= min_party_size)
),
ADD CONSTRAINT check_area_display_order CHECK (display_order >= 0),
ADD CONSTRAINT check_area_max_concurrent CHECK (max_concurrent_reservations IS NULL OR max_concurrent_reservations > 0);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reservation_areas_restaurant_id ON public.reservation_areas(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reservation_areas_active ON public.reservation_areas(restaurant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_reservation_areas_display_order ON public.reservation_areas(restaurant_id, display_order);
CREATE INDEX IF NOT EXISTS idx_reservations_area_id ON public.reservations(reservation_area_id);

-- Enable RLS
ALTER TABLE public.reservation_areas ENABLE ROW LEVEL SECURITY;

-- Basic public read policy for reservation areas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reservation_areas' AND policyname = 'Public read reservation areas') THEN
    CREATE POLICY "Public read reservation areas" ON public.reservation_areas FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- Create a function to get effective settings for an area (with restaurant fallback)
CREATE OR REPLACE FUNCTION public.get_area_effective_settings(area_id uuid)
RETURNS TABLE (
  opening_time time,
  closing_time time,
  time_slot_duration integer,
  max_party_size integer,
  min_party_size integer,
  advance_booking_days integer,
  min_advance_hours integer,
  allowed_days_of_week integer[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ra.opening_time, r.opening_time) as opening_time,
    COALESCE(ra.closing_time, r.closing_time) as closing_time,
    COALESCE(ra.time_slot_duration, r.time_slot_duration) as time_slot_duration,
    COALESCE(ra.max_party_size, r.max_party_size) as max_party_size,
    COALESCE(ra.min_party_size, r.min_party_size) as min_party_size,
    COALESCE(ra.advance_booking_days, r.advance_booking_days) as advance_booking_days,
    COALESCE(ra.min_advance_hours, r.min_advance_hours) as min_advance_hours,
    COALESCE(ra.allowed_days_of_week, r.allowed_days_of_week) as allowed_days_of_week
  FROM public.reservation_areas ra
  JOIN public.restaurants r ON ra.restaurant_id = r.id
  WHERE ra.id = area_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_reservation_areas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reservation_areas_updated_at
  BEFORE UPDATE ON public.reservation_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reservation_areas_updated_at();