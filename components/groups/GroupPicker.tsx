import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { OptionCard } from '@/components/ui/OptionCard';
import { theme } from '@/constants/theme';
import type { GroupWithMeta } from '@/types/group';

type GroupPickerProps = {
  groups: GroupWithMeta[];
  value: string | null;
  onChange: (groupId: string | null) => void;
};

export function GroupPicker({ groups, value, onChange }: GroupPickerProps) {
  if (groups.length === 0) {
    return (
      <AppText variant="bodySmall" muted>
        You have no groups yet. Create one from the Groups tab to share prayers.
      </AppText>
    );
  }

  return (
    <View style={styles.wrapper}>
      {groups.map((group) => (
        <OptionCard
          key={group.id}
          label={group.name}
          description={group.description ?? 'Share with this group'}
          selected={value === group.id}
          onPress={() => onChange(group.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.sm,
  },
});
