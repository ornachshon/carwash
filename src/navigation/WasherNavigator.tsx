import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AvailabilityToggleScreen } from '../screens/washer/AvailabilityToggleScreen';
import { NearbyJobsMapScreen } from '../screens/washer/NearbyJobsMapScreen';
import { JobDetailScreen } from '../screens/washer/JobDetailScreen';
import { JobStatusUpdateScreen } from '../screens/washer/JobStatusUpdateScreen';
import { RateUserScreen } from '../screens/shared/RateUserScreen';
import { colors } from '../theme';
import type { WasherStackParamList } from './types';

const Stack = createNativeStackNavigator<WasherStackParamList>();

export function WasherNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="AvailabilityToggle"
        component={AvailabilityToggleScreen}
        options={{ title: 'Go Online' }}
      />
      <Stack.Screen name="NearbyJobsMap" component={NearbyJobsMapScreen} options={{ title: 'Nearby Jobs' }} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: 'Job Detail' }} />
      <Stack.Screen
        name="JobStatusUpdate"
        component={JobStatusUpdateScreen}
        options={{ title: 'Update Status' }}
      />
      <Stack.Screen name="RateUser" component={RateUserScreen} options={{ title: 'Rate Owner' }} />
    </Stack.Navigator>
  );
}
