import type { ScheduleType } from '@/types/prayer';

export type ScheduleOption = {
  type: ScheduleType;
  label: string;
  description: string;
};

export const SCHEDULE_OPTIONS: ScheduleOption[] = [
  {
    type: 'once',
    label: 'Once',
    description: 'Pray about this today only',
  },
  {
    type: 'daily',
    label: 'Daily',
    description: 'Every day until you change it',
  },
  {
    type: 'weekly',
    label: 'Weekly',
    description: 'Same day each week',
  },
  {
    type: 'specific_weekdays',
    label: 'Specific days',
    description: 'Choose days of the week',
  },
  {
    type: 'until_answered',
    label: 'Until answered',
    description: 'Every day until marked answered',
  },
];

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function getScheduleLabel(type: ScheduleType): string {
  return SCHEDULE_OPTIONS.find((o) => o.type === type)?.label ?? type;
}
