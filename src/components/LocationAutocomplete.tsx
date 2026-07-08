import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import type { GooglePlacesAutocompleteRef } from 'react-native-google-places-autocomplete';
import { AuthTextInput } from './AuthTextInput';
import { colors, spacing, typography } from '../theme';
import { TEL_AVIV_CENTER, type LatLng } from '../utils/geo';

export interface LocationAutocompleteRef {
  setAddressText: (text: string) => void;
}

interface LocationAutocompleteProps {
  apiKey: string | null;
  address: string;
  onAddressChange: (text: string) => void;
  onPlaceSelected: (address: string, coords: LatLng) => void;
  onAutocompleteError: (message: string) => void;
  onClearError: () => void;
}

export const LocationAutocomplete = forwardRef<LocationAutocompleteRef, LocationAutocompleteProps>(
  function LocationAutocomplete(
    { apiKey, address, onAddressChange, onPlaceSelected, onAutocompleteError, onClearError },
    ref,
  ) {
    const placesRef = useRef<GooglePlacesAutocompleteRef>(null);
    const lastLoggedFirstResult = useRef<string | null>(null);

    useImperativeHandle(ref, () => ({
      setAddressText: (text: string) => {
        placesRef.current?.setAddressText(text);
      },
    }));

    if (!apiKey) {
      return (
        <View>
          <AuthTextInput
            label="Address"
            value={address}
            onChangeText={onAddressChange}
            placeholder="Enter your exact wash location"
            autoCapitalize="words"
            autoCorrect={false}
          />
          <Text style={styles.warningText}>
            Google Places search unavailable — configure android.config.googleMaps.apiKey in app.json
            or EXPO_PUBLIC_GOOGLE_MAPS_API_KEY. You can still drop a pin on the map.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>Address</Text>
        <GooglePlacesAutocomplete
          ref={placesRef}
          placeholder="Search address in Hebrew or English"
          fetchDetails
          enablePoweredByContainer={false}
          minLength={2}
          debounce={300}
          keyboardShouldPersistTaps="handled"
          listViewDisplayed="auto"
          keepResultsAfterBlur={false}
          disableScroll
          query={{
            key: apiKey,
            components: 'country:il',
            location: `${TEL_AVIV_CENTER.latitude},${TEL_AVIV_CENTER.longitude}`,
            radius: 50_000,
          }}
          onPress={(data, details = null) => {
            onClearError();
            console.log('[LocationAutocomplete] Place selected:', {
              description: data.description,
              placeId: data.place_id,
              hasDetails: details != null,
              location: details?.geometry?.location ?? null,
            });
            const location = details?.geometry?.location;
            if (!location) {
              console.warn('[LocationAutocomplete] Selected place missing geometry:', data);
              onAutocompleteError(
                'Selected place has no location. Try another result or drop a pin on the map.',
              );
              return;
            }

            const formattedAddress = details.formatted_address ?? data.description;
            onPlaceSelected(formattedAddress, {
              latitude: location.lat,
              longitude: location.lng,
            });
          }}
          onFail={(error) => {
            console.error('[LocationAutocomplete] Places autocomplete failed:', error);
            onAutocompleteError(
              'Address search unavailable. Check your connection or drop a pin on the map.',
            );
          }}
          onNotFound={() => {
            console.log('[LocationAutocomplete] Places autocomplete returned no results');
          }}
          onTimeout={() => {
            console.warn('[LocationAutocomplete] Places autocomplete request timed out');
          }}
          renderRow={(rowData, index) => {
            if (index === 0 && rowData.description !== lastLoggedFirstResult.current) {
              lastLoggedFirstResult.current = rowData.description ?? null;
              console.log('[LocationAutocomplete] Autocomplete predictions received:', {
                firstResult: rowData.description,
              });
            }

            return (
              <View style={styles.row}>
                <Text style={styles.description}>{rowData.description}</Text>
              </View>
            );
          }}
          textInputProps={{
            onChangeText: (text) => {
              onAddressChange(text);
              if (text.trim()) {
                onClearError();
              }
            },
            autoCapitalize: 'words',
            autoCorrect: false,
            placeholderTextColor: colors.textSecondary,
          }}
          styles={{
            container: styles.autocompleteContainer,
            textInput: styles.textInput,
            listView: styles.listView,
            row: styles.row,
            separator: styles.separator,
            description: styles.description,
          }}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 20,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  autocompleteContainer: {
    flex: 0,
    zIndex: 20,
  },
  textInput: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    height: 48,
  },
  listView: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 200,
  },
  row: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  description: {
    ...typography.bodySmall,
    color: colors.text,
  },
  warningText: {
    ...typography.caption,
    color: colors.warning,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
});
