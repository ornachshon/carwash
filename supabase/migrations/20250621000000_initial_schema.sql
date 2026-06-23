-- Initial CarWash schema: users, washer_profiles, vehicles, wash_jobs, job_status_history, ratings

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE public.user_role AS ENUM ('owner', 'washer');
CREATE TYPE public.wash_job_status AS ENUM (
  'requested',
  'accepted',
  'en_route',
  'in_progress',
  'completed',
  'cancelled',
  'paid'
);
CREATE TYPE public.vehicle_size_category AS ENUM ('compact', 'sedan', 'suv', 'truck');

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.washer_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  rating NUMERIC(3, 2) DEFAULT NULL CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  vehicle_description TEXT,
  service_radius_km NUMERIC(6, 2) NOT NULL DEFAULT 10 CHECK (service_radius_km > 0),
  current_location GEOGRAPHY(POINT, 4326),
  is_available BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_connect_account_id TEXT
);

CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT,
  license_plate TEXT,
  size_category public.vehicle_size_category NOT NULL DEFAULT 'sedan'
);

CREATE TABLE public.wash_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  washer_id UUID REFERENCES public.users (id) ON DELETE SET NULL,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles (id) ON DELETE RESTRICT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  address_text TEXT NOT NULL,
  status public.wash_job_status NOT NULL DEFAULT 'requested',
  price NUMERIC(10, 2),
  stripe_payment_intent_id TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE public.job_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.wash_jobs (id) ON DELETE CASCADE,
  status public.wash_job_status NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.wash_jobs (id) ON DELETE CASCADE,
  rated_by public.user_role NOT NULL,
  rated_user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  score SMALLINT NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  UNIQUE (job_id, rated_by)
);

CREATE INDEX idx_washer_profiles_location ON public.washer_profiles USING GIST (current_location);
CREATE INDEX idx_wash_jobs_location ON public.wash_jobs USING GIST (location);
CREATE INDEX idx_wash_jobs_status ON public.wash_jobs (status);
CREATE INDEX idx_wash_jobs_owner ON public.wash_jobs (owner_id);
CREATE INDEX idx_wash_jobs_washer ON public.wash_jobs (washer_id);
CREATE INDEX idx_vehicles_owner ON public.vehicles (owner_id);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wash_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- washer_profiles
CREATE POLICY "Washers can read own profile"
  ON public.washer_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Washers can insert own profile"
  ON public.washer_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'washer'
    )
  );

CREATE POLICY "Washers can update own profile"
  ON public.washer_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- vehicles
CREATE POLICY "Owners can read own vehicles"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert own vehicles"
  ON public.vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'owner'
    )
  );

CREATE POLICY "Owners can update own vehicles"
  ON public.vehicles FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete own vehicles"
  ON public.vehicles FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- wash_jobs
CREATE POLICY "Owners can read own jobs"
  ON public.wash_jobs FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can create jobs"
  ON public.wash_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'owner'
    )
  );

CREATE POLICY "Owners can update own jobs"
  ON public.wash_jobs FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Washers can read assigned jobs"
  ON public.wash_jobs FOR SELECT
  TO authenticated
  USING (washer_id = auth.uid());

CREATE POLICY "Washers can read nearby requested jobs"
  ON public.wash_jobs FOR SELECT
  TO authenticated
  USING (
    status = 'requested'
    AND EXISTS (
      SELECT 1
      FROM public.washer_profiles wp
      JOIN public.users u ON u.id = wp.user_id
      WHERE u.id = auth.uid()
        AND u.role = 'washer'
        AND wp.is_available = TRUE
        AND wp.current_location IS NOT NULL
        AND ST_DWithin(
          wash_jobs.location,
          wp.current_location,
          wp.service_radius_km * 1000
        )
    )
  );

CREATE POLICY "Washers can accept jobs"
  ON public.wash_jobs FOR UPDATE
  TO authenticated
  USING (
    washer_id = auth.uid()
    OR (
      status = 'requested'
      AND washer_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'washer'
      )
    )
  )
  WITH CHECK (washer_id = auth.uid() OR washer_id IS NULL);

-- job_status_history
CREATE POLICY "Participants can read job history"
  ON public.job_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wash_jobs j
      WHERE j.id = job_id
        AND (j.owner_id = auth.uid() OR j.washer_id = auth.uid())
    )
  );

CREATE POLICY "Participants can insert job history"
  ON public.job_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wash_jobs j
      WHERE j.id = job_id
        AND (j.owner_id = auth.uid() OR j.washer_id = auth.uid())
    )
  );

-- ratings
CREATE POLICY "Participants can read ratings for their jobs"
  ON public.ratings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wash_jobs j
      WHERE j.id = job_id
        AND (j.owner_id = auth.uid() OR j.washer_id = auth.uid())
    )
  );

CREATE POLICY "Participants can rate after job"
  ON public.ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wash_jobs j
      WHERE j.id = job_id
        AND j.status IN ('completed', 'paid')
        AND (j.owner_id = auth.uid() OR j.washer_id = auth.uid())
    )
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.wash_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_status_history;
