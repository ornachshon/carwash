import { HeaderBackButton } from '@react-navigation/elements';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme';

export function RoleSelectBackButton() {
  const { returnToRoleSelect } = useAuth();

  return (
    <HeaderBackButton onPress={returnToRoleSelect} tintColor={colors.primary} label="Role" />
  );
}
