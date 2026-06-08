# Graphify — vitalis-commerce

> Regenerated 2026-06-08 by **direct file analysis** (external `graphify` CLI/skill
> not auto-invoked, per workspace policy + org instruction to prefer normal file
> analysis). In-degree counts are real (`grep` over `src/`). Supersedes the
> 2026-06-04 scaffolding-era graph.

## Overview

**Vitalis** is a production-grade **supplement e-commerce** platform (Malaysia /
MYR; money stored as integer **sen**), transformed into a **multi-tenant SaaS** —
many merchant stores on one codebase, isolated by `store_id` + RLS, resolved by
Host/subdomain.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript 5.7 (strict,
`noUncheckedIndexedAccess`) · Supabase (SSR auth + RLS, Postgres) · Stripe (+
Connect) · Resend · PostHog/GA4/Meta · TanStack Query · Tailwind 3.4 · Zod ·
Vitest + Playwright.

**Stage:** **Feature-complete + runtime-validated against live staging.** 165
tracked source files · 13 feature modules · 16 SQL migrations · full
storefront/account/admin/API route surface. Sole open production gate: Stripe
key (config, not code). See `reports/PRODUCTION_READY_STATE.md`.

## Layout (counts are real)

| Area | Shape |
|---|---|
| `src/features/*` (13) | account, admin, analytics, auth, cart, catalog, checkout, cro, loyalty, marketing, **members**, referrals, **stores** — feature modules (`actions.ts`, `queries.ts`, `policy.ts`, `components/`) |
| `src/lib/*` | env, constants, money, utils, seo, faq, legal-content + dirs: **supabase/** (5 clients), **tenant/** (resolve, context), **rbac/** (permissions, actor), **rate-limit/**, email/, stripe/ |
| `src/app/*` | `(storefront)/` (products, categories, cart, checkout, subscribe, legal, …), `account/` (orders, subscriptions, referrals, rewards, **stores**, **invitations**, …), `admin/` (products, orders, coupons, categories, reviews, users, **members**, **store**, **access**), `api/` (webhooks/stripe, admin/members, stores/slug-available, cron/abandoned-carts, cart/recover), `auth/callback`, `login` |
| `src/components/*` | `ui/` primitives · `layout/` · `seo/` |
| `supabase/migrations/` | 0001–0010 (single-store) + **0011–0016** (multi-tenant + idempotency + signup fix) |
| `scripts/` | `go-live-check.mjs` (offline gate), `infra-validate.mjs` (runtime gate), `seed-staging.sql` |
| `tests/e2e/` | smoke, access-control, purchase-path, rbac, store-isolation, invite-flow, tenant-routing, account-and-admin |

## God nodes (measured in-degree)

| Module | In-deg | Role |
|---|---|---|
| `src/lib/env.ts` | **26** | Zod-validated env (client/server split), fail-fast config |
| `src/lib/money.ts` | **23** | money math in integer sen (format/convert) |
| `src/lib/constants.ts` | **23** | central business rules (currency, shipping, bundles, loyalty, subs, roles) |
| `src/lib/supabase/admin.ts` | **18** | **service-role client — BYPASSES RLS** (webhooks/cron/admin writes) |
| `src/lib/supabase/server.ts` | **17** | cookie-bound server client (RLS as the user) |
| `src/lib/tenant/context.ts` | **12** | resolves the active store for a request |
| `src/lib/rbac/actor.ts` | **10** | `getCurrentActor()` — identity + store role + permissions |
| `src/lib/rbac/permissions.ts` | 3 (transitive) | **7-role permission matrix — single source of truth** |
| `src/lib/tenant/resolve.ts` | 3 | Host/subdomain → store slug resolution |

## Dependency graph (key flows)

```
HTTP request
  └─> src/middleware.ts
        ├─> src/lib/rate-limit/* ............ per-IP fixed window (AUTH 15/min, API 60/min)
        └─> src/lib/supabase/middleware.ts .. session refresh + /account & /admin guards
                                              (resolves tenant via tenant/resolve)

per-request authz:
  src/lib/rbac/actor.ts (getCurrentActor)
        ├─> src/lib/tenant/context.ts ─> src/lib/tenant/resolve.ts
        ├─> src/lib/rbac/permissions.ts (matrix; legacy-admin fallback gated on isDefaultStore)
        └─> src/lib/supabase/server.ts

data trust levels (all ─> env.ts ─> types/database.types.ts):
  supabase/public.ts  (cookieless, anon — SSG/ISR catalog reads)
  supabase/client.ts  (browser, anon — RLS)
  supabase/server.ts  (cookie-bound — RLS as user)         in-deg 17
  supabase/admin.ts   (service-role — RLS BYPASS)          in-deg 18  ← app-layer perms ARE the boundary

commerce math:  features/{catalog,cart,checkout} ─> money.ts ─> constants.ts
payments:       features/checkout + app/api/webhooks/stripe ─> lib/stripe ─> Stripe (Connect destination charges)
                idempotency: unique(orders.stripe_checkout_session_id)  [migration 0015]
```

## Communities

1. **Tenancy & access control** — `lib/tenant/{resolve,context}`, `lib/rbac/{permissions,actor}`,
   `middleware.ts`, `features/{members,stores}`. The SaaS spine: Host→store,
   7-role RBAC, membership/invitations, provisioning.
2. **Supabase data/auth layer** — `lib/supabase/{public,client,server,middleware,admin}`.
   Five clients for five trust levels (cookieless anon · browser anon · cookie-RLS
   · session-refresh · service-role bypass).
3. **Commerce domain** — `constants.ts` + `money.ts` + `features/{catalog,cart,checkout}`.
   Revenue-affecting numbers centralized; pricing recomputed server-side.
4. **Payments** — `lib/stripe`, `features/checkout`, `app/api/webhooks/stripe`.
   One-time + subscription, idempotent webhook, refunds, Connect destination
   charges + platform fee.
5. **Growth** — `features/{loyalty,referrals,marketing,cro,analytics}` + `lib/email`.
   Loyalty (per-store), referrals, abandoned-cart cron, Resend, analytics/compliance.
6. **Admin & ops** — `features/admin` + `app/admin/*`. BI dashboard, CRUD, orders,
   reviews, members, store settings, RBAC matrix view — all **store-scoped**.
7. **Presentation / design system** — `components/{ui,layout,seo}` + `globals.css`
   (HSL token system, light/dark, brand green + amber).
8. **Cross-cutting infrastructure** — `env.ts`, `utils.ts`.
9. **Validation & release** — `scripts/{go-live-check,infra-validate}.mjs`,
   `tests/e2e/*`. Offline preflight gate + runtime gate + live E2E.

## Architecture notes

- **Tenant isolation is two-layered.** RLS can't see the Host, so storefront
  isolation is enforced at the **query layer** (`.eq('store_id', …)`); RLS
  enforces the security boundary (public-read-active / owner / store-member).
  `is_store_member()` passes platform admins for any store.
- **Service-role writes mean app-layer permission checks ARE the boundary.**
  Admin mutations use `supabase/admin.ts` (RLS-bypass), so `rbac/actor` +
  `permissions` matrix gate every action; the RBAC legacy global-admin fallback
  is gated on `isDefaultStore` (regression-tested) to prevent cross-tenant leak.
- **Public catalog reads MUST use `supabase/public.ts`** (cookieless) — the
  cookie client forces pages dynamic and breaks SSG/ISR. Don't call
  `headers()`/`getCurrentStoreId()` in SSG catalog query paths.
- **Auth:** middleware uses `getUser()` (revalidates the token), not
  `getSession()`. `handle_new_user` must keep `search_path = public, extensions`
  (pgcrypto lives in `extensions`) — migration 0016.
- **Money** always integer sen; pricing recomputed server-side.

## Known staleness / gotchas (mirrors memory/HANDOFF.md)

- `database.types.ts` was hand-reconstructed after a failed `db:types` emptied it
  — regenerate against the live schema.
- Direct DB host is IPv6-only; use the IPv4 **session pooler** for DDL/SQL.
- E2E must be batched (auth rate limiter trips at 15/min); Node can't resolve
  `*.localhost` (use browser navigation for cross-origin probes).
