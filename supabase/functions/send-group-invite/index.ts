import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sendWithResend(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
): Promise<string | null> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error(`Resend failed (${to}):`, response.status, detail);
    return `Resend ${response.status}: ${detail}`;
  }
  return null;
}

function appBaseUrl(): string {
  const explicit = Deno.env.get('APP_URL') ?? Deno.env.get('EXPO_PUBLIC_WEB_APP_URL');
  if (explicit) return explicit.replace(/\/+$/, '');
  const site = Deno.env.get('SITE_URL');
  if (site) {
    try {
      const host = new URL(site).hostname.replace(/^www\./i, '');
      return `https://app.${host}`;
    } catch {
      /* fall through */
    }
  }
  return 'https://app.prayercare.online';
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
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail =
      Deno.env.get('FROM_EMAIL') ??
      Deno.env.get('BETA_FROM_EMAIL') ??
      'PrayerCare <hello@prayercare.online>';

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Server is not configured.' }, 503);
    }
    if (!resendKey) {
      return jsonResponse({ error: 'Email is not configured (RESEND_API_KEY).' }, 503);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization.' }, 401);
    }

    let body: { invite_id?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    if (!body.invite_id) {
      return jsonResponse({ error: 'invite_id is required.' }, 400);
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

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: invite, error: inviteError } = await admin
      .from('group_invites')
      .select('id, email, token, require_code, status, expires_at, group_id, invited_by')
      .eq('id', body.invite_id)
      .maybeSingle();

    if (inviteError || !invite) {
      return jsonResponse({ error: 'Invite not found.' }, 404);
    }

    if (invite.invited_by !== user.id) {
      const { data: membership } = await admin
        .from('group_members')
        .select('role')
        .eq('group_id', invite.group_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership || (membership.role !== 'leader' && membership.role !== 'admin')) {
        return jsonResponse({ error: 'Only group leaders can send invites.' }, 403);
      }
    }

    if (invite.status !== 'pending') {
      return jsonResponse({ error: 'Invite is not pending.' }, 400);
    }

    const { data: group } = await admin
      .from('prayer_groups')
      .select('name, invite_code')
      .eq('id', invite.group_id)
      .maybeSingle();

    if (!group) {
      return jsonResponse({ error: 'Group not found.' }, 404);
    }

    const base = appBaseUrl();
    const joinByCodeUrl = `${base}/groups/join?code=${encodeURIComponent(group.invite_code)}`;
    const joinByTokenUrl = `${base}/groups/join?token=${encodeURIComponent(invite.token)}`;
    const primaryUrl = invite.require_code ? joinByCodeUrl : joinByTokenUrl;

    const accessBlurb = invite.require_code
      ? `<p>Use this invite code in the app: <strong>${group.invite_code}</strong></p>
         <p><a href="${joinByCodeUrl}">Open PrayerCare and join</a></p>
         <p>You will need to enter the code (or use the link above, which fills it in).</p>`
      : `<p><a href="${joinByTokenUrl}">Accept your invitation</a></p>
         <p>Sign in with <strong>${invite.email}</strong> — the link is enough; no code required.</p>
         <p>If you do not have an account yet, <a href="${base}/sign-up">create one</a> with this email first.</p>`;

    const html = `
      <div style="font-family: Georgia, serif; color: #1a1a1a; line-height: 1.6; max-width: 520px;">
        <h1 style="font-size: 22px;">You're invited to pray together</h1>
        <p><strong>${group.name}</strong> on PrayerCare wants you to join their private prayer group.</p>
        ${accessBlurb}
        <p style="color: #666; font-size: 14px;">This invite expires in 14 days. If you did not expect this, you can ignore this email.</p>
      </div>
    `;

    const sendError = await sendWithResend(
      resendKey,
      fromEmail,
      invite.email,
      `You're invited to ${group.name} on PrayerCare`,
      html,
    );

    if (sendError) {
      return jsonResponse({ error: 'Could not send invite email.', detail: sendError }, 502);
    }

    return jsonResponse({
      ok: true,
      email: invite.email,
      join_url: primaryUrl,
    });
  } catch (err) {
    console.error('send-group-invite failed:', err);
    return jsonResponse({ error: 'Unexpected server error.' }, 500);
  }
});
