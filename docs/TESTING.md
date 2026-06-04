# Testing Guide

## Static checks (run before every commit)
```bash
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # eslint (next/core-web-vitals + typescript)
npm run build       # full production build (also type-checks routes)
```
All three should pass clean. The build output shows each route's render mode —
catalog routes (`/`, `/products`, `/products/[slug]`, `/categories/[slug]`)
should be Static/SSG/ISR, not Dynamic.

## Manual end-to-end (with Supabase + Stripe test keys)
1. **Catalog**: home shows best sellers/categories/reviews; PDP shows gallery,
   bundles, reviews, related/FBT.
2. **Cart/AOV**: add a bundle → drawer opens, free-ship bar updates, cross-sell
   shows, coupon `WELCOME10` applies. `/cart` reflects the same.
3. **Checkout**: pay with Stripe test card `4242 4242 4242 4242` → redirected to
   `/checkout/success` → `orders` row created, stock decremented, confirmation
   email logged in `email_logs`, cart `converted`.
4. **Subscription**: toggle Subscribe & Save → checkout uses subscription mode →
   a `subscriptions` row is created; manage it under `/account/subscriptions`.
5. **Accounts**: sign up (email + Google), view dashboard, edit profile, add an
   address, save a wishlist item.
6. **Growth**: confirm loyalty points on a paid order (`/account/rewards`),
   redeem points → coupon issued; share a referral link, sign up via it, place
   an order → both parties rewarded. Hit `/api/cron/abandoned-carts?secret=...`
   and verify reminder emails are logged.
7. **Admin**: as an `admin`/`staff` user, open `/admin` → metrics populate;
   create/edit/delete a product; moderate a review; refund an order.

## Automated tests (included)

### Unit (Vitest) — runs anywhere, no services needed
```bash
npm run test          # run once
npm run test:watch    # watch mode
```
- `src/lib/money.test.ts` — formatting + sen/RM conversion + percentOff (7 tests).
- `src/features/cart/totals.test.ts` — free-ship threshold, flat shipping,
  item counts, fixed/free-shipping coupons, discount capping (7 tests).
- **14 tests, all green.** Add more alongside source as `*.test.ts`.

### E2E (Playwright)
```bash
npx playwright install chromium   # one-time
npm run build                     # E2E runs against the production server
npm run test:e2e                  # auto-starts `npm start`
```
- `tests/e2e/smoke.spec.ts` — pages render + navigation + empty cart + auth form.
  Runs without seeded data (queries fall back to empty states). **5 tests green.**
- `tests/e2e/purchase-path.spec.ts` — browse → add to cart → drawer → checkout
  redirect. **Self-skips** until a Supabase project with seeded catalog exists.

### Still recommended before launch
- A dedicated Stripe payment test (drive the hosted page with test cards).
- Coverage for `validate_coupon` / RLS via a Supabase test database.

## Setting an admin user
After signing up, in Supabase SQL editor:
```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```
