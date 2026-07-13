import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AuthTextInput } from './AuthTextInput';
import {
  LocationAutocomplete,
  type LocationAutocompleteRef,
} from './LocationAutocomplete';
import { colors, spacing, typography } from '../theme';
import { getDeviceLocation } from '../utils/location';
import { getErrorMessage } from '../utils/authErrors';
import type { LatLng } from '../utils/geo';

interface AddressInputProps {
  apiKey: string | null;
  label?: string;
  address: string;
  coordinates: LatLng | null;
  onAddressChange: (text: string) => void;
  onCoordinatesChange: (coords: LatLng | null) => void;
  onPlacesWarning?: (message: string | null) => void;
  placeholder?: string;
}

export function AddressInput({
  apiKey,
  label = 'Address',
  address,
  coordinates,
  onAddressChange,
  onCoordinatesChange,
  onPlacesWarning,
  placeholder = 'Street, city',
}: AddressInputProps) {
  const autocompleteRef = useRef<LocationAutocompleteRef>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handlePlaceSelected = (selectedAddress: string, coords: LatLng) => {
    onAddressChange(selectedAddress);
    onCoordinatesChange(coords);
    setLocationError(null);
    onPlacesWarning?.(null);
    autocompleteRef.current?.setAddressText(selectedAddress);
  };

  const handleUseMyLocation = async () => {
    setLocating(true);
    setLocationError(null);

    try {
      const coords = await getDeviceLocation();
      onCoordinatesChange(coords);
      onPlacesWarning?.(null);
    } catch (err) {
      setLocationError(getErrorMessage(err));
      onCoordinatesChange(null);
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      {apiKey ? (
        <LocationAutocomplete
          ref={autocompleteRef}
          apiKey={apiKey}
          address={address}
          onAddressChange={(text) => {
            onAddressChange(text);
            if (!text.trim()) {
              onCoordinatesChange(null);
            }
          }}
          onPlaceSelected={handlePlaceSelected}
          onAutocompleteError={(message) => onPlacesWarning?.(message)}
          onClearError={() => onPlacesWarning?.(null)}
        />
      ) : (
        <AuthTextInput
          label={label}
          value={address}
          onChangeText={(text) => {
            onAddressChange(text);
            if (!text.trim()) {
              onCoordinatesChange(null);
            }
          }}
          placeholder={placeholder}
          autoCapitalize="words"
          autoCorrect={false}
        />
      )}

      <TouchableOpacity
        style={[styles.locationButton, locating && styles.locationButtonDisabled]}
        onPress={handleUseMyLocation}
        disabled={locating}
      >
        {locating ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.locationButtonText}>Use my current location</Text>
        )}
      </TouchableOpacity>

      {coordinates ? (
        <Text style={styles.coordsText}>
          Location set ({coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)})
        </Text>
      ) : (
        <Text style={styles.hintText}>
          {apiKey
            ? 'Search for an address or use your current location.'
            : 'Enter your address and use your current location.'}
        </Text>
      )}

      {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}

      {!apiKey ? (
        <Text style={styles.warningText}>
          Address search unavailable — Google Places API key not configured in this build.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
    zIndex: 10,
  },
  locationButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    minHeight: 44,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  locationButtonDisabled: {
    opacity: 0.7,
  },
  locationButtonText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  coordsText: {
    ...typography.caption,
    color: colors.success,
    marginTop: spacing.sm,
  },
  hintText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    marginTop: spacing.sm,
  },
  warningText: {
    ...typography.caption,
    color: colors.warning,
    marginTop: spacing.sm,
  },
});
