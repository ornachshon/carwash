import Constants from 'expo-constants';

const PLACEHOLDER_KEY = 'PASTE_YOUR_GOOGLE_MAPS_API_KEY_HERE';

function readEnvKey(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function readNativeConfigKey(): string | null {
  const configKey = Constants.expoConfig?.android?.config?.googleMaps?.apiKey?.trim();
  if (!configKey || configKey === PLACEHOLDER_KEY) {
    return null;
  }
  return configKey;
}

/** Native Android Maps SDK key (use Android app restriction in Google Cloud). */
export function getGoogleMapsNativeApiKey(): string | null {
  return (
    readEnvKey('EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY') ??
    readEnvKey('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY') ??
    readNativeConfigKey()
  );
}

/**
 * Places Autocomplete + Geocoding web APIs.
 * Use a separate key with API-only restrictions (no Android app restriction).
 */
export function getGooglePlacesApiKey(): string | null {
  return (
    readEnvKey('EXPO_PUBLIC_GOOGLE_PLACES_API_KEY') ??
    readEnvKey('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY') ??
    readNativeConfigKey()
  );
}

/** @deprecated Use getGooglePlacesApiKey or getGoogleMapsNativeApiKey. */
export function getGoogleMapsApiKey(): string | null {
  return getGooglePlacesApiKey();
}
