import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';

import { MemberRow } from '@/components/groups/MemberRow';
import { PrayerCard } from '@/components/prayer/PrayerCard';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { useToast } from '@/components/ui/Toast';
import { getGroupJoinUrlByCode } from '@/constants/beta';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchGroup,
  fetchGroupMembers,
  fetchGroupPrayers,
  leaveGroup,
  removeMember,
  updateMemberRole,
} from '@/lib/api/groups';
import { getCategoryLabel, getScheduleFromPrayer } from '@/lib/prayer-utils';
import type { GroupMember, GroupWithMeta } from '@/types/group';
import type { PrayerWithRelations } from '@/types/prayer';

type ConfirmKind = 'leave' | 'promote' | 'remove' | null;

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [group, setGroup] = useState<GroupWithMeta | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [prayers, setPrayers] = useState<PrayerWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [pendingMember, setPendingMember] = useState<GroupMember | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = group?.my_role === 'admin' || group?.my_role === 'leader';

  const load = useCallback(async () => {
    if (!id) return;

    const [groupResult, membersResult, prayersResult] = await Promise.all([
      fetchGroup(id),
      fetchGroupMembers(id),
      fetchGroupPrayers(id),
    ]);

    setGroup(groupResult.data);
    setMembers(membersResult.data);
    setPrayers(prayersResult.data);
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  async function handleShareCode() {
    if (!group?.invite_code) return;
    const link = getGroupJoinUrlByCode(group.invite_code);
    await Share.share({
      message: `Join our private prayer group "${group.name}" on PrayerCare.\n\nOpen this link:\n${link}\n\nOr enter invite code: ${group.invite_code}`,
      url: link,
      title: `Join ${group.name}`,
    });
  }

  async function handleConfirm() {
    if (!id || !confirmKind) return;
    setError(null);
    setActionLoading(true);

    if (confirmKind === 'leave') {
      const { error: leaveError } = await leaveGroup(id);
      setActionLoading(false);
      if (leaveError) {
        setError(leaveError);
        setConfirmKind(null);
        return;
      }
      setConfirmKind(null);
      showToast('You left the group.');
      router.replace('/(tabs)/groups');
      return;
    }

    if (confirmKind === 'promote' && pendingMember) {
      const { error: promoteError } = await updateMemberRole(pendingMember.member_id, 'leader');
      setActionLoading(false);
      setConfirmKind(null);
      setPendingMember(null);
      if (promoteError) {
        setError(promoteError);
        return;
      }
      showToast('Member promoted to leader.');
      load();
      return;
    }

    if (confirmKind === 'remove' && pendingMember) {
      const { error: removeError } = await removeMember(pendingMember.member_id);
      setActionLoading(false);
      setConfirmKind(null);
      setPendingMember(null);
      if (removeError) {
        setError(removeError);
        return;
      }
      showToast('Member removed.');
      load();
      return;
    }

    setActionLoading(false);
    setConfirmKind(null);
  }

  if (loading && !group) {
    return (
      <Screen centered>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </Screen>
    );
  }

  if (!group) {
    return (
      <Screen centered>
        <AppText muted>Group not found.</AppText>
        <Button title="Go back" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const confirmTitle =
    confirmKind === 'leave'
      ? 'Leave group?'
      : confirmKind === 'promote'
        ? `Make ${pendingMember?.display_name ?? 'member'} a leader?`
        : confirmKind === 'remove'
          ? `Remove ${pendingMember?.display_name ?? 'member'}?`
          : '';

  const confirmMessage =
    confirmKind === 'leave'
      ? 'You will no longer see shared prayers from this group.'
      : confirmKind === 'promote'
        ? 'Leaders can invite members and manage the group.'
        : confirmKind === 'remove'
          ? 'They will lose access to group prayers.'
          : '';

  const confirmLabel =
    confirmKind === 'leave' ? 'Leave' : confirmKind === 'promote' ? 'Confirm' : 'Remove';

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }>
        <View style={styles.header}>
          <AppText variant="greeting">{group.name}</AppText>
          {group.description ? <AppText muted>{group.description}</AppText> : null}
        </View>

        <View style={styles.section}>
          <AppText variant="label">Invite</AppText>
          <View style={styles.codeBox}>
            <AppText style={styles.code}>{group.invite_code}</AppText>
            <AppText variant="bodySmall" muted>
              Share the link or code. Email invites can require a code or allow the link alone.
            </AppText>
          </View>
          <Button title="Share invite link" variant="secondary" onPress={handleShareCode} />
          {canManage ? (
            <Button
              title="Invite by email"
              variant="ghost"
              onPress={() => router.push({ pathname: '/groups/[id]/invite', params: { id: id! } })}
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <AppText variant="label">Shared prayers ({prayers.length})</AppText>
          {prayers.length === 0 ? (
            <EmptyState
              title="No shared prayers yet"
              body="When you create a prayer, choose this group to share it. Members will see it here."
              actionLabel="Start a prayer"
              onAction={() => router.push('/(tabs)/pray')}
            />
          ) : (
            prayers.map((prayer) => {
              const schedule = getScheduleFromPrayer(prayer);
              return (
                <PrayerCard
                  key={prayer.id}
                  prayer={prayer}
                  categoryLabel={getCategoryLabel(prayer)}
                  scheduleType={schedule?.schedule_type}
                  onPress={() => router.push({ pathname: '/prayer/[id]', params: { id: prayer.id } })}
                />
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <AppText variant="label">Members ({members.length})</AppText>
          {members.map((member) => (
            <MemberRow
              key={member.member_id}
              member={member}
              isSelf={member.user_id === user?.id}
              canManage={canManage}
              onPromote={
                member.role === 'member'
                  ? () => {
                      setError(null);
                      setPendingMember(member);
                      setConfirmKind('promote');
                    }
                  : undefined
              }
              onRemove={
                member.role === 'member'
                  ? () => {
                      setError(null);
                      setPendingMember(member);
                      setConfirmKind('remove');
                    }
                  : undefined
              }
            />
          ))}
        </View>

        {error ? <AppText style={styles.error}>{error}</AppText> : null}

        <Button
          title="Leave group"
          variant="ghost"
          onPress={() => {
            setError(null);
            setConfirmKind('leave');
          }}
        />
      </ScrollView>

      <ConfirmDialog
        visible={confirmKind !== null}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        cancelLabel="Cancel"
        destructive={confirmKind === 'leave' || confirmKind === 'remove'}
        loading={actionLoading}
        onCancel={() => {
          if (actionLoading) return;
          setConfirmKind(null);
          setPendingMember(null);
        }}
        onConfirm={handleConfirm}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: theme.spacing.lg,
    gap: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    gap: theme.spacing.sm,
  },
  section: {
    gap: theme.spacing.md,
  },
  codeBox: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  code: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 4,
    color: theme.colors.accentDark,
  },
  error: {
    color: theme.colors.error,
    lineHeight: 24,
  },
});
