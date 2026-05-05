-- Dashboard performance helpers.
-- The application falls back to TypeScript aggregation if this function has not
-- been applied yet, but applying it keeps dashboard stats to one DB round trip.

CREATE INDEX IF NOT EXISTS idx_reservations_restaurant_date
  ON public.reservations (restaurant_id, reservation_date);

CREATE INDEX IF NOT EXISTS idx_reservations_restaurant_created
  ON public.reservations (restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reservations_restaurant_status_date
  ON public.reservations (restaurant_id, status, reservation_date);

CREATE INDEX IF NOT EXISTS idx_reservations_created_at
  ON public.reservations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reservations_reservation_area_id
  ON public.reservations (reservation_area_id);

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  p_restaurant_id uuid DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  total bigint,
  pending bigint,
  confirmed bigint,
  cancelled bigint,
  percent_change integer,
  total_kuver bigint,
  total_meal_reservations bigint,
  deck_kuvers bigint,
  terrace_kuvers bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scoped AS (
    SELECT
      r.status,
      r.party_size,
      r.reservation_type,
      ra.name AS area_name
    FROM public.reservations r
    LEFT JOIN public.reservation_areas ra ON ra.id = r.reservation_area_id
    WHERE (p_restaurant_id IS NULL OR r.restaurant_id = p_restaurant_id)
      AND (p_start_date IS NULL OR r.reservation_date >= p_start_date)
      AND (p_end_date IS NULL OR r.reservation_date <= p_end_date)
  ),
  current_counts AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE COALESCE(status, 'pending') = 'pending') AS pending,
      COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
      COALESCE(SUM(party_size) FILTER (WHERE status = 'confirmed'), 0) AS total_kuver,
      COUNT(*) FILTER (WHERE reservation_type = 'meal') AS total_meal_reservations,
      COALESCE(SUM(party_size) FILTER (
        WHERE status = 'confirmed' AND COALESCE(area_name, '') ILIKE '%deck%'
      ), 0) AS deck_kuvers,
      COALESCE(SUM(party_size) FILTER (
        WHERE status = 'confirmed' AND COALESCE(area_name, '') ILIKE '%terrace%'
      ), 0) AS terrace_kuvers
    FROM scoped
  ),
  comparison AS (
    SELECT
      COUNT(*) FILTER (
        WHERE r.created_at >= (NOW() - INTERVAL '1 month')
          AND r.created_at < NOW()
      ) AS last_month_count,
      COUNT(*) FILTER (
        WHERE r.created_at >= (NOW() - INTERVAL '2 months')
          AND r.created_at < (NOW() - INTERVAL '1 month')
      ) AS two_months_ago_count
    FROM public.reservations r
    WHERE (p_restaurant_id IS NULL OR r.restaurant_id = p_restaurant_id)
  )
  SELECT
    current_counts.total,
    current_counts.pending,
    current_counts.confirmed,
    current_counts.cancelled,
    CASE
      WHEN comparison.two_months_ago_count > 0 THEN
        ROUND(((comparison.last_month_count - comparison.two_months_ago_count)::numeric / comparison.two_months_ago_count::numeric) * 100)::integer
      ELSE 0
    END AS percent_change,
    current_counts.total_kuver,
    current_counts.total_meal_reservations,
    current_counts.deck_kuvers,
    current_counts.terrace_kuvers
  FROM current_counts, comparison;
$$;
