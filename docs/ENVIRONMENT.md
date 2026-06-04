# Environment Variables Guide

Copy `.env.example` → `.env.local` and fill in values. `NEXT_PUBLIC_*` vars are
exposed to the browser; everything else is server-only. Env is validated at
startup by `src/lib/env.ts` (Zod) — the app fails fast on misconfiguration.

| Variable | Required | Where to get it | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | ✅ | Your domain | No trailing slash. Used for canonical URLs, OG, Stripe/redirect/email links. |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase → Project Settings → API | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase → API | Safe for browser (RLS enforces access). |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase → API | **Server-only. Bypasses RLS.** Never expose. |
| `STRIPE_SECRET_KEY` | for checkout | Stripe → Developers → API keys | |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | for checkout | Stripe → API keys | |
| `STRIPE_WEBHOOK_SECRET` | for checkout | `stripe listen` or dashboard webhook | Verifies webhook signatures. |
| `RESEND_API_KEY` | for email | resend.com → API Keys | Without it, emails no-op (logged as 'skipped'). |
| `EMAIL_FROM` | for email | — | e.g. `Vitalis <hello@yourdomain.com>` (verified domain). |
| `EMAIL_REPLY_TO` | optional | — | |
| `NEXT_PUBLIC_POSTHOG_KEY` / `_HOST` | optional | posthog.com | Product analytics. |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | optional | Google Analytics | `G-XXXX`. |
| `NEXT_PUBLIC_META_PIXEL_ID` | optional | Meta Events Manager | |
| `CRON_SECRET` | for cron | generate a long random string | Authorizes `/api/cron/*`. |
| `SUPABASE_AUTH_GOOGLE_CLIENT_ID` / `_SECRET` | for Google login | Google Cloud Console OAuth | Referenced by `supabase/config.toml` for local dev. |

Each integration is **optional at boot** — the app builds and runs with only the
Supabase + site vars set; payment, email, and analytics activate as you add keys.
