import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { theme } from '@/constants/theme';
import { fetchPraiseReport, savePraiseReport } from '@/lib/api/care';
import { formatTimelineDate } from '@/lib/utils/date';
import type { PraiseReport } from '@/types/care';

type PraiseSectionProps = {
  prayerId: string;
  praiseVisibleUntil: string | null;
  onUpdated?: () => void;
};

export function PraiseSection({ prayerId, praiseVisibleUntil, onUpdated }: PraiseSectionProps) {
  const [report, setReport] = useState<PraiseReport | null>(null);
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    const { data } = await fetchPraiseReport(prayerId);
    setReport(data);
    setBody(data?.body ?? '');
    setEditing(!data);
    setLoading(false);
  }, [prayerId]);

  useEffect(() => {
    setLoading(true);
    loadReport();
  }, [loadReport]);

  async function handleSave() {
    setError(null);
    setSaving(true);
    const result = await savePraiseReport(prayerId, body);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setEditing(false);
    await loadReport();
    onUpdated?.();
  }

  const inPraiseWindow =
    praiseVisibleUntil !== null && praiseVisibleUntil >= new Date().toISOString().slice(0, 10);

  if (loading) {
    return (
      <View style={styles.block}>
        <AppText muted>Loading praise...</AppText>
      </View>
    );
  }

  return (
    <View style={[styles.block, styles.praiseBlock]}>
      <AppText variant="title">Praise report</AppText>
      <AppText variant="bodySmall" muted>
        {inPraiseWindow
          ? `Visible in Praise until ${praiseVisibleUntil}. Then it moves to your journey history.`
          : 'This answered prayer has moved to history.'}
      </AppText>

      {report && !editing ? (
        <View style={styles.report}>
          <AppText style={styles.reportBody}>{report.body}</AppText>
          <AppText variant="bodySmall" muted>
            {formatTimelineDate(report.updated_at)}
          </AppText>
          {inPraiseWindow ? (
            <Button title="Edit praise" variant="secondary" onPress={() => setEditing(true)} />
          ) : null}
        </View>
      ) : inPraiseWindow ? (
        <View style={styles.form}>
          <TextArea
            label="How did God answer?"
            value={body}
            onChangeText={setBody}
            placeholder="Share what happened — your testimony encourages others..."
            style={styles.textArea}
          />
          {error ? <AppText style={styles.error}>{error}</AppText> : null}
          <View style={styles.formActions}>
            {report ? (
              <Button title="Cancel" variant="ghost" onPress={() => { setEditing(false); setBody(report.body); }} />
            ) : null}
            <Button
              title={report ? 'Save praise' : 'Write praise report'}
              loading={saving}
              onPress={handleSave}
            />
          </View>
        </View>
      ) : report ? (
        <AppText muted style={styles.historyNote}>
          Praise report saved — now part of your prayer history.
        </AppText>
      ) : (
        <AppText muted style={styles.historyNote}>
          No praise report was written for this prayer.
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
  },
  praiseBlock: {
    backgroundColor: theme.colors.goldLight,
    borderColor: theme.colors.gold,
  },
  report: {
    gap: theme.spacing.sm,
  },
  reportBody: {
    fontSize: 17,
    lineHeight: 26,
  },
  form: {
    gap: theme.spacing.sm,
  },
  textArea: {
    minHeight: 120,
  },
  formActions: {
    gap: theme.spacing.sm,
  },
  historyNote: {
    lineHeight: 22,
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
  },
});
