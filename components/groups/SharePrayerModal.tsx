import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ShareWithGroupPicker } from '@/components/groups/ShareWithGroupPicker';
import { AppText } from '@/components/ui/AppText';
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.handle} />
            <AppText variant="title">Share with group</AppText>
            <AppText variant="bodySmall" muted>
              Members will see this prayer on their Today list according to its schedule.
            </AppText>

            {groupsLoading ? (
              <AppText muted style={styles.loading}>Loading groups...</AppText>
            ) : groups.length === 0 ? (
              <AppText muted style={styles.loading}>
                You have no groups yet — create one below.
              </AppText>
            ) : null}

            <ScrollView
              style={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
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
            </ScrollView>

            {error ? <AppText style={styles.error}>{error}</AppText> : null}

            <View style={styles.actions}>
              <Button title="Cancel" variant="secondary" onPress={onClose} style={styles.actionButton} />
              <Button
                title="Share"
                loading={loading}
                onPress={handleShare}
                style={styles.actionButton}
              />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  keyboard: {
    maxHeight: '92%',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    maxHeight: '100%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.xs,
  },
  scroll: {
    maxHeight: 420,
  },
  loading: {
    textAlign: 'center',
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
