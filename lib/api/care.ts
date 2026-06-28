import { supabase } from '@/lib/supabase';
import { ensureAuthenticated } from '@/lib/auth-session';
import type {
  CareAction,
  CareActionStatus,
  CreateCareActionInput,
  PraiseReport,
} from '@/types/care';

export async function fetchCareActions(prayerId: string): Promise<{
  data: CareAction[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('care_actions')
    .select('*, care_action_assignees(*)')
    .eq('prayer_id', prayerId)
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as CareAction[], error: null };
}

export async function createCareAction(
  input: CreateCareActionInput,
): Promise<{ error: string | null }> {
  const { userId, error: authError } = await ensureAuthenticated();
  if (authError || !userId) return { error: authError };

  const { data: action, error: actionError } = await supabase
    .from('care_actions')
    .insert({
      prayer_id: input.prayerId,
      created_by: userId,
      action_type: input.actionType,
      custom_label: input.actionType === 'custom' ? input.customLabel?.trim() || null : null,
      due_date: input.dueDate ?? null,
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single();

  if (actionError || !action) return { error: actionError?.message ?? 'Could not create care action.' };

  if (input.assigneeName?.trim()) {
    const { error: assigneeError } = await supabase.from('care_action_assignees').insert({
      care_action_id: action.id,
      external_name: input.assigneeName.trim(),
      is_primary: true,
    });

    if (assigneeError) return { error: assigneeError.message };
  }

  await supabase.from('prayer_timeline_events').insert({
    prayer_id: input.prayerId,
    actor_id: userId,
    event_type: 'care_action_created',
    metadata: {
      action_type: input.actionType,
      assignee: input.assigneeName?.trim() || null,
    },
  });

  return { error: null };
}

export async function updateCareActionStatus(
  careActionId: string,
  status: CareActionStatus,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('update_care_action_status', {
    p_care_action_id: careActionId,
    p_status: status,
  });

  if (error?.message.includes('update_care_action_status')) {
    return {
      error:
        'Could not update care action. Run migration 20250628000011_creator_keeps_personal.sql in Supabase.',
    };
  }

  return { error: error?.message ?? null };
}

export async function fetchPraiseReport(prayerId: string): Promise<{
  data: PraiseReport | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('praise_reports')
    .select('*')
    .eq('prayer_id', prayerId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: (data as PraiseReport | null) ?? null, error: null };
}

export async function savePraiseReport(
  prayerId: string,
  body: string,
): Promise<{ error: string | null }> {
  const { userId, error: authError } = await ensureAuthenticated();
  if (authError || !userId) return { error: authError };

  const trimmed = body.trim();
  if (!trimmed) return { error: 'Please write your praise report.' };

  const { data: existing } = await supabase
    .from('praise_reports')
    .select('id')
    .eq('prayer_id', prayerId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('praise_reports')
      .update({ body: trimmed })
      .eq('id', existing.id);

    return { error: error?.message ?? null };
  }

  const { error } = await supabase.from('praise_reports').insert({
    prayer_id: prayerId,
    author_id: userId,
    body: trimmed,
  });

  if (error) return { error: error.message };

  await supabase.from('prayer_timeline_events').insert({
    prayer_id: prayerId,
    actor_id: userId,
    event_type: 'praise_added',
    metadata: {},
  });

  return { error: null };
}