-- Add table_number field to reservations table
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS table_number text;
