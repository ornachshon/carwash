-- Washers need vehicle + owner info for jobs they can see or are assigned to.

CREATE POLICY "Washers can read vehicles on visible jobs"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wash_jobs j
      WHERE j.vehicle_id = vehicles.id
        AND (
          j.washer_id = auth.uid()
          OR (
            j.status = 'requested'
            AND j.washer_id IS NULL
            AND EXISTS (
              SELECT 1
              FROM public.washer_profiles wp
              JOIN public.users u ON u.id = wp.user_id
              WHERE u.id = auth.uid()
                AND u.role = 'washer'
                AND wp.is_available = TRUE
                AND wp.current_location IS NOT NULL
                AND ST_DWithin(
                  j.location,
                  wp.current_location,
                  wp.service_radius_km * 1000
                )
            )
          )
        )
    )
  );

CREATE POLICY "Washers can read owners for visible jobs"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wash_jobs j
      WHERE j.owner_id = users.id
        AND (
          j.washer_id = auth.uid()
          OR (
            j.status = 'requested'
            AND j.washer_id IS NULL
            AND EXISTS (
              SELECT 1
              FROM public.washer_profiles wp
              JOIN public.users u ON u.id = wp.user_id
              WHERE u.id = auth.uid()
                AND u.role = 'washer'
                AND wp.is_available = TRUE
                AND wp.current_location IS NOT NULL
                AND ST_DWithin(
                  j.location,
                  wp.current_location,
                  wp.service_radius_km * 1000
                )
            )
          )
        )
    )
  );

CREATE OR REPLACE FUNCTION public.update_washer_availability(
  p_is_available BOOLEAN,
  p_lng DOUBLE PRECISION DEFAULT NULL,
  p_lat DOUBLE PRECISION DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_is_available AND (p_lng IS NULL OR p_lat IS NULL) THEN
    RAISE EXCEPTION 'Location required when going online';
  END IF;

  UPDATE public.washer_profiles
  SET
    is_available = p_is_available,
    current_location = CASE
      WHEN p_is_available THEN ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ELSE current_location
    END
  WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Washer profile not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_washer_availability(BOOLEAN, DOUBLE PRECISION, DOUBLE PRECISION)
  TO authenticated;
