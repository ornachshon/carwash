import { StyleSheet, Text, View } from 'react-native';
import { ScreenLayout } from '../../components/ScreenLayout';
import { colors, spacing, typography } from '../../theme';

export function NearbyJobsMapScreen() {
  return (
    <ScreenLayout title="Nearby jobs" subtitle="Requested washes within your service radius">
      <View style={styles.mapPlaceholder}>
        <Text style={styles.placeholderText}>react-native-maps — job pins go here</Text>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 300,
  },
  placeholderText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
