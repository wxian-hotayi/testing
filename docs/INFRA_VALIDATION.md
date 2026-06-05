# Runtime Infrastructure Validation

> [scripts/infra-validate.mjs](../scripts/infra-validate.mjs) checks a **live**
> Supabase + Stripe deployment and reports its **actual** state. It never fakes
> a result — a check that can't be performed is `SKIPPED` or `NOT VALIDATED`,
> never `PASS`. Complements the offline [GO_LIVE_CHECKLIST](./GO_LIVE_CHECKLIST.md)
> and the manual [SETUP_AND_VALIDATION](./SETUP_AND_VALIDATION.md) runbook.

```bash
npm run infra-validate                       # staging defaults
npm run infra-validate -- --target=production
npm run infra-validate -- --payments         # also run a real test-mode charge+refund
npm run infra-validate -- --strict           # exit 1 unless every critical gate PASSes
```

## Required environment

Point the variables at the **target** environment (CI secrets, or `.env.local`
for a local run against a real project — it's loaded best-effort):

| Var | Used by | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`) | Gates 1–4 | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `SUPABASE_ANON_KEY`) | Gate 4 (RLS) | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Gates 1–4 | yes |
| `STRIPE_SECRET_KEY` | Gates 7–8 | for payments |
| `STRIPE_WEBHOOK_SECRET` | Gate 9 | for prod |
| `NEXT_PUBLIC_SITE_URL` | Gate 9 | for prod |

`--target=production` makes Gate 9 strict (HTTPS, non-localhost, no `sk_test_`).

## Gates & what is actually verifiable

| Gate | Verifies (live) | Honest limits |
|---|---|---|
| 1 Supabase Connectivity | service-role query succeeds against the URL | — |
| 2 Migration State / Tables | required tables exist (real queries) | migration ledger + indexes + `unique(stripe_checkout_session_id)` → **NOT VALIDATED** via PostgREST; use `supabase migration list` / SQL on `pg_indexes`,`pg_constraint` |
| 3 Database Structure | `store_id` column present on tenant tables (real queries) | FKs/indexes → **NOT VALIDATED** via API; verify via SQL |
| 4 RLS Validation | anon sees **0** rows of `orders`/`store_members` while service sees them | inconclusive (→ WARNING) when no rows exist to test against |
| 5 Tenant Isolation | — | **NOT VALIDATED** here (needs authed store-scoped sessions); covered by `tests/e2e/store-isolation.spec.ts` |
| 6 RBAC | — | **NOT VALIDATED** here (app-layer per-request); covered by `permissions.test.ts` + `tests/e2e/rbac.spec.ts` |
| 7 Stripe Configuration | key valid + account reachable (`balance.retrieve`), Connect enabled, webhook endpoint configured | — |
| 8 Stripe Payment Flow (`--payments`) | real test-mode `PaymentIntent` charge + refund succeed | refuses non-`sk_test_` keys; full checkout→webhook→order→idempotency→fee→refund-sync needs the running app + `stripe listen` → **NOT VALIDATED** here (runbook §5) |
| 9 Production Configuration | required env present; HTTPS/non-localhost; no `sk_test_` in prod | static |
| 10 Decision | aggregates → `PRODUCTION READY: YES/NO` + reason | — |

## Interpreting results

- **PASS** — verified against live infra. **FAIL** — a real check failed.
  **WARNING** — ran, non-blocking. **SKIPPED** — prerequisite absent.
  **NOT VALIDATED** — can't be checked through this surface (use the noted path).
- **Exit code:** `0` if no critical gate FAILED; `1` otherwise. `--strict` also
  exits `1` if any critical gate is not PASS (skip/not-validated/warning).
- **`PRODUCTION READY: YES`** only when **every critical gate is PASS** — so a run
  with `NOT VALIDATED` criticals reports NO (honestly: not proven), even if exit
  code is `0`. Close those via E2E/SQL before go-live.

## Workflows

**Staging:** set staging env → `npm run infra-validate` → review; run
`npm run infra-validate -- --payments` once to confirm Stripe test charge/refund;
run `npm run test:e2e` (with seeded stores + creds) to close Gates 5/6.

**Production:** with production secrets →
`npm run infra-validate -- --target=production --strict`. Combine with the
offline gate (`GO_LIVE_TARGET=production npm run go-live-check`) and the manual
GO-LIVE checklist (DR drill, legal, Lighthouse). Deploy only when all three are
satisfied.

## What this validator cannot do (by design)
Schema-catalog introspection (indexes/constraints/FKs/migration ledger),
app-layer RBAC, cross-tenant isolation, and the full payment→webhook→order loop
require SQL access, authed sessions, or the running app + webhook tunnel — it
reports those as `NOT VALIDATED` and points to the path that can verify them,
rather than guessing.
