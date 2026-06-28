import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { SharePrayerModal } from '@/components/groups/SharePrayerModal';
import { CareActionsSection } from '@/components/prayer/CareActionsSection';
import { PraiseSection } from '@/components/prayer/PraiseSection';
import { TimelineList } from '@/components/prayer/TimelineList';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { OverflowMenu, type OverflowMenuItem } from '@/components/ui/OverflowMenu';
import { Screen } from '@/components/ui/Screen';
import { getScheduleLabel } from '@/constants/schedule';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  deletePrayer,
  fetchPrayerDetail,
  logPrayerActivity,
  markPrayerAnswered,
  restartPrayer,
  setPrayerHidden,
  sharePrayerToGroup,
} from '@/lib/api/prayers';
import {
  getCategoryLabel,
  getScheduleFromPrayer,
  getScriptureFromPrayer,
} from '@/lib/prayer-utils';
import type { PrayerTimelineEvent, PrayerWithRelations } from '@/types/prayer';

export default function PrayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [prayer, setPrayer] = useState<PrayerWithRelations | null>(null);
  const [timeline, setTimeline] = useState<PrayerTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [careFormOpen, setCareFormOpen] = useState(false);

  const loadPrayer = useCallback(async () => {
    if (!id) return;

    const result = await fetchPrayerDetail(id);
    setPrayer(result.data);
    setTimeline(result.timeline);
    setError(result.error);
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadPrayer();
    }, [loadPrayer]),
  );

  async function runAction(action: () => Promise<{ error: string | null }>) {
    setActionLoading(true);
    const result = await action();
    setActionLoading(false);

    if (result.error) {
      Alert.alert('Something went wrong', result.error);
      return;
    }

    await loadPrayer();
  }

  function confirmDelete() {
    Alert.alert(
      'Delete prayer?',
      'This cannot be undone. Your timeline history will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            setActionLoading(true);
            const result = await deletePrayer(id);
            setActionLoading(false);
            if (result.error) {
              Alert.alert('Error', result.error);
              return;
            }
            router.replace('/(tabs)/journey');
          },
        },
      ],
    );
  }

  async function handleShareToGroup(groupId: string, creatorKeepsPersonal: boolean) {
    if (!id) return;

    setShareLoading(true);
    const result = await sharePrayerToGroup(id, groupId, creatorKeepsPersonal);
    setShareLoading(false);

    if (result.error) {
      Alert.alert('Something went wrong', result.error);
      return;
    }

    setShareModalVisible(false);
    await loadPrayer();
  }

  function confirmAnswered() {
    Alert.alert(
      'Mark as answered?',
      'This prayer will leave your Today list. Write a praise report on the next screen to celebrate the answer.',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Yes, answered',
          onPress: () => {
            if (!id || !user?.id) return;
            runAction(() => markPrayerAnswered(id, user.id));
          },
        },
      ],
    );
  }

  const menuItems = useMemo((): OverflowMenuItem[] => {
    if (!prayer || !id || !user?.id) return [];

    const isAnswered = prayer.status === 'answered';
    const isActive = prayer.status === 'active';
    const isPersonal = prayer.visibility === 'personal';
    const isOwner = prayer.creator_id === user.id;
    const items: OverflowMenuItem[] = [];

    if (isActive) {
      items.push({
        label: 'Edit',
        onPress: () => router.push({ pathname: '/prayer/create', params: { id } }),
      });
      items.push({
        label: prayer.is_hidden ? 'Show on Today' : 'Hide from Today',
        onPress: () => runAction(() => setPrayerHidden(id, user.id, !prayer.is_hidden)),
      });
      items.push({
        label: 'Mark answered',
        onPress: confirmAnswered,
      });
      items.push({
        label: 'Care action',
        onPress: () => setCareFormOpen(true),
      });
      if (isPersonal && isOwner) {
        items.push({
          label: 'Share with group',
          onPress: () => setShareModalVisible(true),
        });
      }
    }

    if (isAnswered) {
      items.push({
        label: 'Restart prayer',
        onPress: () => runAction(() => restartPrayer(id, user.id)),
      });
    }

    items.push({
      label: 'Delete',
      destructive: true,
      onPress: confirmDelete,
    });

    return items;
  }, [prayer, id, user?.id]);

  if (loading && !prayer) {
    return (
      <Screen centered>
        <AppText muted>Loading...</AppText>
      </Screen>
    );
  }

  if (!prayer) {
    return (
      <Screen centered>
        <AppText muted>{error ?? 'Prayer not found.'}</AppText>
        <Button title="Go back" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const schedule = getScheduleFromPrayer(prayer);
  const scripture = getScriptureFromPrayer(prayer);
  const categoryLabel = getCategoryLabel(prayer);
  const isAnswered = prayer.status === 'answered';
  const isActive = prayer.status === 'active';
  const isOwner = prayer.creator_id === user?.id;

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPrayer(); }} />
        }>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <AppText variant="greeting">{prayer.title}</AppText>
            </View>
            <OverflowMenu items={menuItems} />
          </View>
          {prayer.prayer_point ? <AppText muted>{prayer.prayer_point}</AppText> : null}
          <View style={styles.meta}>
            {categoryLabel ? <AppText variant="bodySmall" muted>{categoryLabel}</AppText> : null}
            {schedule ? (
              <AppText variant="bodySmall" muted>
                {getScheduleLabel(schedule.schedule_type)}
              </AppText>
            ) : null}
            {prayer.visibility === 'group' ? (
              <AppText variant="bodySmall" accent>
                Group prayer
                {prayer.creator_keeps_personal === false && isOwner ? ' · group list only' : ''}
              </AppText>
            ) : null}
          </View>
        </View>

        <View style={styles.block}>
          <AppText variant="label">Prayer</AppText>
          <AppText style={styles.body}>{prayer.body}</AppText>
        </View>

        {scripture ? (
          <View style={[styles.block, styles.scripture]}>
            <AppText variant="label">Scripture</AppText>
            <AppText style={styles.scriptureRef}>{scripture.reference}</AppText>
            <AppText style={styles.body}>{scripture.text}</AppText>
          </View>
        ) : null}

        {isActive && !prayer.is_hidden ? (
          <Button
            title="I prayed today"
            loading={actionLoading}
            onPress={() => {
              if (!id || !user?.id || !profile) return;
              runAction(() => logPrayerActivity(id, user.id, profile.timezone));
            }}
          />
        ) : null}

        <CareActionsSection
          prayerId={prayer.id}
          canEdit={isActive}
          showForm={careFormOpen}
          onShowFormChange={setCareFormOpen}
        />

        {isAnswered ? (
          <PraiseSection
            prayerId={prayer.id}
            praiseVisibleUntil={prayer.praise_visible_until}
            onUpdated={loadPrayer}
          />
        ) : null}

        <View style={styles.timelineSection}>
          <AppText variant="title">Timeline</AppText>
          <AppText variant="bodySmall" muted style={styles.timelineHint}>
            Your prayer journey — every step remembered.
          </AppText>
          <TimelineList events={timeline} />
        </View>
      </ScrollView>

      <SharePrayerModal
        visible={shareModalVisible}
        loading={shareLoading}
        onClose={() => setShareModalVisible(false)}
        onShare={handleShareToGroup}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    gap: theme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  block: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
  },
  scripture: {
    backgroundColor: theme.colors.goldLight,
    borderColor: theme.colors.gold,
  },
  scriptureRef: {
    fontWeight: '600',
    color: theme.colors.gold,
  },
  body: {
    fontSize: 17,
    lineHeight: 26,
  },
  timelineSection: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  timelineHint: {
    marginBottom: theme.spacing.xs,
  },
});
