-- Allow sermon note scripture snapshots (insert/update were prayer-only)

DROP POLICY IF EXISTS scripture_snapshots_insert ON public.scripture_snapshots;

CREATE POLICY scripture_snapshots_insert ON public.scripture_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      prayer_id IS NOT NULL
      AND public.is_prayer_creator(prayer_id, auth.uid())
    )
    OR (
      sermon_reference_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.sermon_references sr
        INNER JOIN public.sermon_notes sn ON sn.id = sr.sermon_note_id
        WHERE sr.id = sermon_reference_id
          AND sn.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS scripture_snapshots_update ON public.scripture_snapshots;

CREATE POLICY scripture_snapshots_update ON public.scripture_snapshots
  FOR UPDATE TO authenticated
  USING (
    (
      prayer_id IS NOT NULL
      AND public.is_prayer_creator(prayer_id, auth.uid())
    )
    OR (
      sermon_reference_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.sermon_references sr
        INNER JOIN public.sermon_notes sn ON sn.id = sr.sermon_note_id
        WHERE sr.id = sermon_reference_id
          AND sn.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    (
      prayer_id IS NOT NULL
      AND public.is_prayer_creator(prayer_id, auth.uid())
    )
    OR (
      sermon_reference_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.sermon_references sr
        INNER JOIN public.sermon_notes sn ON sn.id = sr.sermon_note_id
        WHERE sr.id = sermon_reference_id
          AND sn.user_id = auth.uid()
      )
    )
  );
