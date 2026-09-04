-- PrayerCare: multiple reminder times per prayer (local OS notifications)
-- Backward compatible: existing prayers keep their schedules; reminders start empty.

CREATE TABLE IF NOT EXISTS public.prayer_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL REFERENCES public.prayers (id) ON DELETE CASCADE,
  reminder_time TIME NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT prayer_reminders_unique_time UNIQUE (prayer_id, reminder_time)
);

CREATE INDEX IF NOT EXISTS prayer_reminders_prayer_id_idx
  ON public.prayer_reminders (prayer_id);

ALTER TABLE public.prayer_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY prayer_reminders_select ON public.prayer_reminders
  FOR SELECT TO authenticated
  USING (public.can_view_prayer(prayer_id, auth.uid()));

CREATE POLICY prayer_reminders_insert ON public.prayer_reminders
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_prayer(prayer_id, auth.uid()));

CREATE POLICY prayer_reminders_update ON public.prayer_reminders
  FOR UPDATE TO authenticated
  USING (public.can_edit_prayer(prayer_id, auth.uid()))
  WITH CHECK (public.can_edit_prayer(prayer_id, auth.uid()));

CREATE POLICY prayer_reminders_delete ON public.prayer_reminders
  FOR DELETE TO authenticated
  USING (public.can_edit_prayer(prayer_id, auth.uid()));

COMMENT ON TABLE public.prayer_reminders IS
  'One prayer may have many reminder times. OS local notifications are scheduled on-device from these rows.';
