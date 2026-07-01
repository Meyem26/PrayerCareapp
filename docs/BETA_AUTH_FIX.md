# Beta login issues — fix for all testers

## The problem

Many testers are in `beta_waitlist` but **not** in **Authentication → Users**.

| Step | What happens |
|------|----------------|
| Join beta on website | Email saved to `beta_waitlist` |
| **Create Account** in app | Creates login in Supabase Auth |
| **Sign In** | Only works **after** Create Account |

**Joining the beta ≠ having an app account.**

Password reset emails also fail if no Auth user exists yet.

---

## Fix for you (admin) — do these once

### 1. Turn off email confirmation (recommended for beta)

So testers can use the app immediately without waiting for verification email.

**Supabase → Authentication → Providers → Email**

- Turn **Confirm email** **OFF**
- Save

### 2. Send auth emails through Resend

Verification and password reset use **Supabase Auth**, not the beta welcome email.

**Supabase → Project Settings → Authentication → SMTP Settings**

| Field | Value |
|--------|--------|
| Enable custom SMTP | ON |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Your Resend API key |
| Sender | `hello@prayercare.online` |
| Sender name | `PrayerCare` |

### 3. Redirect URLs

**Supabase → Authentication → URL Configuration**

| Field | Value |
|--------|--------|
| Site URL | `https://app.prayercare.online` |
| Redirect URLs | `https://app.prayercare.online/**` |

### 4. Redeploy

- **Web app** on Vercel (opens sign-up first in beta)
- **Website** on Vercel (Create Account buttons → `/sign-up`)
- **Edge function** `notify-beta-signup` (email links to `/sign-up`)

---

## Message to send all beta testers

```
You're on the PrayerCare beta list — thank you!

One more step: create your app account (separate from joining the beta).

1. Open https://app.prayercare.online/sign-up
2. Tap CREATE ACCOUNT (not Sign In)
3. Use the SAME email you used on the website
4. Choose a password (8+ characters)

After that you can sign in anytime.

Forgot password only works AFTER you've created an account.
Questions? Reply to this email.
```

---

## Unblock one person manually

1. **Table Editor → `beta_waitlist`** — confirm email is there
2. Ask them to complete **Create Account** at `/sign-up`
3. If they already created account but are stuck on verify:
   - **Authentication → Users** → open user → **Confirm email**

---

## Checklist

```
[ ] Confirm email OFF in Supabase (beta)
[ ] Custom SMTP via Resend configured
[ ] Redirect URLs include app.prayercare.online/**
[ ] Web app redeployed
[ ] Website redeployed
[ ] notify-beta-signup redeployed
[ ] Bulk email sent to testers with /sign-up link
```
