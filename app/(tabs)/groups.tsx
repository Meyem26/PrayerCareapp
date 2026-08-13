import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { GroupCard } from '@/components/groups/GroupCard';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import {
  acceptGroupInviteByToken,
  fetchMyGroups,
  fetchMyPendingInvites,
  joinGroupByCode,
} from '@/lib/api/groups';
import type { GroupWithMeta, PendingGroupInvite } from '@/types/group';

export default function GroupsScreen() {
  const [groups, setGroups] = useState<GroupWithMeta[]>([]);
  const [invites, setInvites] = useState<PendingGroupInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteActionId, setInviteActionId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    const [groupsResult, invitesResult] = await Promise.all([
      fetchMyGroups(),
      fetchMyPendingInvites(),
    ]);
    setGroups(groupsResult.data);
    setInvites(invitesResult.data);
    setError(groupsResult.error);
    if (invitesResult.error && !invitesResult.error.includes('list_my_pending')) {
      setInviteError(invitesResult.error);
    } else {
      setInviteError(null);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadGroups();
    }, [loadGroups]),
  );

  async function handleAcceptInvite(invite: PendingGroupInvite) {
    setInviteError(null);
    setInviteActionId(invite.invite_id);

    const result = invite.require_code
      ? await joinGroupByCode(invite.invite_code)
      : await acceptGroupInviteByToken(invite.token);

    setInviteActionId(null);

    if (result.error || !result.data) {
      setInviteError(result.error ?? 'Could not accept invitation.');
      return;
    }

    router.push({ pathname: '/groups/[id]', params: { id: result.data.id } });
  }

  if (loading && groups.length === 0 && invites.length === 0 && !error) {
    return (
      <Screen centered>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadGroups();
            }}
            tintColor={theme.colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="greeting">Your prayer groups</AppText>
            <AppText muted>
              Private communities for shared prayer and care. Only invited members can join.
            </AppText>
            {error ? (
              <AppText style={styles.error}>
                We couldn't load your groups. Pull to refresh, or try again in a moment.
              </AppText>
            ) : null}

            {invites.length > 0 ? (
              <View style={styles.invitesSection}>
                <AppText variant="label">Invitations</AppText>
                <AppText variant="bodySmall" muted>
                  People invited you to these groups. Accept to join.
                </AppText>
                {inviteError ? <AppText style={styles.error}>{inviteError}</AppText> : null}
                {invites.map((invite) => (
                  <View key={invite.invite_id} style={styles.inviteCard}>
                    <View style={styles.inviteText}>
                      <AppText style={styles.inviteTitle}>{invite.group_name}</AppText>
                      <AppText variant="bodySmall" muted>
                        {invite.require_code
                          ? 'Requires invite code (we’ll use the shared code for you).'
                          : 'Invite link — no code needed.'}
                      </AppText>
                    </View>
                    <Button
                      title="Accept"
                      loading={inviteActionId === invite.invite_id}
                      onPress={() => handleAcceptInvite(invite)}
                      style={styles.acceptButton}
                    />
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.actions}>
              <Button title="Create group" onPress={() => router.push('/groups/create')} />
              <Button
                title="Join with code"
                variant="secondary"
                onPress={() => router.push('/groups/join')}
              />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            onPress={() => router.push({ pathname: '/groups/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          !loading && !error ? (
            <EmptyState
              title="No groups yet"
              body="Create a private group for your small group, ministry, or care team — or join with an invite code."
              actionLabel="Create group"
              onAction={() => router.push('/groups/create')}
            />
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    flexGrow: 1,
  },
  header: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  actions: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  invitesSection: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  inviteText: {
    flex: 1,
    gap: 2,
  },
  inviteTitle: {
    fontWeight: '600',
  },
  acceptButton: {
    minWidth: 96,
  },
  error: {
    color: theme.colors.error,
    lineHeight: 24,
  },
});
