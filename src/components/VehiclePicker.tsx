import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '../theme';
import type { Vehicle } from '../types/database';

interface VehiclePickerProps {
  vehicles: Vehicle[];
  selectedId: string | null;
  onSelect: (vehicleId: string) => void;
}

export function VehiclePicker({ vehicles, selectedId, onSelect }: VehiclePickerProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Vehicle</Text>
      {vehicles.map((vehicle) => {
        const selected = vehicle.id === selectedId;
        return (
          <TouchableOpacity
            key={vehicle.id}
            style={[styles.card, selected && styles.cardSelected]}
            onPress={() => onSelect(vehicle.id)}
          >
            {vehicle.photo_url ? (
              <Image source={{ uri: vehicle.photo_url }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>No photo</Text>
              </View>
            )}
            <View style={styles.details}>
              <Text style={[styles.title, selected && styles.titleSelected]}>
                {vehicle.make} {vehicle.model}
              </Text>
              <Text style={[styles.meta, selected && styles.metaSelected]}>
                {vehicle.color ? `${vehicle.color} · ` : ''}
                {vehicle.license_plate ?? 'No plate'} · {vehicle.size_category}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#E0F2FE',
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  photoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  details: {
    flex: 1,
  },
  title: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  titleSelected: {
    color: colors.primaryDark,
  },
  meta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  metaSelected: {
    color: colors.text,
  },
});
