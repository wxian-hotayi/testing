# Setup & Validation Runbook — multi-tenant SaaS (MT-1…MT-6)

> How to take the multi-tenant work from "compiles & tests green" to "exercised
> for real" against a live Supabase + Stripe (test mode), and validate each
> phase end-to-end. Pairs with [DEPLOYMENT.md](./DEPLOYMENT.md),
> [ENVIRONMENT.md](./ENVIRONMENT.md), [MULTITENANCY.md](./MULTITENANCY.md),
> [RBAC.md](./RBAC.md), [MEMBER_MANAGEMENT.md](./MEMBER_MANAGEMENT.md).
>
> ⚠️ Migrations `0011`–`0014` and the Stripe Connect flows have only been
> verified at the typecheck/lint/test/build level. This runbook is the path to
> runtime validation.

## 0. Prerequisites

- Node 20+, npm.
- **Supabase CLI** (`supabase`) — local stack needs Docker; or use a hosted project.
- **Stripe CLI** (`stripe`) + a Stripe account with **Connect enabled** (test mode).

## 1. Environment (`.env.local`)

Copy `.env.example` → `.env.local`. Required vs optional per [src/lib/env.ts](../src/lib/env.ts):

```bash
# Public (client)
NEXT_PUBLIC_SITE_URL=http://localhost:3000          # root domain = "localhost"
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...       # optional until checkout
# Server (secrets — keep out of git; .env.local is gitignored)
SUPABASE_SERVICE_ROLE_KEY=...                        # required
STRIPE_SECRET_KEY=sk_test_...                        # optional until checkout/Connect
STRIPE_WEBHOOK_SECRET=whsec_...                      # from `stripe listen`
RESEND_API_KEY=...                                   # optional (invite/order emails)
CRON_SECRET=...                                      # optional (abandoned-cart cron)
```

`NEXT_PUBLIC_SITE_URL`'s hostname is the **platform root** used by
`resolveTenantFromHost` ([resolve.ts](../src/lib/tenant/resolve.ts)). Locally it
should be `http://localhost:3000` so that `acme.localhost:3000` resolves to the
`acme` store and bare `localhost` is the default tenant.

## 2. Apply the database schema

**Local stack:**
```bash
supabase start
supabase db reset            # runs migrations 0001–0014 + seed.sql
npm run db:types             # regenerates src/types/database.types.ts from the live schema
npm run typecheck            # confirm the generated types still satisfy the app
```
**Hosted project:**
```bash
supabase link --project-ref <ref>
supabase db push             # applies migrations
supabase gen types typescript --project-id <ref> > src/types/database.types.ts
```

Notes / gotchas:
- `npm run db:types` **overwrites** the hand-written
  [database.types.ts](../src/types/database.types.ts) with the generated version
  (that file's header explains why it was hand-written). Re-run `typecheck`
  after; the app's custom aliases (`Tables`, `UpdateTables`, `Profile`, enum
  aliases) are added by the app, not generated — if the generated file lacks
  them, keep the hand-written helper block or add a small re-export.
- `0013` uses `ALTER TYPE … ADD VALUE`; `0014` then uses those values. Fine as
  separate migration files (each its own transaction). **Do not** concatenate
  them into one transaction.
- `supabase/full-setup.sql` is stale (only 0001–0010) — use the migrations.

## 3. Seed a platform admin + default-store owner

The default store (`00000000-0000-0000-0000-0000000000aa`, slug `default`) is
seeded by `0011` but has no owner yet. In the Supabase SQL editor:
```sql
-- Make yourself the platform operator (Super Admin):
update public.profiles set is_platform_admin = true where email = 'you@example.com';

-- (optional) own the default store so member-management has an owner to act on:
insert into public.store_members (store_id, user_id, role, status)
select '00000000-0000-0000-0000-0000000000aa', id, 'owner', 'active'
from public.profiles where email = 'you@example.com'
on conflict (store_id, user_id) do update set role = 'owner', status = 'active';
```
(New stores created via `/account/stores/new` get their creator as `owner`
automatically — that's MT-3.)

## 4. Run + test subdomains locally (MT-6)

```bash
npm run dev
```
- `http://localhost:3000` → default tenant (default store).
- Create a store at `/account/stores/new` (e.g. slug `acme`).
- `http://acme.localhost:3000` → the `acme` storefront (Chrome resolves
  `*.localhost` automatically; for other tools add hosts entries).
- `http://zzz.localhost:3000` (no such store) → **404** (strict resolution).

## 5. Stripe (test mode) + Connect (MT-3/5)

1. Test keys into `.env.local` (`sk_test_…`, `pk_test_…`).
2. Enable **Connect** in the Stripe dashboard (test mode) — required for Express
   `accounts.create`.
3. Forward webhooks (gives you `STRIPE_WEBHOOK_SECRET`):
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Destination charges keep events on the platform account, so this captures
   `checkout.session.completed`, `invoice.paid`, and `account.updated`.

## 6. End-to-end validation checklist

| Phase | Steps | Expect |
|---|---|---|
| MT-1/2/6 | Visit root, a store subdomain, an unknown subdomain | default store / scoped store / 404 |
| RBAC | Open `/admin/access` | matrix renders; your role highlighted |
| MT-3 | `/account/stores/new` — try a reserved slug (`admin`) and a taken slug | both rejected with messages; valid slug creates store, you're `owner` |
| MT-4 | Invite a teammate → accept at `/account/invitations` → change role → suspend → transfer ownership | each works; demoting/removing the **last owner** is blocked; `membership_audit` gets rows; non-`members.manage` users can't reach `/admin/members` |
| MT-2 RLS | As a `marketing`/`warehouse` member, attempt admin writes outside your permission | blocked (server action returns Forbidden) |
| MT-5 | `/admin/store` → Connect with Stripe → finish Express **test** onboarding → Refresh status | status → **Active**; place a test order (card `4242…`) on that store → Stripe dashboard shows the charge on the connected account with the platform `application_fee` |

## 7. Production (Vercel + Supabase + Stripe live)

- Point a **wildcard domain** `*.yourdomain.com` (and apex) at Vercel; set
  `NEXT_PUBLIC_SITE_URL=https://yourdomain.com`.
- Supabase prod: apply migrations (`supabase db push`), set service-role key.
- Stripe **live** keys + Connect enabled; add the webhook endpoint
  `https://yourdomain.com/api/webhooks/stripe` and subscribe to
  `checkout.session.completed`, `invoice.paid`, `customer.subscription.*`,
  `account.updated`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
- Custom store domains (MT-6 `custom_domain`) need DNS + TLS per domain — the
  verification flow is still deferred (see MULTITENANCY.md).

## 8. Safety / rollback

- All admin writes use the service-role client; the `requirePermission` checks
  are the boundary — review them when adding new admin actions.
- Migrations are additive; to roll back the tenancy work, `supabase db reset` to
  an earlier migration set in a non-prod environment first. Never reset prod.
- Keep `.env.local` out of git (already gitignored).
