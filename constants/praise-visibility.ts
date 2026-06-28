export type PraiseVisibilityOption = {
  days: number;
  label: string;
  description: string;
};

export const PRAISE_VISIBILITY_OPTIONS: PraiseVisibilityOption[] = [
  { days: 7, label: '1 week', description: 'Celebrate briefly, then archive to History' },
  { days: 30, label: '30 days', description: 'A full month of visible praise' },
  { days: 90, label: '90 days', description: 'Extended season of thanksgiving' },
  { days: 365, label: '1 year', description: 'Keep praise visible for a full year' },
];

export const DEFAULT_PRAISE_VISIBILITY_DAYS = 30;
