import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenLayout } from '../../components/ScreenLayout';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, typography } from '../../theme';
import { mapAuthError } from '../../utils/authErrors';
import type { UserRole } from '../../types/database';

export function RoleSelectScreen() {
  const { selectRole, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<UserRole | null>(null);

  const handleSelect = async (role: UserRole) => {
    setError(null);
    setSubmitting(role);
    try {
      await selectRole(role);
    } catch (err) {
      setError(mapAuthError(err instanceof Error ? err.message : 'Failed to save role.'));
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <ScreenLayout title="Choose your role" subtitle="You can only pick one role per account">
      <View style={styles.options}>
        <RoleCard
          title="Car Owner"
          description="Request a mobile wash at your location"
          loading={submitting === 'owner'}
          disabled={submitting !== null}
          onPress={() => handleSelect('owner')}
        />
        <RoleCard
          title="Washer"
          description="Accept nearby jobs and wash on-site"
          loading={submitting === 'washer'}
          disabled={submitting !== null}
          onPress={() => handleSelect('washer')}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.link} onPress={() => signOut()}>
        <Text style={styles.linkText}>Sign out</Text>
      </TouchableOpacity>
    </ScreenLayout>
  );
}

function RoleCard({
  title,
  description,
  loading,
  disabled,
  onPress,
}: {
  title: string;
  description: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, disabled && !loading && styles.cardDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDesc}>{description}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: spacing.md,
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 88,
    justifyContent: 'center',
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  error: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  link: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  linkText: {
    ...typography.body,
    color: colors.primary,
  },
});
