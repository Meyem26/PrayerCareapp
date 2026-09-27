import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';

import { DayHistoryPanel } from '@/components/history/DayHistoryPanel';
import { DateNavigator } from '@/components/history/DateNavigator';
import { MonthCalendar } from '@/components/history/MonthCalendar';
import { JourneyFilterButton } from '@/components/journey/JourneyFilterButton';
import { JourneySummary } from '@/components/journey/JourneySummary';
import { TimelineEntry } from '@/components/journey/TimelineEntry';
import {
  groupByMonth,
  JOURNEY_FILTERS,
  matchesJourneyFilter,
  type JourneyFilter,
} from '@/components/journey/journey-utils';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchHistoryActivityDates,
  fetchHistoryForDate,
  fetchPrayerAnalytics,
} from '@/lib/api/history';
import { fetchJourneyPrayers } from '@/lib/api/prayers';
import { getTodayDateString, parseDateString } from '@/lib/utils/date';
import type { DayHistory } from '@/types/history';
import type { PrayerWithRelations } from '@/types/prayer';

type ViewMode = 'timeline' | 'calendar';

const VIEW_SEGMENTS: { value: ViewMode; label: string }[] = [
  { value: 'timeline', label: 'Timeline' },
  { value: 'calendar', label: 'Calendar' },
];

const EMPTY_COPY: Record<Exclude<JourneyFilter, 'all'>, { title: string; body: string }> = {
  active: {
    title: 'Nothing on your heart right now',
    body: 'When you start a new prayer, it will appear here while you carry it.',
  },
  answered: {
    title: 'No answered prayers yet',
    body: 'When God answers, mark the prayer as answered and it will be remembered here.',
  },
  praise: {
    title: 'No praise right now',
    body: 'Answered prayers appear here while they are in your praise season.',
  },
  hidden: {
    title: 'Nothing set aside',
    body: 'Prayers you hide will rest here until you bring them back.',
  },
};

export default function JourneyScreen() {
  const { profile } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [prayers, setPrayers] = useState<PrayerWithRelations[]>([]);
  const [filter, setFilter] = useState<JourneyFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const [daysThisMonth, setDaysThisMonth] = useState<number | null>(null);
  const [streak, setStreak] = useState<number | null>(null);

  const loadPrayers = useCallback(async () => {
    const { data, error: fetchError } = await fetchJourneyPrayers();
    setPrayers(data);
    setError(fetchError);
    setLoading(false);
    setRefreshing(false);
  }, []);

  const loadSummary = useCallback(async () => {
    if (!profile?.id) return;
    const now = parseDateString(getTodayDateString(timezone));
    const [activity, analytics] = await Promise.all([
      fetchHistoryActivityDates(profile.id, now.year, now.month),
      fetchPrayerAnalytics(profile.id),
    ]);
    setDaysThisMonth(activity.error ? null : activity.data.length);
    setStreak(analytics.data?.prayer_streak ?? null);
  }, [profile?.id, timezone]);

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
      loadSummary();
    }, [loadPrayers, loadSummary]),
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

  const counts = useMemo(() => {
    const result = {} as Record<JourneyFilter, number>;
    for (const item of JOURNEY_FILTERS) {
      result[item.value] = prayers.filter((p) => matchesJourneyFilter(p, item.value)).length;
    }
    return result;
  }, [prayers]);

  const sections = useMemo(
    () => groupByMonth(prayers.filter((p) => matchesJourneyFilter(p, filter))),
    [prayers, filter],
  );

  function refreshAll() {
    setRefreshing(true);
    const tasks: Promise<unknown>[] = [loadPrayers(), loadSummary()];
    if (viewMode === 'calendar') tasks.push(loadActivityDates(), loadDayHistory());
    Promise.all(tasks).finally(() => setRefreshing(false));
  }

  const header = (
    <View style={styles.header}>
      <AppText variant="greeting">Your journey</AppText>
      <AppText muted>
        {viewMode === 'timeline'
          ? 'Every prayer tells a story of faithfulness.'
          : 'Look back on any day — prayers, praise, and care remembered.'}
      </AppText>

      <JourneySummary
        daysThisMonth={daysThisMonth}
        carrying={counts.active ?? 0}
        answered={counts.answered ?? 0}
        streak={streak}
      />

      <View style={styles.segmented}>
        <SegmentedControl segments={VIEW_SEGMENTS} value={viewMode} onChange={setViewMode} />
      </View>

      {error ? (
        <AppText style={styles.error}>
          We couldn't load your journey. Pull to refresh, or try again in a moment.
        </AppText>
      ) : null}
    </View>
  );

  if (loading && prayers.length === 0 && viewMode === 'timeline' && !error) {
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} />}>
          {header}

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

  const hasPrayers = prayers.length > 0;

  return (
    <Screen padded={false}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} />}
        ListHeaderComponent={
          <>
            {header}
            {hasPrayers ? (
              <View style={styles.toolbar}>
                <AppText variant="bodySmall" muted>
                  {filter === 'all'
                    ? `${prayers.length} ${prayers.length === 1 ? 'prayer' : 'prayers'} so far`
                    : `${counts[filter]} of ${prayers.length}`}
                </AppText>
                <JourneyFilterButton value={filter} counts={counts} onChange={setFilter} />
              </View>
            ) : null}
          </>
        }
        renderSectionHeader={({ section }) => (
          <AppText variant="label" style={styles.sectionTitle}>
            {section.title}
          </AppText>
        )}
        renderItem={({ item, index, section }) => (
          <TimelineEntry
            prayer={item}
            isFirst={index === 0}
            isLast={index === section.data.length - 1}
            onPress={() => router.push({ pathname: '/prayer/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          !loading && !error ? (
            filter === 'all' ? (
              <EmptyState
                title="Your journey begins with one prayer"
                body="Bring what's on your heart. Each prayer, and each answer, will be remembered here."
                actionLabel="Start a prayer"
                onAction={() => router.push('/(tabs)/pray')}
              />
            ) : (
              <EmptyState
                title={EMPTY_COPY[filter].title}
                body={EMPTY_COPY[filter].body}
                actionLabel="Show all prayers"
                onAction={() => setFilter('all')}
              />
            )
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: Platform.OS === 'web' ? theme.spacing.md : theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    flexGrow: 1,
  },
  calendarScroll: {
    padding: Platform.OS === 'web' ? theme.spacing.md : theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    gap: theme.spacing.xs,
  },
  segmented: {
    marginTop: theme.spacing.lg,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  sectionTitle: {
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
    marginLeft: 4,
  },
  error: {
    color: theme.colors.error,
    lineHeight: 24,
    marginTop: theme.spacing.md,
  },
});
