import { supabase } from '@/lib/supabase';
import { ensureAuthenticated } from '@/lib/auth-session';
import type { GroupInvite, GroupMember, GroupWithMeta, PrayerGroup } from '@/types/group';
import type { PrayerWithRelations } from '@/types/prayer';

export async function fetchMyGroups(): Promise<{
  data: GroupWithMeta[];
  error: string | null;
}> {
  const { error: authError } = await ensureAuthenticated();
  if (authError) return { data: [], error: authError };

  const { data: memberships, error: memberError } = await supabase
    .from('group_members')
    .select('role, group_id, prayer_groups(*)')
    .order('joined_at', { ascending: false });

  if (memberError) return { data: [], error: memberError.message };

  const groups: GroupWithMeta[] = (memberships ?? [])
    .filter((row) => row.prayer_groups)
    .map((row) => {
      const group = row.prayer_groups as unknown as PrayerGroup;
      return { ...group, my_role: row.role as GroupWithMeta['my_role'] };
    });

  return { data: groups, error: null };
}

export async function fetchGroup(groupId: string): Promise<{
  data: GroupWithMeta | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('prayer_groups')
    .select('*')
    .eq('id', groupId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Group not found.' };

  const { userId } = await ensureAuthenticated();
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId ?? '')
    .maybeSingle();

  return {
    data: { ...(data as PrayerGroup), my_role: membership?.role as GroupWithMeta['my_role'] },
    error: null,
  };
}

export async function fetchGroupMembers(groupId: string): Promise<{
  data: GroupMember[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('get_group_members', { p_group_id: groupId });
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as GroupMember[], error: null };
}

export async function fetchGroupPrayers(groupId: string): Promise<{
  data: PrayerWithRelations[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('prayers')
    .select('*, prayer_schedules(*), prayer_categories(label)')
    .eq('group_id', groupId)
    .eq('visibility', 'group')
    .order('updated_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as PrayerWithRelations[], error: null };
}

export async function createGroup(
  name: string,
  description?: string,
): Promise<{ data: PrayerGroup | null; error: string | null }> {
  const { error: authError } = await ensureAuthenticated();
  if (authError) return { data: null, error: authError };

  const { data, error } = await supabase.rpc('create_prayer_group', {
    p_name: name.trim(),
    p_description: description?.trim() || null,
  });

  if (error) {
    const message = error.message.includes('Not authenticated')
      ? 'Your session expired. Please sign out and sign in again.'
      : error.message;
    return { data: null, error: message };
  }

  if (!data) {
    return {
      data: null,
      error:
        'Could not create group. Run migration 20250628000010_fix_group_create_rls.sql in Supabase.',
    };
  }

  return { data: data as PrayerGroup, error: null };
}

export async function joinGroupByCode(
  inviteCode: string,
): Promise<{ data: PrayerGroup | null; error: string | null }> {
  const { error: authError } = await ensureAuthenticated();
  if (authError) return { data: null, error: authError };

  const { data, error } = await supabase.rpc('join_group_by_invite_code', {
    p_invite_code: inviteCode.trim(),
  });

  if (error) return { data: null, error: error.message };
  return { data: data as PrayerGroup, error: null };
}

export async function inviteMemberByEmail(
  groupId: string,
  email: string,
): Promise<{ error: string | null }> {
  const { userId, error: authError } = await ensureAuthenticated();
  if (authError || !userId) return { error: authError };

  const { error } = await supabase.from('group_invites').insert({
    group_id: groupId,
    invited_by: userId,
    email: email.trim().toLowerCase(),
  });

  return { error: error?.message ?? null };
}

export async function fetchPendingInvites(groupId: string): Promise<{
  data: GroupInvite[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('group_invites')
    .select('*')
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as GroupInvite[], error: null };
}

export async function updateMemberRole(
  memberId: string,
  role: 'member' | 'leader' | 'admin',
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('group_members')
    .update({ role })
    .eq('id', memberId);

  return { error: error?.message ?? null };
}

export async function removeMember(memberId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('group_members').delete().eq('id', memberId);
  return { error: error?.message ?? null };
}

export async function leaveGroup(groupId: string): Promise<{ error: string | null }> {
  const { userId, error: authError } = await ensureAuthenticated();
  if (authError || !userId) return { error: authError };

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  return { error: error?.message ?? null };
}
