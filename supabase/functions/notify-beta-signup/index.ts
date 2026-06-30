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

function deriveAppUrl(siteUrl: string): string {
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

/** Website calls: confirm this email was just saved to beta_waitlist. */
async function verifyRecentWaitlistSignup(email: string): Promise<boolean> {
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

    const errors: string[] = [];

    const adminErr = await sendWithResend(
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
    if (adminErr) errors.push(adminErr);

    const userErr = await sendWithResend(
      resendKey,
      fromEmail,
      email,
      "You're in — welcome to the PrayerCare beta",
      `<div style="font-family: Georgia, 'Times New Roman', serif; color: #1F2937; line-height: 1.65; max-width: 560px;">
        <p style="font-size: 18px; margin: 0 0 1rem;">Dear friend in prayer,</p>
        <p style="margin: 0 0 1rem;">Thank you for joining the <strong>PrayerCare beta</strong>. We're grateful you're here.</p>
        <p style="margin: 0 0 1rem;">PrayerCare was built for the moments we all know — when someone asks for prayer, when life gets busy, and when we want to remember every burden, every act of care, and every reason to praise God.</p>
        <p style="margin: 0 0 1rem;">You're among the first people helping us shape that experience. Your prayers, feedback, and honest impressions will make PrayerCare better for churches, groups, and families everywhere.</p>
        <p style="margin: 0 0 0.5rem;"><strong>Your next step</strong></p>
        <p style="margin: 0 0 1rem;">Open PrayerCare and create your account using <strong>this same email address</strong> (${email}):</p>
        <p style="margin: 0 0 1.5rem;">
          <a href="${appUrl}" style="display: inline-block; background: #4F8EF7; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 999px; font-family: Inter, Arial, sans-serif; font-weight: 600; font-size: 16px;">Open PrayerCare</a>
        </p>
        <p style="margin: 0 0 0.5rem; font-size: 14px; color: #6B7280;">Or copy this link: <a href="${appUrl}" style="color: #4F8EF7;">${appUrl}</a></p>
        <p style="margin: 1.5rem 0 0.5rem;"><strong>On your phone — add PrayerCare to your Home Screen</strong></p>
        <p style="margin: 0 0 0.75rem; font-size: 15px;">For the best experience, open the link above on your phone and add PrayerCare to your home screen — like a real app, without the browser bar.</p>
        <p style="margin: 0 0 0.5rem; font-size: 15px;"><strong>iPhone (Safari)</strong><br/>
        1. Open the link above in Safari<br/>
        2. Tap the <strong>Share</strong> button (square with arrow)<br/>
        3. Tap <strong>Add to Home Screen</strong><br/>
        4. Tap <strong>Add</strong></p>
        <p style="margin: 0 0 1.25rem; font-size: 15px;"><strong>Android (Chrome)</strong><br/>
        1. Open the link above in Chrome<br/>
        2. Tap the <strong>menu</strong> (three dots)<br/>
        3. Tap <strong>Install app</strong> or <strong>Add to Home screen</strong><br/>
        4. Confirm</p>
        <p style="margin: 0 0 1rem;">Once you're in, try adding a prayer, exploring Today, or sharing feedback with us from inside the app. There are no wrong first steps — we're simply glad you're walking with us.</p>
        <p style="margin: 0 0 1rem;">May this be a peaceful place to remember every prayer, every act of care, and every reason to praise God.</p>
        <p style="margin: 0;">With gratitude,<br/><strong>The PrayerCare team</strong></p>
        <p style="margin: 1.5rem 0 0; font-size: 13px; color: #9CA3AF;">Questions? Reply to this email — we read every message during beta.</p>
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
