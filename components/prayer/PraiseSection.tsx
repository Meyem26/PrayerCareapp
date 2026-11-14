import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { theme } from '@/constants/theme';
import { useI18n } from '@/contexts/I18nContext';
import { fetchPraiseReport, savePraiseReport } from '@/lib/api/care';
import { formatTimelineDate } from '@/lib/utils/date';
import type { PraiseReport } from '@/types/care';

type PraiseSectionProps = {
  prayerId: string;
  praiseVisibleUntil: string | null;
  onUpdated?: () => void;
};

export function PraiseSection({ prayerId, praiseVisibleUntil, onUpdated }: PraiseSectionProps) {
  const { t } = useI18n();
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
        <AppText muted>{t('praise.loading')}</AppText>
      </View>
    );
  }

  return (
    <View style={[styles.block, styles.praiseBlock]}>
      <AppText variant="title">{t('praise.title')}</AppText>
      <AppText variant="bodySmall" muted>
        {inPraiseWindow
          ? t('praise.visibleUntil', { date: praiseVisibleUntil })
          : t('praise.movedToHistory')}
      </AppText>

      {report && !editing ? (
        <View style={styles.report}>
          <AppText style={styles.reportBody}>{report.body}</AppText>
          <AppText variant="bodySmall" muted>
            {formatTimelineDate(report.updated_at)}
          </AppText>
          {inPraiseWindow ? (
            <Button title={t('praise.edit')} variant="secondary" onPress={() => setEditing(true)} />
          ) : null}
        </View>
      ) : inPraiseWindow ? (
        <View style={styles.form}>
          <TextArea
            label={t('praise.howAnswered')}
            value={body}
            onChangeText={setBody}
            placeholder={t('praise.placeholder')}
            style={styles.textArea}
          />
          {error ? <AppText style={styles.error}>{error}</AppText> : null}
          <View style={styles.formActions}>
            {report ? (
              <Button
                title={t('common.cancel')}
                variant="ghost"
                onPress={() => {
                  setEditing(false);
                  setBody(report.body);
                }}
              />
            ) : null}
            <Button
              title={report ? t('praise.save') : t('praise.write')}
              loading={saving}
              onPress={handleSave}
            />
          </View>
        </View>
      ) : report ? (
        <AppText muted style={styles.historyNote}>
          {t('praise.savedHistory')}
        </AppText>
      ) : (
        <AppText muted style={styles.historyNote}>
          {t('praise.noneWritten')}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: theme.spacing.sm,
  },
  praiseBlock: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
  },
  report: {
    gap: theme.spacing.sm,
  },
  reportBody: {
    lineHeight: 24,
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
