# RLS & Tenant-Isolation Test Plan — Phase 3 (MT-11)

Repeatable plan to PROVE RLS + tenant isolation on staging once migrations are
applied + [scripts/seed-staging.sql](../scripts/seed-staging.sql) is run.

## Dataset (from the seed)
- Stores: **A** (`store-a`) + **B** (`store-b`).
- Members: A = owner/manager/marketing/warehouse/support; B = owner.
- Shopper: `customer@staging.test` (no membership).
- 1 product per store; add ≥1 order + ≥1 store_member row so RLS is *provable*
  (anon-sees-zero vs service-sees-N).

## A. RLS (anon vs service-role) — `infra-validate` Gate 4
| Table | anon expectation | how |
|---|---|---|
| `orders` | 0 rows | seed ≥1 order; `npm run infra-validate` → "anon sees 0 (service sees N)" = PASS |
| `store_members` | 0 rows | seeded; same |
| `products` (active) | readable (public) | anon CAN read active products — that's by design, isolation is store-scoped at query layer |

PASS requires `service > 0 AND anon = 0`. (Today: store_members table missing →
FAIL; orders empty → inconclusive — see rls-validation.md.)

## B. Tenant isolation (authenticated, store-scoped) — Playwright
Set env (docs/TESTING.md §Multi-store E2E setup):
`E2E_ROOT_DOMAIN`, `E2E_STORE_A_SLUG=store-a`, `E2E_STORE_B_SLUG=store-b`,
`E2E_ADMIN_EMAIL=store-a-admin@staging.test` (+pw), per-role creds, invitee.

| # | Actor | Action | Expected |
|---|---|---|---|
| 1 | store-a-admin | open `store-a.<root>/admin/products` | sees only A's products |
| 2 | store-a-admin | open `store-b.<root>/admin/products` | redirected out (not a B member) |
| 3 | store-a-admin | `GET store-b.<root>/api/admin/members` | 401/403 |
| 4 | store-a-admin | dashboard KPIs | reflect A only (not B) |

Run: `npm run test:e2e` → `store-isolation.spec.ts` must PASS (not skip).

## C. RBAC cross-store attempts — Playwright `rbac.spec.ts`
| Role (member of A) | Sees in `/admin` nav | Blocked from |
|---|---|---|
| admin | Members, Store, Orders, Coupons | (Users = platform only) |
| manager | Orders, Coupons, Categories | Members, Store, Users |
| marketing | Coupons, Reviews | Orders, Members, Store |
| warehouse | Orders, Products | Coupons, Members, Store |
| support | Orders, Reviews | Coupons, Members, Store |

Plus the legacy-fallback assertion (unit-proven; E2E confirms live): a
global-admin profile on `store-b` must resolve to `customer`.

## Pass criteria
A + B + C all green against seeded staging → RLS + isolation **VALIDATED**.
Until then: **NOT VALIDATED** (record actual results back into
rls-validation.md / tenant-isolation.md / rbac-validation.md).
