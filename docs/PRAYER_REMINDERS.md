# Prayer reminders (local OS notifications)

## Root cause (fixed)

Scheduled prayer reminders never appeared because PrayerCare only stored **which days** a prayer shows on Today (`prayer_schedules`). Nothing called `expo-notifications` `scheduleNotificationAsync`. Settings toggles saved preferences + a push token, but no local or remote delivery existed.

## What we built

- Table `prayer_reminders`: **one prayer → many reminder times**
- On create/edit: save times, then schedule **native local notifications** (works with app closed)
- Tap notification → open `/prayer/[id]`
- Delete / answer / hide → cancel that prayer’s scheduled notifications
- App open → resync all active prayer reminders + optional Settings daily digest

## You must do before testing on a phone

1. **Run migration in Supabase SQL Editor**  
   File: `supabase/migrations/20250628000024_prayer_reminders.sql`

2. **Rebuild a native app** (permissions + DateTimePicker need a new binary)  
   Preview APK is enough:

```powershell
cd C:\Users\carin\Documents\PrayerCareapp
$env:EAS_NO_VCS = "1"
npx eas-cli build --platform android --profile preview --non-interactive
```

3. Install the new APK, open PrayerCare, **Allow notifications** when prompted.

4. Create a prayer → **Prayer reminders** → add a time a few minutes ahead → Save → fully close the app → wait for the notification → tap it.

## Notes

- Web does not schedule OS notifications.
- Emulators without Google Play / notification support may not fire reliably — use a real phone.
- Android 12+ may ask for exact alarms; PrayerCare requests `SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM`.
