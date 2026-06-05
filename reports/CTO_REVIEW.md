# CTO Repository Review — Risk & Scalability

**Date:** 2026-06-05 · **Scope:** whole repo (`vitalis-commerce`), no new
features. Findings ranked **Critical / High / Medium / Low** and tagged with the
customer scale they block (**100 / 1k / 10k**). Severity key:

- **Critical** — blocks ANY paying customer (money/data/legal/correctness).
- **High** — breaks or becomes unacceptable by ~1,000 customers.
- **Medium** — degrades by ~10,000 customers.
- **Low** — hygiene / maintainability.

## Verdict by scale

| Customers | Can it serve them today? | Gating blockers |
|---|---|---|
| **100** | **No** | Not deployed/validated (migrations unapplied, Stripe placeholder), webhook idempotency unverified, no error visibility, legal templates. |
| **1,000** | **No** | + per-instance rate limiting, uncached dynamic storefront, in-memory dashboard aggregation, DB connection management. |
| **10,000** | **No** | + single-primary DB with no cache/read-replica, N+1 query latency, custom-domain/ops load. |

Net: **the architecture is fundamentally sound and multi-tenant-correct**, but a
defined set of runtime-readiness, caching, and operability gaps must close before
each tier. None require new features — all are remediation/hardening.

---

# 1. Technical Debt Report

| ID | Sev | Blocks | Finding (evidence) | Remediation |
|---|---|---|---|---|
| TD-1 | **High** | 100 | **Hand-written `src/types/database.types.ts`** can silently drift from the real schema — MT-10/11 found the live DB lacked columns the types declared. | Generate types from the live schema (`npm run db:types`) in CI against a migrated DB; fail the build on drift. |
| TD-2 | **High** | 1k | **Pervasive silent error-swallowing** — 91 `catch` blocks, many `catch { return [] }` / `console.warn` (33). Failures vanish (e.g. catalog/cart/metrics return empty on error). | Route errors to an error tracker (see OPS-1); convert "return empty" fallbacks to logged + alerted; reserve swallowing for truly optional paths. |
| TD-3 | Medium | — | **Service-role client + manual `store_id` scoping** is a footgun — every admin query must remember the filter or it leaks cross-tenant (MT-7 fixed several misses). | Centralize tenant-scoped data access behind a small repository wrapper that *requires* a store id; lint/grep guard for raw `.from()` in admin paths. |
| TD-4 | Medium | 10k | **N+1 / multi-round-trip query patterns** (e.g. `catalog/queries.ts` `withPrimaryImages`, `getRecentReviews`; `cart-service` sequential reads). | Batch with embedded selects or RPCs; add covering indexes; cache hot reads. |
| TD-5 | Low | — | `next lint` is deprecated (removed in Next 16); legal pages are templates; `supabase/full-setup.sql` is stale (0001–0010 only). | Migrate to ESLint CLI; counsel-review legal; regenerate/retire full-setup. |
| TD-6 | Low | — | Test coverage is unit + structural E2E only; multi-tenant/RBAC/payment E2E require a seeded env and have **never executed green**. | Stand up staging + seed (artifacts exist) and run the full E2E suite in CI. |

---

# 2. Security Report

| ID | Sev | Blocks | Finding (evidence) | Remediation |
|---|---|---|---|---|
| SEC-1 | **Critical** | 100 | **Webhook/payment idempotency unverified at runtime.** The `0015` unique index on `orders.stripe_checkout_session_id` is not confirmed applied (MT-11: migrations unapplied) → duplicate orders/charges possible. | Apply migrations to the target + verify the unique index via SQL; run the duplicate-webhook test (stripe-test-plan.md) before taking money. |
| SEC-2 | **High** | 1k | **Rate limiting is in-process / per-instance** (`src/lib/rate-limit/limiter.ts`, a `Map`). On Vercel's serverless fleet each isolate has its own counter → limits don't hold globally → brute-force / abuse / cost. | Swap the store for a shared backend (Upstash Redis / Vercel KV) behind the existing `checkRateLimit` shape; keep auth limits tight. |
| SEC-3 | **High** | 100 | **No CSP and no HSTS.** `next.config.mjs` sets nosniff/frame/referrer/permissions only. | Add `Strict-Transport-Security` and a `Content-Security-Policy` (start report-only); they're config-only changes. |
| SEC-4 | Medium | 1k | **Service-role key is the master key.** Used widely server-side; a leak = full DB access (RLS bypass). Guarded by `server-only` today. | Rotate on a schedule; restrict to the narrowest server paths; consider per-domain service tokens; secret-scanning in CI (go-live Gate 7 covers committed code). |
| SEC-5 | Medium | 1k | **RLS enforcement unproven on live data** (MT-11: tables empty/missing). Tenant isolation depends partly on app-layer `store_id` filters + RLS that has never been runtime-verified. | Execute rls-test-plan.md on seeded staging; prove `service>0 AND anon=0`. |
| SEC-6 | Low | — | Auth is Supabase (JWT + refresh, httpOnly, `getUser()` revalidation) — sound. No MFA for admin/platform operators. | Offer/require MFA for platform + store-admin roles (Supabase supports it). |

---

# 3. Scalability Report

| ID | Sev | Blocks | Finding (evidence) | Remediation |
|---|---|---|---|---|
| SCALE-1 | **High** | 1k | **Storefront is fully dynamic** (MT-6: per-Host tenant resolution via `headers()`), no SSG/ISR/caching — every homepage/PDP/category hit is SSR + DB. Multiplies DB load + latency with traffic. | Cache per store: middleware path-rewrite to `/s/<slug>/…` for SSG/ISR, or `unstable_cache`/route-segment caching keyed by store; CDN HTML cache. |
| SCALE-2 | **High** | 1k | **Dashboard aggregates in memory** — `features/admin/metrics.ts` pulls up to **1,000 orders + 5,000 order_items** into JS and reduces on every dashboard load. Slow + memory-heavy for any active store. | Move aggregation to SQL (views / materialized views / RPC); cache results (e.g. 5-min). |
| SCALE-3 | **High** | 1k | **Postgres connection pressure** — a Supabase client is created per request/action; serverless concurrency can exhaust connections. | Use the Supabase **pooler** (transaction mode) connection for serverless; verify pool sizing; avoid direct-connection at scale. |
| SCALE-4 | Medium | 1k | **Abandoned-cart cron** processes ≤200 carts/run, **sequentially** (per-cart queries + email) on an hourly single invocation (`vercel.json`). Backlogs as carts grow. | Paginate/queue; batch; raise frequency or fan-out; idempotent per-step (already partial). |
| SCALE-5 | **High** | 10k | **Single primary Postgres, no read replicas, no cache layer (Redis).** DB is the ceiling for catalog/storefront reads. | Add a cache tier; read replicas for storefront reads; review Supabase compute tier. |
| SCALE-6 | Medium | 10k | **No load testing / known ceilings.** | Load-test storefront + checkout + webhook ingestion; establish capacity per tier. |
| SCALE-7 | Medium | 10k | **Custom-domain provisioning** (TLS per store) + wildcard ops deferred (MULTITENANCY MT-6). Manual at thousands of stores. | Automate domain verification + cert issuance (Vercel domains API). |

---

# 4. Cost Report

Cost scales primarily with **storefront traffic** and **email volume**, both
currently un-optimized.

| ID | Sev | Blocks | Driver (evidence) | Remediation |
|---|---|---|---|---|
| COST-1 | **High** | 1k | **Dynamic storefront (SCALE-1)** → every visit is a Vercel function invocation + compute + a Supabase round trip. The single biggest, most controllable cost lever. | Caching/SSG (SCALE-1) cuts function invocations + DB egress dramatically. |
| COST-2 | Medium | 1k | **Image optimization** via `next/image` on remote product images — per-transform compute/bandwidth at traffic. | Long `minimumCacheTTL` is set (30d) ✓; serve via a CDN/Supabase transform; pre-size images. |
| COST-3 | Medium | 1k | **Email volume** (Resend) — order confirmations, abandoned-cart sequences, invites grow with customers; no send caps/budgets. | Monitor + cap sends; suppress duplicates (email_logs dedup exists); tier the abandoned-cart flow. |
| COST-4 | Medium | 10k | **Supabase compute/egress + PostHog events** scale with traffic; no budgets/alerts. | Set billing alerts; sample analytics; right-size DB tier. |
| COST-5 | Low | — | **Stripe Connect platform fee = 2%** (`PLATFORM_FEE_BPS`) is revenue, not cost — but Stripe per-txn fees apply; model unit economics. | Model margin per order incl. Stripe + infra cost-per-order. |

---

# 5. Operational Risk Report

| ID | Sev | Blocks | Finding (evidence) | Remediation |
|---|---|---|---|---|
| OPS-1 | **Critical** | 100 | **No observability** — no Sentry/OTel/structured logging/alerting (none in `package.json`); errors are `console.warn`-swallowed (TD-2). You'd be **blind to production failures**. | Add error tracking (Sentry) + structured logs + uptime/alerting before launch. Non-negotiable for taking money. |
| OPS-2 | **Critical** | 100 | **Runtime never validated** — migrations unapplied to any verified env, Stripe key placeholder (MT-10/11). The system has **never processed a real order end-to-end**. | Execute the prepared staging validation (schema-remediation.md, seed-staging.sql, stripe-test-plan.md); re-run `infra-validate`/E2E to green. |
| OPS-3 | **High** | 100 | **Thin CI/CD** — only the go-live preflight workflow exists; no automated deploy gate wired to the platform, no staging pipeline. | Wire `go-live-check` (production target) + `infra-validate` as required deploy gates; add a staging deploy on merge. |
| OPS-4 | High | 1k | **Schema drift between repo and environments** (MT-11). No enforced "migrations applied" check at deploy. | Gate deploys on `supabase migration list` parity; the validator's NOT-VALIDATED items must be closed by SQL checks in CI. |
| OPS-5 | Medium | 1k | **No runbooks/on-call** for incidents (refund failures, webhook backlog, RLS regressions). | Author incident runbooks; define on-call + SLOs. |
| OPS-6 | Low | — | LF/CRLF churn on Windows; deprecation warnings (`next lint`, supabase-js edge `process.version`). | `.gitattributes` for line endings; track deprecations. |

---

# 6. Business Continuity Report

| ID | Sev | Blocks | Finding (evidence) | Remediation |
|---|---|---|---|---|
| BC-1 | **Critical** | 1k (High at 100) | **No verified backups or DR** — backup/restore + rollback never executed (dr-validation.md = NOT VALIDATED); RPO/RTO unknown. | Enable Supabase PITR/backups; run one backup→restore drill + a deploy-rollback drill; record RPO/RTO. |
| BC-2 | **Critical** | 100 | **Legal/compliance not production-ready** — legal pages are templates; no counsel-reviewed ToS/privacy/refund; taking money + storing PII (PDPA/GDPR) without this is a continuity/legal risk. | Counsel review; data-retention + DSR process; cookie/consent for analytics. |
| BC-3 | High | 1k | **Single points of failure** — one Supabase project (primary), one Vercel region, one Stripe platform account. No failover. | Multi-region readiness plan; documented vendor-outage playbooks; consider read replicas (SCALE-5). |
| BC-4 | Medium | 10k | **No tenant data export / offboarding** path; deleting a store cascades (`on delete cascade`) with no archival. | Per-tenant export + soft-delete/retention policy before large tenant counts. |
| BC-5 | Medium | 1k | **Secret rotation / key compromise plan** absent (ties to SEC-4). | Documented rotation for Supabase + Stripe keys; break-glass procedure. |

---

## Consolidated remediation roadmap

**Before 100 customers (Critical — launch gate):**
OPS-1 (observability), OPS-2 (validate runtime end-to-end), SEC-1 (idempotency
proven), BC-1 (one DR drill), BC-2 (legal), SEC-3 (CSP/HSTS), OPS-3 (deploy gates).

**Before 1,000 (High):**
SEC-2 (distributed rate limit), SCALE-1/COST-1 (storefront caching), SCALE-2
(SQL/cached metrics), SCALE-3 (DB pooler), TD-1/TD-2 (type-drift + error
visibility), OPS-4 (migration-parity gate).

**Before 10,000 (scale-out):**
SCALE-5 (cache/read-replicas), SCALE-4 (cron scale-out), SCALE-6 (load tests),
SCALE-7 (domain automation), TD-4 (query batching), BC-3 (multi-region/SPOF).

## Bottom line
This is a well-architected, multi-tenant-correct codebase with disciplined RBAC,
RLS, and money handling. It is **not yet operable for real customers** — the
blockers are runtime validation, observability, idempotency proof, legal, and DR
(Critical), then caching/rate-limit/DB-pooling for 1k and cache/replica/query
work for 10k. **No new features are required to reach 10k — only the remediation
above.**
