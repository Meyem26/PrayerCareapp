# PrayerCare — Build Walkthrough

Follow these phases in order. Complete each step, then move on.  
Reply in chat with **"Step X done"** when you finish a phase and we'll troubleshoot together.

---

## Phase 1 — Backend foundation (today, ~45 min)

### Step 1.1 — Run Supabase migrations

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**
2. Run every migration in `supabase/migrations/` **in filename order** (001 → 016)
3. If you've already run some, only run the new ones:
   - `20250628000013_bible_translation_web_default.sql`
   - `20250628000014_sermon_scripture_rls.sql`
   - `20250628000015_beta_feedback.sql`
   - `20250628000016_beta_waitlist.sql`

**Verify:** Table Editor shows `profiles`, `prayers`, `beta_waitlist`, `beta_feedback`.

### Step 1.2 — Deploy Edge Functions

| Function | File to paste (Dashboard) | Secret |
|----------|---------------------------|--------|
| `fetch-scripture` | `supabase/functions/fetch-scripture/index.dashboard.ts` | None |
| `generate-prayer` | `supabase/functions/generate-prayer/index.dashboard.ts` | `OPENAI_API_KEY` |

**Verify:** Sermon note → Fetch verses for `John 3:16` works in the app.

### Step 1.3 — App environment

Create `.env` in project root (copy from `.env.example`):

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Verify:** `npm start` → sign up → complete onboarding → land on Today tab.

---

## Phase 2 — Website live (today, ~30 min)

### Step 2.1 — Configure website signup (local dev)

For **local preview only**, edit `website/js/config.js` with your Supabase URL and anon key.

For **production deploy**, env vars are injected automatically at build time (see Step 2.3).

### Step 2.2 — Preview locally

```powershell
cd website
npm run dev
```

Open http://localhost:3000 → scroll to **Join the Beta** → submit your email.

**Verify:** Supabase → Table Editor → `beta_waitlist` shows your email.

### Step 2.3 — Deploy website

#### Option A — Vercel (recommended)

1. Push this repo to GitHub (if not already)
2. Go to [vercel.com/new](https://vercel.com/new) → Import your repository
3. Set **Root Directory** to `website`
4. Add **Environment Variables** (Production + Preview):

   | Name | Value |
   |------|-------|
   | `EXPO_PUBLIC_SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` |
   | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | your anon key |

5. Click **Deploy**

Your site will be live at `https://your-project.vercel.app`. Optional: add a custom domain in Vercel → Settings → Domains.

#### Option B — Netlify

1. Go to [app.netlify.com](https://app.netlify.com) → Add new site → Import from Git
2. Base directory: `website`
3. Build command: `npm run build`
4. Publish directory: `.` (website root)
5. Add the same two environment variables under Site settings → Environment variables
6. Deploy

#### Option C — Quick test (no Git)

1. Locally, with env vars set in PowerShell:

   ```powershell
   cd website
   $env:EXPO_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
   $env:EXPO_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   npm run build
   ```

2. Drag the entire `website` folder to [app.netlify.com/drop](https://app.netlify.com/drop)

**After deploy — verify live signup:**

1. Open your live URL
2. Submit an email on **Join the Beta**
3. Check Supabase → `beta_waitlist`

**Optional:** Update Supabase → Auth → URL Configuration → Site URL to your live website URL.

---

## Phase 3 — Mobile beta builds (~1–2 hours first time)

### Step 3.1 — Expo / EAS setup

```powershell
npm install -g eas-cli
eas login
cd C:\Users\carin\Documents\PrayerCareapp
eas init
```

This replaces `REPLACE_AFTER_EAS_INIT` in `app.json`. Set `"owner"` to your Expo username.

### Step 3.2 — EAS environment variables

Expo dashboard → Project → **Environment variables**:

| Name | preview + production |
|------|---------------------|
| `EXPO_PUBLIC_SUPABASE_URL` | your URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | your anon key |

### Step 3.3 — Android preview APK

```powershell
eas build --platform android --profile preview
```

Share the install link with Android testers.

### Step 3.4 — iOS TestFlight (requires Apple Developer $99/yr)

1. App Store Connect → create app `com.prayercare.app`
2. Update `eas.json` → `submit.testflight.ios` with your Apple IDs
3. Build + submit:

```powershell
eas build --platform ios --profile testflight
eas submit --platform ios --profile testflight --latest
```

4. TestFlight → invite testers by email

Full details: `docs/BETA_READINESS.md`

---

## Phase 4 — Test the full loop (~1 hour)

Run through on a **real phone** (not simulator):

| # | Test |
|---|------|
| 1 | Sign up → onboarding → beta welcome modal |
| 2 | Create prayer with schedule → appears on Today |
| 3 | AI prayer on Pray tab |
| 4 | Create group → share invite code |
| 5 | Sermon note + fetch verse |
| 6 | Tap 💬 Share Feedback |
| 7 | Journey calendar |

Note anything broken — use in-app feedback or tell us in chat.

---

## Phase 5 — Invite first testers

1. Send website link for waitlist (optional — or invite directly)
2. Send Android APK link OR TestFlight invite
3. Use the email template in `docs/BETA_READINESS.md`

---

## What we're building toward

```
Website (peaceful landing + waitlist)
        ↓
   Beta signup
        ↓
   App install (APK / TestFlight)
        ↓
   In-app feedback → beta_feedback table
        ↓
   Iterate → public launch
```

---

## Current status checklist

Copy and tick as you go:

```
[ ] Migrations 001–016 run
[ ] fetch-scripture deployed
[ ] generate-prayer deployed (+ OpenAI key)
[ ] .env configured for app
[ ] website/js/config.js configured
[ ] Website preview works locally
[ ] Website deployed (URL: _______________)
[ ] eas init completed
[ ] Android preview build
[ ] iOS TestFlight build (optional)
[ ] First tester invited
```

---

## Need help?

Tell us where you are, for example:

- *"I'm on Phase 1 Step 1.1 — migration 014 failed with …"*
- *"Website signup works but app won't connect"*
- *"eas build failed on iOS credentials"*

We'll debug that step together before moving on.
