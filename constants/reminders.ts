/** Shared helpers for prayer reminder times (HH:MM). */

export const REMINDER_TIME_PRESETS: { label: string; value: string }[] = [
  { label: '6:00 AM', value: '06:00' },
  { label: '7:00 AM', value: '07:00' },
  { label: '8:00 AM', value: '08:00' },
  { label: '9:00 AM', value: '09:00' },
  { label: '12:00 PM', value: '12:00' },
  { label: '3:00 PM', value: '15:00' },
  { label: '6:00 PM', value: '18:00' },
  { label: '7:00 PM', value: '19:00' },
  { label: '8:00 PM', value: '20:00' },
  { label: '9:00 PM', value: '21:00' },
];

export function normalizeReminderTime(raw: string): string {
  const trimmed = raw.trim();
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(trimmed);
  if (!match) return '08:00';
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function parseReminderTime(time: string): { hour: number; minute: number } {
  const normalized = normalizeReminderTime(time);
  const [h, m] = normalized.split(':').map(Number);
  return { hour: h, minute: m };
}

export function formatReminderTimeLabel(time: string): string {
  const { hour, minute } = parseReminderTime(time);
  const preset = REMINDER_TIME_PRESETS.find((item) => item.value === normalizeReminderTime(time));
  if (preset) return preset.label;

  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

export function reminderNotificationBody(title: string, prayerPoint?: string | null): string {
  const focus = (prayerPoint?.trim() || title.trim() || 'your prayer').replace(/\s+/g, ' ');
  return `Time to pray for ${focus}.`;
}

/** Expo WeeklyTrigger weekday: 1 = Sunday … 7 = Saturday. Our DB uses 0–6 (Sun–Sat). */
export function toExpoWeekday(jsDow: number): number {
  return ((jsDow % 7) + 7) % 7 + 1;
}
