import type { CareActionStatus, CareActionType } from '@/types/care';

export const CARE_ACTION_TYPES: { value: CareActionType; label: string }[] = [
  { value: 'call', label: 'Phone call' },
  { value: 'visit', label: 'Visit' },
  { value: 'meal', label: 'Meal' },
  { value: 'financial_help', label: 'Financial help' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'custom', label: 'Other' },
];

export const CARE_STATUS_LABELS: Record<CareActionStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Done',
  cancelled: 'Cancelled',
};

export function getCareActionLabel(
  actionType: CareActionType,
  customLabel?: string | null,
): string {
  if (actionType === 'custom' && customLabel) return customLabel;
  return CARE_ACTION_TYPES.find((item) => item.value === actionType)?.label ?? actionType;
}
