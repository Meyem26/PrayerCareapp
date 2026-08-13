# PrayerCare Mobile — Production Release Guide

Follow these phases **in order**. Do not generate store builds until Phases 1–3 are done and Phase 4 config is real (no `REPLACE_*` placeholders).

---

## Where we are right now

| Area | Status |
|------|--------|
| Core features (auth, prayers, groups, care, praise, sermons) | Strong |
| Freemium schema | Ready (no payments) |
| Delight Pass (toasts, skeletons, empty states, confirms) | Started |
| EAS project ID / Expo owner | **Blocked** — still `REPLACE_*` |
| Brand icon + splash | **Blocked** — replace Expo template art |
| Push *delivery* (scheduled reminders) | Prefs only — be honest in beta |
| Store listings / privacy URL | Prep docs below — host privacy page |

---

## Phase 1 — Production readiness (you + agent)

### Already improved in code
- Soft loading skeletons on Today
- Tasteful empty state when no prayers today
- Gentle success toasts (save prayer, prayed today, answered, shared)
- Cross-platform confirm dialogs (delete / mark answered)
- List fetch errors surfaced (not silent empty)
- Button accessibility labels
- iOS `buildNumber`, Android `versionCode`, encryption export flag

### You must still do
1. Run migration **018** (subscriptions) if not done  
2. Run migration **019** (public free launch defaults)  
3. Run migration **020** (RPC auth.uid() binding — security)  
4. Confirm migration **017** (beta waitlist gate — optional after public signup)  
5. Turn **Allow new users to sign up** ON in Supabase Auth  
6. Custom SMTP via Resend for auth emails  
7. Replace **app icon** and **splash** (see Phase 5)

### Still HIGH priority to fix before public launch
- [ ] Surface errors on Groups / Journey / Sermon lists (same pattern as Today)
- [ ] Honest Settings copy: “Reminders: coming soon” until push sender exists **or** implement Expo push cron
- [ ] Group invite: either send email or keep “Record invite” wording (already honest)
- [ ] Strip Expo template components (`Themed.tsx`, `EditScreenInfo.tsx`) if unused
- [ ] Set `betaMode: false` only when leaving private beta

---

## Phase 2 — Mobile experience checklist

Test on a real phone (not only browser):

- [ ] Safe areas (notch / home indicator) on Today, Pray, Create Prayer
- [ ] Keyboard does not cover inputs (create prayer, sign-up, sermon)
- [ ] Touch targets ≥ 44pt (buttons, overflow menu)
- [ ] Scroll feels smooth; pull-to-refresh works
- [ ] Status bar readable on cream background
- [ ] Tablet: usable (portrait); no broken layout
- [ ] Android back gesture / iOS swipe-back feel natural
- [ ] Splash shows PrayerCare brand (not Expo grid)
- [ ] Home screen icon looks like PrayerCare

---

## Phase 3 — Beta QA checklist

See **`docs/BETA_QA_CHECKLIST.md`**. Complete every row before EAS store builds.

---

## Phase 4 — Build configuration (step by step)

### Step 4.1 — Expo account + EAS init

```powershell
cd C:\Users\carin\Documents\PrayerCareapp
npx eas-cli login
npx eas-cli init
```

This fills `extra.eas.projectId`, `owner`, and `updates.url` in `app.json`.  
**Do not build until placeholders are gone.**

### Step 4.2 — EAS secrets (preview + production)

```powershell
npx eas-cli secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR.supabase.co" --scope project
npx eas-cli secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..." --scope project
npx eas-cli secret:create --name EXPO_PUBLIC_LANDING_URL --value "https://www.prayercare.online" --scope project
npx eas-cli secret:create --name EXPO_PUBLIC_WEB_APP_URL --value "https://app.prayercare.online" --scope project
npx eas-cli secret:create --name EXPO_PUBLIC_BETA_MODE --value "true" --scope project
```

### Step 4.3 — Brand assets

Replace files under `assets/images/`:

| File | Spec |
|------|------|
| `icon.png` | 1024×1024, no transparency, PrayerCare mark |
| `splash-icon.png` | Logo on `#FAF9F7` (or full-bleed splash) |
| `android-icon-foreground.png` | 1024×1024 adaptive foreground |
| `android-icon-background.png` | Solid `#E8F0EC` or soft pattern |
| `favicon.png` | 48×48 or 96×96 for web |

### Step 4.4 — Internal beta APK (Android testers)

```powershell
npx eas-cli build --platform android --profile preview
```

### Step 4.5 — Play Store AAB

```powershell
npx eas-cli build --platform android --profile production
```

### Step 4.6 — iOS TestFlight

1. Create app in App Store Connect (`com.prayercare.app`)
2. Fill `eas.json` submit.testflight Apple IDs
3. Build:

```powershell
npx eas-cli build --platform ios --profile testflight
npx eas-cli submit --platform ios --profile testflight
```

### Identifiers (already set)

- iOS bundle: `com.prayercare.app`
- Android package: `com.prayercare.app`
- Version: `1.0.0` (bump in `app.json` for each store release)

---

## Phase 5 — Store preparation

See **`docs/STORE_LISTING.md`** for:

- Descriptions, keywords  
- Privacy Policy + Terms draft  
- Screenshot sizes  
- Feature graphic specs  
- Support / marketing URLs  

Host at minimum:

- Privacy: `https://www.prayercare.online/privacy` (or Notion/Google Doc public URL for beta)
- Support: your email or a support page
- Marketing: `https://www.prayercare.online`

---

## Phase 6 — First-user review (delight lens)

Ask before you publish:

1. Would this app make someone feel **peaceful**?  
2. Can they use it **without instructions**?  
3. Would they trust it enough to recommend it to a **church / prayer group**?

If any answer is “not yet,” fix that before store submit.

### Delight Pass (in progress)

| Moment | Status |
|--------|--------|
| Soft skeleton while Today loads | Done |
| Empty Today with warm CTA | Done |
| Toast after saving a prayer | Done |
| Toast after “I prayed today” | Done |
| Toast + confirm when marking answered | Done |
| Confirm dialog instead of Alert (web-safe) | Done |
| Toast after care action complete | Next |
| Soft praise transition animation | Next |
| Groups / Journey empty + error polish | Next |

---

## Recommended sequence for *you* this week

```
Day 1  → Finish Phase 3 QA on web + one Android device (Expo Go or preview APK)
Day 2  → Design/replace icon + splash
Day 3  → eas init + secrets + preview APK to 3–5 testers
Day 4  → Fix feedback from testers
Day 5  → TestFlight + Play internal testing
Day 6+ → Store listing + privacy hosted → production builds
```

**Do not** treat “APK generated” as done. Treat “peaceful, clear, trustworthy” as done.

---

## Next agent session prompts (copy/paste)

1. “Continue Delight Pass: care actions toast, groups/journey errors, praise animation”  
2. “Help me run eas init and fill app.json for PrayerCare”  
3. “Generate privacy page HTML for www.prayercare.online/privacy”  
4. “Create branded splash and icon assets for PrayerCare”
