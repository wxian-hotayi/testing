# Deployment Guide (Vercel + Supabase)

## 1. Supabase
1. Create a project at supabase.com.
2. Apply the schema: either link the CLI (`supabase link`) and run
   `supabase db push`, or paste each file in `supabase/migrations/` (in order)
   then `supabase/seed.sql` into the SQL editor.
3. Auth → Providers → enable **Email** and **Google** (add OAuth credentials).
4. Auth → URL Configuration → set Site URL to your domain and add
   `https://yourdomain/auth/callback` to redirect URLs.
5. Copy the API URL, anon key, and service-role key.

## 2. Stripe
1. Get your secret + publishable keys (test mode first).
2. Create a webhook endpoint → `https://yourdomain/api/webhooks/stripe`,
   subscribe to: `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.paid`. Copy the signing secret.
3. Local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

## 3. Resend
1. Add and verify your sending domain; create an API key.
2. Set `EMAIL_FROM` to an address on that domain.

## 4. Vercel
1. Import the Git repo. Framework auto-detected (Next.js).
2. Add **all** env vars from `.env.example` (Project → Settings → Environment
   Variables). Set `NEXT_PUBLIC_SITE_URL` to the production domain.
3. Add `images.remotePatterns` host for your Supabase storage in
   `next.config.mjs` if you serve product images from Supabase.
4. Deploy. The `vercel.json` cron runs `/api/cron/abandoned-carts` hourly —
   protect it with `CRON_SECRET` (Vercel Cron sends the `Authorization` header).

## 5. Post-deploy checks
- Place a Stripe **test** order → confirm an `orders` row + confirmation email +
  stock decrement + cart marked `converted`.
- Trigger the webhook from Stripe's dashboard and confirm a 200 response.
- Run Lighthouse on `/` and a product page (target 90+).
