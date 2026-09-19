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

/**
 * Space for icon + label (excludes system / home-indicator inset).
 * Tall enough that labels are not clipped on iOS, Android, or web.
 */
const TAB_BAR_CONTENT_HEIGHT = Platform.select({ web: 64, default: 56 }) ?? 56;
const TAB_ICON_SIZE = 22;

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

  // Always leave room under the labels (home indicator, Android nav, mobile browser chrome).
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 12);

  const isWeb = Platform.OS === 'web';

  return (
    <>
      <NotificationBootstrap />
      <Tabs
        safeAreaInsets={{ bottom: 0 }}
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.colors.background,
            ...(isWeb ? { height: 56 } : null),
          },
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
          tabBarShowLabel: true,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
            paddingTop: 4,
            paddingBottom: bottomInset,
            elevation: 0,
            shadowOpacity: 0,
            overflow: 'visible',
          },
          tabBarItemStyle: {
            paddingTop: 2,
            paddingBottom: 0,
            justifyContent: 'center',
          },
          tabBarIconStyle: {
            marginTop: 0,
            marginBottom: 0,
          },
          tabBarActiveTintColor: theme.colors.accentDark,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            lineHeight: 14,
            fontWeight: '600',
            letterSpacing: 0.2,
            marginTop: 2,
            marginBottom: 0,
            // Android otherwise adds extra font padding that clips labels in a fixed-height bar.
            includeFontPadding: false,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Today',
            headerLeft: () => <BrandHeaderTitle title="Today" />,
            tabBarLabel: 'Today',
            tabBarIcon: ({ focused }) => (
              <BrandTabIcon name="today" focused={focused} size={TAB_ICON_SIZE} />
            ),
          }}
        />
        <Tabs.Screen
          name="pray"
          options={{
            title: 'Pray',
            headerLeft: () => <BrandHeaderTitle title="Pray" />,
            tabBarLabel: 'Pray',
            tabBarIcon: ({ focused }) => (
              <BrandTabIcon name="pray" focused={focused} size={TAB_ICON_SIZE} />
            ),
          }}
        />
        <Tabs.Screen
          name="groups"
          options={{
            title: 'Groups',
            headerLeft: () => <BrandHeaderTitle title="Groups" />,
            tabBarLabel: 'Groups',
            tabBarIcon: ({ focused }) => (
              <BrandTabIcon name="groups" focused={focused} size={TAB_ICON_SIZE} />
            ),
          }}
        />
        <Tabs.Screen
          name="journey"
          options={{
            title: 'Journey',
            headerLeft: () => <BrandHeaderTitle title="Journey" />,
            tabBarLabel: 'Journey',
            tabBarIcon: ({ focused }) => (
              <BrandTabIcon name="journey" focused={focused} size={TAB_ICON_SIZE} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
