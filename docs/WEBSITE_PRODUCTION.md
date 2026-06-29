# PrayerCare Website — Production Launch Guide

Complete this checklist in order. Do not skip steps.

Replace `yourdomain.com` with your actual domain (e.g. `prayercare.app`).

---

## Overview

| What | Tool |
|------|------|
| Hosting + HTTPS | **Vercel** (recommended) |
| DNS | Your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) |
| Beta signups | **Supabase** `beta_waitlist` table |
| Signup emails | **Resend** + Supabase Edge Function |
| Analytics | **Plausible** (visitors, countries, devices, sources) |
| Beta signup events | Plausible custom event `Beta Signup` |

---

## STEP 1 — Confirm Supabase is ready

### 1.1 Run migration 016 (if not done)

Supabase → **SQL Editor** → run:

`supabase/migrations/20250628000016_beta_waitlist.sql`

### 1.2 Verify table

**Table Editor** → `beta_waitlist` exists.

### 1.3 Test insert manually (optional)

Add a test row, then delete it.

---

## STEP 2 — Deploy email notifications

When someone joins the beta, you and the visitor both receive an email.

### 2.1 Create a Resend account

1. Go to [resend.com](https://resend.com) → sign up (free tier: 100 emails/day)
2. **Domains** → Add your domain → follow DNS instructions (SPF, DKIM)
3. **API Keys** → Create key → copy it

Until your domain is verified, use Resend's test sender: `onboarding@resend.dev`

### 2.2 Deploy Edge Function

Supabase → **Edge Functions** → New function → name: `notify-beta-signup`

Paste all of: `supabase/functions/notify-beta-signup/index.dashboard.ts` → **Deploy**

### 2.3 Add Edge Function secrets

Supabase → **Edge Functions** → **Secrets**:

| Secret | Example |
|--------|---------|
| `RESEND_API_KEY` | `re_...` |
| `BETA_ADMIN_EMAIL` | `you@yourdomain.com` |
| `BETA_FROM_EMAIL` | `PrayerCare <hello@yourdomain.com>` |
| `SITE_URL` | `https://yourdomain.com` |
| `BETA_WEBHOOK_SECRET` | any long random string you invent |

### 2.4 Create Database Webhook

Supabase → **Database** → **Webhooks** → **Create**

| Field | Value |
|-------|-------|
| Name | `beta-waitlist-notify` |
| Table | `beta_waitlist` |
| Events | **Insert** only |
| Type | HTTP Request |
| Method | POST |
| URL | `https://YOUR_PROJECT.supabase.co/functions/v1/notify-beta-signup` |
| Headers | `x-beta-webhook-secret: YOUR_BETA_WEBHOOK_SECRET` |

### 2.5 Test webhook

Submit a test email on your local site (Step 5). Check:

- Row in `beta_waitlist`
- Email to you (admin)
- Confirmation email to the subscriber

---

## STEP 3 — Set up analytics (Plausible)

Plausible is privacy-friendly and shows visitors, countries, devices, and traffic sources.

### 3.1 Create Plausible account

1. [plausible.io](https://plausible.io) → start trial or subscribe
2. Add site: `yourdomain.com`

### 3.2 Note your domain

You'll add `PLAUSIBLE_DOMAIN=yourdomain.com` to Vercel in Step 6.

### 3.3 Beta signup tracking

Already built in — each successful signup fires a **Beta Signup** event in Plausible.

View signups: Plausible → **Goal conversions** → `Beta Signup`

---

## STEP 4 — Configure Vercel environment variables

Expo/Vercel → your **website** project → **Settings** → **Environment Variables**

Add for **Production** (and Preview if you want):

| Variable | Value |
|----------|--------|
| `SITE_URL` | `https://yourdomain.com` |
| `EXPO_PUBLIC_SUPABASE_URL` | your Supabase URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | your anon key |
| `PLAUSIBLE_DOMAIN` | `yourdomain.com` |

The build script uses these to generate `config.js`, `sitemap.xml`, `robots.txt`, and SEO URLs.

---

## STEP 5 — Deploy production build on Vercel

### 5.1 Confirm project settings

| Setting | Value |
|---------|--------|
| Root Directory | `website` |
| Build Command | `npm run build` |
| Output Directory | `.` |
| Framework | Other |

### 5.2 Deploy

Push to GitHub → Vercel auto-deploys, **or** click **Redeploy** in Vercel dashboard.

### 5.3 Verify default Vercel URL first

Open `https://your-project.vercel.app` before connecting custom domain.

**Checklist on Vercel URL:**

- [ ] Browser tab title: `PrayerCare | Remember Every Prayer...`
- [ ] Favicon (blue droplet) visible
- [ ] All sections scroll correctly
- [ ] Mobile menu (☰) works on phone width
- [ ] **Join the Beta** form saves to Supabase
- [ ] Confirmation emails arrive
- [ ] View page source → canonical URL is correct
- [ ] `/robots.txt` loads
- [ ] `/sitemap.xml` loads

---

## STEP 6 — Connect your custom domain

### 6.1 Add domain in Vercel

Vercel → Project → **Settings** → **Domains** → Add:

- `yourdomain.com`
- `www.yourdomain.com` (recommended)

Vercel shows the DNS records you need.

### 6.2 Configure DNS at your registrar

**Option A — Root domain (`yourdomain.com`)**

| Type | Name | Value |
|------|------|--------|
| A | `@` | `76.76.21.21` |

**Option B — www subdomain**

| Type | Name | Value |
|------|------|--------|
| CNAME | `www` | `cname.vercel-dns.com` |

**Using Cloudflare?**

- Set proxy to **DNS only** (grey cloud) until SSL works, then you can enable proxy
- SSL mode: **Full**

### 6.3 Wait for DNS propagation

Usually 5–30 minutes; can take up to 48 hours.

Check: [dnschecker.org](https://dnschecker.org)

### 6.4 HTTPS / SSL

**Automatic on Vercel.** Once DNS points to Vercel:

1. Vercel issues a free Let's Encrypt certificate
2. Status in Domains tab shows **Valid**
3. Your site loads at `https://yourdomain.com` with padlock

No manual certificate upload needed.

### 6.5 Set primary domain

Vercel → Domains → set `yourdomain.com` as **primary** → redirect `www` to root (or vice versa — pick one).

### 6.6 Update `SITE_URL` env var

Ensure Vercel `SITE_URL` = `https://yourdomain.com` (exact, no trailing slash).

**Redeploy** after changing env vars.

---

## STEP 7 — Final verification (all devices)

### Desktop (Chrome, Safari, or Edge)

- [ ] Logo + promise under logo
- [ ] Hero headline readable
- [ ] Join the Beta + Watch Demo buttons work
- [ ] All nav links scroll to sections
- [ ] Beta form submits successfully
- [ ] Footer links work

### Tablet (iPad or responsive mode ~768px)

- [ ] Layout balanced — hero stacks or side-by-side
- [ ] Navigation visible
- [ ] Cards in feature grid readable

### Mobile (iPhone or responsive ~375px)

- [ ] Hamburger menu opens/closes
- [ ] Promise text readable under logo
- [ ] CTA button full width, tappable
- [ ] Form keyboard doesn't break layout
- [ ] No horizontal scroll

### SEO check

Use [opengraph.xyz](https://www.opengraph.xyz) — paste your URL:

- [ ] Title correct
- [ ] Description correct
- [ ] OG image shows

Google: search `site:yourdomain.com` after a few days.

---

## STEP 8 — Test every button and form

| Element | Expected result |
|---------|-----------------|
| Header logo | Scroll to top |
| Join the Beta (header) | Scroll to form |
| Join the Beta (hero) | Scroll to form |
| Watch Demo | Scroll to demo section |
| Our Story / Journey / Features nav | Smooth scroll |
| Mobile menu links | Navigate + close menu |
| Beta email form — valid email | Success message + DB row + emails |
| Beta email form — invalid email | Error message |
| Beta email form — duplicate email | "Already on the list" |
| Footer links | Smooth scroll |

---

## STEP 9 — Go live checklist

```
[ ] Migration 016 run
[ ] notify-beta-signup deployed + secrets set
[ ] Database webhook created
[ ] Resend domain verified (or using test sender)
[ ] Plausible installed (PLAUSIBLE_DOMAIN set)
[ ] Vercel env vars set (SITE_URL, Supabase, Plausible)
[ ] Production deploy successful
[ ] Custom domain connected
[ ] HTTPS padlock visible
[ ] Beta signup tested on live domain
[ ] Admin notification email received
[ ] Visitor confirmation email received
[ ] robots.txt and sitemap.xml live
[ ] Open Graph preview looks correct
[ ] Tested on desktop + mobile
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Signup fails | Check Supabase env vars on Vercel; run migration 016 |
| No emails | Check Resend key, BETA_ADMIN_EMAIL, webhook URL |
| Wrong canonical URL | Set SITE_URL on Vercel → Redeploy |
| DNS not working | Wait longer; verify A/CNAME records |
| No HTTPS | DNS must point to Vercel; wait for certificate |
| No analytics | Set PLAUSIBLE_DOMAIN → Redeploy |
| Favicon missing | Hard refresh (Ctrl+Shift+R) |

---

## After launch

- Monitor **Plausible** for traffic
- Monitor **Supabase** → `beta_waitlist` for signups
- Check **Resend** dashboard for email delivery
- Replace demo video placeholder when ready
- Submit sitemap in [Google Search Console](https://search.google.com/search-console)

---

*Your first impression is live. Take a moment to pray over it.*
