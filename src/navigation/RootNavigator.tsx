import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { hasRole, useAuth } from '../hooks/useAuth';
import { RoleSelectScreen } from '../screens/auth/RoleSelectScreen';
import { colors } from '../theme';
import { AuthNavigator } from './AuthNavigator';
import { OwnerNavigator } from './OwnerNavigator';
import { WasherNavigator } from './WasherNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { session, profile, loading } = useAuth();

  const navigationKey = session?.user?.id
    ? `${session.user.id}-${profile?.role ?? 'pending'}`
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
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !hasRole(profile) ? (
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
        ) : profile.role === 'washer' ? (
          <Stack.Screen name="Washer" component={WasherNavigator} />
        ) : profile.role === 'owner' ? (
          <Stack.Screen name="Owner" component={OwnerNavigator} />
        ) : (
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
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
