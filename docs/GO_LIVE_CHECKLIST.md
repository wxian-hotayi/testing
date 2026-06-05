# GO-LIVE Checklist & Deployment Gate

> Enforceable preflight for production releases of the multi-tenant SaaS
> (Next.js + Supabase + Stripe). This is **not documentation only** — the
> automated gates live in [scripts/go-live-check.mjs](../scripts/go-live-check.mjs)
> and block deployment via `npm run predeploy` + CI.

## How it's enforced

```bash
npm run go-live-check     # run the gate (exit 1 if any critical gate fails)
npm run predeploy         # alias → go-live-check; npm auto-runs it before `deploy`
```

- **Deterministic & offline.** No network, no Supabase/Stripe connectivity — it
  validates config, schema files, code structure, and the local toolchain. It
  never fakes runtime validation.
- **Targets** (`GO_LIVE_TARGET`): `production` (default — env/secrets are
  critical) · `ci` / `staging` (env absence downgraded to warnings, so PR CI
  gates on code + structure, not prod secrets).
- **Flags:** `GO_LIVE_SKIP_BUILD=1` skips Gate 0's build (when CI built it in a
  separate step).
- **Exit code:** `0` only if every **critical** check passes; `1` otherwise.
  Warnings never block.

## Automated gates (in the script)

| Gate | Verifies | Critical / Warn |
|---|---|---|
| **0 Code Integrity** | `typecheck`, `lint`, unit `test`, `build` all pass | critical (build warn-able via flag) |
| **1 Database Schema** | migrations `0011–0015` present; RLS enabled on tenancy tables; store-scoped policies; per-store indexes; order idempotency unique index | critical · *applied/drift = warn (needs live DB)* |
| **2 Environment Config** | Supabase URL/anon/service-role, site URL, Stripe keys present; **test-vs-live** flagged; localhost-in-prod flagged | critical in `production`, warn otherwise |
| **3 Auth & RBAC** | RBAC matrix + 7 roles + `resolveRoleKey`; **no global-admin leak** (`isDefaultStore` guard present) | critical |
| **4 Multi-Tenant Safety** | tenant resolver exists; admin queries + dashboard metrics are `store_id`-scoped | critical |
| **5 Payment Readiness** | Stripe webhook route + signature verify + `checkout.session.completed`; idempotency index; Connect onboarding | critical · *account.updated/charge.refunded = warn* |
| **6 E2E Presence** | Playwright config + specs for RBAC, tenant isolation, invite, checkout (presence only — no browser run) | critical |
| **7 Security Baseline** | rate limiting present *(warn-only TODO)*; no hardcoded secrets; `.env.local` gitignored; no service-role client in client components | critical (rate-limit = warn) |

## What the gate CANNOT verify — manual sign-off required before production

These need a live environment and are **out of scope for an offline CI gate** —
each is a hard manual gate (see [SETUP_AND_VALIDATION.md](./SETUP_AND_VALIDATION.md)):

- [ ] **Migrations applied + zero drift** on the target Supabase
      (`supabase migration list` / `supabase db diff`).
- [ ] **RLS functionally verified** (anon / authenticated / service-role) on the
      live DB.
- [ ] **Stripe test-mode flows pass**: Connect onboarding → order → application
      fee → refund → webhook delivery.
- [ ] **Rate limiting implemented** (Gate 7 only warns today — it is **absent**).
- [ ] **Storefront performance** measured (Lighthouse ≥ 90) — note MT-6 made the
      storefront dynamic; a caching/SSG strategy is likely required.
- [ ] **DR drill**: backup → restore + deploy rollback, RPO/RTO recorded.
- [ ] **Legal** (ToS / privacy / refund) reviewed by counsel.

## CI/CD integration

1. **Pull-request gate** ([.github/workflows/go-live.yml](../.github/workflows/go-live.yml)):
   runs `go-live-check` with `GO_LIVE_TARGET=ci` (placeholder public env) on every
   push/PR — blocks merge if Gates 0–7 structural/code checks fail.
2. **Production deploy gate:** run with `GO_LIVE_TARGET=production` and real
   secrets injected, *before* the deploy step. With Vercel, set this as the
   **Ignored Build Step** (non-zero exit ⇒ deploy skipped) or a required status
   check. `npm run predeploy` runs it automatically before any `npm run deploy`.

## Sign-off

| Approver | Role | Automated gate (CI) | Manual gates (above) | Date |
|---|---|---|---|---|
|  | Eng (release owner) | ☐ green | ☐ complete |  |
|  | Security | — | ☐ reviewed |  |
|  | Product / Ops | — | ☐ approved |  |

**Deployment is permitted only when the automated gate exits `0` in
`production` mode AND every manual gate above is checked.**
