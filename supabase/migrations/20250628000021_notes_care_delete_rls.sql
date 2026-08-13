-- Step 8: Split prayer_notes / care_actions RLS so DELETE is not "any viewer".
-- Previously FOR ALL USING (can_view_prayer) allowed any group member to delete
-- another member's notes or care actions.

DROP POLICY IF EXISTS prayer_notes_all ON public.prayer_notes;

CREATE POLICY prayer_notes_select ON public.prayer_notes
  FOR SELECT TO authenticated
  USING (public.can_view_prayer(prayer_id, auth.uid()));

CREATE POLICY prayer_notes_insert ON public.prayer_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.can_view_prayer(prayer_id, auth.uid())
  );

CREATE POLICY prayer_notes_update ON public.prayer_notes
  FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid()
    OR public.can_edit_prayer(prayer_id, auth.uid())
  )
  WITH CHECK (
    author_id = auth.uid()
    AND public.can_view_prayer(prayer_id, auth.uid())
  );

CREATE POLICY prayer_notes_delete ON public.prayer_notes
  FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR public.can_edit_prayer(prayer_id, auth.uid())
  );

DROP POLICY IF EXISTS care_actions_all ON public.care_actions;

CREATE POLICY care_actions_select ON public.care_actions
  FOR SELECT TO authenticated
  USING (public.can_view_prayer(prayer_id, auth.uid()));

CREATE POLICY care_actions_insert ON public.care_actions
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.can_view_prayer(prayer_id, auth.uid())
  );

CREATE POLICY care_actions_update ON public.care_actions
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.can_edit_prayer(prayer_id, auth.uid())
  )
  WITH CHECK (
    public.can_view_prayer(prayer_id, auth.uid())
    AND (
      created_by = auth.uid()
      OR public.can_edit_prayer(prayer_id, auth.uid())
    )
  );

CREATE POLICY care_actions_delete ON public.care_actions
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.can_edit_prayer(prayer_id, auth.uid())
  );
