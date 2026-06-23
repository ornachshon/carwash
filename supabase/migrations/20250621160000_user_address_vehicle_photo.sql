-- Owner default address on users; vehicle photo URL; vehicle-photos storage bucket

ALTER TABLE public.users
  ADD COLUMN address_text TEXT,
  ADD COLUMN default_location GEOGRAPHY(POINT, 4326);

ALTER TABLE public.vehicles
  ADD COLUMN photo_url TEXT;

CREATE INDEX idx_users_default_location ON public.users USING GIST (default_location);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-photos',
  'vehicle-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Owners can upload vehicle photos to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vehicle-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public read vehicle photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'vehicle-photos');

CREATE POLICY "Owners can update own vehicle photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vehicle-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'vehicle-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owners can delete own vehicle photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vehicle-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
