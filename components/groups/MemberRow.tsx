import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';
import type { GroupMember, GroupMemberRole } from '@/types/group';

type MemberRowProps = {
  member: GroupMember;
  isSelf: boolean;
  canManage: boolean;
  onPromote?: () => void;
  onRemove?: () => void;
};

function roleLabel(role: GroupMemberRole): string {
  if (role === 'admin') return 'Admin';
  if (role === 'leader') return 'Leader';
  return 'Member';
}

export function MemberRow({ member, isSelf, canManage, onPromote, onRemove }: MemberRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <AppText style={styles.name}>
          {member.display_name ?? 'Member'}
          {isSelf ? ' (you)' : ''}
        </AppText>
        <AppText variant="bodySmall" muted>
          {roleLabel(member.role)}
        </AppText>
      </View>
      {canManage && !isSelf && member.role === 'member' ? (
        <View style={styles.actions}>
          {onPromote ? (
            <Pressable onPress={onPromote} style={styles.actionBtn}>
              <AppText variant="bodySmall" accent>
                Make leader
              </AppText>
            </Pressable>
          ) : null}
          {onRemove ? (
            <Pressable onPress={onRemove} style={styles.actionBtn}>
              <AppText variant="bodySmall" style={styles.remove}>
                Remove
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontWeight: '500',
  },
  actions: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
  },
  actionBtn: {
    paddingVertical: theme.spacing.xs,
  },
  remove: {
    color: theme.colors.error,
  },
});
