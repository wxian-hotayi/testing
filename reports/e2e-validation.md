# E2E Validation — Phase 6

**Date:** 2026-06-05 · **Command:** `npm run test:e2e` (Playwright, chromium
installed, server auto-started via `npm run start` against the live project).
**This ran for real.**

## Result: 12 passed · 13 skipped · 0 failed (exit 0)

```
Running 25 tests using 10 workers
...
  13 skipped
  12 passed (11.2s)
```

| Spec group | Ran? | Status | Notes |
|---|---|---|---|
| `smoke.spec.ts` (5) | ✅ ran | **PASS** | homepage hero/trust/footer, nav, key pages load, login form, empty cart |
| `access-control.spec.ts` (6) | ✅ ran | **PASS** | `/account`,`/admin`,`/admin/members` → `/login`; `/api/admin/members` 403; `/api/stores/slug-available` 401; cron 401/500 |
| `purchase-path.spec.ts` (1) | ✅ ran | **PASS** | browse → add to cart → reach `/checkout` (UI flow; stops before payment) |
| `rbac.spec.ts` (5) | ⏭ skipped | **NOT VALIDATED** | needs per-role creds + store fixtures |
| `store-isolation.spec.ts` (2) | ⏭ skipped | **NOT VALIDATED** | needs 2 stores + admins |
| `invite-flow.spec.ts` (1) | ⏭ skipped | **NOT VALIDATED** | needs admin + invitee creds |
| `account-and-admin.spec.ts` (3) | ⏭ skipped | **NOT VALIDATED** | needs auth creds |
| `tenant-routing.spec.ts` (2) | ⏭ skipped | **NOT VALIDATED** | needs `E2E_ROOT_DOMAIN` + store slug |

## Conclusion
**Public surface PASS** (storefront render, navigation, security redirects, API
auth gating, purchase UI flow) — verified in a real browser against the live app.
**Multi-tenant / RBAC / invite / subdomain-routing flows NOT VALIDATED** — they
self-skip without seeded fixtures + credentials (correct behaviour, not a fail).
Provide the `E2E_*` env (docs/TESTING.md §Multi-store E2E setup) on a seeded
staging project to execute the remaining 13.
