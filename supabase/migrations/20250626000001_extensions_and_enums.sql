-- PrayerCare: extensions and enum types

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE prayer_visibility AS ENUM ('personal', 'group');
CREATE TYPE prayer_status AS ENUM ('active', 'answered', 'hidden', 'archived');
CREATE TYPE schedule_type AS ENUM (
  'once',
  'daily',
  'weekly',
  'specific_weekdays',
  'until_answered'
);
CREATE TYPE scripture_source AS ENUM ('ai', 'api', 'manual');
CREATE TYPE timeline_event_type AS ENUM (
  'created',
  'edited',
  'prayed',
  'hidden',
  'unhidden',
  'answered',
  'restarted',
  'note_added',
  'scripture_updated',
  'schedule_changed',
  'shared_to_group',
  'care_action_created',
  'care_action_completed',
  'praise_added'
);
CREATE TYPE group_member_role AS ENUM ('member', 'leader', 'admin');
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
CREATE TYPE care_action_type AS ENUM (
  'call',
  'visit',
  'meal',
  'financial_help',
  'transportation',
  'custom'
);
CREATE TYPE care_action_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE organization_role AS ENUM ('admin', 'pastor', 'viewer');
