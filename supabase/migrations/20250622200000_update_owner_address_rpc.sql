CREATE OR REPLACE FUNCTION public.update_owner_address(
  p_address_text TEXT,
  p_lng DOUBLE PRECISION,
  p_lat DOUBLE PRECISION
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

  UPDATE public.users
  SET
    address_text = p_address_text,
    default_location = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_owner_address(TEXT, DOUBLE PRECISION, DOUBLE PRECISION)
  TO authenticated;
