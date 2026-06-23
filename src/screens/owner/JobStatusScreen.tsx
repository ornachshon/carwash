import { Platform, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenLayout } from '../../components/ScreenLayout';
import { colors, spacing, typography } from '../../theme';
import type { OwnerStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OwnerStackParamList, 'JobStatus'>;

export function OwnerJobStatusScreen({ route }: Props) {
  const jobId = route.params?.jobId;

  return (
    <ScreenLayout title="Job status" subtitle="Live updates via Supabase Realtime">
      {jobId ? (
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>Request sent</Text>
          <Text style={styles.successBody}>
            Your wash request was submitted. We will notify you when a washer accepts it.
          </Text>
          <Text style={styles.jobIdLabel}>Job ID</Text>
          <Text style={styles.jobId}>{jobId}</Text>
        </View>
      ) : null}
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Status timeline: requested → accepted → en route → in progress → completed
        </Text>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  successCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.h3,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  successBody: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.md,
  },
  jobIdLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  jobId: {
    ...typography.bodySmall,
    color: colors.text,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  placeholderText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
