-- Fix RLS infinite recursion caused by policies that SELECT/JOIN public.users
-- while evaluating public.users RLS (circular reference).

CREATE OR REPLACE FUNCTION public.current_user_is_washer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'washer'
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_washer() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_washer() TO authenticated;

DROP POLICY IF EXISTS "Washers can read owners for visible jobs" ON public.users;

CREATE POLICY "Washers can read owners for visible jobs"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.wash_jobs j
      WHERE j.owner_id = users.id
        AND (
          j.washer_id = auth.uid()
          OR (
            j.status = 'requested'
            AND j.washer_id IS NULL
            AND EXISTS (
              SELECT 1
              FROM public.washer_profiles wp
              WHERE wp.user_id = auth.uid()
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

DROP POLICY IF EXISTS "Washers can read vehicles on visible jobs" ON public.vehicles;

CREATE POLICY "Washers can read vehicles on visible jobs"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.wash_jobs j
      WHERE j.vehicle_id = vehicles.id
        AND (
          j.washer_id = auth.uid()
          OR (
            j.status = 'requested'
            AND j.washer_id IS NULL
            AND EXISTS (
              SELECT 1
              FROM public.washer_profiles wp
              WHERE wp.user_id = auth.uid()
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

DROP POLICY IF EXISTS "Washers can insert own profile" ON public.washer_profiles;

CREATE POLICY "Washers can insert own profile"
  ON public.washer_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.current_user_is_washer()
  );

DROP POLICY IF EXISTS "Washers can read nearby requested jobs" ON public.wash_jobs;

CREATE POLICY "Washers can read nearby requested jobs"
  ON public.wash_jobs FOR SELECT
  TO authenticated
  USING (
    status = 'requested'
    AND EXISTS (
      SELECT 1
      FROM public.washer_profiles wp
      WHERE wp.user_id = auth.uid()
        AND wp.is_available = TRUE
        AND wp.current_location IS NOT NULL
        AND ST_DWithin(
          wash_jobs.location,
          wp.current_location,
          wp.service_radius_km * 1000
        )
    )
  );

DROP POLICY IF EXISTS "Washers can accept jobs" ON public.wash_jobs;

CREATE POLICY "Washers can accept jobs"
  ON public.wash_jobs FOR UPDATE
  TO authenticated
  USING (
    washer_id = auth.uid()
    OR (
      status = 'requested'
      AND washer_id IS NULL
      AND public.current_user_is_washer()
    )
  )
  WITH CHECK (washer_id = auth.uid() OR washer_id IS NULL);
