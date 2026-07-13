import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenLayout } from '../../components/ScreenLayout';
import { useAuth } from '../../hooks/useAuth';
import { uploadBeforeWashPhoto, uploadCompletionPhoto } from '../../services/storage';
import {
  completeWashJob,
  fetchWasherJobDetail,
  startWashJob,
  updateWashJobStatus,
} from '../../services/washerJobs';
import { colors, spacing, typography } from '../../theme';
import type { WashJobStatus } from '../../types/database';
import { getErrorMessage } from '../../utils/authErrors';
import { STATUS_LABELS } from '../../utils/jobStatus';
import type { WasherStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<WasherStackParamList, 'JobStatusUpdate'>;

type StatusAction = {
  nextStatus: WashJobStatus;
  label: string;
};

type JobPhotoKind = 'before' | 'completion';

function getNextAction(status: WashJobStatus): StatusAction | null {
  switch (status) {
    case 'accepted':
      return { nextStatus: 'en_route', label: "I'm on my way" };
    case 'en_route':
      return { nextStatus: 'in_progress', label: "I've arrived / Starting wash" };
    case 'in_progress':
      return { nextStatus: 'completed', label: 'Wash complete' };
    default:
      return null;
  }
}

function formatPickerError(err: unknown): string {
  if (err instanceof Error) {
    return [err.name, err.message, err.stack].filter(Boolean).join('\n');
  }
  return String(err);
}

export function JobStatusUpdateScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const { authUser } = useAuth();
  const [status, setStatus] = useState<WashJobStatus | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJob = useCallback(async () => {
    setError(null);
    try {
      const job = await fetchWasherJobDetail(jobId);
      if (!job) {
        setError('Job not found.');
        return;
      }
      if (job.washer_id !== authUser?.id) {
        setError('You are not assigned to this job.');
        return;
      }
      setStatus(job.status);
      setAddress(job.address_text);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }, [authUser?.id, jobId]);

  useEffect(() => {
    setLoading(true);
    loadJob().finally(() => setLoading(false));
  }, [loadJob]);

  const nextAction = status ? getNextAction(status) : null;

  const finishCompletedFlow = useCallback(() => {
    navigation.replace('RateUser', { jobId });
  }, [jobId, navigation]);

  const startWash = async (photoUri?: string | null) => {
    if (!authUser) {
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      let beforeWashPhotoUrl: string | null = null;
      if (photoUri) {
        beforeWashPhotoUrl = await uploadBeforeWashPhoto(jobId, photoUri);
      }

      const updated = await startWashJob(jobId, authUser.id, beforeWashPhotoUrl);
      setStatus(updated.status);
    } catch (startError) {
      setError(getErrorMessage(startError));
    } finally {
      setUpdating(false);
    }
  };

  const completeJob = async (photoUri?: string | null) => {
    if (!authUser) {
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      let completionPhotoUrl: string | null = null;
      if (photoUri) {
        completionPhotoUrl = await uploadCompletionPhoto(jobId, photoUri);
      }

      const updated = await completeWashJob(jobId, authUser.id, completionPhotoUrl);
      setStatus(updated.status);
      finishCompletedFlow();
    } catch (completeError) {
      setError(getErrorMessage(completeError));
    } finally {
      setUpdating(false);
    }
  };

  const pickJobPhoto = async (kind: JobPhotoKind, source: 'library' | 'camera') => {
    setError(null);

    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError('Camera permission is required to take a photo.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
          if (kind === 'before') {
            await startWash(result.assets[0].uri);
          } else {
            await completeJob(result.assets[0].uri);
          }
        }
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Photo library permission is required to pick a photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        if (kind === 'before') {
          await startWash(result.assets[0].uri);
        } else {
          await completeJob(result.assets[0].uri);
        }
      }
    } catch (pickerError) {
      const message = formatPickerError(pickerError);
      console.error('[JobStatusUpdateScreen] photo picker failed:', message, pickerError);
      setError(`Image picker error:\n${message}`);
    }
  };

  const showBeforePhotoOptions = () => {
    Alert.alert('Before wash photo (optional)', 'Take a photo of the car before you start', [
      { text: 'Take photo', onPress: () => void pickJobPhoto('before', 'camera') },
      { text: 'Choose from gallery', onPress: () => void pickJobPhoto('before', 'library') },
      { text: 'Skip & start wash', onPress: () => void startWash(null) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const showCompletionPhotoOptions = () => {
    Alert.alert('After wash photo (optional)', 'Show the owner proof of work', [
      { text: 'Take photo', onPress: () => void pickJobPhoto('completion', 'camera') },
      { text: 'Choose from gallery', onPress: () => void pickJobPhoto('completion', 'library') },
      { text: 'Skip & complete', onPress: () => void completeJob(null) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleAdvance = async () => {
    if (!authUser || !nextAction || !status) {
      return;
    }

    if (nextAction.nextStatus === 'in_progress') {
      showBeforePhotoOptions();
      return;
    }

    if (nextAction.nextStatus === 'completed') {
      showCompletionPhotoOptions();
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      const updated = await updateWashJobStatus(jobId, authUser.id, nextAction.nextStatus);
      setStatus(updated.status);
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <ScreenLayout title="Update status" subtitle="Keep the owner informed as you work">
      {loading ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <>
          {address ? <Text style={styles.addressText}>{address}</Text> : null}

          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Current status</Text>
            <Text style={styles.statusValue}>
              {status ? STATUS_LABELS[status] : 'Unknown'}
            </Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {nextAction ? (
            <TouchableOpacity
              style={[styles.actionButton, updating && styles.actionButtonDisabled]}
              onPress={handleAdvance}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.actionButtonText}>{nextAction.label}</Text>
              )}
            </TouchableOpacity>
          ) : status === 'completed' || status === 'paid' ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('RateUser', { jobId })}
            >
              <Text style={styles.secondaryButtonText}>Rate owner</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.hintText}>No further status updates for this job.</Text>
          )}
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
  addressText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statusLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statusValue: {
    ...typography.h2,
    color: colors.primary,
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
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
  },
  secondaryButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  hintText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    marginBottom: spacing.md,
  },
});
