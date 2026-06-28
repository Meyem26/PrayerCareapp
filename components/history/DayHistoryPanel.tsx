import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { getCareActionLabel } from '@/constants/care';
import { theme } from '@/constants/theme';
import type { DayHistory } from '@/types/history';
import type { CareActionType } from '@/types/care';

type DayHistoryPanelProps = {
  history: DayHistory | null;
  loading: boolean;
  error: string | null;
};

function Section({
  title,
  children,
  empty,
}: {
  title: string;
  children: ReactNode;
  empty?: boolean;
}) {
  if (empty) return null;

  return (
    <View style={styles.section}>
      <AppText variant="label">{title}</AppText>
      {children}
    </View>
  );
}

function HistoryRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.row}>
      <AppText style={styles.rowTitle}>{title}</AppText>
      {subtitle ? (
        <AppText variant="bodySmall" muted numberOfLines={2}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      style={({ pressed }) => [styles.rowPressable, pressed && styles.rowPressed]}
      onPress={onPress}>
      {content}
    </Pressable>
  );
}

export function DayHistoryPanel({ history, loading, error }: DayHistoryPanelProps) {
  if (loading) {
    return <AppText muted style={styles.message}>Loading this day...</AppText>;
  }

  if (error) {
    return <AppText style={styles.error}>{error}</AppText>;
  }

  if (!history) {
    return <AppText muted style={styles.message}>Select a day to explore your history.</AppText>;
  }

  const isEmpty =
    history.scheduled.length === 0 &&
    history.prayed.length === 0 &&
    history.answered.length === 0 &&
    history.praise.length === 0 &&
    history.care_actions.length === 0;

  if (isEmpty) {
    return (
      <AppText muted style={styles.message}>
        A quiet day — no recorded prayer activity yet.
      </AppText>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Section title="You prayed" empty={history.prayed.length === 0}>
        {history.prayed.map((item) => (
          <HistoryRow
            key={`${item.prayer_id}-${item.prayed_at}`}
            title={item.title}
            onPress={() => router.push({ pathname: '/prayer/[id]', params: { id: item.prayer_id } })}
          />
        ))}
      </Section>

      <Section title="Scheduled that day" empty={history.scheduled.length === 0}>
        {history.scheduled.map((item) => (
          <HistoryRow
            key={item.id}
            title={item.title}
            subtitle={item.prayer_point ?? undefined}
            onPress={() => router.push({ pathname: '/prayer/[id]', params: { id: item.id } })}
          />
        ))}
      </Section>

      <Section title="Answered" empty={history.answered.length === 0}>
        {history.answered.map((item) => (
          <HistoryRow
            key={item.id}
            title={item.title}
            onPress={() => router.push({ pathname: '/prayer/[id]', params: { id: item.id } })}
          />
        ))}
      </Section>

      <Section title="Praise" empty={history.praise.length === 0}>
        {history.praise.map((item) => (
          <HistoryRow
            key={item.prayer_id}
            title={item.title}
            subtitle={item.body}
            onPress={() => router.push({ pathname: '/prayer/[id]', params: { id: item.prayer_id } })}
          />
        ))}
      </Section>

      <Section title="Care" empty={history.care_actions.length === 0}>
        {history.care_actions.map((item) => (
          <HistoryRow
            key={item.id}
            title={getCareActionLabel(item.action_type as CareActionType, item.custom_label)}
            subtitle={item.prayer_title}
            onPress={() => router.push({ pathname: '/prayer/[id]', params: { id: item.prayer_id } })}
          />
        ))}
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.lg,
  },
  section: {
    gap: theme.spacing.sm,
  },
  rowPressable: {
    borderRadius: theme.radius.md,
  },
  rowPressed: {
    backgroundColor: theme.colors.accentLight,
  },
  row: {
    gap: 2,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowTitle: {
    fontWeight: '500',
  },
  message: {
    lineHeight: 24,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
});
