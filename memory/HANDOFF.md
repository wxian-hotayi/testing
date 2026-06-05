# HANDOFF — vitalis-commerce

_Last updated: 2026-06-05 · Multi-tenant SaaS transformation in progress
(MT-1/2/3/4 + RBAC done; MT-5/6 remain) · gate green · committed checkpoint_

Production-grade **supplement e-commerce** platform (Malaysia / MYR), now being
converted into a **multi-tenant SaaS** (many merchant stores on one codebase).
Next.js 15 (App Router) + React 19 + TS (strict) + Tailwind · Supabase (Postgres
+ Auth, RLS) · Stripe · Resend · PostHog/GA4/Meta · Vercel. Money is integer
**sen** everywhere. Local-first: integrations coded against env-var placeholders.

Verified gate (all green): `npm run typecheck`, `npm run lint`,
`npm run test` (50 unit), `npm run build`.

## Completed

**Original single-store platform (8 phases):** foundation/design system + 10 SQL
migrations; catalog/PDP/SEO; cart + AOV (bundles, cross-sell, coupons,
exit-intent); Stripe checkout (one-time + subscription, idempotent webhook,
refunds); accounts + subscriptions self-service; growth (loyalty, referrals,
abandoned-cart cron, Resend emails); admin (BI, CRUD, orders, reviews); analytics
+ compliance + docs. Vitest + Playwright.

**Multi-tenant SaaS transformation (this session — see [docs/](../docs/)):**
- **Types recovery** — `src/types/database.types.ts` had been **truncated to
  empty** by a failed `npm run db:types` (the `>` redirect wipes the file when
  `supabase gen types` errors with no local DB). Hand-reconstructed from
  migrations; build was broken until this. Regenerate via `npm run db:types`
  once a live schema exists.
- **MT-1 tenancy spine** — `stores`, `store_members`, `profiles.is_platform_admin`,
  Host→store resolution (`src/lib/tenant/*`, middleware). [migration 0011]
- **MT-2 data isolation** — `store_id` on 20 commerce tables (default → default
  store), per-store unique keys, store-scoped RLS, loyalty per-store; threaded
  through cart→order chain + catalog. [0012]
- **RBAC** — 7-role permission matrix (`src/lib/rbac/*`), enforced in middleware
  + server actions + UI; `/admin/access` matrix view. [0013]
- **MT-4 member management** — invitations + membership status + audit;
  `/admin/members` (invite/role/suspend/remove/transfer/bulk), `/account/invitations`,
  `GET /api/admin/members`; sole-owner protection. [0014]
- **MT-3 provisioning** — self-serve store creation (creator → owner), slug
  policy + live availability, `/account/stores`, `/admin/store` settings. [no migration]

## In Progress / Next

- **MT-5 — Stripe Connect** (per-store payout accounts; `stores.stripe_account_id`
  / `stripe_charges_enabled` already exist).
- **MT-6 — storefront subdomain routing** (resolve store per Host in storefront
  pages, drop the default-store fallback, per-store branding; catalog queries are
  already `storeId`-capable). Decide SSG-vs-dynamic per store here.

## Issues / Blockers / Gotchas

- ⚠️ **Migrations 0011–0014 have NOT been applied to a live Postgres.** All
  TypeScript/UI/tests are verified, but the SQL is not runtime-validated. Apply
  with `supabase db reset` against a real instance, then `npm run db:types` (which
  will replace the hand-written types). Watch: `ALTER TYPE … ADD VALUE` (0013)
  must commit before 0014 uses the new enum values — fine across separate
  migration files, would fail if concatenated into one transaction.
- ⚠️ `@supabase/ssr` must stay version-aligned with `@supabase/supabase-js`
  (currently ssr 0.10.3 / js 2.107). `Database` type needs `__InternalSupabase`.
- ⚠️ Public catalog reads MUST use `src/lib/supabase/public.ts` (cookieless) —
  the cookie client forces pages dynamic and breaks static/ISR. Do NOT call
  `headers()`/`getCurrentStoreId()` in SSG catalog query paths (that's MT-6).
- 🟡 `supabase/full-setup.sql` only consolidates 0001–0010 — stale vs 0011–0014.
- 🟡 Default store (`…0000aa`) has no `owner` member; legacy global `admin`
  retains access via the RBAC fallback until a real owner is assigned (MT-3/4).
- 🟡 Legal pages are templates; `next lint` deprecation (migrate before Next 16).

## Important Files

- Tenancy: `src/lib/tenant/{resolve,context}.ts`, `src/lib/supabase/middleware.ts`.
- RBAC: `src/lib/rbac/{permissions,actor}.ts` (matrix = single source of truth).
- Members: `src/features/members/*` (policy.ts = sole-owner invariant).
- Stores: `src/features/stores/*` (policy.ts = slug rules).
- Trust levels: `src/lib/supabase/{public,server,admin}.ts` (anon/cookieless,
  cookie/user-RLS, service-role/bypass). Admin writes use service-role → app-layer
  permission checks ARE the boundary.
- Schema: `supabase/migrations/0001–0014`. Business rules: `src/lib/constants.ts`.
- Docs: `docs/{MULTITENANCY,RBAC,MEMBER_MANAGEMENT}.md`.

## Architecture Notes

- Feature-module layout under `src/features/*`; primitives in `src/components/ui`;
  shared libs in `src/lib`. Path alias `@/*` → `./src/*`.
- RLS cannot see the Host, so storefront tenant isolation is enforced at the
  **query layer** (`.eq('store_id', …)`); RLS enforces the security boundary
  (public-read-active / owner / store-member). `is_store_member()` passes platform
  admins for any store.
- Pricing always recomputed server-side; money in integer sen.

## Next Actions

1. Apply migrations to a live Supabase + `npm run db:types`; smoke-test RLS and
   the member/role flows on real data.
2. Build **MT-5** (Stripe Connect) and **MT-6** (subdomain storefront routing).
3. Add E2E for invite→accept→role-change and store-creation flows.

## Resume command

Say **"continue"** / **"resume project"** to reload this file. Docs in `docs/`.
