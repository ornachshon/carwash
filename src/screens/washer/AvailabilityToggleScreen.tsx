import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SignOutButton } from '../../components/SignOutButton';
import { ScreenLayout } from '../../components/ScreenLayout';
import { useAuth } from '../../hooks/useAuth';
import { fetchWasherProfile, setWasherAvailability } from '../../services/washerProfile';
import { colors, spacing, typography } from '../../theme';
import type { WasherProfile } from '../../types/database';
import { getErrorMessage } from '../../utils/authErrors';
import type { WasherStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<WasherStackParamList, 'AvailabilityToggle'>;

export function AvailabilityToggleScreen({ navigation }: Props) {
  const { authUser } = useAuth();
  const [profile, setProfile] = useState<WasherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!authUser) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchWasherProfile(authUser.id);
      setProfile(data);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleToggle = async (nextAvailable: boolean) => {
    if (!authUser || toggling) {
      return;
    }

    setToggling(true);
    setError(null);

    try {
      if (nextAvailable) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission is required to go online and receive nearby jobs.');
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        await setWasherAvailability(true, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } else {
        await setWasherAvailability(false);
      }

      await loadProfile();
    } catch (toggleError) {
      setError(getErrorMessage(toggleError));
    } finally {
      setToggling(false);
    }
  };

  const isOnline = profile?.is_available === true;

  return (
    <ScreenLayout title="Availability" subtitle="Go online to receive nearby job requests">
      {loading ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <>
          <View style={[styles.statusCard, isOnline ? styles.statusOnline : styles.statusOffline]}>
            <Text style={[styles.statusLabel, isOnline ? styles.statusLabelOnline : styles.statusLabelOffline]}>
              {isOnline ? 'You are ONLINE' : 'You are OFFLINE'}
            </Text>
            <Text style={styles.statusHint}>
              {isOnline
                ? 'Owners can see you within your service radius.'
                : 'Turn on availability to see and accept nearby wash requests.'}
            </Text>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Available for jobs</Text>
            <Switch
              value={isOnline}
              onValueChange={handleToggle}
              disabled={toggling || !profile}
              trackColor={{ false: colors.border, true: colors.secondary }}
              thumbColor={colors.surface}
            />
          </View>

          {toggling ? (
            <View style={styles.updatingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.updatingText}>Updating availability…</Text>
            </View>
          ) : null}

          {profile ? (
            <Text style={styles.radiusText}>
              Service radius: {profile.service_radius_km} km
            </Text>
          ) : (
            <Text style={styles.warningText}>
              Washer profile not found. Sign out and choose the washer role again.
            </Text>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {isOnline ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('NearbyJobsMap')}
            >
              <Text style={styles.primaryButtonText}>See nearby jobs</Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}

      <SignOutButton />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    borderRadius: 12,
    borderWidth: 2,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statusOnline: {
    backgroundColor: '#ECFDF5',
    borderColor: colors.success,
  },
  statusOffline: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  statusLabel: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  statusLabelOnline: {
    color: colors.success,
  },
  statusLabelOffline: {
    color: colors.textSecondary,
  },
  statusHint: {
    ...typography.body,
    color: colors.textSecondary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  toggleLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  updatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  updatingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  radiusText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  warningText: {
    ...typography.bodySmall,
    color: colors.warning,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  primaryButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});
