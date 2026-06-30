/**
 * Dashboard deploy — paste ALL of this into Supabase Edge Functions editor.
 * Function name: notify-beta-signup
 *
 * Secrets:
 *   RESEND_API_KEY=...
 *   BETA_ADMIN_EMAIL=you@yourdomain.com
 *   BETA_FROM_EMAIL=PrayerCare <onboarding@resend.dev>  (use resend.dev until your domain is verified)
 *   SITE_URL=https://www.yourdomain.com
 *   APP_URL=https://app.yourdomain.com  (required if SITE_URL uses www.)
 *
 * Webhook optional: the website calls this function after signup if webhooks fail.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-beta-webhook-secret',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sendWithResend(apiKey, from, to, subject, html) {
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

function deriveAppUrl(siteUrl) {
  const explicit = Deno.env.get('APP_URL');
  if (explicit) return explicit.replace(/\/+$/, '');

  try {
    const parsed = new URL(siteUrl);
    const host = parsed.hostname.replace(/^www\./i, '');
    return `https://app.${host}`;
  } catch {
    return 'https://app.prayercare.app';
  }
}

async function verifyRecentWaitlistSignup(email) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return false;

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recent } = await admin
    .from('beta_waitlist')
    .select('id')
    .eq('email', email)
    .gte('created_at', since)
    .maybeSingle();

  if (recent?.id) return true;

  const { data: existing } = await admin
    .from('beta_waitlist')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  return Boolean(existing?.id);
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
    const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://prayercare.app').replace(/\/+$/, '');
    const appUrl = deriveAppUrl(siteUrl);

    if (!resendKey || !adminEmail) {
      console.warn('RESEND_API_KEY or BETA_ADMIN_EMAIL not set — skipping email.');
      return jsonResponse({ ok: true, emailed: false });
    }

    const errors = [];

    const adminErr = await sendWithResend(
      resendKey,
      fromEmail,
      adminEmail,
      `New PrayerCare beta signup: ${email}`,
      `<p>A new person joined the PrayerCare beta waitlist.</p>
       <p><strong>Email:</strong> ${email}<br/>
       <strong>Source:</strong> ${source}</p>
       <p>View signups in Supabase → beta_waitlist.</p>`,
    );
    if (adminErr) errors.push(adminErr);

    const userErr = await sendWithResend(
      resendKey,
      fromEmail,
      email,
      "You're in — welcome to the PrayerCare beta",
      `<div style="font-family: Georgia, 'Times New Roman', serif; color: #1F2937; line-height: 1.65; max-width: 560px;">
        <p style="margin: 0 0 1rem;">Thank you for joining the PrayerCare beta. We're so glad you're here.</p>
        <p style="margin: 0 0 1rem;">Open the app and sign up with the same email you used for beta:</p>
        <p style="margin: 0 0 1.5rem;">
          <a href="${appUrl}" style="display: inline-block; background: #4F8EF7; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 999px; font-family: Inter, Arial, sans-serif; font-weight: 600; font-size: 16px;">Open PrayerCare</a>
        </p>
        <p style="margin: 0 0 1rem; font-size: 14px; color: #6B7280;"><a href="${appUrl}" style="color: #4F8EF7;">${appUrl}</a></p>
        <p style="margin: 0 0 1rem;">On your phone: open that link in Safari or Chrome, then Add to Home Screen for the best experience.</p>
        <p style="margin: 0 0 1rem;">We're building a peaceful place to remember every prayer, every act of care, and every reason to praise God — and your feedback helps us get there.</p>
        <p style="margin: 0;">With gratitude,<br/>The PrayerCare team</p>
      </div>`,
    );
    if (userErr) errors.push(userErr);

    if (errors.length) {
      return jsonResponse({ ok: true, emailed: false, errors });
    }

    return jsonResponse({ ok: true, emailed: true });
  } catch (error) {
    console.error('notify-beta-signup error:', error);
    return jsonResponse({ error: 'Unexpected server error.' }, 500);
  }
});
