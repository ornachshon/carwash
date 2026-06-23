import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthTextInput } from '../../components/AuthTextInput';
import { ScreenLayout } from '../../components/ScreenLayout';
import { useAuth } from '../../hooks/useAuth';
import { updateOwnerAddress } from '../../services/vehicles';
import { colors, spacing, typography } from '../../theme';
import { getErrorMessage, mapAuthError } from '../../utils/authErrors';
import type { OwnerStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OwnerStackParamList, 'OwnerAddress'>;

export function OwnerAddressScreen({ navigation }: Props) {
  const { authUser, refreshProfile } = useAuth();
  const [addressText, setAddressText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    setError(null);

    if (!addressText.trim()) {
      setError('Please enter your default address.');
      return;
    }

    if (!authUser) {
      setError('You must be signed in.');
      return;
    }

    setSubmitting(true);
    try {
      await updateOwnerAddress(authUser.id, addressText.trim());
      await refreshProfile();
      navigation.replace('AddVehicle');
    } catch (err) {
      const raw = getErrorMessage(err);
      console.error('[OwnerAddressScreen] save failed:', raw, err);
      setError(mapAuthError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenLayout
      title="Your address"
      subtitle="Used as the default location for wash requests. You can change this later."
      scroll
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <AuthTextInput
          label="Default address"
          value={addressText}
          onChangeText={setAddressText}
          placeholder="e.g. 123 Main St, Tel Aviv"
          multiline
          numberOfLines={3}
          style={styles.addressInput}
          autoCapitalize="sentences"
        />
        {error ? <Text style={styles.formError}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  addressInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  formError: {
    ...typography.bodySmall,
    color: colors.error,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});
