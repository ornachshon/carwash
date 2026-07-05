import { supabase } from './supabase';
import type { JobStatusHistory, User, WashJob } from '../types/database';
import { getErrorMessage } from '../utils/authErrors';

export interface OwnerJobStatusDetail extends Pick<
  WashJob,
  'id' | 'status' | 'washer_id' | 'address_text' | 'completion_photo_url' | 'requested_at'
> {
  washer: Pick<User, 'id' | 'full_name' | 'phone'> | null;
}

export async function fetchOwnerJobStatus(jobId: string): Promise<OwnerJobStatusDetail | null> {
  const { data, error } = await supabase
    .from('wash_jobs')
    .select(
      `
      id,
      status,
      washer_id,
      address_text,
      completion_photo_url,
      requested_at,
      washer:users!wash_jobs_washer_id_fkey (id, full_name, phone)
    `,
    )
    .eq('id', jobId)
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return data as OwnerJobStatusDetail | null;
}

export async function fetchJobStatusHistory(jobId: string): Promise<JobStatusHistory[]> {
  const { data, error } = await supabase
    .from('job_status_history')
    .select('*')
    .eq('job_id', jobId)
    .order('changed_at', { ascending: true });

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return data ?? [];
}
