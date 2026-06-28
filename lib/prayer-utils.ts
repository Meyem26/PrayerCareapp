import type { PrayerSchedule, PrayerWithRelations, ScheduleType } from '@/types/prayer';

export function getScheduleFromPrayer(
  prayer: PrayerWithRelations,
): PrayerSchedule | null {
  if (!prayer.prayer_schedules) return null;
  return Array.isArray(prayer.prayer_schedules)
    ? prayer.prayer_schedules[0] ?? null
    : prayer.prayer_schedules;
}

export function getScriptureFromPrayer(prayer: PrayerWithRelations) {
  const snapshots = prayer.scripture_snapshots;
  if (!snapshots?.length) return null;
  return snapshots[0];
}

export function getCategoryLabel(prayer: PrayerWithRelations): string | null {
  return prayer.prayer_categories?.label ?? null;
}

export function isValidSchedule(type: ScheduleType, weekdays: number[]): boolean {
  if (type === 'specific_weekdays') {
    return weekdays.length > 0;
  }
  return true;
}
