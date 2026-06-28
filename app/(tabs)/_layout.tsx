import { Redirect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import { ProfileMenuButton } from '@/components/navigation/ProfileMenuButton';
import { NotificationBootstrap } from '@/components/notifications/NotificationBootstrap';
import { LoadingScreen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const { session, isLoading, isProfileLoading, isEmailVerified, needsOnboarding } = useAuth();

  if (isLoading || isProfileLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!isEmailVerified) {
    return <Redirect href="/(auth)/verify-email" />;
  }

  if (needsOnboarding) {
    return <Redirect href="/(onboarding)" />;
  }

  return (
    <>
      <NotificationBootstrap />
      <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.background },
        headerTitleStyle: {
          color: theme.colors.text,
          fontSize: 17,
          fontWeight: '600',
        },
        headerShadowVisible: false,
        headerRight: () => (
          <ProfileMenuButton />
        ),
        headerRightContainerStyle: {
          paddingRight: theme.spacing.md,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarLabel: 'Today',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'sun.max', android: 'wb_sunny', web: 'wb_sunny' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="pray"
        options={{
          title: 'Pray',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'hands.sparkles',
                android: 'volunteer_activism',
                web: 'volunteer_activism',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'person.3', android: 'groups', web: 'groups' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="journey"
        options={{
          title: 'Journey',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'point.bottomleft.forward.to.point.topright.scurvepath',
                android: 'timeline',
                web: 'timeline',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
    </>
  );
}
