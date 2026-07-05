import { supabase } from './supabase';
import type { TablesInsert, Vehicle, VehicleSizeCategory } from '../types/database';
import { getErrorMessage } from '../utils/authErrors';
import { uploadVehiclePhoto } from './storage';

export interface CreateVehicleInput {
  ownerId: string;
  make: string;
  model: string;
  color: string;
  licensePlate: string;
  sizeCategory: VehicleSizeCategory;
  photoUri?: string | null;
}

export async function createVehicle(input: CreateVehicleInput) {
  let photoUrl: string | null = null;

  if (input.photoUri) {
    photoUrl = await uploadVehiclePhoto(input.ownerId, input.photoUri);
  }

  const row: TablesInsert<'vehicles'> = {
    owner_id: input.ownerId,
    make: input.make,
    model: input.model,
    color: input.color,
    license_plate: input.licensePlate,
    size_category: input.sizeCategory,
    photo_url: photoUrl,
  };

  const { data, error } = await supabase.from('vehicles').insert(row).select().single();

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return data;
}

export async function fetchOwnerVehicles(ownerId: string): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('owner_id', ownerId)
    .order('make', { ascending: true });

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return data ?? [];
}

export async function updateOwnerAddress(
  ownerId: string,
  addressText: string,
  location?: { latitude: number; longitude: number },
) {
  if (location) {
    const { error } = await supabase.rpc('update_owner_address', {
      p_address_text: addressText,
      p_lng: location.longitude,
      p_lat: location.latitude,
    });

    if (error) {
      throw new Error(getErrorMessage(error));
    }
    return;
  }

  const { error } = await supabase
    .from('users')
    .update({ address_text: addressText })
    .eq('id', ownerId);

  if (error) {
    throw new Error(getErrorMessage(error));
  }
}
