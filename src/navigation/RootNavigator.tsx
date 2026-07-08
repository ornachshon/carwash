import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { RoleSelectScreen } from '../screens/auth/RoleSelectScreen';
import { colors } from '../theme';
import { AuthNavigator } from './AuthNavigator';
import { OwnerNavigator } from './OwnerNavigator';
import { WasherNavigator } from './WasherNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const headerOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.primary,
  headerTitleStyle: { color: colors.text },
};

export function RootNavigator() {
  const { session, activeRole, loading } = useAuth();

  const navigationKey = session?.user?.id
    ? `${session.user.id}-${activeRole ?? 'choose-role'}`
    : 'signed-out';

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer key={navigationKey}>
      <Stack.Navigator screenOptions={{ ...headerOptions, contentStyle: { backgroundColor: colors.background } }}>
        {!session ? (
          <Stack.Screen name="Auth" component={AuthNavigator} options={{ headerShown: false }} />
        ) : activeRole !== 'owner' && activeRole !== 'washer' ? (
          <Stack.Screen
            name="RoleSelect"
            component={RoleSelectScreen}
            options={{ title: 'Choose role', headerBackVisible: false }}
          />
        ) : activeRole === 'owner' ? (
          <Stack.Screen name="Owner" component={OwnerNavigator} options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="Washer" component={WasherNavigator} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
