import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ShareWithGroupPicker } from '@/components/groups/ShareWithGroupPicker';
import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { fetchMyGroups } from '@/lib/api/groups';
import type { GroupWithMeta } from '@/types/group';

type SharePrayerModalProps = {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onShare: (groupId: string, creatorKeepsPersonal: boolean) => void;
};

export function SharePrayerModal({
  visible,
  loading,
  onClose,
  onShare,
}: SharePrayerModalProps) {
  const [groups, setGroups] = useState<GroupWithMeta[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [creatorKeepsPersonal, setCreatorKeepsPersonal] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    setSelectedGroupId(null);
    setCreatorKeepsPersonal(true);
    setError(null);
    setGroupsLoading(true);

    fetchMyGroups().then(({ data, error: fetchError }) => {
      setGroups(data);
      setGroupsLoading(false);
      if (fetchError) setError(fetchError);
    });
  }, [visible]);

  function handleShare() {
    setError(null);

    if (!selectedGroupId) {
      setError('Please select a group or create one.');
      return;
    }

    onShare(selectedGroupId, creatorKeepsPersonal);
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Share with a group"
      subtitle="Members will see this prayer on their Today list according to its schedule."
      footer={
        <>
          {error ? <AppText style={styles.error}>{error}</AppText> : null}
          <View style={styles.actions}>
            <Button title="Cancel" variant="secondary" onPress={onClose} style={styles.actionButton} />
            <Button
              title="Share"
              loading={loading}
              disabled={groupsLoading}
              onPress={handleShare}
              style={styles.actionButton}
            />
          </View>
        </>
      }>
      {groupsLoading ? (
        <AppText muted style={styles.loading}>
          Loading groups...
        </AppText>
      ) : (
        <ShareWithGroupPicker
          groups={groups}
          value={selectedGroupId}
          onChange={setSelectedGroupId}
          creatorKeepsPersonal={creatorKeepsPersonal}
          onCreatorKeepsPersonalChange={setCreatorKeepsPersonal}
          onGroupCreated={(group) => {
            setGroups((prev) => {
              if (prev.some((item) => item.id === group.id)) return prev;
              return [group, ...prev];
            });
          }}
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  loading: {
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
