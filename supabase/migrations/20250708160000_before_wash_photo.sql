ALTER TABLE public.wash_jobs
  ADD COLUMN IF NOT EXISTS before_wash_photo_url TEXT;
