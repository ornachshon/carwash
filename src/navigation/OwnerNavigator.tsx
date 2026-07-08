import { HeaderBackButton } from '@react-navigation/elements';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RoleSelectBackButton } from '../components/RoleSelectBackButton';
import { AddVehicleScreen } from '../screens/owner/AddVehicleScreen';
import { OwnerAddressScreen } from '../screens/owner/OwnerAddressScreen';
import { RequestWashScreen } from '../screens/owner/RequestWashScreen';
import { OwnerJobStatusScreen } from '../screens/owner/JobStatusScreen';
import { RateUserScreen } from '../screens/shared/RateUserScreen';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme';
import type { OwnerStackParamList } from './types';

const Stack = createNativeStackNavigator<OwnerStackParamList>();

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

export function OwnerNavigator() {
  const { profile, activeRole } = useAuth();

  if (activeRole !== 'owner') {
    return null;
  }

  const needsAddress = !profile?.address_text?.trim();

  return (
    <Stack.Navigator
      initialRouteName={needsAddress ? 'OwnerAddress' : 'RequestWash'}
      screenOptions={screenOptions}
    >
      <Stack.Screen
        name="OwnerAddress"
        component={OwnerAddressScreen}
        options={({ navigation }) => ({ title: 'Your Address', ...stackBackOrRoleSelect({ navigation }) })}
      />
      <Stack.Screen
        name="AddVehicle"
        component={AddVehicleScreen}
        options={({ navigation }) => ({ title: 'Add Vehicle', ...stackBackOrRoleSelect({ navigation }) })}
      />
      <Stack.Screen
        name="RequestWash"
        component={RequestWashScreen}
        options={({ navigation }) => ({ title: 'Request Wash', ...stackBackOrRoleSelect({ navigation }) })}
      />
      <Stack.Screen
        name="JobStatus"
        component={OwnerJobStatusScreen}
        options={({ navigation }) => ({ title: 'Job Status', ...stackBackOrRoleSelect({ navigation }) })}
      />
      <Stack.Screen
        name="RateUser"
        component={RateUserScreen}
        options={({ navigation }) => ({ title: 'Rate Washer', ...stackBackOrRoleSelect({ navigation }) })}
      />
    </Stack.Navigator>
  );
}
