-- PrayerCare: categories, prayers, groups, care, sermon notes
-- Scheduling uses computed visibility (no per-member occurrence rows).

CREATE TABLE public.prayer_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, slug)
);

CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.prayer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES public.organizations (id) ON DELETE SET NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER prayer_groups_set_updated_at
  BEFORE UPDATE ON public.prayer_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.prayer_groups (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role group_member_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

CREATE TABLE public.group_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.prayer_groups (id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status invite_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.prayers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.prayer_groups (id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.prayer_categories (id) ON DELETE SET NULL,
  visibility prayer_visibility NOT NULL DEFAULT 'personal',
  title TEXT NOT NULL,
  prayer_point TEXT,
  body TEXT NOT NULL,
  status prayer_status NOT NULL DEFAULT 'active',
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  answered_at TIMESTAMPTZ,
  praise_visible_until DATE,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ai_prompt_snapshot TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT prayers_visibility_group_check CHECK (
    (visibility = 'personal' AND group_id IS NULL)
    OR (visibility = 'group' AND group_id IS NOT NULL)
  )
);

CREATE INDEX prayers_creator_status_idx ON public.prayers (creator_id, status);
CREATE INDEX prayers_group_status_idx ON public.prayers (group_id, status) WHERE group_id IS NOT NULL;
CREATE INDEX prayers_answered_at_idx ON public.prayers (answered_at) WHERE answered_at IS NOT NULL;

CREATE TRIGGER prayers_set_updated_at
  BEFORE UPDATE ON public.prayers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.prayer_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL UNIQUE REFERENCES public.prayers (id) ON DELETE CASCADE,
  schedule_type schedule_type NOT NULL DEFAULT 'daily',
  weekdays SMALLINT[] NOT NULL DEFAULT '{}',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  custom_end_date DATE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT prayer_schedules_weekdays_check CHECK (
    schedule_type <> 'specific_weekdays'
    OR cardinality(weekdays) > 0
  )
);

CREATE TRIGGER prayer_schedules_set_updated_at
  BEFORE UPDATE ON public.prayer_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Written only when a user actually prays (not pre-generated).
CREATE TABLE public.prayer_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL REFERENCES public.prayers (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  prayed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (prayer_id, user_id, activity_date)
);

CREATE INDEX prayer_activity_logs_user_date_idx
  ON public.prayer_activity_logs (user_id, activity_date DESC);

CREATE TABLE public.scripture_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID REFERENCES public.prayers (id) ON DELETE CASCADE,
  sermon_reference_id UUID,
  reference TEXT NOT NULL,
  text TEXT NOT NULL,
  translation_id TEXT NOT NULL DEFAULT 'NIV',
  source scripture_source NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER scripture_snapshots_set_updated_at
  BEFORE UPDATE ON public.scripture_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.prayer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL REFERENCES public.prayers (id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER prayer_notes_set_updated_at
  BEFORE UPDATE ON public.prayer_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.prayer_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL REFERENCES public.prayers (id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  event_type timeline_event_type NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX prayer_timeline_events_prayer_created_idx
  ON public.prayer_timeline_events (prayer_id, created_at DESC);

CREATE TABLE public.praise_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL UNIQUE REFERENCES public.prayers (id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER praise_reports_set_updated_at
  BEFORE UPDATE ON public.praise_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.care_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL REFERENCES public.prayers (id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  action_type care_action_type NOT NULL,
  custom_label TEXT,
  due_date DATE,
  status care_action_status NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT care_actions_custom_label_check CHECK (
    action_type <> 'custom' OR custom_label IS NOT NULL
  )
);

CREATE TRIGGER care_actions_set_updated_at
  BEFORE UPDATE ON public.care_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.care_action_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_action_id UUID NOT NULL REFERENCES public.care_actions (id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  external_name TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT care_action_assignees_target_check CHECK (
    user_id IS NOT NULL OR external_name IS NOT NULL
  )
);

CREATE TABLE public.sermon_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  speaker TEXT,
  church TEXT,
  sermon_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meditation_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER sermon_notes_set_updated_at
  BEFORE UPDATE ON public.sermon_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.sermon_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sermon_note_id UUID NOT NULL REFERENCES public.sermon_notes (id) ON DELETE CASCADE,
  reference TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.scripture_snapshots
  ADD CONSTRAINT scripture_snapshots_sermon_reference_fk
  FOREIGN KEY (sermon_reference_id)
  REFERENCES public.sermon_references (id)
  ON DELETE CASCADE;

CREATE TABLE public.scripture_api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_id TEXT NOT NULL,
  reference_normalized TEXT NOT NULL,
  text TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  UNIQUE (translation_id, reference_normalized)
);

CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role organization_role NOT NULL DEFAULT 'viewer',
  UNIQUE (organization_id, user_id)
);

-- Default system categories (user_id NULL = available to everyone)
INSERT INTO public.prayer_categories (user_id, slug, label, sort_order) VALUES
  (NULL, 'health', 'Health & Healing', 1),
  (NULL, 'family', 'Family', 2),
  (NULL, 'finances', 'Finances', 3),
  (NULL, 'ministry', 'Ministry', 4),
  (NULL, 'salvation', 'Salvation', 5),
  (NULL, 'guidance', 'Guidance', 6),
  (NULL, 'relationships', 'Relationships', 7),
  (NULL, 'thanksgiving', 'Thanksgiving', 8),
  (NULL, 'missionary', 'Missionary', 9),
  (NULL, 'other', 'Other', 99);
