export class GeocodingError extends Error {
  readonly isNetwork: boolean;

  constructor(message: string, isNetwork = false) {
    super(message);
    this.name = 'GeocodingError';
    this.isNetwork = isNetwork;
  }
}

interface GeocodeResponse {
  status: string;
  error_message?: string;
  results?: { formatted_address: string }[];
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  apiKey: string,
): Promise<string> {
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?latlng=${latitude},${longitude}` +
    `&key=${encodeURIComponent(apiKey)}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new GeocodingError('Could not reach Google Geocoding API.', true);
  }

  let data: GeocodeResponse;
  try {
    data = (await response.json()) as GeocodeResponse;
  } catch {
    throw new GeocodingError('Invalid response from Google Geocoding API.');
  }

  if (data.status === 'ZERO_RESULTS') {
    throw new GeocodingError('No address found for this location.');
  }

  if (data.status !== 'OK' || !data.results?.[0]?.formatted_address) {
    throw new GeocodingError(data.error_message ?? `Geocoding failed (${data.status}).`);
  }

  return data.results[0].formatted_address;
}
