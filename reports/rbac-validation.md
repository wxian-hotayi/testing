# RBAC Validation — Phase 5

**Date:** 2026-06-05

## Logic / matrix — PASS (unit-verified, actually executed)
`npm test` ran the RBAC matrix + the legacy-fallback regression. **Real output:**

```
✓ src/lib/rbac/permissions.test.ts (14 tests)
Test Files  7 passed (7)
     Tests  62 passed (62)
```

[permissions.test.ts](../src/lib/rbac/permissions.test.ts) asserts the required
behaviour, including the legacy-admin fallback fix:

| Expectation | Status | Evidence (test case) |
|---|---|---|
| global admin on **non-default** store ⇒ `customer` | **PASS** | "global admin is NOT admin of a non-default store" |
| global admin on **default** store ⇒ `admin` | **PASS** | "still has admin on the default store (legacy path)" |
| platform admin ⇒ `super_admin` | **PASS** | "platform admin still spans every store" |
| 7 roles defined + ROLE_PERMISSIONS matrix | **PASS** | matrix invariant tests |
| departmental disjointness (marketing≠inventory, warehouse≠refund, support≠products.write) | **PASS** | "departmental roles are disjoint where it matters" |

## Live system — NOT VALIDATED
Per-request role resolution against the running app (and per-role nav/page gating)
was **not exercised**: the E2E [rbac.spec.ts](../tests/e2e/rbac.spec.ts) ran but
**SELF-SKIPPED** (no per-role creds / store fixtures):

```
-  12..16 rbac.spec.ts › RBAC: admin/manager/marketing/warehouse/support  (skipped)
```

## Conclusion
RBAC **logic is PASS** (unit, executed, incl. the cross-tenant fix). Live RBAC
enforcement is **NOT VALIDATED** — run `npm run test:e2e` with seeded role
accounts (docs/TESTING.md) against staging to close it.
