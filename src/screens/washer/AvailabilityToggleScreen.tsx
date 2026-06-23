import { StyleSheet, Text, View } from 'react-native';
import { SignOutButton } from '../../components/SignOutButton';
import { ScreenLayout } from '../../components/ScreenLayout';
import { colors, spacing, typography } from '../../theme';

export function AvailabilityToggleScreen() {
  return (
    <ScreenLayout title="Availability" subtitle="Go online to receive nearby job requests">
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Toggle available / offline + update location</Text>
      </View>
      <SignOutButton />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
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
