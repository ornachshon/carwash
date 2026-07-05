import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AddVehicleScreen } from '../screens/owner/AddVehicleScreen';
import { OwnerAddressScreen } from '../screens/owner/OwnerAddressScreen';
import { RequestWashScreen } from '../screens/owner/RequestWashScreen';
import { OwnerJobStatusScreen } from '../screens/owner/JobStatusScreen';
import { RateUserScreen } from '../screens/shared/RateUserScreen';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme';
import type { OwnerStackParamList } from './types';

const Stack = createNativeStackNavigator<OwnerStackParamList>();

export function OwnerNavigator() {
  const { profile } = useAuth();

  if (profile?.role !== 'owner') {
    return null;
  }

  const needsAddress = !profile.address_text?.trim();

  return (
    <Stack.Navigator
      initialRouteName={needsAddress ? 'OwnerAddress' : 'RequestWash'}
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="OwnerAddress"
        component={OwnerAddressScreen}
        options={{ title: 'Your Address' }}
      />
      <Stack.Screen name="AddVehicle" component={AddVehicleScreen} options={{ title: 'Add Vehicle' }} />
      <Stack.Screen name="RequestWash" component={RequestWashScreen} options={{ title: 'Request Wash' }} />
      <Stack.Screen name="JobStatus" component={OwnerJobStatusScreen} options={{ title: 'Job Status' }} />
      <Stack.Screen name="RateUser" component={RateUserScreen} options={{ title: 'Rate Washer' }} />
    </Stack.Navigator>
  );
}
