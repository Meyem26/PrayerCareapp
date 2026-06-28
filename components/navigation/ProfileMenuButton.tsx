import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProfileAvatar } from '@/components/navigation/ProfileAvatar';
import { AppText } from '@/components/ui/AppText';
import { useAuth } from '@/contexts/AuthContext';
import { BETA_MODE } from '@/constants/beta';
import { theme } from '@/constants/theme';

type MenuItem = {
  label: string;
  route: '/(more)/profile' | '/(more)/settings' | '/(more)/sermon-notes' | '/(more)/analytics';
};

const MENU_ITEMS: MenuItem[] = [
  { label: 'Profile', route: '/(more)/profile' },
  { label: 'Settings', route: '/(more)/settings' },
  { label: 'Sermon Notes', route: '/(more)/sermon-notes' },
  { label: 'Analytics', route: '/(more)/analytics' },
];

export function ProfileMenuButton() {
  const { profile, signOut } = useAuth();
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();

  function navigate(route: MenuItem['route']) {
    setVisible(false);
    router.push(route);
  }

  async function handleSignOut() {
    setVisible(false);
    await signOut();
    router.replace('/(auth)/login');
  }

  return (
    <>
      <ProfileAvatar
        displayName={profile?.display_name}
        avatarUrl={profile?.avatar_url}
        size={36}
        onPress={() => setVisible(true)}
      />

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <View style={[styles.menu, { top: insets.top + theme.spacing.md }]}>
            <View style={styles.menuHeader}>
              <ProfileAvatar
                displayName={profile?.display_name}
                avatarUrl={profile?.avatar_url}
                size={48}
              />
              <View style={styles.menuHeaderText}>
                <AppText style={styles.menuName}>{profile?.display_name ?? 'Your profile'}</AppText>
                <AppText variant="bodySmall" muted>
                  PrayerCare{BETA_MODE ? ' · Beta' : ''}
                </AppText>
              </View>
            </View>

            <View style={styles.menuItems}>
              {MENU_ITEMS.map((item) => (
                <Pressable
                  key={item.route}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                  onPress={() => navigate(item.route)}>
                  <AppText>{item.label}</AppText>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [styles.signOut, pressed && styles.menuItemPressed]}
              onPress={handleSignOut}>
              <AppText style={styles.signOutText}>Sign Out</AppText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(42, 42, 42, 0.25)',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.lg,
  },
  menu: {
    position: 'absolute',
    right: theme.spacing.lg,
    width: 260,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  menuHeaderText: {
    flex: 1,
    gap: 2,
  },
  menuName: {
    fontWeight: '600',
  },
  menuItems: {
    paddingVertical: theme.spacing.xs,
  },
  menuItem: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  menuItemPressed: {
    backgroundColor: theme.colors.accentLight,
  },
  signOut: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  signOutText: {
    color: theme.colors.error,
  },
});
