# HANDOFF — vitalis-commerce

_Last updated: 2026-06-04 · Phase 0 complete_

Production-grade **supplement e-commerce** platform. Next.js 15 (App Router) +
React 19 + Supabase + Stripe + Resend + PostHog/GA4/Meta. Currency **MYR**; all
money in integer **minor units (sen)**. Build is sequenced into 8 phases (0–7).
Working **local-first**: external integrations are coded against env-var
placeholders and touch nothing live until keys are provided.

## Completed — Phase 0: Foundation

- **Tooling/config:** `package.json` (Next 15, React 19, TS 5.7),
  `tsconfig.json` (strict + `noUncheckedIndexedAccess`), `next.config.mjs`
  (security headers, image optimization, package-import optimization), Tailwind
  v3.4, ESLint flat config, Prettier, PostCSS, `.env.example`, `.gitignore`.
- **Env layer** (`src/lib/env.ts`): Zod-validated, fail-fast, client/server
  split; `env` + `getServerEnv()`.
- **Supabase layer** (`src/lib/supabase/`): `client` (browser/anon), `server`
  (cookie-bound), `middleware` (session refresh + route guards), `admin`
  (service-role, RLS-bypass).
- **Route protection** (`src/middleware.ts`): `/account/*` → any auth user;
  `/admin/*` → role `admin`/`staff`; uses `getUser()` (token revalidation).
- **Commerce domain** (`src/lib/constants.ts`, `src/lib/money.ts`): pricing
  ladder RM99/179/249, free-ship RM200, flat fee RM10, loyalty, referral reward,
  abandoned-cart schedule, subscription discount 15%, roles; money helpers.
- **Design system** (`src/app/globals.css`, `tailwind.config.ts`): HSL token
  system, light/dark, brand green + amber accent. `Button` primitive (cva).
- **App shell:** `src/app/layout.tsx` (Inter font, metadata, TanStack Query
  provider), `src/app/page.tsx` (styled hero + trust strip), `providers.tsx`.
- **Database (10 migrations + seed):** profiles/addresses, full catalog
  (categories, products, images, bundles, cross-sell, inventory log), reviews/
  wishlist/newsletter, carts/items, orders/items, subscriptions/items, loyalty +
  referrals, coupons + redemptions, marketing (templates/flows/logs/settings).
  Full **RLS** default-deny. RPCs: `validate_coupon`, `next_billing_date`,
  `decrement_stock`. Triggers: `handle_new_user`, rating recalc, loyalty ledger.
- **Types:** hand-authored `src/types/database.types.ts` mirroring the schema.
- **Deliverables:** `docs/ERD.md` (Mermaid), `README.md` (install/deploy/env).
- **SEO helpers:** `src/lib/seo.ts` (`buildMetadata`, `jsonLd`).

## In Progress

- Nothing mid-edit. Clean checkpoint at the Phase 0 / Phase 1 boundary.

## Issues / Blockers

- 🟡 **`npm install` not yet run** here — no live build verification. First
  action next session: install → `npm run typecheck` → `npm run lint`.
- 🟡 **`database.types.ts` is hand-written.** Regenerate with `npm run db:types`
  once a Supabase project exists, to guarantee 1:1 schema fidelity.
- 🟡 **Anonymous carts** rely on server-side service-role handling (RLS only
  covers authenticated owners). Server cart actions arrive in Phase 2.

## Important Files

- `src/lib/env.ts` — **god node**, all config flows through here.
- `src/lib/constants.ts` — **god node**, all business rules.
- `src/lib/supabase/admin.ts` — RLS-bypassing; trusted server contexts only.
- `src/lib/supabase/middleware.ts` — auth/route-guard logic.
- `supabase/migrations/0001…0010_*.sql` + `supabase/seed.sql` — schema + data.
- `src/types/database.types.ts` — typed `Database` + row aliases.

## Architecture Notes

- Money is always integer sen; convert to display only at the UI boundary.
- Four Supabase clients map to four trust levels; never use `admin` where a
  user-scoped `server` client suffices.
- `server-only` import guards prevent server secrets leaking to the client.
- Authorization in middleware uses `getUser()` (revalidates), not `getSession()`.
- RLS default-deny; trusted writes (orders, webhooks, cron) use service role.
- Feature-module layout under `src/features/*` (added per phase).
- Path alias `@/*` → `./src/*`. Target market Malaysia (MYR, NPRA/KKM).

## Next Actions — Phase 1: Catalog

1. `npm install` → `npm run typecheck` + `npm run lint` to validate Phase 0.
2. Catalog data layer (`src/features/catalog/queries.ts`).
3. Product card + grid, category pages, full PDP (gallery, ingredients,
   benefits, reviews, related / frequently-bought-together).
4. Expand homepage: best sellers, categories, reviews, FAQ, newsletter.
5. SEO: product/review/FAQ JSON-LD, `sitemap.ts`, `robots.ts`.

## Phase plan

| Phase | Scope | Status |
|---|---|---|
| 0 | Foundation (scaffold, schema, ERD, design system) | ✅ Done |
| 1 | Catalog (products, categories, PDP, homepage, SEO) | ⬜ Next |
| 2 | Cart + AOV engine (drawer, bundles, cross-sell, free-ship bar) | ⬜ |
| 3 | Checkout + Payments (Stripe one-time + subscriptions, webhooks) | ⬜ |
| 4 | Accounts (auth, roles, customer + subscription dashboards) | ⬜ |
| 5 | Growth (loyalty, referrals, abandoned-cart, email flows) | ⬜ |
| 6 | Admin (CRUD + BI dashboard) | ⬜ |
| 7 | Analytics + Compliance + Polish (perf, legal, docs) | ⬜ |

## Resume command

Say **"continue"** / **"resume project"** to reload this file.
