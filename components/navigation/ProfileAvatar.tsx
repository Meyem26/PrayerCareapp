import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type ProfileAvatarProps = {
  displayName?: string | null;
  avatarUrl?: string | null;
  size?: number;
  onPress?: () => void;
};

function getInitials(name?: string | null): string {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export function ProfileAvatar({
  displayName,
  avatarUrl,
  size = 36,
  onPress,
}: ProfileAvatarProps) {
  const content = avatarUrl ? (
    <Image
      source={{ uri: avatarUrl }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  ) : (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{getInitials(displayName)}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: theme.colors.accentDark,
    fontWeight: '600',
  },
});
