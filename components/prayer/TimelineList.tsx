import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { formatTimelineDate } from '@/lib/utils/date';
import { getTimelineLabel } from '@/lib/timeline-labels';
import { theme } from '@/constants/theme';
import type { PrayerTimelineEvent } from '@/types/prayer';

type TimelineListProps = {
  events: PrayerTimelineEvent[];
};

export function TimelineList({ events }: TimelineListProps) {
  if (events.length === 0) {
    return (
      <AppText muted style={styles.empty}>
        Your prayer journey will appear here as you pray, care, and celebrate answers.
      </AppText>
    );
  }

  return (
    <View style={styles.list}>
      {events.map((event, index) => (
        <View key={event.id} style={styles.item}>
          <View style={styles.line}>
            <View style={styles.dot} />
            {index < events.length - 1 ? <View style={styles.connector} /> : null}
          </View>
          <View style={styles.content}>
            <AppText style={styles.label}>{getTimelineLabel(event.event_type)}</AppText>
            <AppText variant="bodySmall" muted>
              {formatTimelineDate(event.created_at)}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.md,
  },
  item: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  line: {
    alignItems: 'center',
    width: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
    marginTop: 4,
  },
  connector: {
    flex: 1,
    width: 2,
    backgroundColor: theme.colors.border,
    marginTop: theme.spacing.xs,
    minHeight: 24,
  },
  content: {
    flex: 1,
    gap: 2,
    paddingBottom: theme.spacing.sm,
  },
  label: {
    fontWeight: '500',
  },
  empty: {
    lineHeight: 24,
  },
});
