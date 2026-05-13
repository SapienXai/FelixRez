-- Track the latest meaningful reservation edit for management UI badges.

ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS last_update_summary jsonb,
ADD COLUMN IF NOT EXISTS last_updated_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_last_updated_by_user_id
  ON public.reservations(last_updated_by_user_id);

COMMENT ON COLUMN public.reservations.last_update_summary IS
  'Latest meaningful reservation edit summary used by management UI.';

COMMENT ON COLUMN public.reservations.last_updated_by_user_id IS
  'Admin user who made the latest meaningful reservation edit.';
