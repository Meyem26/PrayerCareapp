# PrayerCare Freemium Architecture

PrayerCare is designed as a freemium product from day one. **Private beta does not charge anyone** and unlocks all features. Payments (Stripe) come after public launch without redesigning the schema.

---

## Plans

| Tier | Audience | Access today (beta) |
|------|----------|---------------------|
| `free` | Every Christian | Full (unlocked in beta) |
| `plus` | Individuals | Full (unlocked in beta) |
| `ministry` | Ministries / small churches | Full (unlocked in beta) |
| `church` | Larger churches | Full (unlocked in beta) |

During private beta every user is assigned **`church`** (highest tier) and enforcement is **off**.

---

## Clean architecture (recommended)

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

1. **Centralized checks** — never hardcode “if plus then …” in random screens. Use `useEntitlements()` or `canAccessFeature()`.
2. **Denormalized tier on profile** — one field for UI; easy to read.
3. **`subscriptions` table** — ready for Stripe customer/subscription IDs, periods, cancel flags.
4. **`plan_entitlements` in DB** — server/RPC can enforce limits later; app matrix in TypeScript stays in sync for UX.
5. **Beta kill-switch** — `BETA_MODE` or `EXPO_PUBLIC_SUBSCRIPTIONS_ENFORCED` turns limits on/off without rewriting features.

---

## What was added

### Migration `018`

File: `supabase/migrations/20250628000018_subscription_tiers.sql`

- Enums: `subscription_tier`, `subscription_status`, `subscription_provider`
- `profiles.subscription_tier` (default `church` for beta)
- `subscriptions` table (Stripe-ready columns, nullable)
- `plan_entitlements` seeded for all four plans
- Backfill existing users → `church` + beta subscription row
- `handle_new_user()` assigns `church` + beta subscription
- SQL helpers: `user_subscription_tier()`, `user_has_feature()`, `user_feature_limit()`

### App code

| Path | Role |
|------|------|
| `lib/subscriptions/plans.ts` | Plan definitions + feature keys |
| `lib/subscriptions/permissions.ts` | `canAccessFeature`, limits, beta unlock |
| `hooks/useEntitlements.ts` | React hook for screens |
| `contexts/AuthContext.tsx` | Exposes `subscriptionTier` + `canAccess` |

---

## Usage (now and later)

```tsx
import { useEntitlements } from '@/hooks/useEntitlements';

function ExportButton() {
  const { canAccess } = useEntitlements();

  if (!canAccess('export_journal')) {
    return <UpgradeHint plan="plus" />;
  }

  return <Button title="Export journal" onPress={exportJournal} />;
}
```

AI monthly limits (future):

```tsx
const { withinLimit, getLimit } = useEntitlements();
const usedThisMonth = 3; // from ai_generation_logs

if (!withinLimit('ai_prayer_generation', usedThisMonth)) {
  // show “You've used your free AI prayers this month”
}
```

---

## Private beta → public launch checklist

### During beta (current)

```
[x] EXPO_PUBLIC_BETA_MODE=true
[ ] EXPO_PUBLIC_SUBSCRIPTIONS_ENFORCED unset/false
[x] New users get subscription_tier = church
[x] All canAccess() return true
[ ] No Stripe keys
```

### At public launch

1. Run SQL to change defaults (example):

```sql
ALTER TABLE public.profiles
  ALTER COLUMN subscription_tier SET DEFAULT 'free';

-- Optional: keep early beta testers on plus/church as a thank-you,
-- or set everyone without a paid subscription to free:
UPDATE public.profiles SET subscription_tier = 'free'
WHERE id IN (
  SELECT user_id FROM public.subscriptions WHERE provider = 'beta'
);

UPDATE public.subscriptions
SET status = 'canceled', canceled_at = NOW(), metadata = metadata || '{"ended":"beta"}'::jsonb
WHERE provider = 'beta' AND status = 'active';
```

2. Update `handle_new_user()` to insert `free` + `provider = 'manual'` (or wait for Stripe checkout).

3. Env:

```
EXPO_PUBLIC_BETA_MODE=false
EXPO_PUBLIC_SUBSCRIPTIONS_ENFORCED=true
```

4. Add Stripe (later): webhook updates `subscriptions` + syncs `profiles.subscription_tier`.

---

## Future Stripe (do not build yet)

When ready:

1. Create Stripe Products/Prices for Plus, Ministry, Church.
2. Edge Function `stripe-webhook` listening for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
3. Upsert `subscriptions` with `provider='stripe'`, customer/subscription IDs, period dates.
4. Sync `profiles.subscription_tier` from the active subscription.
5. Optional Customer Portal for cancel/upgrade.

Schema already has:

- `provider_customer_id`
- `provider_subscription_id`
- `provider_price_id`
- `current_period_start` / `current_period_end`
- `cancel_at_period_end`

No redesign needed.

---

## Run migration 018

**Supabase → SQL Editor** → paste and run:

`supabase/migrations/20250628000018_subscription_tiers.sql`

Then verify:

```sql
SELECT subscription_tier, count(*) FROM public.profiles GROUP BY 1;
SELECT * FROM public.plan_entitlements WHERE tier = 'free' LIMIT 5;
SELECT public.user_has_feature('export_journal'); -- as authenticated user
```

---

## Feature key reference

Free: journal, AI (limited), reminders, recurring, today, history, calendar, praise, sermon notes, meditation notes, **1 prayer group**.

Plus adds: unlimited AI, multiple groups, advanced search, export.

Ministry adds: care actions, analytics, follow-up, reporting, group permissions, shared lists, unlimited members.

Church adds: unlimited ministries, church dashboard, leadership analytics, church reporting, integrations.
