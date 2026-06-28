import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { formatDisplayDate } from '@/lib/utils/date';
import { theme } from '@/constants/theme';
import type { SermonNote } from '@/types/sermon';

type SermonNoteCardProps = {
  note: SermonNote;
  onPress: () => void;
};

export function SermonNoteCard({ note, onPress }: SermonNoteCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}>
      <AppText style={styles.title}>{note.title}</AppText>
      <View style={styles.meta}>
        <AppText variant="bodySmall" muted>
          {formatDisplayDate(note.sermon_date)}
        </AppText>
        {note.speaker ? (
          <AppText variant="bodySmall" muted>
            · {note.speaker}
          </AppText>
        ) : null}
        {note.church ? (
          <AppText variant="bodySmall" muted>
            · {note.church}
          </AppText>
        ) : null}
      </View>
      {note.meditation_notes ? (
        <AppText variant="bodySmall" muted numberOfLines={2}>
          {note.meditation_notes}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.9,
    backgroundColor: theme.colors.accentLight,
  },
  title: {
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 26,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
});
