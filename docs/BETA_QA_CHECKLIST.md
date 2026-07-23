# PrayerCare Beta QA Checklist

Test on **web** (`app.prayercare.online`) and at least **one phone** (Android APK or iOS TestFlight / Expo Go).

Mark each row: Pass / Fail / N/A — note device + date.

---

## Auth

| # | Workflow | Pass? | Notes |
|---|----------|-------|-------|
| A1 | Join beta on website with new email | | |
| A2 | Create Account with **same** email | | |
| A3 | Sign In with email + password | | |
| A4 | Sign In when already logged in → goes to Today | | |
| A5 | Wrong password shows clear error | | |
| A6 | Forgot password → email received | | |
| A7 | Reset password link works | | |
| A8 | Email not on waitlist is blocked with friendly message | | |
| A9 | Sign out works | | |

## Prayers

| # | Workflow | Pass? | Notes |
|---|----------|-------|-------|
| P1 | AI prayer generation from Pray tab | | |
| P2 | Edit AI draft then save | | |
| P3 | Manual prayer creation (title + body + schedule) | | |
| P4 | AI Bible verse suggestion on create | | |
| P5 | Edit existing prayer | | |
| P6 | Recurring: daily | | |
| P7 | Recurring: weekly / weekdays | | |
| P8 | Prayer appears on Today for correct day | | |
| P9 | “I prayed today” records + gentle toast | | |
| P10 | Hide from Today / show again | | |
| P11 | Mark answered → toast + praise section | | |
| P12 | Restart answered prayer | | |
| P13 | Delete prayer (confirm dialog) | | |
| P14 | Share prayer with group | | |

## Journey & history

| # | Workflow | Pass? | Notes |
|---|----------|-------|-------|
| J1 | Journey list loads | | |
| J2 | Calendar / history filters | | |
| J3 | Empty Today state is clear & warm | | |
| J4 | Offline / failed load shows error (not fake empty) | | |

## Groups

| # | Workflow | Pass? | Notes |
|---|----------|-------|-------|
| G1 | Create group | | |
| G2 | Join by invite code | | |
| G3 | Share invite code | | |
| G4 | Record email invite (documented as record-only) | | |
| G5 | View group prayers | | |
| G6 | Leave group / remove member (if leader) | | |

## Care & praise

| # | Workflow | Pass? | Notes |
|---|----------|-------|-------|
| C1 | Add care action | | |
| C2 | Mark care completed → success toast | | |
| C3 | Write praise report | | |

## Sermon & settings

| # | Workflow | Pass? | Notes |
|---|----------|-------|-------|
| S1 | Create sermon note | | |
| S2 | Fetch / attach verses | | |
| S3 | Edit / delete sermon note | | |
| S4 | Profile name update | | |
| S5 | Bible translation preference | | |
| S6 | Notification toggles save (delivery may be “coming soon”) | | |
| S7 | Analytics screen loads | | |

## Polish / delight

| # | Check | Pass? | Notes |
|---|-------|-------|-------|
| D1 | Soft skeleton on Today load | | |
| D2 | Toast after create prayer | | |
| D3 | No Expo template icon on device home screen | | |
| D4 | Splash feels on-brand | | |
| D5 | Feels peaceful to a first-time tester | | |

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Builder | | |
| Tester 1 | | |
| Tester 2 | | |

**Ready for EAS store builds?** Yes / No
