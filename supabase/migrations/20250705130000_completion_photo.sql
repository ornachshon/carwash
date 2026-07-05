ALTER TABLE public.wash_jobs
  ADD COLUMN IF NOT EXISTS completion_photo_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'completion-photos',
  'completion-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read completion photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'completion-photos');

CREATE POLICY "Washers can upload completion photos for assigned jobs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'completion-photos'
    AND EXISTS (
      SELECT 1
      FROM public.wash_jobs j
      WHERE j.id::text = (storage.foldername(name))[1]
        AND j.washer_id = auth.uid()
    )
  );

CREATE POLICY "Washers can update completion photos for assigned jobs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'completion-photos'
    AND EXISTS (
      SELECT 1
      FROM public.wash_jobs j
      WHERE j.id::text = (storage.foldername(name))[1]
        AND j.washer_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'completion-photos'
    AND EXISTS (
      SELECT 1
      FROM public.wash_jobs j
      WHERE j.id::text = (storage.foldername(name))[1]
        AND j.washer_id = auth.uid()
    )
  );
