import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OptionCard } from '@/components/ui/OptionCard';
import { TextArea } from '@/components/ui/TextArea';
import { CARE_ACTION_TYPES, CARE_STATUS_LABELS, getCareActionLabel } from '@/constants/care';
import { theme } from '@/constants/theme';
import { createCareAction, fetchCareActions, updateCareActionStatus } from '@/lib/api/care';
import type { CareAction, CareActionType } from '@/types/care';

type CareActionsSectionProps = {
  prayerId: string;
  canEdit: boolean;
  showForm?: boolean;
  onShowFormChange?: (show: boolean) => void;
};

export function CareActionsSection({
  prayerId,
  canEdit,
  showForm: showFormProp,
  onShowFormChange,
}: CareActionsSectionProps) {
  const [internalShowForm, setInternalShowForm] = useState(false);
  const showForm = showFormProp ?? internalShowForm;

  function setShowForm(value: boolean) {
    if (onShowFormChange) {
      onShowFormChange(value);
    } else {
      setInternalShowForm(value);
    }
  }

  const [actions, setActions] = useState<CareAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionType, setActionType] = useState<CareActionType>('call');
  const [customLabel, setCustomLabel] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActions = useCallback(async () => {
    const { data } = await fetchCareActions(prayerId);
    setActions(data);
    setLoading(false);
  }, [prayerId]);

  useEffect(() => {
    setLoading(true);
    loadActions();
  }, [loadActions]);

  async function handleCreate() {
    setError(null);

    if (actionType === 'custom' && !customLabel.trim()) {
      setError('Please describe the care action.');
      return;
    }

    setSaving(true);
    const result = await createCareAction({
      prayerId,
      actionType,
      customLabel,
      assigneeName,
      notes,
    });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setShowForm(false);
    setCustomLabel('');
    setAssigneeName('');
    setNotes('');
    await loadActions();
  }

  async function handleStatusChange(action: CareAction, status: 'completed' | 'cancelled') {
    const result = await updateCareActionStatus(action.id, status);
    if (result.error) {
      Alert.alert('Something went wrong', result.error);
      return;
    }
    await loadActions();
  }

  function getAssigneeLabel(action: CareAction): string | null {
    const assignee = action.care_action_assignees?.[0];
    if (!assignee) return null;
    return assignee.external_name ?? 'Assigned';
  }

  return (
    <View style={styles.block}>
      <AppText variant="title">Care actions</AppText>
      <AppText variant="bodySmall" muted>
        Turn prayer into intentional care — calls, visits, meals, and follow-up.
      </AppText>

      {actions.length === 0 && !showForm ? (
        <AppText muted style={styles.empty}>
          No care actions yet. Tap ⋯ above to add one.
        </AppText>
      ) : (
        <View style={styles.list}>
          {actions.map((action) => {
            const assignee = getAssigneeLabel(action);
            const isDone = action.status === 'completed' || action.status === 'cancelled';

            return (
              <View key={action.id} style={styles.item}>
                <View style={styles.itemHeader}>
                  <AppText style={styles.itemTitle}>
                    {getCareActionLabel(action.action_type, action.custom_label)}
                  </AppText>
                  <AppText variant="bodySmall" muted>
                    {CARE_STATUS_LABELS[action.status]}
                  </AppText>
                </View>
                {assignee ? (
                  <AppText variant="bodySmall" muted>
                    For: {assignee}
                  </AppText>
                ) : null}
                {action.notes ? (
                  <AppText variant="bodySmall">{action.notes}</AppText>
                ) : null}
                {canEdit && !isDone ? (
                  <View style={styles.itemActions}>
                    <Button
                      title="Mark done"
                      variant="secondary"
                      style={styles.smallButton}
                      onPress={() => handleStatusChange(action, 'completed')}
                    />
                    <Button
                      title="Cancel"
                      variant="ghost"
                      style={styles.smallButton}
                      onPress={() => handleStatusChange(action, 'cancelled')}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {canEdit && showForm ? (
          <View style={styles.form}>
            <AppText variant="label">Type of care</AppText>
            <View style={styles.typeGrid}>
              {CARE_ACTION_TYPES.map((item) => (
                <OptionCard
                  key={item.value}
                  label={item.label}
                  selected={actionType === item.value}
                  onPress={() => setActionType(item.value)}
                />
              ))}
            </View>
            {actionType === 'custom' ? (
              <Input
                label="Describe"
                value={customLabel}
                onChangeText={setCustomLabel}
                placeholder="What kind of care?"
              />
            ) : null}
            <Input
              label="Assign to (optional)"
              value={assigneeName}
              onChangeText={setAssigneeName}
              placeholder="Mom, Pastor John, or a team name"
            />
            <TextArea
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Details for whoever is caring..."
              style={styles.notesArea}
            />
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
            <View style={styles.formActions}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => {
                  setShowForm(false);
                  setError(null);
                }}
              />
              <Button title="Add care action" loading={saving} onPress={handleCreate} />
            </View>
          </View>
      ) : null}
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
  empty: {
    lineHeight: 22,
  },
  list: {
    gap: theme.spacing.sm,
  },
  item: {
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  itemTitle: {
    fontWeight: '600',
    flex: 1,
  },
  itemActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  smallButton: {
    flex: 1,
    minHeight: 44,
  },
  form: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  typeGrid: {
    gap: theme.spacing.sm,
  },
  notesArea: {
    minHeight: 80,
  },
  formActions: {
    gap: theme.spacing.sm,
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
  },
});
