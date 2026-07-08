import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AddressInput } from '../../components/AddressInput';
import { ScreenLayout } from '../../components/ScreenLayout';
import { useAuth } from '../../hooks/useAuth';
import { updateOwnerAddress } from '../../services/vehicles';
import { colors, spacing, typography } from '../../theme';
import { getErrorMessage, mapAuthError } from '../../utils/authErrors';
import type { LatLng } from '../../utils/geo';
import type { OwnerStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OwnerStackParamList, 'OwnerAddress'>;

export function OwnerAddressScreen({ navigation }: Props) {
  const { authUser, refreshProfile } = useAuth();

  const [addressText, setAddressText] = useState('');
  const [coordinates, setCoordinates] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    setError(null);

    const trimmed = addressText.trim();
    if (!trimmed) {
      setError('Please enter your default address.');
      return;
    }

    if (!coordinates) {
      setError('Tap "Use my current location" so washers can find you.');
      return;
    }

    if (!authUser) {
      setError('You must be signed in.');
      return;
    }

    setSubmitting(true);
    try {
      await updateOwnerAddress(authUser.id, trimmed, coordinates);
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
      keyboardShouldPersistTaps="handled"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <AddressInput
          address={addressText}
          coordinates={coordinates}
          onAddressChange={setAddressText}
          onCoordinatesChange={setCoordinates}
          placeholder="e.g. 100 Dizengoff St, Tel Aviv"
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
