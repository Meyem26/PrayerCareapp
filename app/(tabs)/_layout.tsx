import { Redirect, Tabs } from 'expo-router';

import { BrandHeaderTitle } from '@/components/navigation/BrandHeaderTitle';
import { BrandTabIcon } from '@/components/navigation/BrandTabIcon';
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
          headerShadowVisible: false,
          headerTitle: () => null,
          headerLeftContainerStyle: {
            paddingLeft: theme.spacing.md,
            flex: 1,
          },
          headerRight: () => <ProfileMenuButton />,
          headerRightContainerStyle: {
            paddingRight: theme.spacing.md,
          },
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            paddingTop: 6,
          },
          tabBarActiveTintColor: theme.colors.accentDark,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Today',
            headerLeft: () => <BrandHeaderTitle title="Today" />,
            tabBarLabel: 'Today',
            tabBarIcon: ({ focused }) => <BrandTabIcon name="today" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="pray"
          options={{
            title: 'Pray',
            headerLeft: () => <BrandHeaderTitle title="Pray" />,
            tabBarIcon: ({ focused }) => <BrandTabIcon name="pray" focused={focused} size={28} />,
          }}
        />
        <Tabs.Screen
          name="groups"
          options={{
            title: 'Groups',
            headerLeft: () => <BrandHeaderTitle title="Groups" />,
            tabBarIcon: ({ focused }) => <BrandTabIcon name="groups" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="journey"
          options={{
            title: 'Journey',
            headerLeft: () => <BrandHeaderTitle title="Journey" />,
            tabBarIcon: ({ focused }) => <BrandTabIcon name="journey" focused={focused} />,
          }}
        />
      </Tabs>
    </>
  );
}
