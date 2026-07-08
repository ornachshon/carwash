-- Break wash_jobs INSERT recursion: "Owners can create jobs" WITH CHECK was
-- SELECTing public.users, whose RLS policies SELECT public.wash_jobs again.

CREATE OR REPLACE FUNCTION public.current_user_is_owner()
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
      AND role = 'owner'
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_owner() TO authenticated;

DROP POLICY IF EXISTS "Owners can create jobs" ON public.wash_jobs;

CREATE POLICY "Owners can create jobs"
  ON public.wash_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND public.current_user_is_owner()
  );

-- Same users subquery pattern on vehicles INSERT; fix preventively.
DROP POLICY IF EXISTS "Owners can insert own vehicles" ON public.vehicles;

CREATE POLICY "Owners can insert own vehicles"
  ON public.vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND public.current_user_is_owner()
  );
