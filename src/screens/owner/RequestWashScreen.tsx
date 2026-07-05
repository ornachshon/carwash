import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, type MapPressEvent, type Region } from 'react-native-maps';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  LocationAutocomplete,
  type LocationAutocompleteRef,
} from '../../components/LocationAutocomplete';
import { ScreenLayout } from '../../components/ScreenLayout';
import { SignOutButton } from '../../components/SignOutButton';
import { VehiclePicker } from '../../components/VehiclePicker';
import { getGoogleMapsApiKey } from '../../config/googleMaps';
import { useAuth } from '../../hooks/useAuth';
import { GeocodingError, reverseGeocode } from '../../services/geocoding';
import { fetchOwnerVehicles } from '../../services/vehicles';
import { createWashJob } from '../../services/washJobs';
import { colors, spacing, typography } from '../../theme';
import type { Vehicle } from '../../types/database';
import { getErrorMessage } from '../../utils/authErrors';
import { parseGeographyPoint, TEL_AVIV_CENTER, type LatLng } from '../../utils/geo';
import type { OwnerStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OwnerStackParamList, 'RequestWash'>;
type TimeMode = 'asap' | 'later';

function regionFromCoords(coords: LatLng, delta = 0.02): Region {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

function formatScheduledAt(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function RequestWashScreen({ navigation }: Props) {
  const { authUser, profile } = useAuth();
  const apiKey = useMemo(() => getGoogleMapsApiKey(), []);

  const savedAddress = profile?.address_text?.trim() ?? '';
  const savedLocation = useMemo(
    () => parseGeographyPoint(profile?.default_location),
    [profile?.default_location],
  );
  const needsPinDrop = savedLocation === null;

  const mapRef = useRef<MapView>(null);
  const locationAutocompleteRef = useRef<LocationAutocompleteRef>(null);
  const skipAddressClearRef = useRef(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placesWarning, setPlacesWarning] = useState<string | null>(null);

  const [addressLabel, setAddressLabel] = useState(savedAddress);
  const [locationCustom, setLocationCustom] = useState(false);
  const [coordinates, setCoordinates] = useState<LatLng | null>(savedLocation);
  const [timeMode, setTimeMode] = useState<TimeMode>('asap');
  const [scheduledAt, setScheduledAt] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const mapRegion = useMemo(
    () => regionFromCoords(coordinates ?? TEL_AVIV_CENTER),
    [coordinates],
  );

  const setAddressSynced = useCallback((text: string) => {
    skipAddressClearRef.current = true;
    setAddressLabel(text);
    locationAutocompleteRef.current?.setAddressText(text);
    skipAddressClearRef.current = false;
  }, []);

  useEffect(() => {
    setAddressLabel(savedAddress);
    setCoordinates(savedLocation);
    setLocationCustom(false);
    if (savedAddress) {
      locationAutocompleteRef.current?.setAddressText(savedAddress);
    }
    if (savedLocation) {
      mapRef.current?.animateToRegion(regionFromCoords(savedLocation, 0.008), 0);
    }
  }, [savedAddress, savedLocation]);

  useEffect(() => {
    if (!authUser) {
      setLoadingVehicles(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoadingVehicles(true);
      setError(null);

      try {
        const rows = await fetchOwnerVehicles(authUser.id);
        if (cancelled) {
          return;
        }
        setVehicles(rows);
        if (rows.length === 1) {
          setSelectedVehicleId(rows[0].id);
        } else if (rows.length > 0 && !selectedVehicleId) {
          setSelectedVehicleId(rows[0].id);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setLoadingVehicles(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const handleAddressChange = useCallback((text: string) => {
    setAddressLabel(text);
    if (skipAddressClearRef.current) {
      return;
    }
    if (!text.trim()) {
      setCoordinates(null);
      setLocationCustom(false);
      setPlacesWarning(null);
      return;
    }
    setCoordinates(null);
  }, []);

  const handlePlaceSelected = useCallback((address: string, coords: LatLng) => {
    setAddressSynced(address);
    setCoordinates(coords);
    setLocationCustom(true);
    setPlacesWarning(null);
    setError(null);
    mapRef.current?.animateToRegion(regionFromCoords(coords, 0.008), 400);
  }, [setAddressSynced]);

  const applyMapLocationWithGeocode = useCallback(
    async (coords: LatLng) => {
      setCoordinates(coords);
      setLocationCustom(true);
      setError(null);
      mapRef.current?.animateToRegion(regionFromCoords(coords, 0.008), 400);

      if (!apiKey) {
        return;
      }

      try {
        const address = await reverseGeocode(coords.latitude, coords.longitude, apiKey);
        setAddressSynced(address);
        setPlacesWarning(null);
      } catch (err) {
        if (err instanceof GeocodingError && err.isNetwork) {
          setPlacesWarning(
            'Offline — pin set but address lookup failed. Type an address or retry when online.',
          );
        } else {
          setPlacesWarning('Pin set but address lookup failed. Type an address manually.');
        }
      }
    },
    [apiKey, setAddressSynced],
  );

  const handleMapPress = useCallback(
    (event: MapPressEvent) => {
      void applyMapLocationWithGeocode(event.nativeEvent.coordinate);
    },
    [applyMapLocationWithGeocode],
  );

  const handleMarkerDragEnd = useCallback(
    (event: { nativeEvent: { coordinate: LatLng } }) => {
      void applyMapLocationWithGeocode(event.nativeEvent.coordinate);
    },
    [applyMapLocationWithGeocode],
  );

  const handleResetToSavedAddress = useCallback(() => {
    if (!savedAddress) {
      return;
    }
    setAddressSynced(savedAddress);
    setLocationCustom(false);
    if (savedLocation) {
      setCoordinates(savedLocation);
      mapRef.current?.animateToRegion(regionFromCoords(savedLocation, 0.008), 400);
    } else {
      setCoordinates(null);
    }
    setPlacesWarning(null);
    setError(null);
  }, [savedAddress, savedLocation, setAddressSynced]);

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setScheduledAt((current) => {
        const next = new Date(current);
        next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        return next;
      });
      if (Platform.OS === 'android') {
        setShowTimePicker(true);
      }
    }
  };

  const handleTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (date) {
      setScheduledAt((current) => {
        const next = new Date(current);
        next.setHours(date.getHours(), date.getMinutes(), 0, 0);
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!authUser) {
      setError('You must be signed in to request a wash.');
      return;
    }

    if (!selectedVehicleId) {
      setError('Please select a vehicle.');
      return;
    }

    const addressText = addressLabel.trim();
    if (!addressText) {
      setError('Please enter or select a wash location address.');
      return;
    }

    if (!coordinates) {
      setError('Select an address from the list or drop a pin on the map.');
      return;
    }

    let requestedAt = new Date();
    if (timeMode === 'later') {
      if (scheduledAt.getTime() <= Date.now()) {
        setError('Scheduled time must be in the future.');
        return;
      }
      requestedAt = scheduledAt;
    }

    setSubmitting(true);

    try {
      const jobId = await createWashJob({
        vehicleId: selectedVehicleId,
        location: coordinates,
        addressText,
        requestedAt,
      });

      navigation.replace('JobStatus', { jobId });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenLayout title="Request a wash" subtitle="Pick your vehicle, location, and time">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <SignOutButton />

        {loadingVehicles ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading your vehicles…</Text>
          </View>
        ) : vehicles.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyText}>Add a vehicle before requesting a wash.</Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('AddVehicle')}
            >
              <Text style={styles.secondaryButtonText}>Add vehicle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Header content — outside ScrollView */}
            <VehiclePicker
              vehicles={vehicles}
              selectedId={selectedVehicleId}
              onSelect={setSelectedVehicleId}
            />

            <Text style={styles.sectionLabel}>Location</Text>

            {/* GooglePlacesAutocomplete FlatList must NOT be inside ScrollView */}
            <LocationAutocomplete
              ref={locationAutocompleteRef}
              apiKey={apiKey}
              address={addressLabel}
              onAddressChange={handleAddressChange}
              onPlaceSelected={handlePlaceSelected}
              onAutocompleteError={(message) => setPlacesWarning(message)}
              onClearError={() => setPlacesWarning(null)}
            />

            {placesWarning ? <Text style={styles.warningText}>{placesWarning}</Text> : null}

            {needsPinDrop ? (
              <Text style={styles.helperText}>
                Search for your address or tap the map to drop a pin.
              </Text>
            ) : locationCustom ? (
              <TouchableOpacity onPress={handleResetToSavedAddress}>
                <Text style={styles.linkText}>Use saved address instead</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.helperText}>Search or tap the map to adjust the pin.</Text>
            )}

            {/* Scrollable body — map, when, submit only */}
            <ScrollView
              style={styles.scrollBody}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <View style={styles.mapWrapper}>
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  initialRegion={mapRegion}
                  region={coordinates ? mapRegion : undefined}
                  onPress={handleMapPress}
                >
                  {coordinates ? (
                    <Marker coordinate={coordinates} draggable onDragEnd={handleMarkerDragEnd} />
                  ) : null}
                </MapView>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>When</Text>
                <View style={styles.timeRow}>
                  <TouchableOpacity
                    style={[styles.timeChip, timeMode === 'asap' && styles.timeChipSelected]}
                    onPress={() => setTimeMode('asap')}
                  >
                    <Text
                      style={[styles.timeChipText, timeMode === 'asap' && styles.timeChipTextSelected]}
                    >
                      ASAP
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.timeChip, timeMode === 'later' && styles.timeChipSelected]}
                    onPress={() => setTimeMode('later')}
                  >
                    <Text
                      style={[styles.timeChipText, timeMode === 'later' && styles.timeChipTextSelected]}
                    >
                      Schedule for later
                    </Text>
                  </TouchableOpacity>
                </View>

                {timeMode === 'later' ? (
                  <View style={styles.scheduleBlock}>
                    <Text style={styles.scheduledLabel}>{formatScheduledAt(scheduledAt)}</Text>
                    <View style={styles.scheduleButtons}>
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <Text style={styles.secondaryButtonText}>Change date</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => setShowTimePicker(true)}
                      >
                        <Text style={styles.secondaryButtonText}>Change time</Text>
                      </TouchableOpacity>
                    </View>
                    {showDatePicker ? (
                      <DateTimePicker
                        value={scheduledAt}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        minimumDate={new Date()}
                        onChange={handleDateChange}
                      />
                    ) : null}
                    {showTimePicker ? (
                      <DateTimePicker
                        value={scheduledAt}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleTimeChange}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={styles.submitButtonText}>Request wash</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </>
        )}
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  loadingBlock: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyBlock: {
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  helperText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  warningText: {
    ...typography.bodySmall,
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  linkText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  mapWrapper: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  timeChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  timeChipText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  timeChipTextSelected: {
    color: colors.surface,
    fontWeight: '600',
  },
  scheduleBlock: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  scheduledLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  scheduleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    marginBottom: spacing.md,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});
