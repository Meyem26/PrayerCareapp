import { Pressable, StyleSheet, View } from 'react-native';

import {
  daysBetween,
  formatShortDate,
  getJourneyMoment,
  getMomentDate,
  type JourneyMoment,
} from '@/components/journey/journey-utils';
import { AppText } from '@/components/ui/AppText';
import { getScheduleLabel } from '@/constants/schedule';
import { theme } from '@/constants/theme';
import { getCategoryLabel, getScheduleFromPrayer } from '@/lib/prayer-utils';
import type { PrayerWithRelations } from '@/types/prayer';

type TimelineEntryProps = {
  prayer: PrayerWithRelations;
  isFirst: boolean;
  isLast: boolean;
  onPress: () => void;
};

const MARKER: Record<JourneyMoment, string | null> = {
  praise: '✦',
  answered: '✓',
  hidden: null,
  archived: null,
  active: null,
};

function describeMoment(prayer: PrayerWithRelations, moment: JourneyMoment): string {
  const date = formatShortDate(getMomentDate(prayer));

  if (moment === 'praise' || moment === 'answered') {
    const days = prayer.answered_at ? daysBetween(prayer.created_at, prayer.answered_at) : 0;
    const carried =
      days > 1 ? ` · after ${days} days of prayer` : days === 1 ? ' · after a day of prayer' : '';
    return `${moment === 'praise' ? 'Praise' : 'Answered'} · ${date}${carried}`;
  }
  if (moment === 'hidden') return `Set aside · began ${date}`;
  if (moment === 'archived') return `Archived · began ${date}`;
  return `Began ${date}`;
}

export function TimelineEntry({ prayer, isFirst, isLast, onPress }: TimelineEntryProps) {
  const moment = getJourneyMoment(prayer);
  const isAnswered = moment === 'praise' || moment === 'answered';
  const isQuiet = moment === 'hidden' || moment === 'archived';
  const category = getCategoryLabel(prayer);
  const schedule = getScheduleFromPrayer(prayer);
  const marker = MARKER[moment];

  const meta = [
    category,
    moment === 'active' && schedule?.schedule_type ? getScheduleLabel(schedule.schedule_type) : null,
    prayer.visibility === 'group' ? 'Shared' : null,
  ].filter(Boolean);

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        {isFirst && isLast ? null : (
          <View
            style={[
              styles.line,
              { top: isFirst ? DOT_CENTER : 0 },
              isLast ? { height: DOT_CENTER } : { bottom: 0 },
            ]}
          />
        )}
        <View
          style={[
            styles.dot,
            moment === 'active' && styles.dotActive,
            isAnswered && styles.dotAnswered,
            moment === 'praise' && styles.dotPraise,
            isQuiet && styles.dotQuiet,
          ]}>
          {marker ? (
            <AppText style={[styles.marker, moment === 'praise' && styles.markerPraise]}>
              {marker}
            </AppText>
          ) : null}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${prayer.title}. ${describeMoment(prayer, moment)}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          isAnswered && styles.cardAnswered,
          moment === 'praise' && styles.cardPraise,
          isQuiet && styles.cardQuiet,
          pressed && styles.cardPressed,
        ]}>
        <AppText
          variant="label"
          style={[styles.moment, isAnswered && styles.momentAnswered]}
          numberOfLines={1}>
          {describeMoment(prayer, moment)}
        </AppText>
        <AppText style={styles.title} numberOfLines={2}>
          {prayer.title}
        </AppText>
        {prayer.prayer_point ? (
          <AppText variant="bodySmall" muted numberOfLines={2}>
            {prayer.prayer_point}
          </AppText>
        ) : null}
        {meta.length > 0 ? (
          <AppText variant="bodySmall" style={styles.meta} numberOfLines={1}>
            {meta.join('  ·  ')}
          </AppText>
        ) : null}
      </Pressable>
    </View>
  );
}

const DOT = 22;
const RAIL = 30;
const DOT_CENTER = theme.spacing.md + DOT / 2;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  rail: {
    width: RAIL,
    alignItems: 'center',
  },
  line: {
    position: 'absolute',
    width: 2,
    backgroundColor: theme.colors.border,
  },
  dot: {
    marginTop: theme.spacing.md,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentLight,
  },
  dotAnswered: {
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.goldLight,
  },
  dotPraise: {
    backgroundColor: theme.colors.gold,
  },
  dotQuiet: {
    borderStyle: 'dashed',
  },
  marker: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: theme.colors.gold,
  },
  markerPraise: {
    color: theme.colors.white,
  },
  card: {
    flex: 1,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    gap: 4,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  cardAnswered: {
    borderColor: '#E7DCC0',
  },
  cardPraise: {
    backgroundColor: '#FBF7EC',
  },
  cardQuiet: {
    opacity: 0.7,
  },
  cardPressed: {
    borderColor: theme.colors.accent,
  },
  moment: {
    color: theme.colors.textMuted,
  },
  momentAnswered: {
    color: theme.colors.gold,
    fontWeight: '600',
  },
  title: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  meta: {
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
