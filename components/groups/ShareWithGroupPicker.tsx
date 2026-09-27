import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SelectField } from '@/components/ui/SelectField';
import { groupVisibilityOptions, toGroupVisibility } from '@/constants/prayer-visibility';
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
  /** Hide the "who should see it" selector when a later step asks it instead. */
  showVisibility?: boolean;
};

function groupDescription(group: GroupWithMeta): string | undefined {
  if (group.member_count) {
    return `${group.member_count} member${group.member_count === 1 ? '' : 's'}`;
  }
  return group.description ?? undefined;
}

export function ShareWithGroupPicker({
  groups,
  value,
  onChange,
  onGroupCreated,
  creatorKeepsPersonal = true,
  onCreatorKeepsPersonalChange,
  showVisibility = true,
}: ShareWithGroupPickerProps) {
  const [creating, setCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showCreate = creating || groups.length === 0;
  const selectedGroup = groups.find((group) => group.id === value) ?? null;

  async function handleCreateGroup() {
    setError(null);

    if (!newGroupName.trim()) {
      setError('Please enter a name for your new group.');
      return;
    }

    setSaving(true);
    const { data, error: createError } = await createGroup(newGroupName);
    setSaving(false);

    if (createError || !data) {
      setError(createError ?? 'Could not create group.');
      return;
    }

    const group: GroupWithMeta = { ...data, my_role: 'admin' };
    onGroupCreated(group);
    onChange(group.id);
    setCreating(false);
    setNewGroupName('');
  }

  return (
    <View style={styles.wrapper}>
      {!showCreate ? (
        <SelectField
          label="Group"
          placeholder="Choose a group"
          sheetTitle="Which group?"
          sheetSubtitle="Members will see this prayer on their Today list."
          options={groups.map((group) => ({
            value: group.id,
            label: group.name,
            description: groupDescription(group),
          }))}
          value={value}
          onChange={(groupId) => {
            setError(null);
            onChange(groupId);
          }}
          actions={[
            {
              key: 'create',
              label: '＋ Create a new group',
              description: 'Start a private group right now',
              onPress: () => {
                setCreating(true);
                onChange(null);
              },
            },
          ]}
        />
      ) : (
        <Animated.View entering={FadeIn.duration(200)} style={styles.createBox}>
          <AppText variant="bodySmall" muted>
            {groups.length === 0
              ? "You're not in a group yet. Name one and invite people after saving."
              : 'Name your new group. You can invite people after saving.'}
          </AppText>
          <Input
            label="New group name"
            value={newGroupName}
            onChangeText={setNewGroupName}
            placeholder="Women's Ministry, Care Team..."
            returnKeyType="done"
            onSubmitEditing={handleCreateGroup}
          />
          {error ? <AppText style={styles.error}>{error}</AppText> : null}
          <Button title="Create group" loading={saving} onPress={handleCreateGroup} />
          {groups.length > 0 ? (
            <Button
              title="Choose an existing group"
              variant="ghost"
              onPress={() => {
                setCreating(false);
                setError(null);
              }}
            />
          ) : null}
        </Animated.View>
      )}

      {showVisibility && value && !showCreate ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <SelectField
            label="Who should see it?"
            placeholder="Choose who sees it"
            sheetTitle="Who should see this prayer?"
            options={groupVisibilityOptions(selectedGroup?.name)}
            value={toGroupVisibility(creatorKeepsPersonal)}
            onChange={(next) => onCreatorKeepsPersonalChange?.(next === 'group_and_me')}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.md,
  },
  createBox: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  error: {
    color: theme.colors.error,
  },
});
