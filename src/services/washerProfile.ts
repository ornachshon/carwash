import { supabase } from './supabase';
import type { WasherProfile } from '../types/database';
import { getErrorMessage } from '../utils/authErrors';
import type { LatLng } from '../utils/geo';

export async function fetchWasherProfile(userId: string): Promise<WasherProfile | null> {
  const { data, error } = await supabase
    .from('washer_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return data;
}

export async function setWasherAvailability(
  isAvailable: boolean,
  location?: LatLng,
): Promise<void> {
  const { error } = await supabase.rpc('update_washer_availability', {
    p_is_available: isAvailable,
    p_lng: location?.longitude,
    p_lat: location?.latitude,
  });

  if (error) {
    throw new Error(getErrorMessage(error));
  }
}
