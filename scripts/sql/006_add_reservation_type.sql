-- Add reservation type field to support meal/drinks only reservations
-- This allows restaurants to specify whether they accept only meal reservations
-- and customers to specify their reservation type

-- Add reservation_type to reservations table
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS reservation_type text CHECK (reservation_type IN ('meal', 'drinks')) DEFAULT 'meal';

-- Add meal_only_reservations setting to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS meal_only_reservations boolean DEFAULT false;

-- Add comments for clarity
COMMENT ON COLUMN public.reservations.reservation_type IS 'Type of reservation: meal (with food) or drinks (drinks only)';
COMMENT ON COLUMN public.restaurants.meal_only_reservations IS 'Whether this restaurant only accepts meal reservations (no drinks-only)';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_reservations_type ON public.reservations(reservation_type);
CREATE INDEX IF NOT EXISTS idx_restaurants_meal_only ON public.restaurants(meal_only_reservations);

-- Add validation function to check reservation type against restaurant policy
CREATE OR REPLACE FUNCTION public.validate_reservation_type()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if restaurant only accepts meal reservations
  IF EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE id = NEW.restaurant_id 
    AND meal_only_reservations = true 
    AND NEW.reservation_type = 'drinks'
  ) THEN
    RAISE EXCEPTION 'This restaurant only accepts meal reservations';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate reservation type
DROP TRIGGER IF EXISTS validate_reservation_type_trigger ON public.reservations;
CREATE TRIGGER validate_reservation_type_trigger
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_reservation_type();