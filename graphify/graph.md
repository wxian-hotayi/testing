# Graphify — vitalis-commerce

> Generated 2026-06-04 by direct file analysis (external `graphify` CLI/skill not auto-invoked, per workspace policy). Run the real tool with explicit confirmation if you want its native output.

## Overview

**Vitalis** is a production-grade **supplement e-commerce** platform. Currency is **MYR**, and all monetary values are stored as integer **minor units (sen)** to avoid floating-point errors (RM 1 = 100 sen), matching Stripe's convention.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript 5.7 (strict, `noUncheckedIndexedAccess`) · Supabase (SSR auth + RLS) · Stripe · Resend · PostHog · TanStack Query · Tailwind 3.4 · Zod.

**Stage:** Scaffolding. Infrastructure and domain libs are in place; **no UI routes, no DB types, no email templates yet.**

## Module map (11 files)

| Module | Role | Internal deps |
|---|---|---|
| `src/middleware.ts` | Edge middleware entry → delegates to supabase session refresh | `lib/supabase/middleware` |
| `src/lib/supabase/middleware.ts` | Session refresh + `/account` & `/admin` route guards | `lib/env`, `types/database.types`* |
| `src/lib/supabase/client.ts` | Browser client (anon key, RLS) | `lib/env`, `types/database.types`* |
| `src/lib/supabase/server.ts` | Server client bound to request cookies | `lib/env`, `types/database.types`* |
| `src/lib/supabase/admin.ts` | Service-role client — **bypasses RLS** (webhooks/cron/admin) | `lib/env`, `types/database.types`* |
| `src/lib/env.ts` | **God node** — Zod-validated env, fail-fast, client/server split | `zod` |
| `src/lib/constants.ts` | **God node** — business rules (currency, shipping, bundles, loyalty, subscriptions, roles) | — |
| `src/lib/money.ts` | Money format/convert helpers (sen) | `lib/constants` |
| `src/lib/utils.ts` | `cn()` Tailwind class-merge helper | `clsx`, `tailwind-merge` |
| `src/app/globals.css` | Tailwind base + HSL design tokens (light/dark) | — |
| `src/types/database.types.ts` | Supabase-generated `Database` types — **MISSING** | — |

\* = currently a **broken import** (file does not exist).

## Dependency graph

```
src/middleware.ts
  └─> src/lib/supabase/middleware.ts ─┐
src/lib/supabase/client.ts ───────────┤
src/lib/supabase/server.ts ───────────┼─> src/lib/env.ts            (GOD NODE, in-degree 4)
src/lib/supabase/admin.ts ────────────┘     └─> zod
       (all four) ─────────────────────> src/types/database.types.ts  (MISSING — broken x4)

src/lib/money.ts ─> src/lib/constants.ts   (GOD NODE — business rules)
src/lib/utils.ts ─> clsx, tailwind-merge   (external only)
```

## Communities

1. **Supabase data/auth layer** — `supabase/{client,server,middleware,admin}.ts` + `middleware.ts`. Four client variants for four trust levels: browser (anon), server (cookie-bound), middleware (session refresh + guards), admin (service-role, RLS-bypass).
2. **Commerce domain logic** — `constants.ts` (rules) + `money.ts` (math). Revenue-affecting numbers centralized.
3. **Cross-cutting infrastructure** — `env.ts`, `utils.ts`.
4. **Presentation / design system** — `globals.css` + `tailwind.config.ts` (HSL token system, light/dark, brand green + amber accent).

## God nodes

- **`src/lib/env.ts`** — imported by all 4 Supabase clients. Single source of validated config; any env change ripples here first.
- **`src/lib/constants.ts`** — single source of business rules. Edits here affect pricing, shipping, loyalty, subscriptions site-wide.

## Architecture notes

- **Auth model:** middleware calls `getUser()` (revalidates token) — deliberately *not* `getSession()` — before authorizing. `/account/*` requires any user; `/admin/*` requires `role IN ('admin','staff')` read from the `profiles` table.
- **Security boundary:** `server-only` guards `server.ts` and `admin.ts` so secrets can't be bundled into the browser build. Service-role client is explicitly RLS-bypassing and documented as trusted-context-only.
- **Env safety:** `NEXT_PUBLIC_*` referenced explicitly (not destructured) so Next inlines them; server schema parsed lazily + cached via `getServerEnv()`.
- **Security headers** set globally in `next.config.mjs` (nosniff, SAMEORIGIN, referrer policy, permissions policy).

## Known gaps / issues

- 🔴 **`src/types/database.types.ts` missing** — imported by 4 modules; `typecheck`/`build` fail until `npm run db:types` (requires a Supabase project + local schema).
- 🔴 **No App Router entry** — `src/app/` has only `globals.css`; needs `layout.tsx` + `page.tsx` to render.
- 🟡 **No `src/emails/`** despite `email:dev` script + Resend/react-email deps.
- 🟡 **No `supabase/migrations`** — RLS policies and `profiles` table referenced but not defined in-repo.
- 🟡 No `src/components/` or `src/features/` yet (referenced by Tailwind `content` globs).
