import { t } from '@/lib/i18n';
import type { CareActionStatus, CareActionType } from '@/types/care';

export const CARE_ACTION_TYPES: { value: CareActionType; labelKey: string }[] = [
  { value: 'call', labelKey: 'care.typeCall' },
  { value: 'visit', labelKey: 'care.typeVisit' },
  { value: 'meal', labelKey: 'care.typeMeal' },
  { value: 'financial_help', labelKey: 'care.typeFinancial' },
  { value: 'transportation', labelKey: 'care.typeTransport' },
  { value: 'custom', labelKey: 'care.typeOther' },
];

export const CARE_STATUS_KEYS: Record<CareActionStatus, string> = {
  pending: 'care.statusPending',
  in_progress: 'care.statusInProgress',
  completed: 'care.statusDone',
  cancelled: 'care.statusCancelled',
};

export function getCareActionLabel(
  actionType: CareActionType,
  customLabel?: string | null,
): string {
  if (actionType === 'custom' && customLabel) return customLabel;
  const item = CARE_ACTION_TYPES.find((entry) => entry.value === actionType);
  return item ? t(item.labelKey) : actionType;
}

export function getCareStatusLabel(status: CareActionStatus): string {
  return t(CARE_STATUS_KEYS[status]);
}
