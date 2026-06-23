import { supabase } from './supabase';
import type { LatLng } from '../utils/geo';
import { getErrorMessage } from '../utils/authErrors';

export interface CreateWashJobInput {
  vehicleId: string;
  location: LatLng;
  addressText: string;
  requestedAt?: Date;
}

export async function createWashJob(input: CreateWashJobInput): Promise<string> {
  const requestedAt = (input.requestedAt ?? new Date()).toISOString();

  const { data, error } = await supabase.rpc('create_wash_job', {
    p_vehicle_id: input.vehicleId,
    p_lng: input.location.longitude,
    p_lat: input.location.latitude,
    p_address_text: input.addressText,
    p_requested_at: requestedAt,
  });

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  if (typeof data !== 'string') {
    throw new Error('Unexpected response when creating wash job.');
  }

  return data;
}
