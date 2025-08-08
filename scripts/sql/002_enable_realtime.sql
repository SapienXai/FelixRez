-- Enable real-time for reservations table
-- This script should be run in the Supabase SQL editor

-- Enable real-time for the reservations table
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;

-- Alternative approach if the above doesn't work:
-- DROP PUBLICATION IF EXISTS supabase_realtime;
-- CREATE PUBLICATION supabase_realtime FOR TABLE public.reservations;

-- Verify the publication includes reservations
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';