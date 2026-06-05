# VALIDATION_REPORT.md — MT-7 Real-Environment Validation

**Project:** vitalis-commerce (multi-tenant SaaS) · **Date:** 2026-06-05
**Reviewers (roles played):** Senior QA, DevOps, Security, SaaS Product Owner

---

## ⚠️ Scope & honesty statement (read first)

This environment has **no live Supabase, no Stripe account/keys, and no browser**,
and workspace policy bars standing up external integrations. Therefore the phases
that require a running system **were not executed** — and **no results were
fabricated**. Each phase below is marked:

- **PASS (static)** — verified by code/schema review and/or unit tests.
- **FIXED** — a real defect was found by static analysis and corrected this session.
- **NOT VALIDATED (needs live env)** — cannot be proven here; a step-by-step
  procedure exists in [docs/SETUP_AND_VALIDATION.md](docs/SETUP_AND_VALIDATION.md).

**No screenshots are included** — capturing them requires a running app, which
isn't available. Where the spec asks for screenshots, run the linked runbook.

Automated gate at time of report: **typecheck ✓ · lint ✓ · unit tests ✓ (53) ·
build ✓**.

---

## Summary

| Phase | Area | Status | Top risk |
|---|---|---|---|
| 1 | Supabase migrations/RLS | PASS (static) · runtime NOT VALIDATED | Med |
| 2 | Role system (RBAC) | PASS (static+tests) · **1 FIXED** | Low (post-fix) |
| 3 | Store isolation | **3 CRITICAL FIXED** · runtime NOT VALIDATED | High→Low (post-fix) |
| 4 | Subdomain routing | PASS (static+tests) · runtime NOT VALIDATED | Low |
| 5 | Stripe Connect | PASS (static) · **1 FIXED** · runtime NOT VALIDATED | Med |
| 6 | Webhook reliability | **1 FIXED (idempotency)** · runtime NOT VALIDATED | Med→Low |
| 7 | Performance | NOT VALIDATED (no Lighthouse) | **High (known)** |
| 8 | Security | PASS (static, post-fix) · **rate limiting MISSING** | Med |
| 9 | Disaster recovery | NOT VALIDATED — procedure documented | Med |

**Fixes applied this session:** 6 (3 critical isolation, 1 idempotency, 1 refund
webhook, 1 privilege-scope). All verified by typecheck/lint/test/build.

---

## Fixes applied this session (bug fixing was in scope)

| # | Severity | Issue | Fix |
|---|---|---|---|
| F1 | **Critical** | Admin **read** queries (`listProducts/Orders/Coupons/Categories/Reviews`, `getProductForEdit`, `getOrderDetail`) returned **all stores'** rows (service-role, no `store_id` filter) → cross-tenant data leakage. | Scoped every admin query by `getCurrentStoreId()` (defensive). [admin/queries.ts](src/features/admin/queries.ts) |
| F2 | **Critical** | Admin **write** actions matched only by `id` → a Store A admin could update/delete Store B rows (IDOR). Inserts didn't set `store_id`. | Added `store_id` guard to update/delete and set `store_id` on insert. [admin/actions.ts](src/features/admin/actions.ts) |
| F3 | **Critical** | Dashboard KPIs (revenue, orders, products, carts, subscriptions) aggregated **across all stores**. | Scoped `getDashboardMetrics` by current store. [admin/metrics.ts](src/features/admin/metrics.ts) |
| F4 | High | `/admin/users` (edits the **global** `profiles.role`) was reachable by store `customers.manage` (store admins) — a privilege/visibility leak of all platform users. | Restricted page + `setUserRoleAction` + nav to **`platform.manage`** (super-admin only). |
| F5 | Med | No DB idempotency on `orders.stripe_checkout_session_id` → racing duplicate webhooks could double-insert orders. | Unique partial index. [0015_idempotency.sql](supabase/migrations/0015_idempotency.sql) |
| F6 | Med | Refunds issued from the **Stripe dashboard** never synced to the order. | Added `charge.refunded` webhook handler. [webhooks/stripe/route.ts](src/app/api/webhooks/stripe/route.ts) |

---

## PHASE 1 — Supabase validation

**Method:** static review of migrations `0001`–`0015`.

- **Tables / indexes / constraints / FKs / enums** — internally consistent:
  FKs reference existing tables; deferred FKs wired in order (`orders.subscription_id`
  in 0005, `carts/orders.coupon_id` in 0007); per-store unique indexes (0012);
  enum values used in code match definitions. `store_role_rank()` fixed in 0014
  (departmental roles were rank 0). `ALTER TYPE ADD VALUE` (0013) commits before
  use in 0014 (separate files) ✓.
- **RLS** — enabled default-deny (0009) + on new tables (0011/0012/0014); policies
  attached and store-scoped. **Functional** RLS behaviour (does anon/auth/service
  actually get the right rows?) requires a live DB → **NOT VALIDATED**.
- **Risk (Med):** `src/types/database.types.ts` is hand-written; it may diverge
  from the real generated schema. `npm run db:types` after applying migrations is
  **mandatory** and may surface drift.

**Verdict:** PASS (static) · runtime apply NOT VALIDATED. Pass-criteria (zero
migration errors / missing tables / broken FKs) provable only by running
`supabase db reset` — see runbook §2.

## PHASE 2 — Role system (RBAC)

**Method:** matrix review + 9 unit tests ([permissions.test.ts](src/lib/rbac/permissions.test.ts)).

Forbidden-action requirements **hold in the matrix and at the enforcement points**
(every admin action calls `requirePermission`):

- Marketing → no `orders.refund`, no `inventory.adjust` ✓
- Warehouse → no `marketing.send`, no `members.manage`/`customers.manage` ✓
- Support → no `products.write`, no `members.manage`/`customers.manage` ✓

- **FIXED (F4):** global-role admin moved to `platform.manage`.
- **Finding (Med, OPEN):** `inventory.adjust` and `marketing.send` permissions
  exist but are **not wired to any concrete action/UI** (manual inventory
  adjustment and a campaign sender aren't built as gated actions). They're inert,
  not exploitable — but the matrix advertises capabilities without enforcement
  points. Recommend either building the gated actions or removing the unused
  permissions.
- **NOT VALIDATED:** per-account login / dashboard / menu walkthrough (needs 7
  real auth accounts). Menu visibility is deterministic from `permissions` (nav
  filter) and was inspected.

**Verdict:** PASS (static+tests); no privilege escalation in code; live per-role
walkthrough NOT VALIDATED (runbook §6).

## PHASE 3 — Store isolation

**Method:** trace every store-owned read/write path.

- **Storefront:** scoped at the query layer (`storeId`) + RLS — consistent.
- **Admin:** was **NOT isolated** — see **F1/F2/F3** (now fixed). Post-fix, admin
  products/orders/coupons/categories/reviews **and dashboard KPIs** are scoped to
  the operator's resolved store; cross-store update/delete is blocked.
- **`listUsers`** intentionally remains global but is now platform-operator-only
  (F4).
- **Defensive scoping:** when no store resolves (pre-migration), filters are
  skipped so the single-store app still works — verify post-migration that scoping
  actually engages (runbook §6).

**Verdict:** Storefront PASS (static); admin **FIXED**; **zero cross-tenant
leakage in code post-fix**. Runtime multi-store proof NOT VALIDATED (needs 3 live
stores + accounts).

## PHASE 4 — Subdomain routing

**Method:** logic review + 6 unit tests ([resolve.test.ts](src/lib/tenant/resolve.test.ts)).

- `resolveTenantFromHost` (root/www/localhost → default; `<slug>.root` → subdomain;
  other → custom) tested. `getStorefrontStore` resolves strictly and **404s
  unknown** subdomains; branding (name/logo/colour) wired in `SiteHeader`.
- **NOT VALIDATED:** real DNS/subdomain loading + theme render (needs deployment
  or local `*.localhost`); procedure in runbook §4.

**Verdict:** PASS (static+tests); runtime NOT VALIDATED.

## PHASE 5 — Stripe Connect

**Method:** code review of onboarding, checkout routing, webhook; fee math tested.

- Onboarding (Express account + Account Link), destination charge + `application_fee`
  (`PLATFORM_FEE_BPS`, 2%), `refreshStripeStatus`, `account.updated` webhook — present.
- **FIXED (F6):** `charge.refunded` now syncs dashboard-initiated refunds.
- Webhook events vs spec: `checkout.session.completed` ✓, `account.updated` ✓,
  `charge.refunded` ✓ (added). `payment_intent.succeeded` **intentionally not
  handled** (finalization is on `checkout.session.completed`; handling both risks
  double-processing) — documented in code.
- Fee math: `platformFeeSen()` unit-tested (rounding, caps, zero).
- **NOT VALIDATED:** real onboarding, payout, fee collection, refund in Stripe
  test mode — runbook §5. Pass-criteria (financial correctness, webhook
  processing) provable only against Stripe.

**Verdict:** PASS (static); runtime NOT VALIDATED.

## PHASE 6 — Webhook reliability

- **Idempotency:** `finalizeOrderFromSession` guards by existing
  `stripe_checkout_session_id`; **FIXED (F5)** adds a unique index so racing
  duplicates can't double-insert. Retries: handlers are idempotent (status
  updates / upserts); errors return 500 → Stripe retries.
- Signature verification present (`constructEvent`).
- **Finding (Low, OPEN):** no event-id dedup table — relies on idempotent handlers
  + the unique index. Acceptable; consider a `processed_events` table for
  belt-and-suspenders.
- **NOT VALIDATED:** actual duplicate/out-of-order/retry simulation (needs
  Stripe CLI) — runbook §5.

**Verdict:** Hardened to PASS (static) via F5; runtime simulation NOT VALIDATED.

## PHASE 7 — Performance

- **Cannot run Lighthouse here.**
- **Known risk (High):** MT-6 made the **entire storefront dynamic** (per-Host
  tenant resolution via `headers()`), so homepage/PDP/category are no longer
  SSG/ISR — they render per request. This likely **misses the Performance > 90 /
  fast-paint targets** without mitigation.
- **Recommended fixes:** (a) SSG-per-store via middleware path-rewrite to a
  `/s/<slug>/…` segment with `generateStaticParams`; or (b) Next route-segment /
  data caching (`unstable_cache` keyed by store) for catalog reads; or (c) CDN
  caching of storefront HTML per Host. Tracked as deferred in
  [docs/MULTITENANCY.md](docs/MULTITENANCY.md).

**Verdict:** NOT VALIDATED; **explicit performance-regression risk flagged** for
remediation before launch. Measure with Lighthouse after applying a caching
strategy.

## PHASE 8 — Security

- **RBAC bypass:** enforced server-side in actions (the real boundary, since admin
  writes use the service-role client) ✓.
- **Tenant boundary:** storefront scoped; admin **FIXED (F1–F4)**.
- **Direct API calls:** `/api/admin/members` gated by `members.manage`;
  `/api/stores/slug-available` requires auth; webhook signature-verified;
  abandoned-cart cron **enforces `CRON_SECRET`** (Bearer or `?secret`; 500 if
  unset) — verified ✓.
- **Session handling:** Supabase Auth (JWT + refresh, httpOnly cookies via
  `@supabase/ssr`); middleware uses `getUser()` (revalidates) — not `getSession()`
  ✓.
- **Role escalation:** `setUserRoleAction` now `platform.manage`; store-role
  changes guarded by sole-owner protection (tested) ✓.
- **Secrets:** service-role key is `server-only`; `.env.local` gitignored ✓.
- **Finding (Med, OPEN — NOT implemented):** **No rate limiting** anywhere (auth,
  webhook, public APIs). Recommended before production (edge middleware +
  Upstash/Vercel KV, or a WAF). Left as a recommendation rather than built, to
  respect "no new features."
- **NOT VALIDATED:** active pen-testing / fuzzing (needs a running target).

**Verdict:** No critical **code-level** vulnerability after F1–F4; rate limiting is
an open production gap (Med). Live pen-test NOT VALIDATED.

## PHASE 9 — Disaster recovery

- **Cannot test backup/restore here** (no live DB/infra).
- **Documented procedure:** Supabase daily backups / PITR for restore; schema is
  fully migration-driven (re-appliable to a fresh project); Vercel "Promote
  previous deployment" for app rollback; `supabase db reset` for **non-prod** only.
- **Recommendation:** before launch, perform one real backup→restore drill and one
  deploy-rollback drill, and record RPO/RTO.

**Verdict:** NOT VALIDATED — procedure captured; drill required (runbook §7–8).

---

## Production-readiness recommendations (prioritised)

1. **Apply migrations to a live Supabase + `npm run db:types`**, then run the
   Phase-by-phase runbook checklist (closes the NOT-VALIDATED items).
2. **Verify the isolation fixes engage post-migration** (F1–F4) with 3 real stores.
3. **Add rate limiting** (Phase 8) — required for production.
4. **Resolve the storefront performance regression** (Phase 7) with a caching/SSG
   strategy, then measure Lighthouse.
5. Decide on `inventory.adjust` / `marketing.send` (build gated actions or drop).
6. Run a **DR drill** (backup/restore + rollback) and record RPO/RTO.
7. Add E2E (Playwright) for invite→accept→role-change, store creation, subdomain
   routing, and a Stripe test-mode order.

## Overall risk level

**Medium.** The architecture is sound and the critical isolation defects found by
this review are fixed in code. Remaining gates to "production-ready" are
**runtime validation** (DB + Stripe + Lighthouse + DR), **rate limiting**, and the
**storefront performance** strategy — none of which can be closed inside this
environment, but all of which now have a clear, documented path.
