# Deploy PrayerCare Web App for Beta Users

Your **landing page** (`yourdomain.com`) and **web app** (`app.yourdomain.com`) are two separate Vercel projects.

---

## Beta user journey

```
1. Join beta on landing page (yourdomain.com)
2. Email saved to beta_waitlist
3. User clicks "Open PrayerCare" → app.yourdomain.com
4. User signs up with THE SAME EMAIL
5. App checks waitlist → allows account → onboarding → use app
```

---

## Step 1 — Run migration 017

Supabase → **SQL Editor** → run:

`supabase/migrations/20250628000017_beta_waitlist_signup_gate.sql`

This blocks new sign-ups unless the email is on `beta_waitlist`.

---

## Step 2 — Supabase Auth URLs

**Authentication → URL Configuration**

| Field | Value |
|-------|--------|
| Site URL | `https://app.yourdomain.com` |
| Redirect URLs | `https://app.yourdomain.com/**` |
| | `https://yourdomain.com/**` (landing) |

---

## Step 3 — Create second Vercel project (web app)

You already have a Vercel project for `website/`. Create **another** project:

1. [vercel.com/new](https://vercel.com/new) → Import **same GitHub repo**
2. Project name: e.g. `prayercare-app`
3. **Root Directory:** leave as **`.`** (repo root, NOT `website`)
4. Vercel reads root `vercel.json` automatically

### Environment variables (Production)

| Name | Value |
|------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | your Supabase URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | your anon key |
| `EXPO_PUBLIC_BETA_MODE` | `true` |
| `EXPO_PUBLIC_LANDING_URL` | `https://yourdomain.com` |
| `EXPO_PUBLIC_WEB_APP_URL` | `https://app.yourdomain.com` |

5. **Deploy**

Test: `https://prayercare-app.vercel.app` → should show PrayerCare login/sign-up.

---

## Step 4 — Add subdomain for the app

Vercel → **prayercare-app** project → **Settings → Domains**

Add: **`app.yourdomain.com`**

DNS at your registrar:

| Type | Name | Value |
|------|------|--------|
| CNAME | `app` | `cname.vercel-dns.com` |

Wait until **Valid Configuration**.

---

## Step 5 — Connect landing page to app

Vercel → **landing page** project → **Environment Variables**

Add:

| Name | Value |
|------|--------|
| `APP_URL` | `https://app.yourdomain.com` |

Redeploy landing site.

After join beta, users see **Open PrayerCare** button.

Update Edge Function secret:

| Secret | Value |
|--------|--------|
| `APP_URL` | `https://app.yourdomain.com` |

Redeploy `notify-beta-signup` (or update secrets).

---

## Step 6 — Test end-to-end

1. Open `yourdomain.com` → Join beta with `test+1@yourmail.com`
2. Click **Open PrayerCare**
3. On `app.yourdomain.com` → **Create Account** with same email
4. Complete onboarding
5. Try creating account with a random email → should be **blocked**

---

## Two Vercel projects summary

| Project | Root folder | Domain | Build |
|---------|-------------|--------|--------|
| Landing | `website` | `yourdomain.com` | `npm run build` |
| Web app | `.` (root) | `app.yourdomain.com` | `npm run build:web` |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| App build fails on Vercel | Check build logs; run `npm run build:web` locally |
| Sign up blocked for waitlist email | Run migration 017; same email spelling |
| Email verify link broken | Add `https://app.yourdomain.com/**` to Supabase redirects |
| Blank page on app | Check env vars; redeploy |
| 404 on refresh | Root `vercel.json` rewrites should be present |
