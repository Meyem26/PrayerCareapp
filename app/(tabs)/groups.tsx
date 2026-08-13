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
import { fetchMyGroups } from '@/lib/api/groups';
import type { GroupWithMeta } from '@/types/group';

export default function GroupsScreen() {
  const [groups, setGroups] = useState<GroupWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    const { data, error: fetchError } = await fetchMyGroups();
    setGroups(data);
    setError(fetchError);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadGroups();
    }, [loadGroups]),
  );

  if (loading && groups.length === 0 && !error) {
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
  error: {
    color: theme.colors.error,
    lineHeight: 24,
  },
});
