# Vitalis Commerce

A production-grade supplement e-commerce platform built for conversion, AOV,
LTV, and operational efficiency.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Supabase
(PostgreSQL + Auth) · Stripe · Resend · PostHog / GA4 / Meta Pixel · Vercel.

> **Status:** Phase 0 (Foundation) complete. See `memory/HANDOFF.md` for the
> phased build plan and current progress.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
#    → fill in Supabase, Stripe, Resend, analytics keys

# 3. (Optional) Start Supabase locally — requires the Supabase CLI + Docker
supabase start          # boots Postgres, Auth, Studio
supabase db reset       # applies migrations/ then seed.sql
npm run db:types        # regenerate src/types/database.types.ts

# 4. Run the dev server
npm run dev             # http://localhost:3000
```

Without a Supabase project the app boots, but data-backed pages will be empty.
Provide `NEXT_PUBLIC_SUPABASE_URL` + keys to light up the catalog.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run lint` | ESLint (next/core-web-vitals + TS) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run format` | Prettier write |
| `npm run db:reset` | Reset local DB (migrations + seed) |
| `npm run db:types` | Regenerate DB types from local schema |

## Project structure

```
src/
  app/                 # Next.js App Router (routes, layouts)
  components/ui/        # Design-system primitives (Button, …)
  features/            # Feature modules (catalog, cart, checkout, …) — added per phase
  lib/                 # Cross-cutting libs
    supabase/          #   browser / server / admin clients + middleware
    env.ts             #   zod-validated environment
    constants.ts       #   business rules (pricing, shipping, loyalty)
    money.ts           #   sen ↔ RM formatting helpers
    seo.ts             #   metadata + JSON-LD helpers
  types/               # Database + shared types
supabase/
  migrations/          # Ordered SQL schema (0001…0010)
  seed.sql             # Demo catalog + marketing config
  config.toml          # Local dev config
docs/
  ERD.md               # Entity relationship diagram (Mermaid)
```

## Environment variables

See [`.env.example`](.env.example) for the full annotated list. Summary:

| Group | Required to run | Notes |
|---|---|---|
| App | `NEXT_PUBLIC_SITE_URL` | Canonical URLs, redirects |
| Supabase | URL, anon key, service-role key | Service role is **server-only** |
| Stripe | secret, publishable, webhook secret | Added in Phase 3 |
| Resend | API key, from/reply-to | Added in Phase 5 |
| Analytics | PostHog, GA4, Meta Pixel IDs | Added in Phase 7 |

## Database

The full schema lives in `supabase/migrations/` and is documented in
[`docs/ERD.md`](docs/ERD.md). Highlights:

- **Row Level Security** is enabled on every table (default-deny).
- All money is stored as **integer sen** (RM 1 = 100 sen).
- Triggers maintain denormalized aggregates (product ratings, loyalty balance)
  and auto-create a `profiles` row on signup.

## Deployment (Vercel)

1. Push to a Git provider and import the repo into Vercel.
2. Add all environment variables from `.env.example` to the Vercel project.
3. Set `NEXT_PUBLIC_SITE_URL` to your production domain.
4. Point your Supabase project's Auth redirect URLs at `https://yourdomain/auth/callback`.
5. Add the Stripe webhook endpoint (`/api/webhooks/stripe`) and copy its signing
   secret into `STRIPE_WEBHOOK_SECRET` (Phase 3).
6. Deploy. Vercel auto-detects Next.js.

## Documentation

| Doc | Contents |
|---|---|
| [docs/ERD.md](docs/ERD.md) | Database schema + entity relationship diagram |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | Every env var, where to get it |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel + Supabase + Stripe + Resend setup |
| [docs/TESTING.md](docs/TESTING.md) | Static checks + manual E2E + admin setup |
| [docs/API.md](docs/API.md) | Server actions, route handlers, RPCs |
| [docs/ADMIN_MANUAL.md](docs/ADMIN_MANUAL.md) | Operating the admin panel |
| [docs/CUSTOMER_MANUAL.md](docs/CUSTOMER_MANUAL.md) | Customer-facing guide |

## Compliance

This is a supplement store. All product copy uses structure/function language
("supports", "helps maintain") and avoids disease, cure, treat, or guarantee
claims. Legal pages and disclaimers are generated in Phase 7. Note the target
market is Malaysia (NPRA/KKM), not the US FDA — disclaimers are configurable.
