-- RPC to insert wash_jobs with a PostGIS geography point (client-side WKT is unreliable).
CREATE OR REPLACE FUNCTION public.create_wash_job(
  p_vehicle_id UUID,
  p_lng DOUBLE PRECISION,
  p_lat DOUBLE PRECISION,
  p_address_text TEXT,
  p_requested_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.vehicles v
    WHERE v.id = p_vehicle_id AND v.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Vehicle not found';
  END IF;

  INSERT INTO public.wash_jobs (
    owner_id,
    vehicle_id,
    location,
    address_text,
    status,
    requested_at
  ) VALUES (
    auth.uid(),
    p_vehicle_id,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_address_text,
    'requested',
    COALESCE(p_requested_at, NOW())
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_wash_job(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TIMESTAMPTZ)
  TO authenticated;
