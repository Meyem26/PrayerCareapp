-- PrayerCare: Row Level Security policies

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripture_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.praise_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_action_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sermon_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sermon_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripture_api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Notification preferences
CREATE POLICY notification_preferences_select_own ON public.notification_preferences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY notification_preferences_update_own ON public.notification_preferences
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Push tokens
CREATE POLICY push_tokens_all_own ON public.push_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Categories: system + own custom
CREATE POLICY prayer_categories_select ON public.prayer_categories
  FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY prayer_categories_insert_own ON public.prayer_categories
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY prayer_categories_update_own ON public.prayer_categories
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY prayer_categories_delete_own ON public.prayer_categories
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Groups
CREATE POLICY prayer_groups_select_member ON public.prayer_groups
  FOR SELECT TO authenticated
  USING (public.is_group_member(id, auth.uid()));

CREATE POLICY prayer_groups_insert ON public.prayer_groups
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY prayer_groups_update_leader ON public.prayer_groups
  FOR UPDATE TO authenticated
  USING (public.is_group_leader_or_admin(id, auth.uid()))
  WITH CHECK (public.is_group_leader_or_admin(id, auth.uid()));

CREATE POLICY prayer_groups_delete_admin ON public.prayer_groups
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

-- Group members
CREATE POLICY group_members_select ON public.group_members
  FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY group_members_insert ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_group_leader_or_admin(group_id, auth.uid())
  );

CREATE POLICY group_members_update_leader ON public.group_members
  FOR UPDATE TO authenticated
  USING (public.is_group_leader_or_admin(group_id, auth.uid()))
  WITH CHECK (public.is_group_leader_or_admin(group_id, auth.uid()));

CREATE POLICY group_members_delete_leader ON public.group_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_group_leader_or_admin(group_id, auth.uid())
  );

-- Group invites
CREATE POLICY group_invites_select ON public.group_invites
  FOR SELECT TO authenticated
  USING (
    public.is_group_leader_or_admin(group_id, auth.uid())
    OR lower(email) = lower((auth.jwt() ->> 'email'))
  );

CREATE POLICY group_invites_insert ON public.group_invites
  FOR INSERT TO authenticated
  WITH CHECK (public.is_group_leader_or_admin(group_id, auth.uid()));

CREATE POLICY group_invites_update ON public.group_invites
  FOR UPDATE TO authenticated
  USING (public.is_group_leader_or_admin(group_id, auth.uid()))
  WITH CHECK (public.is_group_leader_or_admin(group_id, auth.uid()));

-- Prayers
CREATE POLICY prayers_select ON public.prayers
  FOR SELECT TO authenticated
  USING (public.can_view_prayer(id, auth.uid()));

CREATE POLICY prayers_insert ON public.prayers
  FOR INSERT TO authenticated
  WITH CHECK (
    creator_id = auth.uid()
    AND (
      visibility = 'personal'
      OR (
        visibility = 'group'
        AND group_id IS NOT NULL
        AND public.is_group_member(group_id, auth.uid())
      )
    )
  );

CREATE POLICY prayers_update ON public.prayers
  FOR UPDATE TO authenticated
  USING (public.can_edit_prayer(id, auth.uid()))
  WITH CHECK (public.can_edit_prayer(id, auth.uid()));

CREATE POLICY prayers_delete ON public.prayers
  FOR DELETE TO authenticated
  USING (
    creator_id = auth.uid()
    OR (
      group_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = prayers.group_id
          AND gm.user_id = auth.uid()
          AND gm.role = 'admin'
      )
    )
  );

-- Schedules follow prayer access
CREATE POLICY prayer_schedules_select ON public.prayer_schedules
  FOR SELECT TO authenticated
  USING (public.can_view_prayer(prayer_id, auth.uid()));

CREATE POLICY prayer_schedules_insert ON public.prayer_schedules
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_prayer(prayer_id, auth.uid()));

CREATE POLICY prayer_schedules_update ON public.prayer_schedules
  FOR UPDATE TO authenticated
  USING (public.can_edit_prayer(prayer_id, auth.uid()))
  WITH CHECK (public.can_edit_prayer(prayer_id, auth.uid()));

CREATE POLICY prayer_schedules_delete ON public.prayer_schedules
  FOR DELETE TO authenticated
  USING (public.can_edit_prayer(prayer_id, auth.uid()));

-- Activity logs
CREATE POLICY prayer_activity_logs_select ON public.prayer_activity_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_view_prayer(prayer_id, auth.uid()));

CREATE POLICY prayer_activity_logs_insert ON public.prayer_activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_view_prayer(prayer_id, auth.uid()));

-- Timeline
CREATE POLICY prayer_timeline_events_select ON public.prayer_timeline_events
  FOR SELECT TO authenticated
  USING (public.can_view_prayer(prayer_id, auth.uid()));

CREATE POLICY prayer_timeline_events_insert ON public.prayer_timeline_events
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND public.can_view_prayer(prayer_id, auth.uid())
  );

-- Notes, praise, scripture, care, sermon — inherit prayer/owner visibility
CREATE POLICY prayer_notes_all ON public.prayer_notes
  FOR ALL TO authenticated
  USING (public.can_view_prayer(prayer_id, auth.uid()))
  WITH CHECK (author_id = auth.uid() AND public.can_view_prayer(prayer_id, auth.uid()));

CREATE POLICY praise_reports_select ON public.praise_reports
  FOR SELECT TO authenticated
  USING (public.can_view_prayer(prayer_id, auth.uid()));

CREATE POLICY praise_reports_insert ON public.praise_reports
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.can_view_prayer(prayer_id, auth.uid()));

CREATE POLICY praise_reports_update ON public.praise_reports
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY scripture_snapshots_select ON public.scripture_snapshots
  FOR SELECT TO authenticated
  USING (
    (prayer_id IS NOT NULL AND public.can_view_prayer(prayer_id, auth.uid()))
    OR (
      sermon_reference_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.sermon_references sr
        INNER JOIN public.sermon_notes sn ON sn.id = sr.sermon_note_id
        WHERE sr.id = scripture_snapshots.sermon_reference_id
          AND sn.user_id = auth.uid()
      )
    )
  );

CREATE POLICY care_actions_all ON public.care_actions
  FOR ALL TO authenticated
  USING (public.can_view_prayer(prayer_id, auth.uid()))
  WITH CHECK (created_by = auth.uid() AND public.can_view_prayer(prayer_id, auth.uid()));

CREATE POLICY care_action_assignees_select ON public.care_action_assignees
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.care_actions ca
      WHERE ca.id = care_action_id
        AND public.can_view_prayer(ca.prayer_id, auth.uid())
    )
  );

CREATE POLICY care_action_assignees_write ON public.care_action_assignees
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.care_actions ca
      WHERE ca.id = care_action_id
        AND public.can_edit_prayer(ca.prayer_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.care_actions ca
      WHERE ca.id = care_action_id
        AND public.can_edit_prayer(ca.prayer_id, auth.uid())
    )
  );

CREATE POLICY sermon_notes_all_own ON public.sermon_notes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY sermon_references_all ON public.sermon_references
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sermon_notes sn
      WHERE sn.id = sermon_note_id AND sn.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sermon_notes sn
      WHERE sn.id = sermon_note_id AND sn.user_id = auth.uid()
    )
  );

-- Scripture cache and org tables: service role only (no client policies)
CREATE POLICY scripture_api_cache_deny ON public.scripture_api_cache
  FOR ALL TO authenticated
  USING (FALSE);

CREATE POLICY organizations_deny ON public.organizations
  FOR ALL TO authenticated
  USING (FALSE);

CREATE POLICY organization_members_deny ON public.organization_members
  FOR ALL TO authenticated
  USING (FALSE);

-- Auto-add group creator as admin
CREATE OR REPLACE FUNCTION public.handle_new_prayer_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_prayer_group_created
  AFTER INSERT ON public.prayer_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_prayer_group();
