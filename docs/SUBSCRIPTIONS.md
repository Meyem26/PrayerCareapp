# PrayerCare Freemium Architecture

PrayerCare is designed as a freemium product, but **the first public release is completely free**.

- No Stripe
- No paywalls
- No feature restrictions in the app
- Schema stays ready for paid plans later

---

## Current launch mode (Aug 2026)

| Setting | Value |
|---------|--------|
| `EXPO_PUBLIC_BETA_MODE` | `false` |
| `EXPO_PUBLIC_SUBSCRIPTIONS_ENFORCED` | `false` (must stay false) |
| New user `subscription_tier` | `free` |
| New user subscription `provider` | `manual` |
| App feature access | **All features unlocked** via permissions kill-switch |

`canAccess()` returns `true` for every feature while enforcement is off. Do **not** set `EXPO_PUBLIC_SUBSCRIPTIONS_ENFORCED=true` until you intentionally launch freemium.

---

## Plans (catalog for later)

| Tier | Audience | Enforced later (not now) |
|------|----------|--------------------------|
| `free` | Every Christian | Core journal + limited AI + 1 group |
| `plus` | Individuals | Advanced personal features |
| `ministry` | Ministries / small churches | Care + group tools |
| `church` | Larger churches | Full church suite |

While enforcement is **off**, every signed-in user has full product access regardless of stored tier.

---

## Clean architecture (keep for later)

```
┌─────────────────────────────────────────────────────────┐
│  UI / Screens                                           │
│  useEntitlements().canAccess('export_journal')          │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  App permission layer (single source of truth)          │
│  lib/subscriptions/permissions.ts                       │
│  + lib/subscriptions/plans.ts (feature matrix)          │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  Database                                               │
│  profiles.subscription_tier  ← fast client reads        │
│  subscriptions               ← Stripe-ready history     │
│  plan_entitlements           ← DB catalog + SQL helpers │
└─────────────────────────────────────────────────────────┘
```

**Why this shape**

1. **Centralized checks** — use `useEntitlements()` / `canAccessFeature()` when freemium turns on.
2. **Denormalized tier on profile** — one field for UI.
3. **`subscriptions` table** — ready for Stripe IDs later.
4. **`plan_entitlements` in DB** — server/RPC can enforce later.
5. **Kill-switch** — `EXPO_PUBLIC_SUBSCRIPTIONS_ENFORCED` turns limits on/off without rewriting features.

---

## Migrations

| File | Purpose |
|------|---------|
| `018_subscription_tiers.sql` | Enums, tables, entitlements, beta defaults |
| `019_public_free_launch.sql` | Free defaults, `handle_new_user` → free/manual, relabel existing users |

### Run migration 019 (required for public launch)

**Supabase Dashboard → SQL Editor → New query**

1. Open `supabase/migrations/20250628000019_public_free_launch.sql`
2. Paste the full file into the editor
3. Click **Run**
4. Confirm success (no red errors)

Verify:

```sql
SELECT subscription_tier, count(*) FROM public.profiles GROUP BY 1;
-- expect: free

SELECT tier, provider, status, count(*)
FROM public.subscriptions
GROUP BY 1, 2, 3;
-- expect: active free/manual rows; old beta rows canceled
```

If migration **018** was never run, run **018 first**, then **019**.

---

## Env (free launch)

```
EXPO_PUBLIC_BETA_MODE=false
EXPO_PUBLIC_SUBSCRIPTIONS_ENFORCED=false
```

EAS production profile already sets both. Do not add Stripe keys.

---

## When you add freemium later (post-launch)

1. Decide free vs paid feature matrix in `lib/subscriptions/plans.ts` + `plan_entitlements`.
2. Set `EXPO_PUBLIC_SUBSCRIPTIONS_ENFORCED=true`.
3. Wire `useEntitlements()` on gated screens.
4. Add Stripe products + webhook Edge Function (schema already has columns).

Do **not** do this for the first public release.

---

## Feature key reference (future freemium matrix)

Free: journal, AI (limited), reminders, recurring, today, history, calendar, praise, sermon notes, meditation notes, **1 prayer group**.

Plus adds: unlimited AI, multiple groups, advanced search, export.

Ministry adds: care actions, analytics, follow-up, reporting, group permissions, shared lists, unlimited members.

Church adds: unlimited ministries, church dashboard, leadership analytics, church reporting, integrations.

Again: this matrix is **not enforced** during the free public launch.
