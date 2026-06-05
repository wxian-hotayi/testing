# PRODUCTION READINESS — Sign-off (MT-10)

**Date:** 2026-06-05 · **Validator:** Principal-Staff-Engineer review
**Target exercised:** the Supabase project in `.env.local`
(`https://<project-ref>.supabase.co`) + the local app build. This is **not** a
purpose-built clean staging environment (I cannot provision Supabase/Stripe
projects, DNS, browsers, or backups), so several phases are **NOT VALIDATED** by
necessity — never faked.

## Summary

| Area | Status | Basis (evidence) |
|---|---|---|
| **Database** | ❌ **FAIL** | Connectivity ✅, but **migrations 0011–0015 are NOT applied** — tenancy tables (`stores`,`store_members`,`store_invitations`,`membership_audit`) MISSING and `store_id` absent on commerce tables. Only base 0001–0010 schema present. → [database-validation.md](./database-validation.md), [schema-remediation.md](./schema-remediation.md) |
| **RLS** | ❌ **FAIL / NOT VALIDATED** | `store_members` table missing → can't test; `orders` empty → inconclusive. Policies exist statically. → [rls-validation.md](./rls-validation.md) |
| **RBAC** | ✅ logic / 🚫 live | **62 unit tests PASS** incl. legacy-fallback regression; live per-request gating NOT VALIDATED (E2E skipped). → [rbac-validation.md](./rbac-validation.md) |
| **Tenant Isolation** | 🚫 **NOT VALIDATED** | E2E specs self-skipped (no seeded stores/creds); no store_id in target. → [tenant-isolation.md](./tenant-isolation.md) |
| **Payments** | ❌ **FAIL** | Stripe key is a placeholder (`sk_test_xxx`) — invalid; no charge possible. → [stripe-validation.md](./stripe-validation.md) |
| **Webhooks** | 🚫 **NOT VALIDATED** | Requires valid Stripe + running app + `stripe listen`. |
| **E2E (public surface)** | ✅ **PASS (partial)** | Real run: **12 passed / 13 skipped / 0 failed** — storefront, security redirects, API auth gating, purchase UI flow. → [e2e-validation.md](./e2e-validation.md) |
| **Performance** | 🚫 **NOT VALIDATED** | No Lighthouse tooling/browser; MT-6 dynamic-storefront risk noted. → [performance-validation.md](./performance-validation.md) |
| **Disaster Recovery** | 🚫 **NOT VALIDATED** | No backup/restore access. → [dr-validation.md](./dr-validation.md) |

## What was actually proven at runtime (real evidence)
- ✅ Supabase reachable; the 10 expected tenancy/commerce tables exist.
- ✅ App builds, boots, and serves; **12 E2E specs pass in a real browser**
  (storefront render, nav, auth redirects, `/api` auth rejection, purchase flow).
- ✅ RBAC permission matrix + cross-tenant legacy-fallback fix: **62 unit tests
  pass** (executed).

## What was disproven / flagged at runtime
- ❌ **Schema drift:** `store_id` (migration 0012) is **absent** from commerce
  tables in the target — tenant scoping cannot function there.
- ❌ **Stripe not configured** (placeholder key) — payments unusable.

## MT-11 update (blocker remediation prepared)

Re-ran validation after deeper investigation. Findings sharpened + a validator
bug fixed:
- **Root cause confirmed:** *no* MT migrations (0011–0015) applied to the target —
  not merely "0012 missing." (Earlier "10 tables present" was an `infra-validate`
  false positive from a `head:true` probe; **fixed** to use GET — Gates 1/2/4
  now detect missing tables correctly.)
- **Stripe** key is a placeholder → Gates 7/8 FAIL (no charge created).
- **Prepared to close** (not applied by me — team action): apply-migrations plan
  + rollback ([schema-remediation.md](./schema-remediation.md)),
  [scripts/seed-staging.sql](../scripts/seed-staging.sql),
  [rls-test-plan.md](./rls-test-plan.md), [stripe-test-plan.md](./stripe-test-plan.md),
  `.env.staging.example`.
- Per the success criteria, status **remains NO** until 0012 + isolation +
  payments + webhooks are verified on a remediated staging env.

## FINAL DECISION

### PRODUCTION READY = **NO**

**Reasons (blocking):**
1. Database schema is **incomplete/drifted** (store_id / migration 0012 not
   applied) — FAIL.
2. **Payments not configured/validated** (invalid Stripe key) — FAIL.
3. **RLS, tenant isolation, webhooks, performance, and DR are NOT VALIDATED** at
   runtime — cannot be marked safe.

A correct go/no-go requires a clean staging project with **all** migrations
applied + seeded data + real Stripe test keys, then re-running every phase to
green.

## Remaining risks
- Multi-tenant data isolation unproven against live, seeded stores.
- Payment correctness (fee, refund-sync, webhook idempotency) entirely unproven.
- Storefront performance regression (dynamic rendering) unmeasured.
- No DR drill → unknown RPO/RTO.

## Recommended next actions (owner: release eng)
1. Provision a **clean staging Supabase** (Auth+Storage+RLS) + **Stripe test**
   account (Connect on); fill `.env.staging` (template added).
2. `supabase db push` (apply 0011–0015) → `npm run db:types` → re-run
   `npm run infra-validate -- --target=staging` until Gates 1–4 are green.
3. Seed Store A/B + the 7 role accounts (docs/TESTING.md); set `E2E_*`; run
   `npm run test:e2e` → close RBAC + isolation + invite + routing.
4. Configure real `sk_test_` key + webhook; `npm run infra-validate -- --payments`;
   run app + `stripe listen` for the full order/refund/idempotency loop.
5. Lighthouse the 3 pages; run one **DR backup→restore** drill; record results.
6. Re-issue this sign-off from the staging evidence.

> Evidence rule honored: every PASS above corresponds to a command that actually
> ran; everything unverifiable is marked NOT VALIDATED, not PASS.
