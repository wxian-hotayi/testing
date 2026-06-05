# Tenant Isolation Validation — Phase 4

**Date:** 2026-06-05 · **Status: NOT VALIDATED**

## What was required
Create Store A + Store B and store-a-admin / store-b-admin users; prove Store A
cannot access Store B products/orders/members/analytics, via **UI and API**, with
screenshots.

## What was actually done / possible
- **Cannot create the two stores + scoped admin users** without seeding the
  target (and the target lacks `store_id` columns — see database-validation.md —
  so store-scoped data can't even exist there yet).
- **Cannot capture UI screenshots** — no interactive browser session is available
  to me.
- The dedicated E2E spec exists ([tests/e2e/store-isolation.spec.ts](../tests/e2e/store-isolation.spec.ts))
  and **ran but SELF-SKIPPED** (no `E2E_ROOT_DOMAIN` / `E2E_STORE_A/B` / per-role
  creds). Evidence from the E2E run:

```
-  22 store-isolation.spec.ts › store-A admin operates A but is blocked from B admin   (skipped)
-  23 store-isolation.spec.ts › store-A admin cannot read store B members via the API  (skipped)
```

## Honest conclusion
**NOT VALIDATED at runtime.** Cross-tenant isolation is implemented + statically
reviewed (MT-2 query scoping + RLS + the MT-7 admin-isolation fixes) and the
*logic* is unit-tested, but it has **not been exercised against two live seeded
stores**. To validate: apply migration 0012 to staging, seed Store A/B + admins
(docs/TESTING.md §Multi-store E2E setup), set the `E2E_*` vars, and run
`npm run test:e2e` — then re-author this report from the real results +
screenshots.
