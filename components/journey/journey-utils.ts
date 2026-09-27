import type { PrayerWithRelations } from '@/types/prayer';

export type JourneyFilter = 'all' | 'active' | 'answered' | 'praise' | 'hidden';

export type JourneyMoment = 'praise' | 'answered' | 'hidden' | 'archived' | 'active';

export const JOURNEY_FILTERS: { value: JourneyFilter; label: string; description: string }[] = [
  { value: 'all', label: 'All prayers', description: 'Your whole journey' },
  { value: 'active', label: 'Still praying', description: 'Prayers you are carrying now' },
  { value: 'answered', label: 'Answered', description: 'Every prayer God has answered' },
  {
    value: 'praise',
    label: 'Praise',
    description: 'Recently answered, still in your praise season',
  },
  { value: 'hidden', label: 'Hidden', description: 'Prayers you have set aside' },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isInPraiseWindow(prayer: PrayerWithRelations): boolean {
  if (prayer.status !== 'answered' || !prayer.praise_visible_until) return false;
  return prayer.praise_visible_until >= todayIso();
}

export function matchesJourneyFilter(prayer: PrayerWithRelations, filter: JourneyFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'hidden') return prayer.is_hidden;
  if (filter === 'praise') return isInPraiseWindow(prayer);
  if (filter === 'answered') return prayer.status === 'answered';
  if (filter === 'active') return prayer.status === 'active' && !prayer.is_hidden;
  return true;
}

export function getJourneyMoment(prayer: PrayerWithRelations): JourneyMoment {
  if (isInPraiseWindow(prayer)) return 'praise';
  if (prayer.status === 'answered') return 'answered';
  if (prayer.is_hidden || prayer.status === 'hidden') return 'hidden';
  if (prayer.status === 'archived') return 'archived';
  return 'active';
}

/** The moment a prayer sits at in the timeline: when it was answered, or when it began. */
export function getMomentDate(prayer: PrayerWithRelations): Date {
  return new Date(prayer.status === 'answered' && prayer.answered_at ? prayer.answered_at : prayer.created_at);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const diff = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return Math.max(0, Math.round(diff / 86_400_000));
}

export function formatShortDate(date: Date): string {
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export type JourneySection = {
  key: string;
  title: string;
  data: PrayerWithRelations[];
};

export function groupByMonth(prayers: PrayerWithRelations[]): JourneySection[] {
  const sorted = [...prayers].sort(
    (a, b) => getMomentDate(b).getTime() - getMomentDate(a).getTime(),
  );
  const now = new Date();
  const sections: JourneySection[] = [];

  for (const prayer of sorted) {
    const date = getMomentDate(prayer);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    let section = sections[sections.length - 1];

    if (!section || section.key !== key) {
      const isThisMonth =
        date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      section = {
        key,
        title: isThisMonth
          ? 'This month'
          : date.toLocaleDateString(undefined, {
              month: 'long',
              ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
            }),
        data: [],
      };
      sections.push(section);
    }

    section.data.push(prayer);
  }

  return sections;
}
