# Step 7 — Brand assets + EAS setup

Complete **A** then **B**. Do not run store builds until both are done.

## A. Replace brand images

Current files under `assets/images/` still look like **Expo template** art (blueprint grid / black grid splash). Replace them with the final PrayerCare logo.

| File | Size | Notes |
|------|------|--------|
| `assets/images/icon.png` | **1024×1024** PNG | App Store / Play icon. **No transparency.** Square. |
| `assets/images/splash-icon.png` | **1024×1024** PNG | Logo centered; splash background is `#FAF9F7` in `app.json` |
| `assets/images/android-icon-foreground.png` | **1024×1024** PNG preferred | Logo only (safe zone in center); transparent OK |
| `assets/images/android-icon-background.png` | **1024×1024** or solid | Soft green `#E8F0EC` matches `app.json` |
| `assets/images/android-icon-monochrome.png` | optional | Android 13+ themed icon |
| `assets/images/favicon.png` | 48×48 or 96×96 | Web favicon |

**How:** Export from your design tool → overwrite those exact filenames (same paths). Do not rename `app.json` paths.

**Check:** Open `assets/images/icon.png` — it should clearly be PrayerCare, not an Expo blueprint.

---

## B. EAS init (fills REPLACE_* in app.json)

### B1. Create / sign in to Expo

1. Go to https://expo.dev/signup (or log in)
2. Note your **username** (this becomes `owner` in `app.json`)

### B2. Run in PowerShell

```powershell
cd C:\Users\carin\Documents\PrayerCareapp
npx eas-cli login
npx eas-cli init
```

- Answer **yes** to create an EAS project / link this app
- When finished, open `app.json` and confirm:
  - `"owner"` is your Expo username (not `REPLACE_WITH_EXPO_USERNAME`)
  - `"extra.eas.projectId"` is a real UUID (not `REPLACE_AFTER_EAS_INIT`)
  - `"updates.url"` looks like `https://u.expo.dev/<that-uuid>`

### B3. EAS secrets (production values)

```powershell
cd C:\Users\carin\Documents\PrayerCareapp
npx eas-cli secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR_PROJECT.supabase.co" --scope project
npx eas-cli secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY" --scope project
npx eas-cli secret:create --name EXPO_PUBLIC_LANDING_URL --value "https://www.prayercare.online" --scope project
npx eas-cli secret:create --name EXPO_PUBLIC_WEB_APP_URL --value "https://app.prayercare.online" --scope project
npx eas-cli secret:create --name EXPO_PUBLIC_BETA_MODE --value "false" --scope project
npx eas-cli secret:create --name EXPO_PUBLIC_SUBSCRIPTIONS_ENFORCED --value "false" --scope project
```

Get Supabase URL + anon key from: Supabase → **Project Settings → API**.

If a secret already exists, use:

```powershell
npx eas-cli secret:update --name EXPO_PUBLIC_BETA_MODE --value "false" --scope project
```

### B4. Apple IDs (later — Step 10 / TestFlight)

Leave `eas.json` `YOUR_APPLE_*` until you create the App Store Connect app. Not required for Android preview builds.

---

## Already configured (do not change)

- App name: **PrayerCare**
- iOS bundle / Android package: **`com.prayercare.app`**
- Version: `1.0.0`
- Splash background: `#FAF9F7` (kept)
- App icon + Android adaptive icon background: `#FAF9F7` (matches app UI)
- `betaMode`: **false**

---

## Done when

- [ ] Icon/splash are PrayerCare brand (not Expo template)
- [ ] `app.json` has no `REPLACE_*`
- [ ] EAS secrets set for Supabase + URLs + beta/subscriptions false
