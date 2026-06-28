import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OptionCard } from '@/components/ui/OptionCard';
import { theme } from '@/constants/theme';
import { createGroup } from '@/lib/api/groups';
import type { GroupWithMeta } from '@/types/group';

type ShareWithGroupPickerProps = {
  groups: GroupWithMeta[];
  value: string | null;
  onChange: (groupId: string | null) => void;
  onGroupCreated: (group: GroupWithMeta) => void;
  creatorKeepsPersonal?: boolean;
  onCreatorKeepsPersonalChange?: (value: boolean) => void;
};

export function ShareWithGroupPicker({
  groups,
  value,
  onChange,
  onGroupCreated,
  creatorKeepsPersonal = true,
  onCreatorKeepsPersonalChange,
}: ShareWithGroupPickerProps) {
  const [mode, setMode] = useState<'pick' | 'create'>(groups.length === 0 ? 'create' : 'pick');
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateGroup() {
    setError(null);

    if (!newGroupName.trim()) {
      setError('Please enter a name for your new group.');
      return;
    }

    setCreating(true);
    const { data, error: createError } = await createGroup(newGroupName);
    setCreating(false);

    if (createError || !data) {
      setError(createError ?? 'Could not create group.');
      return;
    }

    const group: GroupWithMeta = { ...data, my_role: 'admin' };
    onGroupCreated(group);
    onChange(group.id);
    setMode('pick');
    setNewGroupName('');
  }

  return (
    <View style={styles.wrapper}>
      <AppText variant="bodySmall" muted>
        Choose a group or create one now — members will see this prayer on their Today list.
      </AppText>

      {groups.length > 0 ? (
        <View style={styles.options}>
          {groups.map((group) => (
            <OptionCard
              key={group.id}
              label={group.name}
              description={group.description ?? 'Share with this group'}
              selected={value === group.id && mode === 'pick'}
              onPress={() => {
                setMode('pick');
                setError(null);
                onChange(group.id);
              }}
            />
          ))}
        </View>
      ) : null}

      <OptionCard
        label="Create new group"
        description="Start a private group right now"
        selected={mode === 'create'}
        onPress={() => {
          setMode('create');
          setError(null);
          onChange(null);
        }}
      />

      {mode === 'create' ? (
        <View style={styles.createBox}>
          <Input
            label="New group name"
            value={newGroupName}
            onChangeText={setNewGroupName}
            placeholder="Women's Ministry, Care Team..."
          />
          {error ? <AppText style={styles.error}>{error}</AppText> : null}
          <Button
            title="Create & select group"
            loading={creating}
            onPress={handleCreateGroup}
          />
        </View>
      ) : null}

      {(value && mode === 'pick') || mode === 'create' ? (
        <View style={styles.listChoice}>
          <AppText variant="label">Where should this appear for you?</AppText>
          <OptionCard
            label="Keep on my Today list too"
            description="You and group members both see it on Today"
            selected={creatorKeepsPersonal}
            onPress={() => onCreatorKeepsPersonalChange?.(true)}
          />
          <OptionCard
            label="Group list only"
            description="Only in the group — not on your personal Today list"
            selected={!creatorKeepsPersonal}
            onPress={() => onCreatorKeepsPersonalChange?.(false)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  options: {
    gap: theme.spacing.sm,
  },
  createBox: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  error: {
    color: theme.colors.error,
  },
  listChoice: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
});
