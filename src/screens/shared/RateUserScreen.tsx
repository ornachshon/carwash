import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthTextInput } from '../../components/AuthTextInput';
import { ScreenLayout } from '../../components/ScreenLayout';
import { hasRole, useAuth } from '../../hooks/useAuth';
import { fetchRatingContext, submitRating } from '../../services/ratings';
import { colors, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/authErrors';
import type { OwnerStackParamList, WasherStackParamList } from '../../navigation/types';

type RateUserRoute = RouteProp<OwnerStackParamList, 'RateUser'>;

const MAX_COMMENT_LENGTH = 500;

function displayName(fullName: string | null | undefined): string {
  const trimmed = fullName?.trim();
  return trimmed || 'User';
}

function StarRow({ score, onSelect }: { score: number; onSelect: (value: number) => void }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = value <= score;
        return (
          <TouchableOpacity
            key={value}
            style={styles.starButton}
            onPress={() => onSelect(value)}
            accessibilityRole="button"
            accessibilityLabel={`${value} star${value === 1 ? '' : 's'}`}
          >
            <Text style={[styles.star, filled ? styles.starFilled : styles.starEmpty]}>★</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function RateUserScreen() {
  const route = useRoute<RateUserRoute>();
  const navigation =
    useNavigation<NativeStackNavigationProp<OwnerStackParamList & WasherStackParamList>>();
  const { authUser, profile, activeRole } = useAuth();
  const { jobId } = route.params;

  const [rateeName, setRateeName] = useState<string | null>(null);
  const [rateeLabel, setRateeLabel] = useState<'owner' | 'washer' | null>(null);
  const [ratedUserId, setRatedUserId] = useState<string | null>(null);
  const [ratedBy, setRatedBy] = useState<'owner' | 'washer' | null>(null);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exitAfterRating = useCallback(() => {
    if (activeRole === 'washer') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'AvailabilityToggle' }],
      });
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'RequestWash' }],
    });
  }, [activeRole, navigation]);

  useEffect(() => {
    if (!authUser || !hasRole(profile) || !activeRole) {
      setLoading(false);
      setError('You must be signed in with a role to rate this job.');
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const context = await fetchRatingContext(jobId, authUser.id, profile.role);
        if (cancelled) {
          return;
        }
        setRateeName(displayName(context.ratedUser.full_name));
        setRateeLabel(context.rateeLabel);
        setRatedUserId(context.ratedUser.id);
        setRatedBy(context.ratedBy);
      } catch (loadError) {
        if (!cancelled) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser, jobId, profile]);

  const handleSubmit = async () => {
    if (!ratedBy || !ratedUserId) {
      return;
    }

    if (score < 1) {
      setError('Please select a star rating before submitting.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await submitRating({
        jobId,
        ratedBy,
        ratedUserId,
        score,
        comment,
      });
      exitAfterRating();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const title = rateeLabel === 'owner' ? 'Rate the owner' : 'Rate the washer';
  const subtitle =
    rateeName != null
      ? `How was your experience with ${rateeName}?`
      : 'Share feedback about your recent wash.';

  return (
    <ScreenLayout title={title} subtitle={subtitle} scroll keyboardShouldPersistTaps="handled">
      {loading ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <>
          {rateeName ? <Text style={styles.rateeName}>{rateeName}</Text> : null}

          <Text style={styles.sectionLabel}>Your rating</Text>
          <StarRow score={score} onSelect={setScore} />
          <Text style={styles.scoreHint}>{score > 0 ? `${score} out of 5` : 'Tap a star'}</Text>

          <AuthTextInput
            label="Comment (optional)"
            value={comment}
            onChangeText={setComment}
            placeholder="Anything else you'd like to share?"
            multiline
            numberOfLines={4}
            maxLength={MAX_COMMENT_LENGTH}
            style={styles.commentInput}
            autoCapitalize="sentences"
          />
          <Text style={styles.charCount}>
            {comment.length}/{MAX_COMMENT_LENGTH}
          </Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.submitButtonText}>Submit rating</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={exitAfterRating} disabled={submitting}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
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
  rateeName: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  starButton: {
    padding: spacing.xs,
  },
  star: {
    fontSize: 40,
    lineHeight: 44,
  },
  starFilled: {
    color: colors.warning,
  },
  starEmpty: {
    color: colors.border,
  },
  scoreHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  commentInput: {
    minHeight: 112,
    textAlignVertical: 'top',
  },
  charCount: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
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
    marginBottom: spacing.sm,
  },
  submitButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  skipButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
