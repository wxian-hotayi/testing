# HANDOFF — vitalis-commerce

_Last updated: 2026-06-04 · ALL 8 phases complete & verified · test suite green · graphify run_

Production-grade **supplement e-commerce** platform (Malaysia / MYR). Next.js 15
(App Router) + React 19 + TS (strict) + Tailwind · Supabase (Postgres + Auth,
RLS) · Stripe · Resend · PostHog/GA4/Meta · Vercel. Money is integer **sen**
everywhere. Built **local-first**: all integrations coded against env-var
placeholders — nothing live is touched until real keys are added.

Verified gate (all green): `npm run test` (14 unit), `npm run typecheck`,
`npm run lint`, `npm run build`, `npm run test:e2e` (5 smoke; purchase-path
self-skips without data).

## Completed (all phases)

- **0 Foundation** — scaffold, design system, 10 SQL migrations + seed (RLS
  default-deny, RPCs `validate_coupon`/`decrement_stock`, triggers), 4-tier
  Supabase clients (browser/server/admin/**public** cookieless), ERD.
- **1 Catalog** — storefront shell, homepage, PDP (gallery/reviews/FBT),
  categories, FAQ; static/ISR/SSG; Product/Review/FAQ JSON-LD, sitemap, robots.
- **2 Cart + AOV** — anon + auth carts, drawer, bundle selector, free-ship bar,
  cross-sell, coupons, exit-intent popup, real-order purchase toasts.
- **3 Payments** — Stripe-hosted Checkout (one-time + subscription),
  signature-verified webhook, idempotent order creation, refunds.
- **4 Accounts** — email + Google auth, account area, subscription self-service
  (pause/skip/cancel/address), addresses, wishlist, profile.
- **5 Growth** — loyalty (earn + redeem→coupon), referrals (capture→reward
  both), abandoned-cart cron, Resend emails (welcome + order confirmation).
- **6 Admin** — BI dashboard + chart; products/categories/coupons CRUD; orders
  (status/tracking/refund); reviews moderation; admin-only user roles.
- **7 Analytics + Compliance + Polish + Docs** — PostHog/GA4/Meta (env-gated),
  legal pages + about/contact, 404 + error boundary, 7 docs.
- **Tests** — Vitest (money, cart totals) + Playwright (smoke + purchase-path).

## In Progress

- Nothing mid-edit. Clean, feature-complete checkpoint.

## Issues / Blockers / Gotchas

- ⚠️ `@supabase/ssr` MUST be version-aligned with `@supabase/supabase-js`
  (now ssr 0.10.3 / js 2.107) — a stale pair silently collapsed every typed
  `.select()` to `never`. `Database` type needs `__InternalSupabase`.
- ⚠️ Public catalog reads MUST use `src/lib/supabase/public.ts` (cookieless) —
  the cookie client forces pages dynamic and breaks static/ISR.
- ⚠️ **Migrations were never applied to a live Postgres until 2026-06-04.** First
  real apply caught an ordering bug: SQL-language `current_user_role()` referenced
  `public.profiles` before the table existed (SQL bodies validate at CREATE).
  FIXED in `0001_init.sql` (helpers moved after profiles). All other table-refs
  are in `plpgsql` (deferred) or post-table. `supabase/full-setup.sql` is the
  one-paste setup (resets public schema first → safe to re-run). The full schema
  still hasn't been executed end-to-end on my side (no local Postgres) — a live
  Supabase run is the real test.
- 🟡 `database.types.ts` is hand-written; regenerate via `npm run db:types` once
  a live Supabase schema exists.
- 🟡 Legal pages are templates — review with counsel before launch.
- 🟡 `next lint` deprecation (migrate to ESLint CLI before Next 16). Benign
  Edge-runtime `process.version` warning from supabase-js in middleware.

## Important Files (graphify god nodes + keys)

- `src/lib/supabase/admin.ts` `createAdminClient()` — **47 edges**, RLS-bypass;
  trusted server contexts only.
- `src/lib/money.ts` `formatMoney`/sen helpers — **37 edges**; `src/lib/utils.ts`
  `cn()` — **27 edges**.
- `src/lib/supabase/server.ts` `createClient()`, `src/lib/seo.ts`
  `buildMetadata()`, `src/features/cart/cart-service.ts` `getCartView()`,
  `src/features/cart/cart-provider.tsx` `useCart()` — all high-degree hubs.
- Business rules: `src/lib/constants.ts`. Schema: `supabase/migrations/*` + seed.

## Architecture Notes

- **graphify** (`graphify-out/`: GRAPH_REPORT.md, graph.html, graph.json):
  488 nodes / 1344 edges / **12 communities, no import cycles**, 98% EXTRACTED.
  Communities map 1:1 to feature modules (storefront pages, cart, checkout/order
  service, account, admin actions/dashboard, auth, analytics, types/clients).
- Feature-module layout under `src/features/*`; primitives in
  `src/components/ui`; shared libs in `src/lib`. Path alias `@/*` → `./src/*`.
- Three server-read trust levels: public (anon, cookieless, static reads),
  server (cookie, RLS user-scoped), admin (service-role, trusted writes).
- Pricing always recomputed server-side; never trusted from client.
- Middleware guards `/account/*` (auth) and `/admin/*` (staff/admin via
  `getUser()`), and captures `?ref=` referral cookie.

## Next Actions

1. Provide real keys (`.env.local`), `supabase db reset`, `npm run db:types`.
2. Configure Stripe webhook + Google OAuth; deploy to Vercel (docs/DEPLOYMENT.md).
3. Add a Stripe payment E2E (test cards) + coupon/RLS tests on a Supabase test DB.
4. Optional: split low-cohesion areas (graphify flags Storefront Pages & Admin
   Actions communities at ~0.05 cohesion — large but acceptable for route groups).

## Resume command

Say **"continue"** / **"resume project"** to reload this file. Say
**"read graphify"** to load `graphify-out/GRAPH_REPORT.md`.
