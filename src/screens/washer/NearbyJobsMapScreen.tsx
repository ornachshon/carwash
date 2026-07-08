import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenLayout } from '../../components/ScreenLayout';
import { useAuth } from '../../hooks/useAuth';
import { fetchWasherProfile } from '../../services/washerProfile';
import { fetchNearbyRequestedJobs, type NearbyWashJob } from '../../services/washerJobs';
import { colors, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/authErrors';
import { distanceKm, formatDistanceKm, parseGeographyPoint, type LatLng } from '../../utils/geo';
import type { WasherStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<WasherStackParamList, 'NearbyJobsMap'>;

function formatRequestedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function vehicleLabel(job: NearbyWashJob): string {
  const v = job.vehicle;
  if (!v) {
    return 'Vehicle';
  }
  const plate = v.license_plate ? ` · ${v.license_plate}` : '';
  return `${v.make} ${v.model}${plate}`;
}

export function NearbyJobsMapScreen({ navigation }: Props) {
  const { authUser } = useAuth();
  const [washerLocation, setWasherLocation] = useState<LatLng | null>(null);
  const [jobs, setJobs] = useState<NearbyWashJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!authUser) {
      return;
    }

    setError(null);

    try {
      const [profile, nearbyJobs] = await Promise.all([
        fetchWasherProfile(authUser.id),
        fetchNearbyRequestedJobs(),
      ]);

      setWasherLocation(parseGeographyPoint(profile?.current_location));
      setJobs(nearbyJobs);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }, [authUser]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const openJob = (jobId: string) => {
    navigation.navigate('JobDetail', { jobId });
  };

  const renderJobCard = ({ item }: { item: NearbyWashJob }) => {
    const distance =
      washerLocation && item.location
        ? formatDistanceKm(distanceKm(washerLocation, item.location))
        : null;

    return (
      <TouchableOpacity style={styles.jobCard} onPress={() => openJob(item.id)}>
        <View style={styles.jobCardHeader}>
          <Text style={styles.jobVehicle}>{vehicleLabel(item)}</Text>
          {distance ? <Text style={styles.jobDistance}>{distance}</Text> : null}
        </View>
        <Text style={styles.jobAddress}>{item.address_text}</Text>
        <Text style={styles.jobTime}>Requested {formatRequestedAt(item.requested_at)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenLayout title="Nearby jobs" subtitle="Requested washes within your service radius">
      {loading ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <FlatList
            data={jobs}
            keyExtractor={(item) => item.id}
            renderItem={renderJobCard}
            ListEmptyComponent={
              <View style={styles.emptyBlock}>
                <Text style={styles.emptyText}>
                  No open jobs nearby. Pull to refresh when you are online.
                </Text>
              </View>
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.listContent}
          />
        </>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  jobCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  jobVehicle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  jobDistance: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  jobAddress: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  jobTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyBlock: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    marginBottom: spacing.md,
  },
});
