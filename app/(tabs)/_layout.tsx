import { Redirect, Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandHeaderTitle } from '@/components/navigation/BrandHeaderTitle';
import { BrandTabIcon } from '@/components/navigation/BrandTabIcon';
import { ProfileMenuButton } from '@/components/navigation/ProfileMenuButton';
import { NotificationBootstrap } from '@/components/notifications/NotificationBootstrap';
import { LoadingScreen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

/** Content height for icon + label (excludes system nav inset). */
const TAB_BAR_CONTENT_HEIGHT = 60;

export default function TabLayout() {
  const { session, isLoading, isProfileLoading, isEmailVerified, needsOnboarding } = useAuth();
  const insets = useSafeAreaInsets();

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

  // Android edge-to-edge draws under the system nav; without this, labels clip in half.
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 0);

  return (
    <>
      <NotificationBootstrap />
      <Tabs
        safeAreaInsets={{ bottom: 0 }}
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
            borderTopWidth: StyleSheet.hairlineWidth,
            height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
            paddingTop: 6,
            paddingBottom: bottomInset,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarItemStyle: {
            paddingTop: 2,
          },
          tabBarIconStyle: {
            marginBottom: 0,
          },
          tabBarActiveTintColor: theme.colors.accentDark,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.2,
            marginTop: 2,
            marginBottom: 0,
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
            tabBarIcon: ({ focused }) => <BrandTabIcon name="pray" focused={focused} />,
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
