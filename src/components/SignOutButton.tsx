import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { colors, spacing, typography } from '../theme';

export function SignOutButton() {
  const { signOut } = useAuth();

  return (
    <TouchableOpacity style={styles.button} onPress={() => signOut()}>
      <Text style={styles.text}>Sign out</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    padding: spacing.md,
  },
  text: {
    ...typography.body,
    color: colors.primary,
  },
});
