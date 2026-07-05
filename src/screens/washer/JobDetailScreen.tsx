import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenLayout } from '../../components/ScreenLayout';
import { useAuth } from '../../hooks/useAuth';
import {
  acceptWashJob,
  fetchWasherJobDetail,
  getJobCoordinates,
  type WashJobDetail,
} from '../../services/washerJobs';
import { colors, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/authErrors';
import type { LatLng } from '../../utils/geo';
import type { WasherStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<WasherStackParamList, 'JobDetail'>;

function regionFromCoords(coords: LatLng, delta = 0.02): Region {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

function formatRequestedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function JobDetailScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const { authUser } = useAuth();
  const [job, setJob] = useState<WashJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJob = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchWasherJobDetail(jobId);
      setJob(data);
      if (!data) {
        setError('Job not found or you do not have access to it.');
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }, [jobId]);

  useEffect(() => {
    setLoading(true);
    loadJob().finally(() => setLoading(false));
  }, [loadJob]);

  const coordinates = useMemo(() => (job ? getJobCoordinates(job) : null), [job]);
  const mapRegion = useMemo(
    () => (coordinates ? regionFromCoords(coordinates) : null),
    [coordinates],
  );

  const canAccept =
    job?.status === 'requested' &&
    job.washer_id === null &&
    authUser?.id != null;

  const isAssignedToMe = job?.washer_id === authUser?.id;

  const handleAccept = async () => {
    if (!authUser || !canAccept) {
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      await acceptWashJob(jobId, authUser.id);
      navigation.replace('JobStatusUpdate', { jobId });
    } catch (acceptError) {
      setError(getErrorMessage(acceptError));
      await loadJob();
    } finally {
      setAccepting(false);
    }
  };

  const vehicle = job?.vehicle;
  const ownerName = job?.owner?.full_name?.trim() || 'Owner';

  return (
    <ScreenLayout title="Job detail" subtitle="Review the request before accepting" scroll>
      {loading ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : job ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Vehicle</Text>
            <View style={styles.vehicleRow}>
              {vehicle?.photo_url ? (
                <Image source={{ uri: vehicle.photo_url }} style={styles.vehiclePhoto} />
              ) : (
                <View style={styles.vehiclePhotoPlaceholder}>
                  <Text style={styles.vehiclePhotoPlaceholderText}>No photo</Text>
                </View>
              )}
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleTitle}>
                  {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown vehicle'}
                </Text>
                {vehicle?.color ? <Text style={styles.metaText}>Color: {vehicle.color}</Text> : null}
                {vehicle?.license_plate ? (
                  <Text style={styles.metaText}>Plate: {vehicle.license_plate}</Text>
                ) : null}
                {vehicle?.size_category ? (
                  <Text style={styles.metaText}>Size: {vehicle.size_category}</Text>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Location</Text>
            <Text style={styles.bodyText}>{job.address_text}</Text>
            {mapRegion ? (
              <View style={styles.mapWrapper}>
                <MapView style={styles.map} initialRegion={mapRegion} region={mapRegion}>
                  {coordinates ? <Marker coordinate={coordinates} /> : null}
                </MapView>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>When</Text>
            <Text style={styles.bodyText}>{formatRequestedAt(job.requested_at)}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Owner</Text>
            <Text style={styles.bodyText}>{ownerName}</Text>
            {job.owner?.phone ? <Text style={styles.metaText}>{job.owner.phone}</Text> : null}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {canAccept ? (
            <TouchableOpacity
              style={[styles.acceptButton, accepting && styles.acceptButtonDisabled]}
              onPress={handleAccept}
              disabled={accepting}
            >
              {accepting ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.acceptButtonText}>Accept job</Text>
              )}
            </TouchableOpacity>
          ) : isAssignedToMe ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.replace('JobStatusUpdate', { jobId })}
            >
              <Text style={styles.secondaryButtonText}>Continue to status updates</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.warningText}>This job is no longer available to accept.</Text>
          )}
        </>
      ) : (
        <Text style={styles.errorText}>{error ?? 'Job not found.'}</Text>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  centerBlock: {
    minHeight: 160,
    justifyContent: 'center',
    alignItems: 'center',
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
  vehicleRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  vehiclePhoto: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  vehiclePhotoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehiclePhotoPlaceholderText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  vehicleInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  vehicleTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  bodyText: {
    ...typography.body,
    color: colors.text,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  mapWrapper: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: {
    flex: 1,
  },
  acceptButton: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  acceptButtonDisabled: {
    opacity: 0.7,
  },
  acceptButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  secondaryButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  warningText: {
    ...typography.body,
    color: colors.warning,
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    marginBottom: spacing.md,
  },
});
