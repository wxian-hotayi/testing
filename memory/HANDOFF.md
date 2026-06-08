# HANDOFF — vitalis-commerce

_Last updated: 2026-06-08 · Multi-tenant SaaS **runtime-validated against live
staging**. MT-1…MT-12 complete · migrations 0011–0016 applied & proven · RLS /
RBAC / tenant isolation / invite-accept / routing all proven by live E2E ·
signup bug fixed (0016) · **sole remaining blocker: Stripe placeholder key**._

Production-grade **supplement e-commerce** platform (Malaysia / MYR), converted
into a **multi-tenant SaaS** (many merchant stores on one codebase). Next.js 15
(App Router) + React 19 + TS (strict) + Tailwind · Supabase (Postgres + Auth,
RLS) · Stripe (+ Connect) · Resend · PostHog/GA4/Meta · Vercel. Money is integer
**sen** everywhere.

Verdict (`reports/PRODUCTION_READY_STATE.md`): **PRODUCTION READY = NO** — the
only un-passed gate is Stripe (placeholder key `sk_test_xxx`), a config/test-key
task, **not** a code defect.

## Completed

**Original single-store platform (8 phases):** foundation/design system + 10 SQL
migrations; catalog/PDP/SEO; cart + AOV; Stripe checkout (one-time + subscription,
idempotent webhook, refunds); accounts + subscriptions; growth (loyalty,
referrals, abandoned-cart cron, Resend); admin BI/CRUD/orders/reviews; analytics
+ compliance + docs.

**Multi-tenant SaaS (MT-1…MT-6 + RBAC):**
- MT-1 tenancy spine (`stores`, `store_members`, `is_platform_admin`, Host→store
  resolve) [0011]; MT-2 `store_id` isolation on commerce tables + store-scoped RLS
  [0012]; RBAC 7-role matrix (`src/lib/rbac/*`) [0013]; MT-4 member mgmt
  (invitations/audit, `/admin/members`, `/account/invitations`, `GET
  /api/admin/members`, sole-owner protection) [0014]; MT-3 self-serve store
  provisioning; MT-5 Stripe Connect (destination charges + platform fee); MT-6
  per-store subdomain storefront routing.

**Hardening + validation (this session, MT-7…MT-12):**
- **MT-7** closed production blockers — fixed admin cross-tenant leakage/IDOR
  (store-scoped all admin queries/actions/dashboard); fixed **RBAC legacy-admin
  leak** (global admin granted admin on ANY store → now gated on `isDefaultStore`)
  + regression test.
- **E2E suite** (`tests/e2e/*`): smoke, access-control, purchase-path, rbac,
  store-isolation, invite-flow, tenant-routing, account-and-admin.
- **go-live gate** — `scripts/go-live-check.mjs` (8 offline gates) + CI; aliased
  to `npm run predeploy`. See [docs/GO_LIVE_CHECKLIST.md](../docs/GO_LIVE_CHECKLIST.md).
- **Rate limiting** — in-memory per-IP fixed window (AUTH 15/min, API 60/min),
  wired in `src/middleware.ts` (`src/lib/rate-limit/*`).
- **MT-9 infra-validate** — `scripts/infra-validate.mjs` (10 runtime gates,
  `--strict --payments --target=`). See [docs/INFRA_VALIDATION.md](../docs/INFRA_VALIDATION.md).
- **CTO review** — `reports/CTO_REVIEW.md` (debt/security/scalability/cost at
  100/1k/10k tenants).
- **MT-10/11/12 runtime validation against live staging** (project
  `atpgszwyzkjojmkkeorp`, via IPv4 session pooler): migrations 0011–0016 applied
  & proven; RLS enforced; tenant isolation + RBAC + invite/accept + routing
  proven by live E2E. Reports in `reports/`.
- **Migration 0015** — `unique(orders.stripe_checkout_session_id)` webhook
  idempotency.
- **Migration 0016** — **signup bugfix:** `handle_new_user` pinned
  `search_path=public`, but pgcrypto lives in the `extensions` schema, so
  `gen_random_bytes()` was unresolvable → **every signup failed**. Fix adds
  `extensions` to the search_path. Verified: 8 users created post-fix.
- **Production cutover runbook** — [docs/PRODUCTION_CUTOVER.md](../docs/PRODUCTION_CUTOVER.md).

## In Progress / Next

- **Nothing mid-edit.** Code + schema are runtime-validated against staging.
- **One step to a green staging verdict:** drop a real `sk_test_…` key +
  test-endpoint `whsec_…` into `.env.local`, run
  `node scripts/infra-validate.mjs --strict --payments` → Gate 7/8 flip green.
- **Production cutover** then follows `docs/PRODUCTION_CUTOVER.md` (prod Supabase
  project, live keys, HTTPS domain, CI gating).

## Issues / Blockers / Gotchas

- ⛔ **Stripe is the sole blocker** — `.env.local` has placeholder `sk_test_xxx`.
  Charge/refund/webhook idempotency can't be validated without a real key.
- ✅ Migrations 0011–0016 ARE applied to staging (the earlier "not applied"
  verdict was a **stale PostgREST schema cache** false negative — fixed via
  `NOTIFY pgrst, 'reload schema'`).
- ⚠️ **E2E must be run in small batches** — a bulk run trips the per-IP auth
  rate limiter (15/min); it returns "Too many requests" (the control working,
  not a bug).
- ⚠️ **Node can't resolve `*.localhost`** (`getaddrinfo ENOTFOUND`); Chromium
  can. Cross-origin E2E probes use browser navigation, not the Node request ctx.
- ⚠️ Direct DB host `db.<ref>.supabase.co` is **IPv6-only/unreachable here** —
  use the **IPv4 session pooler** (`aws-1-…pooler.supabase.com:5432`, user
  `postgres.<ref>`) for DDL/SQL.
- ⚠️ `target=production` adds hard Gate 9 checks: `NEXT_PUBLIC_SITE_URL` must be
  HTTPS non-localhost; `sk_test` rejected (needs `sk_live_`).
- 🟡 **graphify/graph.md is stale** (2026-06-04, scaffolding-era — "11 files, no
  UI routes, DB types MISSING"). Regenerate before trusting it as architecture.
- 🟡 `database.types.ts` was hand-reconstructed (a failed `db:types` had emptied
  it); regenerate via `npm run db:types` against the live schema.

## Important Files

- Tenancy: `src/lib/tenant/{resolve,context}.ts`, `src/lib/supabase/middleware.ts`.
- RBAC: `src/lib/rbac/{permissions,actor}.ts` (matrix = single source of truth);
  `permissions.test.ts` (legacy-fallback regression).
- Members: `src/features/members/*` (policy.ts = sole-owner invariant; actions.ts
  = invite/accept).
- Trust levels: `src/lib/supabase/{public,server,admin}.ts`.
- Rate limit: `src/lib/rate-limit/{limiter,middleware}.ts`.
- Validators: `scripts/{go-live-check,infra-validate}.mjs`; seed
  `scripts/seed-staging.sql`.
- Schema: `supabase/migrations/0001–0016`. Business rules: `src/lib/constants.ts`.
- Reports: `reports/{PRODUCTION_READY_STATE,CTO_REVIEW,…}.md`.
- Docs: `docs/{MULTITENANCY,RBAC,MEMBER_MANAGEMENT,GO_LIVE_CHECKLIST,
  INFRA_VALIDATION,PRODUCTION_CUTOVER,SETUP_AND_VALIDATION,TESTING}.md`.

## Architecture Notes

- Feature-module layout under `src/features/*`; primitives in `src/components/ui`;
  shared libs in `src/lib`. Path alias `@/*` → `./src/*`.
- RLS cannot see the Host → storefront tenant isolation is enforced at the
  **query layer** (`.eq('store_id', …)`); RLS enforces the security boundary
  (public-read-active / owner / store-member). `is_store_member()` passes
  platform admins. Admin writes use the service-role client → app-layer
  permission checks ARE the boundary.
- Pricing always recomputed server-side; money in integer sen.

## Next Actions

1. **Flip staging green** — real `sk_test_` key → `infra-validate --strict --payments`.
2. **Production cutover** — follow `docs/PRODUCTION_CUTOVER.md` (prod project +
   live keys + HTTPS + CI gate), re-prove gates against prod.
3. **Regenerate graphify** (stale) — run the tool with explicit confirmation.

## Resume command

Say **"continue"** / **"resume project"** to reload this file. Docs in `docs/`.
