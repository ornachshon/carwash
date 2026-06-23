import { supabase } from './supabase';
import { getErrorMessage } from '../utils/authErrors';

const BUCKET = 'vehicle-photos';

function extensionFromUri(uri: string): string {
  const match = uri.match(/\.(\w+)(?:\?|$)/);
  const ext = match?.[1]?.toLowerCase();
  if (ext === 'png') return 'png';
  if (ext === 'webp') return 'webp';
  if (ext === 'heic') return 'heic';
  return 'jpg';
}

function contentTypeFromExt(ext: string): string {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  return 'image/jpeg';
}

export async function uploadVehiclePhoto(
  ownerId: string,
  localUri: string,
): Promise<string> {
  const ext = extensionFromUri(localUri);
  const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType: contentTypeFromExt(ext),
    upsert: false,
  });

  if (uploadError) {
    throw new Error(getErrorMessage(uploadError));
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
