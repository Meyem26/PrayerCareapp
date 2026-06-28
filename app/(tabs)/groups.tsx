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
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { fetchMyGroups } from '@/lib/api/groups';
import type { GroupWithMeta } from '@/types/group';

export default function GroupsScreen() {
  const [groups, setGroups] = useState<GroupWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGroups = useCallback(async () => {
    const { data } = await fetchMyGroups();
    setGroups(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadGroups();
    }, [loadGroups]),
  );

  if (loading && groups.length === 0) {
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
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="greeting">Your prayer groups</AppText>
            <AppText muted>
              Private communities for shared prayer and care. Only invited members can join.
            </AppText>
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
          <AppText muted style={styles.empty}>
            You are not in any groups yet. Create one for your small group, ministry, or care
            team.
          </AppText>
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
  },
  header: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  actions: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  empty: {
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    lineHeight: 24,
  },
});
