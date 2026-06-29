import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-beta-webhook-secret',
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
) {
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
    throw new Error(`Resend failed: ${response.status} ${detail}`);
  }
}

/** Website calls: confirm this email was just saved to beta_waitlist. */
async function verifyRecentWaitlistSignup(email: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return false;

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data } = await admin
    .from('beta_waitlist')
    .select('id')
    .eq('email', email)
    .gte('created_at', since)
    .maybeSingle();

  return Boolean(data?.id);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('BETA_WEBHOOK_SECRET');
    const providedSecret = req.headers.get('x-beta-webhook-secret');
    const isTrustedWebhook = Boolean(webhookSecret && providedSecret === webhookSecret);

    const body = await req.json();
    const record = body.record ?? body;
    const email = typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';
    const source = record.source ?? 'website';

    if (!email) {
      return jsonResponse({ error: 'Email is required.' }, 400);
    }

    if (!isTrustedWebhook) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return jsonResponse({ error: 'Unauthorized.' }, 401);
      }

      const verified = await verifyRecentWaitlistSignup(email);
      if (!verified) {
        return jsonResponse({ error: 'Signup not found.' }, 401);
      }
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const adminEmail = Deno.env.get('BETA_ADMIN_EMAIL');
    const fromEmail = Deno.env.get('BETA_FROM_EMAIL') ?? 'PrayerCare <onboarding@resend.dev>';
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://prayercare.app';

    if (!resendKey || !adminEmail) {
      console.warn('RESEND_API_KEY or BETA_ADMIN_EMAIL not set — skipping email.');
      return jsonResponse({ ok: true, emailed: false });
    }

    await sendWithResend(
      resendKey,
      fromEmail,
      adminEmail,
      `New PrayerCare beta signup: ${email}`,
      `<p>A new person joined the PrayerCare beta waitlist.</p>
       <p><strong>Email:</strong> ${email}<br/>
       <strong>Source:</strong> ${source}<br/>
       <strong>Time:</strong> ${new Date().toISOString()}</p>
       <p>View all signups in Supabase → <code>beta_waitlist</code>.</p>`,
    );

    await sendWithResend(
      resendKey,
      fromEmail,
      email,
      "You're on the PrayerCare beta list",
      `<p>Thank you for joining the PrayerCare beta.</p>
       <p>We're building a peaceful place to remember every prayer, every act of care, and every reason to praise God.</p>
       <p>We'll email you when the beta is ready for you to install.</p>
       <p>With gratitude,<br/>The PrayerCare team</p>
       <p><a href="${siteUrl}">${siteUrl}</a></p>`,
    );

    return jsonResponse({ ok: true, emailed: true });
  } catch (error) {
    console.error('notify-beta-signup error:', error);
    return jsonResponse({ error: 'Unexpected server error.' }, 500);
  }
});
