# PrayerCare Public Launch QA Checklist

Test on **web** (`https://app.prayercare.online`) and at least **one physical phone** when you have a preview build.  
Mark: **Pass** / **Fail** / **N/A** — note device + date.

This replaces beta waitlist checks. Focus: free public account, prayer logic, security, delete account, verified Scripture, honest notifications.

---

## 0 — Preconditions (before testing)

| # | Check | Pass? | Notes |
|---|-------|-------|-------|
| 0.1 | Migrations **019** free launch, **020** RPC auth.uid, **021** notes/care DELETE RLS applied in Supabase | | |
| 0.2 | Edge Functions deployed: `delete-account`, `generate-prayer`, `fetch-scripture` | | |
| 0.3 | Privacy `https://www.prayercare.online/privacy` and Terms `/terms` load | | |
| 0.4 | No Beta / waitlist wording on landing or auth | | |
| 0.5 | Settings says push delivery is **not** enabled yet | | |
| 0.6 | Supabase Auth Site URL / redirect allow `prayercare://` and app URLs | | |

---

## 1 — Auth & account

| # | Workflow | Pass? | Notes |
|---|----------|-------|-------|
| A1 | Create free account (new email) | | |
| A2 | Sign in with email + password | | |
| A3 | Already signed in → lands on Today | | |
| A4 | Wrong password → clear error | | |
| A5 | Forgot password → email received | | |
| A6 | Reset password link / deep link works | | |
| A7 | Email verify flow works (or clearly documented) | | |
| A8 | Sign out works | | |
| A9 | **Delete Account** from Profile (confirm) removes access; cannot sign in again | | |
| A10 | Delete Account transfers / reassigns group ownership if you were sole admin | | |

---

## 2 — Prayer core logic

| # | Workflow | Pass? | Notes |
|---|----------|-------|-------|
| P1 | Manual create: title + body + schedule | | |
| P2 | AI draft from Pray → edit → save | | |
| P3 | AI **suggests reference only**; verse text from lookup (WEB/KJV/ASV) | | |
| P4 | Look up reference loads official text + attribution | | |
| P5 | Daily schedule appears on Today | | |
| P6 | Specific weekdays appear only on those days | | |
| P7 | “I prayed today” logs + toast | | |
| P8 | Hide from Today / unhide | | |
| P9 | Mark answered → Praise; history still has past activity | | |
| P10 | Restart answered prayer | | |
| P11 | Edit prayer | | |
| P12 | Delete prayer (confirm) | | |
| P13 | Share prayer to a group | | |
| P14 | Group member **cannot** delete your note/care (only author or leader) | | |

---

## 3 — Journey, groups, care, sermon

| # | Workflow | Pass? | Notes |
|---|----------|-------|-------|
| J1 | Journey list + filters | | |
| J2 | Calendar day history | | |
| J3 | Empty / error states feel clear (not fake empty on error) | | |
| G1 | Create group + invite code | | |
| G2 | Second account joins with code | | |
| G3 | Leave group / remove member (leader) | | |
| C1 | Add care action + mark complete | | |
| S1 | Sermon note + fetch verse + attribution | | |
| S2 | Settings: timezone, translation, praise window save | | |
| S3 | Notification toggles save; copy is honest | | |

---

## 4 — Store / trust surfaces

| # | Check | Pass? | Notes |
|---|-------|-------|-------|
| T1 | No paywall / subscription gate on free features | | |
| T2 | No `REPLACE_*` in app.json | | |
| T3 | Icon / splash on-brand; splash bg `#FAF9F7` | | |
| T4 | Privacy & Terms reachable from website (store listing URLs) | | |
| T5 | Support contact `support@prayercare.online` works or is monitored | | |

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Builder | | | |
| Tester | | | |

**Ready for Step 10 (TestFlight / Play internal)?** Yes / No  
**Blockers:**
