import { supabase } from './supabase';
import type { User, Vehicle, WashJob, WashJobStatus } from '../types/database';
import { getErrorMessage } from '../utils/authErrors';
import { parseGeographyPoint, type LatLng } from '../utils/geo';

export interface NearbyWashJob {
  id: string;
  address_text: string;
  requested_at: string;
  status: WashJob['status'];
  location: LatLng | null;
  vehicle: Pick<
    Vehicle,
    'id' | 'make' | 'model' | 'color' | 'license_plate' | 'photo_url' | 'size_category'
  > | null;
}

export interface WashJobDetail extends WashJob {
  vehicle: Vehicle | null;
  owner: Pick<User, 'id' | 'full_name' | 'phone'> | null;
}

function mapNearbyJob(row: {
  id: string;
  address_text: string;
  requested_at: string;
  status: WashJob['status'];
  location: unknown;
  vehicle: NearbyWashJob['vehicle'];
}): NearbyWashJob {
  return {
    id: row.id,
    address_text: row.address_text,
    requested_at: row.requested_at,
    status: row.status,
    location: parseGeographyPoint(row.location),
    vehicle: row.vehicle,
  };
}

export async function fetchNearbyRequestedJobs(): Promise<NearbyWashJob[]> {
  const { data, error } = await supabase
    .from('wash_jobs')
    .select(
      `
      id,
      address_text,
      requested_at,
      status,
      location,
      vehicle:vehicles (
        id,
        make,
        model,
        color,
        license_plate,
        photo_url,
        size_category
      )
    `,
    )
    .eq('status', 'requested')
    .is('washer_id', null)
    .order('requested_at', { ascending: false });

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return (data ?? []).map(mapNearbyJob);
}

export async function fetchWasherJobDetail(jobId: string): Promise<WashJobDetail | null> {
  const { data, error } = await supabase
    .from('wash_jobs')
    .select(
      `
      *,
      vehicle:vehicles (*),
      owner:users!wash_jobs_owner_id_fkey (id, full_name, phone)
    `,
    )
    .eq('id', jobId)
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return data as WashJobDetail | null;
}

export async function acceptWashJob(jobId: string, washerId: string): Promise<WashJob> {
  const { data, error } = await supabase
    .from('wash_jobs')
    .update({
      washer_id: washerId,
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('status', 'requested')
    .is('washer_id', null)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  if (!data) {
    throw new Error('This job is no longer available. Another washer may have accepted it.');
  }

  return data;
}

export async function startWashJob(
  jobId: string,
  washerId: string,
  beforeWashPhotoUrl?: string | null,
): Promise<WashJob> {
  const patch: Partial<WashJob> = {
    status: 'in_progress',
  };

  if (beforeWashPhotoUrl) {
    patch.before_wash_photo_url = beforeWashPhotoUrl;
  }

  const { data, error } = await supabase
    .from('wash_jobs')
    .update(patch)
    .eq('id', jobId)
    .eq('washer_id', washerId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  if (!data) {
    throw new Error('Could not start this wash.');
  }

  return data;
}

export async function completeWashJob(
  jobId: string,
  washerId: string,
  completionPhotoUrl?: string | null,
): Promise<WashJob> {
  const patch: Partial<WashJob> = {
    status: 'completed',
    completed_at: new Date().toISOString(),
  };

  if (completionPhotoUrl) {
    patch.completion_photo_url = completionPhotoUrl;
  }

  const { data, error } = await supabase
    .from('wash_jobs')
    .update(patch)
    .eq('id', jobId)
    .eq('washer_id', washerId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  if (!data) {
    throw new Error('Could not complete this job.');
  }

  return data;
}

export async function updateWashJobStatus(
  jobId: string,
  washerId: string,
  status: WashJobStatus,
): Promise<WashJob> {
  const patch: Partial<WashJob> = { status };

  if (status === 'completed') {
    patch.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('wash_jobs')
    .update(patch)
    .eq('id', jobId)
    .eq('washer_id', washerId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  if (!data) {
    throw new Error('Could not update job status.');
  }

  return data;
}

export function getJobCoordinates(job: Pick<WashJob, 'location'>): LatLng | null {
  return parseGeographyPoint(job.location);
}
