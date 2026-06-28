import type { TimelineEventType } from '@/types/prayer';

const TIMELINE_LABELS: Record<TimelineEventType, string> = {
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
  return TIMELINE_LABELS[eventType] ?? eventType;
}

export function getStatusLabel(status: string, isHidden: boolean): string {
  if (isHidden) return 'Hidden';
  if (status === 'answered') return 'Answered';
  if (status === 'active') return 'Active';
  return status;
}
