import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { DayHistoryPanel } from '@/components/history/DayHistoryPanel';
import { DateNavigator } from '@/components/history/DateNavigator';
import { MonthCalendar } from '@/components/history/MonthCalendar';
import { PrayerCard } from '@/components/prayer/PrayerCard';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchHistoryActivityDates, fetchHistoryForDate } from '@/lib/api/history';
import { fetchJourneyPrayers } from '@/lib/api/prayers';
import { getTodayDateString, parseDateString } from '@/lib/utils/date';
import { getCategoryLabel, getScheduleFromPrayer } from '@/lib/prayer-utils';
import type { DayHistory } from '@/types/history';
import type { PrayerWithRelations } from '@/types/prayer';

type ViewMode = 'list' | 'calendar';
type Filter = 'all' | 'active' | 'answered' | 'praise' | 'hidden';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'praise', label: 'Praise' },
  { key: 'answered', label: 'Answered' },
  { key: 'hidden', label: 'Hidden' },
];

function isInPraiseWindow(prayer: PrayerWithRelations): boolean {
  if (prayer.status !== 'answered' || !prayer.praise_visible_until) return false;
  return prayer.praise_visible_until >= new Date().toISOString().slice(0, 10);
}

function matchesFilter(prayer: PrayerWithRelations, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'hidden') return prayer.is_hidden;
  if (filter === 'praise') return isInPraiseWindow(prayer);
  if (filter === 'answered') return prayer.status === 'answered';
  if (filter === 'active') return prayer.status === 'active' && !prayer.is_hidden;
  return true;
}

export default function JourneyScreen() {
  const { profile } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [prayers, setPrayers] = useState<PrayerWithRelations[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const timezone = profile?.timezone ?? 'UTC';
  const today = getTodayDateString(timezone);
  const [selectedDate, setSelectedDate] = useState(today);
  const parsed = parseDateString(selectedDate);
  const [calendarYear, setCalendarYear] = useState(parsed.year);
  const [calendarMonth, setCalendarMonth] = useState(parsed.month);
  const [activityDates, setActivityDates] = useState<string[]>([]);
  const [dayHistory, setDayHistory] = useState<DayHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadPrayers = useCallback(async () => {
    const { data } = await fetchJourneyPrayers();
    setPrayers(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  const loadActivityDates = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await fetchHistoryActivityDates(profile.id, calendarYear, calendarMonth);
    setActivityDates(data);
  }, [profile?.id, calendarYear, calendarMonth]);

  const loadDayHistory = useCallback(async () => {
    if (!profile?.id) return;
    setHistoryLoading(true);
    setHistoryError(null);
    const { data, error } = await fetchHistoryForDate(profile.id, selectedDate);
    setDayHistory(data);
    setHistoryError(error);
    setHistoryLoading(false);
  }, [profile?.id, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadPrayers();
    }, [loadPrayers]),
  );

  useEffect(() => {
    if (viewMode !== 'calendar') return;
    loadActivityDates();
  }, [viewMode, loadActivityDates]);

  useEffect(() => {
    if (viewMode !== 'calendar') return;
    loadDayHistory();
  }, [viewMode, loadDayHistory]);

  useEffect(() => {
    const next = parseDateString(selectedDate);
    setCalendarYear(next.year);
    setCalendarMonth(next.month);
  }, [selectedDate]);

  const filtered = prayers.filter((p) => matchesFilter(p, filter));

  if (loading && prayers.length === 0 && viewMode === 'list') {
    return (
      <Screen centered>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </Screen>
    );
  }

  if (viewMode === 'calendar') {
    return (
      <Screen padded={false}>
        <ScrollView
          contentContainerStyle={styles.calendarScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                Promise.all([loadActivityDates(), loadDayHistory()]).finally(() =>
                  setRefreshing(false),
                );
              }}
            />
          }>
          <View style={styles.header}>
            <AppText variant="greeting">Your journey</AppText>
            <AppText muted>
              Browse any day — prayers, praise, and care remembered.
            </AppText>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </View>

          <MonthCalendar
            year={calendarYear}
            month={calendarMonth}
            selectedDate={selectedDate}
            activityDates={activityDates}
            timezone={timezone}
            onMonthChange={(year, month) => {
              setCalendarYear(year);
              setCalendarMonth(month);
            }}
            onSelectDate={setSelectedDate}
          />

          <DateNavigator date={selectedDate} timezone={timezone} onChange={setSelectedDate} />

          <DayHistoryPanel history={dayHistory} loading={historyLoading} error={historyError} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPrayers();
            }}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="greeting">Your journey</AppText>
            <AppText muted>
              Every prayer tells a story — created, prayed, cared for, answered.
            </AppText>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            <View style={styles.filters}>
              {FILTERS.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => setFilter(item.key)}
                  style={[styles.filterChip, filter === item.key && styles.filterChipActive]}>
                  <AppText
                    variant="bodySmall"
                    style={filter === item.key ? styles.filterTextActive : undefined}>
                    {item.label}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const schedule = getScheduleFromPrayer(item);
          return (
            <PrayerCard
              prayer={item}
              categoryLabel={getCategoryLabel(item)}
              scheduleType={schedule?.schedule_type}
              onPress={() => router.push({ pathname: '/prayer/[id]', params: { id: item.id } })}
            />
          );
        }}
        ListEmptyComponent={
          <AppText muted style={styles.empty}>
            {filter === 'all'
              ? 'No prayers yet. Tap Pray to begin your first prayer.'
              : filter === 'praise'
                ? 'No answered prayers in your praise window right now.'
                : `No ${filter} prayers.`}
          </AppText>
        }
      />
    </Screen>
  );
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <View style={styles.viewToggle}>
      <Pressable
        style={[styles.viewChip, value === 'list' && styles.viewChipActive]}
        onPress={() => onChange('list')}>
        <AppText variant="bodySmall" style={value === 'list' ? styles.viewTextActive : undefined}>
          List
        </AppText>
      </Pressable>
      <Pressable
        style={[styles.viewChip, value === 'calendar' && styles.viewChipActive]}
        onPress={() => onChange('calendar')}>
        <AppText
          variant="bodySmall"
          style={value === 'calendar' ? styles.viewTextActive : undefined}>
          Calendar
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  calendarScroll: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  viewChip: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  viewChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  viewTextActive: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  filterChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  filterTextActive: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    lineHeight: 24,
  },
});
