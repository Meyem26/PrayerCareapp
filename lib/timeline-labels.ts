import { t } from '@/lib/i18n';
import type { TimelineEventType } from '@/types/prayer';

const TIMELINE_LABEL_KEYS: Record<TimelineEventType, string> = {
  created: 'timeline.created',
  edited: 'timeline.edited',
  prayed: 'timeline.prayed',
  hidden: 'timeline.hidden',
  unhidden: 'timeline.unhidden',
  answered: 'timeline.answered',
  restarted: 'timeline.restarted',
  note_added: 'timeline.noteAdded',
  scripture_updated: 'timeline.scriptureUpdated',
  schedule_changed: 'timeline.scheduleChanged',
  shared_to_group: 'timeline.sharedToGroup',
  care_action_created: 'timeline.careCreated',
  care_action_completed: 'timeline.careCompleted',
  praise_added: 'timeline.praiseAdded',
};

const TIMELINE_LABEL_FALLBACK: Record<TimelineEventType, string> = {
  created: 'Prayer created',
  edited: 'Prayer updated',
  prayed: 'Prayed',
  hidden: 'Hidden from Today',
  unhidden: 'Restored to Today',
  answered: 'Prayer answered',
  restarted: 'Prayer restarted',
  note_added: 'Note added',
  scripture_updated: 'Scripture updated',
  schedule_changed: 'Schedule updated',
  shared_to_group: 'Shared with group',
  care_action_created: 'Care action added',
  care_action_completed: 'Care action completed',
  praise_added: 'Praise report added',
};

export function getTimelineLabel(eventType: TimelineEventType): string {
  const key = TIMELINE_LABEL_KEYS[eventType];
  if (!key) return eventType;
  const translated = t(key);
  if (!translated || translated === key || translated.startsWith('[missing')) {
    return TIMELINE_LABEL_FALLBACK[eventType] ?? eventType;
  }
  return translated;
}

export function getStatusLabel(status: string, isHidden: boolean): string {
  if (isHidden) return t('status.hidden');
  if (status === 'answered') return t('status.answered');
  if (status === 'active') return t('status.active');
  return status;
}
