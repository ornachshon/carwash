import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthTextInput } from '../../components/AuthTextInput';
import { ScreenLayout } from '../../components/ScreenLayout';
import { SizeCategoryPicker } from '../../components/SizeCategoryPicker';
import { SignOutButton } from '../../components/SignOutButton';
import { useAuth } from '../../hooks/useAuth';
import { createVehicle } from '../../services/vehicles';
import { colors, spacing, typography } from '../../theme';
import type { VehicleSizeCategory } from '../../types/database';
import { getErrorMessage, mapAuthError } from '../../utils/authErrors';
import type { OwnerStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OwnerStackParamList, 'AddVehicle'>;

export function AddVehicleScreen({ navigation }: Props) {
  const { authUser } = useAuth();
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [sizeCategory, setSizeCategory] = useState<VehicleSizeCategory>('sedan');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const formatPickerError = (err: unknown): string => {
    if (err instanceof Error) {
      const parts = [err.name, err.message].filter(Boolean);
      if (err.stack) {
        parts.push(err.stack);
      }
      return parts.join('\n');
    }
    if (typeof err === 'object' && err !== null) {
      try {
        return JSON.stringify(err, null, 2);
      } catch {
        return String(err);
      }
    }
    return String(err);
  };

  const pickImage = async (source: 'library' | 'camera') => {
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
          setPhotoUri(result.assets[0].uri);
        }
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Photo library permission is required to pick an image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      const message = formatPickerError(err);
      console.error('[AddVehicleScreen] image picker failed:', message, err);
      setError(`Image picker error:\n${message}`);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!make.trim() || !model.trim() || !color.trim() || !licensePlate.trim()) {
      setError('Please fill in make, model, color, and license plate.');
      return;
    }

    if (!authUser) {
      setError('You must be signed in.');
      return;
    }

    setSubmitting(true);
    try {
      await createVehicle({
        ownerId: authUser.id,
        make: make.trim(),
        model: model.trim(),
        color: color.trim(),
        licensePlate: licensePlate.trim(),
        sizeCategory,
        photoUri,
      });
      navigation.replace('RequestWash');
    } catch (err) {
      const raw = getErrorMessage(err);
      console.error('[AddVehicleScreen] save failed:', raw, err);
      setError(mapAuthError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert('Vehicle photo', 'Choose a source', [
      { text: 'Take photo', onPress: () => void pickImage('camera') },
      { text: 'Choose from gallery', onPress: () => void pickImage('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <ScreenLayout title="Add vehicle" subtitle="Save your car details for faster booking" scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <AuthTextInput label="Make" value={make} onChangeText={setMake} autoCapitalize="words" />
        <AuthTextInput label="Model" value={model} onChangeText={setModel} autoCapitalize="words" />
        <AuthTextInput label="Color" value={color} onChangeText={setColor} autoCapitalize="words" />
        <AuthTextInput
          label="License plate"
          value={licensePlate}
          onChangeText={setLicensePlate}
          autoCapitalize="characters"
        />
        <SizeCategoryPicker value={sizeCategory} onChange={setSizeCategory} />

        <Text style={styles.label}>Photo</Text>
        {photoUri ? (
          <View style={styles.photoPreviewWrap}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            <TouchableOpacity onPress={showPhotoOptions}>
              <Text style={styles.linkText}>Change photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.photoButton} onPress={showPhotoOptions}>
            <Text style={styles.photoButtonText}>Add photo (camera or gallery)</Text>
          </TouchableOpacity>
        )}

        {error ? <Text style={styles.formError}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.buttonText}>Save vehicle</Text>
          )}
        </TouchableOpacity>
        <SignOutButton />
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  photoButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  photoButtonText: {
    ...typography.body,
    color: colors.primary,
  },
  photoPreviewWrap: {
    marginBottom: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  linkText: {
    ...typography.body,
    color: colors.primary,
  },
  formError: {
    ...typography.bodySmall,
    color: colors.error,
    marginBottom: spacing.md,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.md,
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
