import { t } from '@/lib/i18n';
import type { ScheduleType } from '@/types/prayer';

export type ScheduleOption = {
  type: ScheduleType;
  labelKey: string;
  descriptionKey: string;
};

export const SCHEDULE_OPTIONS: ScheduleOption[] = [
  {
    type: 'once',
    labelKey: 'schedule.once',
    descriptionKey: 'schedule.onceDesc',
  },
  {
    type: 'daily',
    labelKey: 'schedule.daily',
    descriptionKey: 'schedule.dailyDesc',
  },
  {
    type: 'weekly',
    labelKey: 'schedule.weekly',
    descriptionKey: 'schedule.weeklyDesc',
  },
  {
    type: 'specific_weekdays',
    labelKey: 'schedule.specificDays',
    descriptionKey: 'schedule.specificDaysDesc',
  },
  {
    type: 'until_answered',
    labelKey: 'schedule.untilAnswered',
    descriptionKey: 'schedule.untilAnsweredDesc',
  },
];

export const WEEKDAY_KEYS = [
  'schedule.weekdaySun',
  'schedule.weekdayMon',
  'schedule.weekdayTue',
  'schedule.weekdayWed',
  'schedule.weekdayThu',
  'schedule.weekdayFri',
  'schedule.weekdaySat',
] as const;

/** @deprecated Prefer getWeekdayLabel — kept for callers that need a short English fallback. */
export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function getWeekdayLabel(dayIndex: number): string {
  const key = WEEKDAY_KEYS[dayIndex];
  return key ? t(key) : String(dayIndex);
}

export function getScheduleLabel(type: ScheduleType): string {
  const option = SCHEDULE_OPTIONS.find((o) => o.type === type);
  return option ? t(option.labelKey) : type;
}

export function getScheduleDescription(type: ScheduleType): string {
  const option = SCHEDULE_OPTIONS.find((o) => o.type === type);
  return option ? t(option.descriptionKey) : '';
}

/** Conversational wording for the create flow ("Every day", "Mon, Wed, Fri"). */
export const REPEAT_CHOICES: {
  type: Exclude<ScheduleType, 'once'>;
  labelKey: string;
  hintKey: string;
}[] = [
  { type: 'daily', labelKey: 'schedule.everyDay', hintKey: 'schedule.everyDayHint' },
  {
    type: 'until_answered',
    labelKey: 'schedule.untilAnswered',
    hintKey: 'schedule.untilAnsweredHint',
  },
  {
    type: 'specific_weekdays',
    labelKey: 'schedule.certainDays',
    hintKey: 'schedule.certainDaysHint',
  },
  { type: 'weekly', labelKey: 'schedule.onceAWeek', hintKey: 'schedule.onceAWeekHint' },
];

export function describeRepeat(type: ScheduleType, weekdays: number[]): string {
  if (type === 'once') return t('schedule.justToday');
  if (type === 'specific_weekdays') {
    if (weekdays.length === 0) return t('schedule.certainDays');
    if (weekdays.length === 7) return t('schedule.everyDay');
    return [...weekdays]
      .sort()
      .map((day) => getWeekdayLabel(day))
      .join(', ');
  }
  const choice = REPEAT_CHOICES.find((item) => item.type === type);
  return choice ? t(choice.labelKey) : getScheduleLabel(type);
}
