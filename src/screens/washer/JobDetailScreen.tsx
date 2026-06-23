import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenLayout } from '../../components/ScreenLayout';
import { colors, spacing, typography } from '../../theme';
import type { WasherStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<WasherStackParamList, 'JobDetail'>;

export function JobDetailScreen({ route }: Props) {
  return (
    <ScreenLayout title="Job detail" subtitle={`Job ID: ${route.params.jobId}`} scroll>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Vehicle info, address, price, accept button</Text>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    minHeight: 200,
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
