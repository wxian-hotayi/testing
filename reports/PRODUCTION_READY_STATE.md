# PRODUCTION READY STATE — direct runtime verification

**Date:** 2026-06-08 · **Mode:** system-activation verification (no new features)
**Target:** live Supabase project `atpgszwyzkjojmkkeorp` (disposable dev/staging),
reached via the IPv4 session pooler for DDL and via PostgREST for API checks.
Every result below is from commands run this session against the live DB and a
running Next.js server. **Nothing simulated. Nothing marked PASS without runtime proof.**

> **Correction vs. the 2026-06-05 report.** The prior verification concluded
> "migrations NOT applied / RLS FAIL." That was a **false negative**: PostgREST
> was serving a **stale schema cache**, so the API reported tenancy tables
> missing while they existed in the database. Direct SQL introspection + a
> `NOTIFY pgrst, 'reload schema'` corrected it. The corrected, re-run evidence
> is below.

---

## Phase 1 — Database / migrations (direct SQL + PostgREST after cache reload)

Migrations **0011–0016 are applied.** Verified two ways: direct `pg` introspection
over the session pooler, and `infra-validate` after reloading the PostgREST cache.

```
✅ PASS  GATE 1 Supabase Connectivity      reached + authenticated (service-role)
✅ PASS  GATE 2 Migration State / Tables   stores, store_members, store_invitations, membership_audit PRESENT
✅ PASS  GATE 3 Database Structure          store_id PRESENT on the commerce tables
```

| Required object | Real DB result |
|---|---|
| `stores`, `store_members`, `store_invitations`, `membership_audit` | **PRESENT** |
| `store_id` on products, categories, orders, order_items, coupons, carts, reviews, subscriptions, … | **PRESENT** (23 tables) |
| `unique(orders.stripe_checkout_session_id)` (0015 webhook idempotency) | **PRESENT** — `orders_stripe_session_unique`, verified by direct SQL on `pg_indexes` |
| Store-member enums / role types | **PRESENT** |

**Verdict: the multi-tenant schema is live.** Base 0001–0010 + tenancy 0011–0015 + bugfix 0016.

## Phase 1b — Critical signup bug found and fixed (migration 0016)

Runtime finding during seeding: **every signup failed** with GoTrue
`"Database error creating new user"`. Root cause (diagnosed via `pg_proc.proconfig`):

- `handle_new_user()` (the `auth.users` insert trigger) pinned `set search_path = public`.
- On Supabase, **pgcrypto lives in the `extensions` schema**, so `gen_random_bytes()`
  (used to mint the profile referral code) was unresolvable inside the trigger →
  the trigger raised → the whole auth insert rolled back.

**Fix — `supabase/migrations/0016_fix_handle_new_user_search_path.sql`:** change the
function's `search_path` to `public, extensions`. Body otherwise byte-identical to 0001
(no logic change). **Proof it worked:** after applying 0016, the seeder created **8 auth
users** with zero errors (previously 100% failure).

## Phase 2 — RLS security validation (with seeded data → enforcement is provable)

Seeded: 8 role users, Stores A/B + default, store memberships, and orders — so
anon-vs-service enforcement has real rows to act on.

```
✅ PASS  GATE 4 RLS
        ✔ anon sees 0 orders         (service sees 2)  — RLS enforced
        ✔ anon sees 0 store_members  (service sees 10) — RLS enforced
```

The anon (public) key is blocked from every protected tenant row while the
service role sees them — RLS is on and enforcing.

## Phase 3 — Tenant isolation (validated via live E2E, not a DB probe)

`infra-validate` marks this **NOT VALIDATED** by design — cross-tenant isolation
needs authenticated, store-scoped sessions, which a service-role/anon probe
cannot fake. It defers to the Playwright spec. **That spec was run and passed:**

```
$ npm run test:e2e -- tests/e2e/store-isolation.spec.ts --workers=1   → 2 passed
  ✔ store-A admin operates A but is blocked from B admin (UI redirect away from /admin/products on B)
  ✔ store-A admin cannot read store B members via the API → HTTP 403
```

A store-A admin is redirected out of store B's admin UI **and** receives **403**
from `GET store-b.localhost/api/admin/members`. **Tenant isolation is proven live.**

## Phase 4 — RBAC (logic + live, both validated)

- **Logic — PASS:** `npm test` → 62 unit tests incl. `permissions.test.ts`
  regression (global-admin → `customer` on a non-default store; → `admin` on the
  default store; platform admin → `super_admin`).
- **Live — PASS:** per-role nav gating + gated-page redirects on the running app:

```
$ npm run test:e2e -- tests/e2e/rbac.spec.ts --workers=1   → 5 passed
  ✔ admin · ✔ manager · ✔ marketing · ✔ warehouse · ✔ support  (nav + gated pages correct per role)
```

## Phase 5 — Member invite/accept + subdomain routing (live E2E)

```
$ npm run test:e2e -- tests/e2e/invite-flow.spec.ts --workers=1     → 1 passed
  ✔ admin invites → invitee accepts → invitee gains /admin access (full MT-4 loop)

$ npm run test:e2e -- tests/e2e/tenant-routing.spec.ts --workers=1  → 2 passed
  ✔ unknown store subdomain → 404
  ✔ known store subdomain   → storefront renders
```

## Phase 6 — Full E2E suite (run in rate-limit-respecting batches)

Every spec passes. The suite must be batched: the **per-IP auth rate limiter
(15/min)** — a real production safety control — throttles a single bulk run of
all logins (it literally returns *"Too many requests. Please slow down."*). Run
in batches under the window, the result is all-green:

| Spec | Result |
|---|---|
| `smoke.spec.ts` | ✅ 5 passed |
| `access-control.spec.ts` | ✅ passed |
| `purchase-path.spec.ts` | ✅ passed |
| `account-and-admin.spec.ts` | ✅ passed (1 conditional skip) |
| `rbac.spec.ts` | ✅ 5 passed |
| `tenant-routing.spec.ts` | ✅ 2 passed |
| `store-isolation.spec.ts` | ✅ 2 passed |
| `invite-flow.spec.ts` | ✅ 1 passed |

Two test-harness fixes were made this session (no app changes):
`store-isolation` now probes the cross-store API via browser navigation (Node's
`getaddrinfo` can't resolve `*.localhost`; Chromium can), and `invite-flow` uses
exact, non-ambiguous selectors and asserts the durable post-accept state.

## Phase 7 — Payments (the one remaining gate)

```
❌ FAIL     GATE 7 Stripe Configuration   Invalid API Key provided: sk_test_xxx  (placeholder)
⏭️ SKIPPED  GATE 8 Stripe Payment Flow     needs --payments + a real sk_test_ key
```

`.env.local` carries a **placeholder** Stripe key. Connectivity, charge/refund,
and webhook idempotency **cannot be validated without a real `sk_test_` key.**
This is a configuration + test-key task, **not an application defect** — the
webhook idempotency schema (0015) and Connect destination-charge code are in
place; only the live key + a test-mode charge/refund remain to be exercised.

## Core-systems summary

| System | Result | Evidence |
|---|---|---|
| Database / migrations 0011–0016 | ✅ PASS | tables + `store_id` present; direct SQL + PostgREST (Gate 2/3) |
| Signup trigger | ✅ FIXED | 0016 search_path fix; 8 users created post-fix |
| RLS | ✅ PASS | anon 0 / service 2 orders; anon 0 / service 10 members (Gate 4) |
| Tenant isolation | ✅ PASS (live) | store-isolation.spec 2/2 — UI redirect + API 403 |
| RBAC | ✅ PASS (logic + live) | 62 unit tests + rbac.spec 5 roles |
| Member invite/accept (MT-4) | ✅ PASS (live) | invite-flow.spec full loop |
| Subdomain routing (MT-6) | ✅ PASS (live) | tenant-routing.spec — 404 + render |
| Rate limiting | ✅ PASS (observed) | auth limiter returned "Too many requests" under load |
| Storefront / purchase UI | ✅ PASS | smoke + purchase-path + access-control |
| Payments (Stripe) | ❌ FAIL / NOT VALIDATED | placeholder key (Gate 7/8) |

## Single remaining blocker & how to clear it

**Stripe is not configured with a real key.** To close it:

1. Put a real `sk_test_…` secret + `whsec_…` webhook secret in the environment.
2. `node scripts/infra-validate.mjs --strict --payments` → exercises a live
   test-mode charge + refund and validates the webhook idempotency unique index.
3. On green, re-run this verification — all gates pass.

Everything else (multi-tenancy, RLS, RBAC, tenant isolation, invites, routing,
rate limiting, storefront/checkout UI) is **proven with real runtime evidence**.

---

PRODUCTION READY = NO

*Sole reason: Stripe (Gate 7/8) is unvalidated — a placeholder key, not a code
defect. With a real test key it is the last gate to flip. All other core systems
are verified live against real infrastructure this session.*
