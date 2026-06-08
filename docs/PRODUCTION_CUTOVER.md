# Production Cutover Runbook

> The ordered, operational sequence to take this multi-tenant SaaS from a
> verified **staging** state to a live **production** deployment. It ties
> together the two existing gates — [GO_LIVE_CHECKLIST.md](./GO_LIVE_CHECKLIST.md)
> (offline preflight) and [INFRA_VALIDATION.md](./INFRA_VALIDATION.md) (runtime
> validator) — into a step-by-step cutover.
>
> **Principle (carried from every validation pass): never mark a step done
> without runtime proof. If something can't be verified, it is NOT VALIDATED.**

## Where we are now (2026-06-08)

Verified live against the **disposable dev/staging** project `atpgszwyzkjojmkkeorp`:

- Migrations **0011–0016 applied**; tenancy tables + `store_id` present; signup
  trigger bug fixed (0016).
- **RLS enforced** (anon 0 / service 2 orders; anon 0 / service 10 members).
- **Tenant isolation, RBAC, invite/accept, subdomain routing** all proven by
  passing live E2E.
- **Sole open gate: Stripe** (placeholder key).

### Production dry-run — what hardens vs. staging

`node scripts/infra-validate.mjs --strict --target=production` (run against the
staging DB) shows the production-only constraints that must be satisfied with
real prod values. Beyond the staging result, **Gate 9 adds two hard failures**:

```
❌ GATE 9 — Production Configuration
   ❌ NEXT_PUBLIC_SITE_URL must be HTTPS, non-localhost (got "http://localhost:3000")
   ❌ sk_test key in production mode            (must be sk_live_…)
❌ GATE 7 — Stripe Configuration               (placeholder key sk_test_xxx)
```

So the production cutover is exactly: **real prod URL + live Stripe keys + a prod
Supabase project, then re-prove the runtime gates against it.**

---

## Step 0 — Decommission-readiness of the staging project

`atpgszwyzkjojmkkeorp` is **disposable** — confirmed dev/staging, safe to reset.
Do **not** promote it to production. Production gets its own project (Step 1) so
staging seed data, test users, and the placeholder Stripe key never leak into a
live environment.

## Step 1 — Stand up the production Supabase project

1. Create a **new** Supabase project (separate from staging). Record its ref,
   anon key, service-role key, and DB password (session-pooler connection string).
2. Apply migrations **0001–0016** to it, in order:
   ```bash
   # via the Supabase CLI against the prod project
   supabase link --project-ref <PROD_REF>
   supabase db push
   # or apply supabase/migrations/*.sql over the session pooler
   ```
3. **Verify the ledger + structure with SQL** (PostgREST can't introspect this —
   Gate 2/3 explicitly mark it NOT VALIDATED):
   ```sql
   select name from supabase_migrations.schema_migrations order by name;   -- 0001..0016 present
   select indexname from pg_indexes where indexname = 'orders_stripe_session_unique';  -- present (0015)
   select count(*) from information_schema.columns where column_name='store_id';        -- store_id on tenant tables
   ```
4. Confirm **pgcrypto is in the `extensions` schema** (the 0016 fix assumes this):
   ```sql
   select n.nspname from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto';  -- extensions
   ```

## Step 2 — Production environment config (clears Gate 9)

Set, in the production host (Vercel/host env — **not** `.env.local`):

| Var | Production value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>` — **HTTPS, non-localhost** |
| `NEXT_PUBLIC_SUPABASE_URL` | prod project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | prod service-role key (server-only, never client) |
| `STRIPE_SECRET_KEY` | **`sk_live_…`** (live mode) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the **live** webhook endpoint (Step 3) |
| `PLATFORM_FEE_BPS` | your Connect platform fee in basis points |

> For a green **staging** verdict first, the same steps work with `sk_test_…`
> and a test webhook endpoint + a real staging domain — see Step 5.

## Step 3 — Stripe live mode (clears Gate 7/8)

1. In the Stripe dashboard (live mode), get the `sk_live_` secret key.
2. Register the **live** webhook endpoint → `https://<your-domain>/api/stripe/webhook`,
   subscribe to `checkout.session.completed` (+ `account.updated`,
   `charge.refunded`). Copy its `whsec_` into `STRIPE_WEBHOOK_SECRET`.
3. Confirm Connect is enabled for destination charges (platform + connected
   accounts). The idempotency guard is the `orders_stripe_session_unique` index
   (0015) — already verified present in Step 1.

## Step 4 — Re-prove the runtime gates against production

The DB/RLS/config gates run from the validator; tenant-isolation and RBAC are
**only** provable via E2E (Gate 5/6 are NOT VALIDATED by a DB probe — by design).

```bash
# 1) Offline preflight (code + schema files + config). Blocks deploy on failure.
GO_LIVE_TARGET=production npm run go-live-check

# 2) Runtime validator + real test-mode (or live) charge/refund + webhook idempotency.
node scripts/infra-validate.mjs --strict --target=production --payments

# 3) Live behaviour — RBAC, tenant isolation, invite/accept, routing.
#    Run in batches under the 15/min auth rate limiter (see note below).
npm run test:e2e -- tests/e2e/rbac.spec.ts tests/e2e/tenant-routing.spec.ts --workers=1
npm run test:e2e -- tests/e2e/store-isolation.spec.ts tests/e2e/invite-flow.spec.ts --workers=1
```

**Expected green state:** Gates 1–4 + 9 PASS; Gate 5/6 PASS via E2E; Gate 7/8
PASS with the live/test key. Then `PRODUCTION READY = YES`.

> **Rate-limiter note.** A single bulk E2E run trips the per-IP auth limiter
> (15/min) — it returns *"Too many requests."* That's the control working, not a
> bug. Run specs in small batches, or temporarily raise the limit only in a
> controlled validation environment.

## Step 5 — Fast path: green **staging** verdict today

Before the full prod cutover, you can flip staging to `PRODUCTION READY = YES`
in minutes — it only needs Stripe:

1. Put a real **`sk_test_…`** + test-endpoint `whsec_…` in `.env.local`.
2. `node scripts/infra-validate.mjs --strict --payments` (target defaults to
   staging — Gate 9's HTTPS/live-key constraints stay relaxed).
3. Gate 7/8 flip green → staging verdict is YES.

## Step 6 — Gate the pipeline (don't regress)

Wire both gates into CI/CD so a missing migration, a `sk_test` key in prod, or a
localhost URL **blocks the deploy**:

- `npm run predeploy` → `go-live-check` (already aliased; offline, deterministic).
- A post-deploy/staging job running `infra-validate --strict --target=production`
  against the live project, failing the pipeline on any critical gate.

---

## Cutover checklist (tick before announcing live)

- [ ] Prod Supabase project created; migrations 0001–0016 applied; ledger + indexes verified by SQL
- [ ] pgcrypto in `extensions` schema (0016 assumption holds)
- [ ] RLS enforced on prod (anon=0 / service>0 on orders + store_members)
- [ ] `NEXT_PUBLIC_SITE_URL` = HTTPS, non-localhost
- [ ] `STRIPE_SECRET_KEY` = `sk_live_`; live webhook endpoint + `whsec_` set
- [ ] `go-live-check` (target=production) → exit 0
- [ ] `infra-validate --strict --target=production --payments` → all critical gates PASS
- [ ] E2E (batched): rbac, tenant-routing, store-isolation, invite-flow → all pass against prod
- [ ] CI gates wired (predeploy + post-deploy validation)
- [ ] Staging seed data / test users NOT present in prod
