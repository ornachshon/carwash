import { supabase } from './supabase';
import type { User, UserRole, WashJob } from '../types/database';
import { getErrorMessage } from '../utils/authErrors';

export interface RatingContext {
  job: Pick<WashJob, 'id' | 'status' | 'owner_id' | 'washer_id'>;
  ratedUser: Pick<User, 'id' | 'full_name'>;
  ratedBy: UserRole;
  rateeLabel: 'owner' | 'washer';
}

export function mapRatingError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes('duplicate key') ||
    lower.includes('unique constraint') ||
    lower.includes('23505')
  ) {
    return "You've already rated this job.";
  }
  if (lower.includes('row-level security')) {
    return 'You are not allowed to rate this job.';
  }
  return message;
}

export async function fetchRatingContext(
  jobId: string,
  currentUserId: string,
  currentRole: UserRole,
): Promise<RatingContext> {
  const { data, error } = await supabase
    .from('wash_jobs')
    .select(
      `
      id,
      status,
      owner_id,
      washer_id,
      owner:users!wash_jobs_owner_id_fkey (id, full_name),
      washer:users!wash_jobs_washer_id_fkey (id, full_name)
    `,
    )
    .eq('id', jobId)
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  if (!data) {
    throw new Error('Job not found.');
  }

  const job = data as {
    id: string;
    status: WashJob['status'];
    owner_id: string;
    washer_id: string | null;
    owner: Pick<User, 'id' | 'full_name'> | null;
    washer: Pick<User, 'id' | 'full_name'> | null;
  };

  if (job.owner_id !== currentUserId && job.washer_id !== currentUserId) {
    throw new Error('You are not part of this job.');
  }

  if (currentRole === 'owner' && job.owner_id === currentUserId) {
    if (!job.washer_id || !job.washer) {
      throw new Error('This job has no assigned washer to rate.');
    }
    return {
      job,
      ratedUser: job.washer,
      ratedBy: 'owner',
      rateeLabel: 'washer',
    };
  }

  if (currentRole === 'washer' && job.washer_id === currentUserId) {
    if (!job.owner) {
      throw new Error('Could not load the owner for this job.');
    }
    return {
      job,
      ratedUser: job.owner,
      ratedBy: 'washer',
      rateeLabel: 'owner',
    };
  }

  throw new Error('Your role does not match this job.');
}

export async function submitRating(input: {
  jobId: string;
  ratedBy: UserRole;
  ratedUserId: string;
  score: number;
  comment?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('ratings').insert({
    job_id: input.jobId,
    rated_by: input.ratedBy,
    rated_user_id: input.ratedUserId,
    score: input.score,
    comment: input.comment?.trim() || null,
  });

  if (error) {
    throw new Error(mapRatingError(getErrorMessage(error)));
  }
}
