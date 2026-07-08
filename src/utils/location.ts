import { Platform } from 'react-native';
import * as Location from 'expo-location';

export type DeviceCoordinates = {
  latitude: number;
  longitude: number;
};

const POSITION_TIMEOUT_MS = 12_000;
const LAST_KNOWN_MAX_AGE_MS = 15 * 60 * 1000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('LOCATION_TIMEOUT')), ms);
    }),
  ]);
}

async function ensureLocationReady(): Promise<void> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission is required to go online and receive nearby jobs.');
  }

  if (!(await Location.hasServicesEnabledAsync())) {
    if (Platform.OS === 'android') {
      try {
        await Location.enableNetworkProviderAsync();
      } catch {
        // User dismissed the system dialog.
      }
    }

    if (!(await Location.hasServicesEnabledAsync())) {
      throw new Error(
        'Location services are off. Turn on location in your device settings, then try again.',
      );
    }
  }

  if (Platform.OS === 'android') {
    const providers = await Location.getProviderStatusAsync();
    if (!providers.locationServicesEnabled) {
      throw new Error(
        'Location services are off. Turn on location in your device settings, then try again.',
      );
    }
    if (providers.gpsAvailable === false && providers.networkAvailable === false) {
      throw new Error(
        'No location providers are available. Enable GPS or network location in settings.',
      );
    }
  }
}

async function tryCurrentPosition(
  accuracy: Location.LocationAccuracy,
): Promise<Location.LocationObject | null> {
  try {
    return await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy,
        mayShowUserSettingsDialog: true,
      }),
      POSITION_TIMEOUT_MS,
    );
  } catch {
    return null;
  }
}

export async function getDeviceLocation(): Promise<DeviceCoordinates> {
  await ensureLocationReady();

  for (const accuracy of [Location.Accuracy.Low, Location.Accuracy.Balanced]) {
    const position = await tryCurrentPosition(accuracy);
    if (position) {
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    }
  }

  const lastKnown = await Location.getLastKnownPositionAsync({
    maxAge: LAST_KNOWN_MAX_AGE_MS,
  });
  if (lastKnown) {
    return {
      latitude: lastKnown.coords.latitude,
      longitude: lastKnown.coords.longitude,
    };
  }

  throw new Error(
    'Could not get your current location. On Android, set location mode to High accuracy, then try again near a window or outdoors.',
  );
}
