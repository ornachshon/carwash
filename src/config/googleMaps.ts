import Constants from 'expo-constants';

const PLACEHOLDER_KEY = 'PASTE_YOUR_GOOGLE_MAPS_API_KEY_HERE';

/** Reads Google Maps / Places / Geocoding API key from env or app.json (never hardcoded). */
export function getGoogleMapsApiKey(): string | null {
  const envKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (envKey) {
    return envKey;
  }

  const configKey = Constants.expoConfig?.android?.config?.googleMaps?.apiKey?.trim();
  if (!configKey || configKey === PLACEHOLDER_KEY) {
    return null;
  }

  return configKey;
}
