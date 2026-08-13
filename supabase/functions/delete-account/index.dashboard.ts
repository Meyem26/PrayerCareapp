/**
 * Dashboard paste variant of delete-account (same logic as index.ts).
 *
 * Deploy: Supabase → Edge Functions → Create function `delete-account`
 * Secrets required (usually auto for hosted): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type MemberRow = {
  user_id: string;
  role: 'member' | 'leader' | 'admin';
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function pickSuccessor(members: MemberRow[]): MemberRow | null {
  if (!members.length) return null;
  return (
    members.find((m) => m.role === 'admin') ||
    members.find((m) => m.role === 'leader') ||
    members[0] ||
    null
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Server is not configured for account deletion.' }, 503);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header.' }, 401);
    }

    let body: { confirm?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    if (body.confirm !== 'DELETE') {
      return jsonResponse(
        { error: 'Confirmation required. Send { "confirm": "DELETE" } to proceed.' },
        400,
      );
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Not authenticated.' }, 401);
    }

    const userId = user.id;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: ownedGroups, error: ownedError } = await admin
      .from('prayer_groups')
      .select('id')
      .eq('created_by', userId);

    if (ownedError) {
      console.error('owned groups lookup failed:', ownedError.message);
      return jsonResponse({ error: 'Could not prepare group ownership for deletion.' }, 500);
    }

    for (const group of ownedGroups ?? []) {
      const { data: otherMembers, error: membersError } = await admin
        .from('group_members')
        .select('user_id, role')
        .eq('group_id', group.id)
        .neq('user_id', userId);

      if (membersError) {
        console.error('group members lookup failed:', membersError.message);
        return jsonResponse({ error: 'Could not prepare group membership for deletion.' }, 500);
      }

      const successor = pickSuccessor((otherMembers ?? []) as MemberRow[]);

      if (!successor) {
        const { error: deleteGroupError } = await admin
          .from('prayer_groups')
          .delete()
          .eq('id', group.id);

        if (deleteGroupError) {
          console.error('delete sole-owner group failed:', deleteGroupError.message);
          return jsonResponse({ error: 'Could not delete a group you own alone.' }, 500);
        }
        continue;
      }

      const { error: transferError } = await admin
        .from('prayer_groups')
        .update({ created_by: successor.user_id })
        .eq('id', group.id);

      if (transferError) {
        console.error('transfer group ownership failed:', transferError.message);
        return jsonResponse({ error: 'Could not transfer group ownership.' }, 500);
      }

      const { error: promoteError } = await admin
        .from('group_members')
        .update({ role: 'admin' })
        .eq('group_id', group.id)
        .eq('user_id', successor.user_id);

      if (promoteError) {
        console.error('promote successor failed:', promoteError.message);
        return jsonResponse({ error: 'Could not assign a new group admin.' }, 500);
      }
    }

    const { data: groupPrayers, error: groupPrayersError } = await admin
      .from('prayers')
      .select('id, group_id')
      .eq('creator_id', userId)
      .eq('visibility', 'group')
      .not('group_id', 'is', null);

    if (groupPrayersError) {
      console.error('group prayers lookup failed:', groupPrayersError.message);
      return jsonResponse({ error: 'Could not prepare shared prayers for deletion.' }, 500);
    }

    for (const prayer of groupPrayers ?? []) {
      if (!prayer.group_id) continue;

      const { data: group, error: groupError } = await admin
        .from('prayer_groups')
        .select('created_by')
        .eq('id', prayer.group_id)
        .maybeSingle();

      if (groupError) {
        console.error('group owner lookup failed:', groupError.message);
        return jsonResponse({ error: 'Could not reassign a shared prayer.' }, 500);
      }

      if (!group?.created_by || group.created_by === userId) {
        const { error: deletePrayerError } = await admin.from('prayers').delete().eq('id', prayer.id);
        if (deletePrayerError) {
          console.error('delete orphan group prayer failed:', deletePrayerError.message);
          return jsonResponse({ error: 'Could not clean up a shared prayer.' }, 500);
        }
        continue;
      }

      const { error: reassignError } = await admin
        .from('prayers')
        .update({ creator_id: group.created_by })
        .eq('id', prayer.id);

      if (reassignError) {
        console.error('reassign group prayer failed:', reassignError.message);
        return jsonResponse({ error: 'Could not reassign a shared prayer.' }, 500);
      }
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('auth.admin.deleteUser failed:', deleteUserError.message);
      return jsonResponse(
        { error: deleteUserError.message || 'Could not delete your account. Please try again.' },
        500,
      );
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error('delete-account failed:', err);
    return jsonResponse({ error: 'Unexpected error while deleting account.' }, 500);
  }
});
