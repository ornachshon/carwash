import { HeaderBackButton } from '@react-navigation/elements';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RoleSelectBackButton } from '../components/RoleSelectBackButton';
import { AvailabilityToggleScreen } from '../screens/washer/AvailabilityToggleScreen';
import { NearbyJobsMapScreen } from '../screens/washer/NearbyJobsMapScreen';
import { JobDetailScreen } from '../screens/washer/JobDetailScreen';
import { JobStatusUpdateScreen } from '../screens/washer/JobStatusUpdateScreen';
import { RateUserScreen } from '../screens/shared/RateUserScreen';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme';
import type { WasherStackParamList } from './types';

const Stack = createNativeStackNavigator<WasherStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.primary,
  headerTitleStyle: { color: colors.text },
  contentStyle: { backgroundColor: colors.background },
};

function stackBackOrRoleSelect({ navigation }: { navigation: { canGoBack: () => boolean; goBack: () => void } }) {
  return {
    headerLeft: () =>
      navigation.canGoBack() ? (
        <HeaderBackButton onPress={() => navigation.goBack()} tintColor={colors.primary} />
      ) : (
        <RoleSelectBackButton />
      ),
  };
}

export function WasherNavigator() {
  const { activeRole } = useAuth();

  if (activeRole !== 'washer') {
    return null;
  }

  return (
    <Stack.Navigator initialRouteName="AvailabilityToggle" screenOptions={screenOptions}>
      <Stack.Screen
        name="AvailabilityToggle"
        component={AvailabilityToggleScreen}
        options={({ navigation }) => ({ title: 'Go Online', ...stackBackOrRoleSelect({ navigation }) })}
      />
      <Stack.Screen
        name="NearbyJobsMap"
        component={NearbyJobsMapScreen}
        options={({ navigation }) => ({ title: 'Nearby Jobs', ...stackBackOrRoleSelect({ navigation }) })}
      />
      <Stack.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={({ navigation }) => ({ title: 'Job Detail', ...stackBackOrRoleSelect({ navigation }) })}
      />
      <Stack.Screen
        name="JobStatusUpdate"
        component={JobStatusUpdateScreen}
        options={({ navigation }) => ({ title: 'Update Status', ...stackBackOrRoleSelect({ navigation }) })}
      />
      <Stack.Screen
        name="RateUser"
        component={RateUserScreen}
        options={({ navigation }) => ({ title: 'Rate Owner', ...stackBackOrRoleSelect({ navigation }) })}
      />
    </Stack.Navigator>
  );
}
