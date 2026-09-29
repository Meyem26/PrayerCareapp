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

/** Conversational wording for the create flow ("Every day", "Mon, Wed, Fri"). */
export const REPEAT_CHOICES: { type: Exclude<ScheduleType, 'once'>; label: string; hint: string }[] = [
  { type: 'daily', label: 'Every day', hint: 'Back on Today every day until you change it.' },
  {
    type: 'until_answered',
    label: 'Until answered',
    hint: 'Every day, until you mark it answered.',
  },
  { type: 'specific_weekdays', label: 'Certain days', hint: 'Only on the days you pick.' },
  { type: 'weekly', label: 'Once a week', hint: 'On this same day each week.' },
];

export function describeRepeat(type: ScheduleType, weekdays: number[]): string {
  if (type === 'once') return 'Just today';
  if (type === 'specific_weekdays') {
    if (weekdays.length === 0) return 'Certain days';
    if (weekdays.length === 7) return 'Every day';
    return [...weekdays]
      .sort()
      .map((day) => WEEKDAY_LABELS[day])
      .join(', ');
  }
  return REPEAT_CHOICES.find((choice) => choice.type === type)?.label ?? getScheduleLabel(type);
}
