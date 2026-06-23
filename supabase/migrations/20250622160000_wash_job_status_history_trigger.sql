-- Auto-record wash job status changes in job_status_history.

CREATE OR REPLACE FUNCTION public.record_wash_job_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.job_status_history (job_id, status, changed_at)
  VALUES (NEW.id, NEW.status, NOW());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_wash_job_status_change_insert ON public.wash_jobs;
DROP TRIGGER IF EXISTS on_wash_job_status_change_update ON public.wash_jobs;

CREATE TRIGGER on_wash_job_status_change_insert
  AFTER INSERT ON public.wash_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.record_wash_job_status_change();

CREATE TRIGGER on_wash_job_status_change_update
  AFTER UPDATE OF status ON public.wash_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.record_wash_job_status_change();

-- Backfill history for jobs created before this trigger existed.
INSERT INTO public.job_status_history (job_id, status, changed_at)
SELECT wj.id, wj.status, wj.requested_at
FROM public.wash_jobs wj
WHERE NOT EXISTS (
  SELECT 1
  FROM public.job_status_history h
  WHERE h.job_id = wj.id
);
