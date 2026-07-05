import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenLayout } from '../../components/ScreenLayout';
import { fetchJobStatusHistory, fetchOwnerJobStatus, type OwnerJobStatusDetail } from '../../services/ownerJobs';
import { supabase } from '../../services/supabase';
import { colors, spacing, typography } from '../../theme';
import type { JobStatusHistory, WashJobStatus } from '../../types/database';
import { getErrorMessage } from '../../utils/authErrors';
import { formatStatusTimestamp, STATUS_COLORS, STATUS_LABELS } from '../../utils/jobStatus';
import type { OwnerStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OwnerStackParamList, 'JobStatus'>;

function displayName(fullName: string | null | undefined): string {
  return fullName?.trim() || 'Your washer';
}

export function OwnerJobStatusScreen({ route, navigation }: Props) {
  const jobId = route.params?.jobId;
  const [job, setJob] = useState<OwnerJobStatusDetail | null>(null);
  const [history, setHistory] = useState<JobStatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJob = useCallback(async () => {
    if (!jobId) {
      return;
    }

    setError(null);
    try {
      const [jobRow, historyRows] = await Promise.all([
        fetchOwnerJobStatus(jobId),
        fetchJobStatusHistory(jobId),
      ]);
      setJob(jobRow);
      setHistory(historyRows);
      if (!jobRow) {
        setError('Job not found.');
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    loadJob().finally(() => setLoading(false));
  }, [jobId, loadJob]);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    const channel = supabase
      .channel(`owner-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wash_jobs',
          filter: `id=eq.${jobId}`,
        },
        async () => {
          try {
            const jobRow = await fetchOwnerJobStatus(jobId);
            if (jobRow) {
              setJob(jobRow);
            }
          } catch (realtimeError) {
            console.error('[OwnerJobStatusScreen] job realtime refresh failed:', realtimeError);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_status_history',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const row = payload.new as JobStatusHistory;
          setHistory((current) => {
            if (current.some((item) => item.id === row.id)) {
              return current;
            }
            return [...current, row].sort(
              (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime(),
            );
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [jobId]);

  const status = job?.status ?? 'requested';
  const statusColor = STATUS_COLORS[status as WashJobStatus] ?? colors.textSecondary;
  const showWasher = status !== 'requested' && job?.washer;
  const showCompletionPhoto =
    (status === 'completed' || status === 'paid') && !!job?.completion_photo_url;
  const showRateButton = status === 'completed' || status === 'paid';

  const timeline = useMemo(() => history, [history]);

  if (!jobId) {
    return (
      <ScreenLayout title="Job status" subtitle="Live updates via Supabase Realtime">
        <Text style={styles.errorText}>Missing job ID.</Text>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Job status" subtitle="Live updates via Supabase Realtime" scroll>
      {loading ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={[styles.statusCard, { borderColor: statusColor }]}>
            <Text style={styles.statusLabel}>Current status</Text>
            <Text style={[styles.statusValue, { color: statusColor }]}>
              {STATUS_LABELS[status as WashJobStatus] ?? status}
            </Text>
            {job?.address_text ? <Text style={styles.addressText}>{job.address_text}</Text> : null}
          </View>

          {showWasher ? (
            <View style={styles.washerCard}>
              <Text style={styles.sectionTitle}>Your washer</Text>
              <Text style={styles.washerName}>{displayName(job?.washer?.full_name)}</Text>
              {job?.washer?.phone ? (
                <TouchableOpacity onPress={() => void Linking.openURL(`tel:${job.washer?.phone}`)}>
                  <Text style={styles.washerPhone}>{job.washer.phone}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.washerPhoneMuted}>Phone not provided</Text>
              )}
            </View>
          ) : null}

          {showCompletionPhoto ? (
            <View style={styles.completionCard}>
              <Text style={styles.sectionTitle}>Your car has been washed ✓</Text>
              <Image source={{ uri: job!.completion_photo_url! }} style={styles.completionPhoto} />
            </View>
          ) : null}

          <View style={styles.timelineCard}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            {timeline.length === 0 ? (
              <Text style={styles.emptyTimeline}>Waiting for status updates…</Text>
            ) : (
              timeline.map((entry, index) => (
                <View key={entry.id} style={styles.timelineRow}>
                  <View style={styles.timelineMarkerCol}>
                    <View
                      style={[
                        styles.timelineDot,
                        { backgroundColor: STATUS_COLORS[entry.status] ?? colors.border },
                      ]}
                    />
                    {index < timeline.length - 1 ? <View style={styles.timelineLine} /> : null}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>{STATUS_LABELS[entry.status]}</Text>
                    <Text style={styles.timelineTime}>{formatStatusTimestamp(entry.changed_at)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {showRateButton ? (
            <TouchableOpacity
              style={styles.rateButton}
              onPress={() => navigation.navigate('RateUser', { jobId })}
            >
              <Text style={styles.rateButtonText}>Rate your washer</Text>
            </TouchableOpacity>
          ) : null}
        </>
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
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 2,
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
    marginBottom: spacing.sm,
  },
  addressText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  washerCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  washerName: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  washerPhone: {
    ...typography.body,
    color: colors.primary,
  },
  washerPhoneMuted: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  completionCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  completionPhoto: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  emptyTimeline: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineMarkerCol: {
    width: 16,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    minHeight: 24,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  timelineLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  timelineTime: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  rateButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  rateButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    marginBottom: spacing.md,
  },
});
