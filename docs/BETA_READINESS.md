# PrayerCare Private Beta — Readiness & Distribution Guide

This document is your single reference for preparing, testing, and distributing the PrayerCare private beta on **Android** and **iOS**.

---

## Part 1 — Pre-build checklist (run in Supabase first)

Run migrations **001 through 015** in order in the Supabase SQL Editor:

| # | Migration | Purpose |
|---|-----------|---------|
| 001–012 | Core schema, groups, history | App foundation |
| 013 | `bible_translation_web_default` | WEB as default Bible |
| 014 | `sermon_scripture_rls` | Fix sermon verse saving |
| 015 | `beta_feedback` | In-app feedback from testers |

### Edge Functions (deploy before beta)

| Function | Required | Secrets |
|----------|----------|---------|
| `fetch-scripture` | **Yes** (sermon notes, verses) | None for WEB/KJV/ASV |
| `generate-prayer` | **Yes** (AI Pray tab) | `OPENAI_API_KEY` |

Deploy via Dashboard (paste `index.dashboard.ts`) or CLI:

```powershell
supabase functions deploy fetch-scripture
supabase functions deploy generate-prayer
```

### Supabase Auth settings

1. **Authentication → URL Configuration**
   - Site URL: `prayercare://` (or your production URL later)
   - Redirect URLs: `prayercare://reset-password`, `prayercare://**`

2. **Authentication → Email**
   - For beta: consider disabling “Confirm email” temporarily so testers aren’t blocked
   - Or keep confirmation on and tell testers to check spam

3. **View beta feedback**
   - Table Editor → `beta_feedback` (service role / dashboard admin)

---

## Part 2 — Beta Readiness Checklist

Use this before inviting testers. Mark each item after you verify on a **real device**.

### Authentication

| Status | Item |
|--------|------|
| ☐ | Sign up with email + password |
| ☐ | Email verification flow (or disabled for beta) |
| ☐ | Sign in / sign out |
| ☐ | Forgot password → email link → reset password screen |
| ☐ | Onboarding completes and lands on Today tab |
| ☐ | Session persists after app restart |

### AI Prayer Assistant

| Status | Item |
|--------|------|
| ☐ | “Generate with AI” on Pray tab returns a draft |
| ☐ | Draft opens in prayer create screen |
| ☐ | AI verse suggestion works (if used) |
| ☐ | Rate limit / error message is friendly if OpenAI key missing |
| ☐ | `generate-prayer` Edge Function deployed |

### Prayer creation & editing

| Status | Item |
|--------|------|
| ☐ | Create personal prayer manually |
| ☐ | Edit prayer from detail overflow menu |
| ☐ | Category selection works |
| ☐ | Schedule (recurring) saves correctly |
| ☐ | Prayer appears on Today when scheduled for today |
| ☐ | “I prayed today” logs activity |

### Bible verse generation

| Status | Item |
|--------|------|
| ☐ | Sermon note → Fetch verses (e.g. `1 Cor 11:1`) |
| ☐ | Verse text saves after note is created |
| ☐ | Fetch verse on saved sermon note |
| ☐ | `fetch-scripture` Edge Function deployed |
| ☐ | Settings Bible translation = WEB/KJV/ASV |

### Recurring prayer schedules

| Status | Item |
|--------|------|
| ☐ | Daily / weekly / custom schedule options |
| ☐ | Prayer shows on correct days in Today |
| ☐ | Journey history reflects prayed days |

### Groups

| Status | Item |
|--------|------|
| ☐ | Create group |
| ☐ | Join group with invite code |
| ☐ | Share invite code (copy / share sheet) |
| ☐ | Share prayer to group |
| ☐ | View shared prayers in group |
| ☐ | Leave group (non-owner) |

### Care actions & praise

| Status | Item |
|--------|------|
| ☐ | Add care action from prayer detail |
| ☐ | Mark care action complete |
| ☐ | Mark prayer answered + praise report |
| ☐ | Praise visible in Journey filter |

### History & calendar

| Status | Item |
|--------|------|
| ☐ | Journey list filters (All / Active / Praise / etc.) |
| ☐ | Calendar view shows activity dots |
| ☐ | Day history panel loads for selected date |
| ☐ | Analytics screen shows stats |

### Notifications

| Status | Item |
|--------|------|
| ☐ | Settings toggles save |
| ☐ | Push token registers on physical device (after EAS `projectId` set) |
| ☐ | **Known gap:** scheduled push delivery not implemented yet — prefs only |

### Offline behavior

| Status | Item |
|--------|------|
| ☐ | Graceful error when offline (no crash) |
| ☐ | Cached session allows opening app offline |
| ☐ | API calls show error, not blank crash |

### Error handling

| Status | Item |
|--------|------|
| ☐ | Wrong password shows clear message |
| ☐ | Missing Edge Function shows deploy hint |
| ☐ | Empty lists show encouraging copy (Today, Groups, Journey) |

### Security review

| Status | Item |
|--------|------|
| ☐ | RLS enabled on all user tables |
| ☐ | No service role key in app bundle |
| ☐ | Only `EXPO_PUBLIC_*` vars in client |
| ☐ | Auth gates on prayer / groups / sermon stacks |

### Performance review

| Status | Item |
|--------|------|
| ☐ | Today tab loads in < 3s on LTE |
| ☐ | No visible jank scrolling prayer lists |
| ☐ | Pull-to-refresh works on main lists |

### Beta-specific

| Status | Item |
|--------|------|
| ☐ | Beta welcome modal on first launch |
| ☐ | 💬 Share Feedback button visible |
| ☐ | Feedback saves to `beta_feedback` table |
| ☐ | Profile menu shows “PrayerCare · Beta” |

---

## Part 3 — Polish review (what we fixed & known gaps)

### Fixed for beta

- Beta welcome modal + floating **Share Feedback** button
- Sermon scripture RLS (verses now save)
- Auth guards on modal stacks (prayer, groups, sermon)
- Password reset screen (`prayercare://reset-password`)
- Email verification “I verified my email” refreshes session
- Profile name syncs when profile loads
- 404 screen matches app design
- Group invite button renamed to **Record Invite** (no false “email sent”)
- Reduced JWT refresh on every API call
- Production-like `app.json` (name, icons, splash, permissions)

### Known gaps (communicate to testers)

| Area | Beta behavior |
|------|----------------|
| Push reminders | Preferences saved; **notifications not sent yet** |
| Group email invite | Records email only; share **invite code** manually |
| Licensed Bibles (NIV, ESV) | Manual paste only unless API.Bible configured |
| AI draft | Lost if app killed between generate and save |
| Dark mode | System setting exists but UI is light-themed |

### UX polish recommendations (post-beta or if time permits)

- Add bottom padding on all scroll views for feedback FAB
- Persist AI draft to SecureStore
- “Share Feedback” hide on keyboard open
- Haptic feedback on “I prayed today”
- Skeleton loaders instead of full-screen spinners

---

## Part 4 — EAS build setup (one-time)

### Prerequisites

1. [Expo account](https://expo.dev/signup) (free tier works for beta)
2. [Apple Developer Program](https://developer.apple.com/programs/) — **$99/year** (required for TestFlight)
3. Google Play Console — **$25 one-time** (optional for APK; required for Play Store internal testing)

### Step 1 — Install EAS CLI

```powershell
npm install -g eas-cli
eas login
```

### Step 2 — Link project

```powershell
cd C:\Users\carin\Documents\PrayerCareapp
eas init
```

This updates `app.json` with your real `extra.eas.projectId` and `updates.url`.

Edit `app.json` and set `"owner"` to your Expo username.

### Step 3 — Set environment secrets for builds

In [expo.dev](https://expo.dev) → your project → **Environment variables**:

| Variable | Profile | Required |
|----------|---------|----------|
| `EXPO_PUBLIC_SUPABASE_URL` | preview, testflight | Yes |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | preview, testflight | Yes |

Or via CLI:

```powershell
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR_PROJECT.supabase.co" --environment preview
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key" --environment preview
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR_PROJECT.supabase.co" --environment production
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key" --environment production
```

Edge Function secrets (`OPENAI_API_KEY`) stay in **Supabase**, not EAS.

---

## Part 5 — Android preview build

### What you get

An **APK** file testers install directly (no Play Store required).

### Build command

```powershell
eas build --platform android --profile preview
```

EAS will prompt to create a **keystore** on first build (save credentials — EAS stores them).

### Distribute to testers

1. When build finishes, open the link from EAS dashboard
2. Share the **Install** URL with Android testers
3. Testers must enable **Install from unknown sources** for their browser/files app

### Android requirements

| Item | Details |
|------|---------|
| Min OS | Android 6+ (Expo default) |
| APK size | ~50–80 MB typical |
| Google account | Not required for direct APK |

---

## Part 6 — iOS TestFlight build

### What you get

An App Store-signed build uploaded to **TestFlight** for up to **10,000** external testers.

### One-time Apple setup

1. [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **+** → New App
   - Name: PrayerCare
   - Bundle ID: `com.prayercare.app` (must match `app.json`)
   - SKU: e.g. `prayercare-beta`

2. Note your **Apple Team ID** and **App Store Connect App ID** (numeric)

3. Update `eas.json` → `submit.testflight.ios` with your Apple ID email, Team ID, and ASC App ID

### Build command

```powershell
eas build --platform ios --profile testflight
```

First iOS build: EAS creates **Distribution Certificate** and **Provisioning Profile** (follow prompts).

### Submit to TestFlight

```powershell
eas submit --platform ios --profile testflight --latest
```

Or enable **auto-submit** by adding to `testflight` profile in `eas.json`:

```json
"testflight": {
  "distribution": "store",
  "autoSubmit": true
}
```

### Invite iOS testers

1. App Store Connect → your app → **TestFlight**
2. Wait for **Beta App Review** (usually 24–48 hours first time)
3. **Internal testing**: up to 100 users on your App Store Connect team (instant)
4. **External testing**: add emails → testers get TestFlight invite

### iOS requirements

| Item | Details |
|------|---------|
| Apple Developer | $99/year membership |
| TestFlight app | Free from App Store |
| Device | iPhone/iPad, iOS 15+ recommended |
| Privacy policy URL | Required for **external** TestFlight (host a simple page) |

---

## Part 7 — Build both platforms

```powershell
# Android APK + iOS TestFlight in one command
eas build --platform all --profile preview
# Note: use testflight profile for iOS store build:
eas build --platform ios --profile testflight
eas build --platform android --profile preview
```

---

## Part 8 — Tester onboarding email (template)

> **Subject:** You're invited to PrayerCare Beta  
>  
> Thank you for helping test PrayerCare — a calm space for prayer, care, and community.  
>  
> **Install:**  
> - **iPhone:** Install TestFlight, then open [your TestFlight link]  
> - **Android:** Open [your APK link] and allow install when prompted  
>  
> **First steps:**  
> 1. Create an account with your email  
> 2. Complete the short onboarding  
> 3. Try adding a prayer on the **Pray** tab  
>  
> **Share feedback:** Tap the **💬 Share Feedback** button anytime in the app.  
>  
> **Known beta limits:** Push reminders are not sent yet (you can still set preferences). Group invites work via invite code.  
>  
> Thank you — your feedback shapes PrayerCare.

---

## Part 9 — Turning off beta mode later

1. Set `"betaMode": false` in `app.json` → `extra`
2. Remove or hide `BetaOverlay` from `app/_layout.tsx`
3. Ship a new production build

---

## Quick command reference

```powershell
eas login
eas init
eas build --platform android --profile preview
eas build --platform ios --profile testflight
eas submit --platform ios --profile testflight --latest
eas build:list
```

---

*Last updated: private beta preparation — PrayerCare v1.0.0*
