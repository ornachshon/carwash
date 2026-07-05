-- Allow job participants to read each other's name when rating after a job.

CREATE POLICY "Participants can read counterpart on shared jobs"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.wash_jobs j
      WHERE (
        j.owner_id = auth.uid() AND j.washer_id = users.id
      ) OR (
        j.washer_id = auth.uid() AND j.owner_id = users.id
      )
    )
  );

DROP POLICY IF EXISTS "Participants can rate after job" ON public.ratings;

CREATE POLICY "Participants can rate after job"
  ON public.ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.wash_jobs j
      WHERE j.id = ratings.job_id
        AND j.status IN ('completed', 'paid')
        AND (
          (
            j.owner_id = auth.uid()
            AND ratings.rated_by = 'owner'
            AND ratings.rated_user_id = j.washer_id
          )
          OR (
            j.washer_id = auth.uid()
            AND ratings.rated_by = 'washer'
            AND ratings.rated_user_id = j.owner_id
          )
        )
    )
  );
