import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Screen } from '@/components/ui/Screen';
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

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupWithMeta | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [prayers, setPrayers] = useState<PrayerWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const canManage =
    group?.my_role === 'admin' || group?.my_role === 'leader';

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
    await Share.share({
      message: `Join our private prayer group "${group.name}" on PrayerCare.\n\nInvite code: ${group.invite_code}`,
    });
  }

  function handleLeave() {
    Alert.alert('Leave group?', 'You will no longer see shared prayers from this group.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          const { error } = await leaveGroup(id);
          if (error) {
            Alert.alert('Error', error);
            return;
          }
          router.replace('/(tabs)/groups');
        },
      },
    ]);
  }

  function handlePromote(member: GroupMember) {
    Alert.alert(
      `Make ${member.display_name ?? 'member'} a leader?`,
      'Leaders can invite members and manage the group.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            const { error } = await updateMemberRole(member.member_id, 'leader');
            if (error) Alert.alert('Error', error);
            else load();
          },
        },
      ],
    );
  }

  function handleRemove(member: GroupMember) {
    Alert.alert(
      `Remove ${member.display_name ?? 'member'}?`,
      'They will lose access to group prayers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await removeMember(member.member_id);
            if (error) Alert.alert('Error', error);
            else load();
          },
        },
      ],
    );
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

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
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
              Share this code privately with people you trust.
            </AppText>
          </View>
          <Button title="Share invite code" variant="secondary" onPress={handleShareCode} />
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
            <AppText muted style={styles.empty}>
              No group prayers yet. Share a prayer when you create one.
            </AppText>
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
              onPromote={member.role === 'member' ? () => handlePromote(member) : undefined}
              onRemove={member.role === 'member' ? () => handleRemove(member) : undefined}
            />
          ))}
        </View>

        <Button title="Leave group" variant="ghost" onPress={handleLeave} />
      </ScrollView>
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
  empty: {
    lineHeight: 24,
  },
});
