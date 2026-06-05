# Testing Guide

## Static checks (run before every commit)
```bash
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # eslint (next/core-web-vitals + typescript)
npm run build       # full production build (also type-checks routes)
```
All three should pass clean. Since MT-6 the storefront resolves the store from
the Host, so catalog routes (`/`, `/products`, `/products/[slug]`,
`/categories/[slug]`) render **Dynamic** (`ƒ`); only `/sitemap.xml` and
`/robots.txt` stay static. (Recovering static performance per-store is a
documented follow-up — see docs/MULTITENANCY.md.)

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
- `src/lib/money.test.ts` — formatting, sen/RM conversion, percentOff, platform
  fee (10).
- `src/features/cart/totals.test.ts` — free-ship, flat shipping, item counts,
  coupons, discount capping (7).
- `src/lib/tenant/resolve.test.ts` — Host → tenant resolution (6).
- `src/lib/rbac/permissions.test.ts` — role/permission matrix + resolveRoleKey (9).
- `src/features/members/policy.test.ts` — sole-owner protection, invite/role
  validation (14).
- `src/features/stores/policy.test.ts` — slug format/reserved + name/colour (7).
- **53 tests, all green.** Add more alongside source as `*.test.ts`.

### E2E (Playwright)
```bash
npx playwright install chromium   # one-time
npm run build                     # E2E runs against the production server
npm run test:e2e                  # auto-starts `npm start`
```
Runs anywhere the app server starts:
- `tests/e2e/smoke.spec.ts` — pages render + navigation + empty cart + auth form.
- `tests/e2e/access-control.spec.ts` — unauthenticated `/account`, `/admin`,
  `/admin/members` redirect to `/login`; `/api/admin/members` → 403,
  `/api/stores/slug-available` → 401, cron endpoint → 401/500. (Security
  boundaries; no data/auth needed.)

Self-skip until their prerequisites are provided (mirrors the purchase path):
- `tests/e2e/purchase-path.spec.ts` — browse → cart → checkout redirect. Needs
  seeded catalog.
- `tests/e2e/tenant-routing.spec.ts` (MT-6) — unknown subdomain → 404; known
  store renders. Needs live tenancy. Env: `E2E_ROOT_DOMAIN` (e.g.
  `localhost:3000`), `E2E_STORE_SLUG`.
- `tests/e2e/account-and-admin.spec.ts` (MT-3/MT-4) — login → account; create a
  store; invite a member. Env: `E2E_EMAIL`, `E2E_PASSWORD` (a real Supabase
  account; the invite test also needs `members.manage` and self-skips otherwise).

Multi-store coverage (Store Isolation + RBAC + Invite loop) — self-skip unless
the fixtures below exist:
- `tests/e2e/rbac.spec.ts` — per-role admin-nav visibility + gated-page
  redirects (admin/manager/marketing/warehouse/support).
- `tests/e2e/store-isolation.spec.ts` — a store-A admin cannot reach or query
  store B's admin surface (UI redirect + API 401/403).
- `tests/e2e/invite-flow.spec.ts` — admin invites → invitee accepts → gains
  access (two browser contexts).

**Validation:** `npx playwright test --list` confirms all specs compile/collect
without a browser. Full execution needs `npx playwright install chromium` + a
running app (+ the env vars / fixtures below for the gated specs).

### Multi-store E2E setup (real environment)

These specs target a live, seeded environment (no live DB/Stripe/browser exists
in CI-less local analysis — run them where Supabase is reachable).

1. **Env** (`.env.local` or shell):
   ```bash
   E2E_ROOT_DOMAIN=localhost:3000        # platform root (Chrome resolves *.localhost)
   E2E_STORE_A_SLUG=store-a
   E2E_STORE_B_SLUG=store-b
   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=...        # owner/admin of store A only
   E2E_MANAGER_EMAIL=... E2E_MANAGER_PASSWORD=...    # (optional, per role)
   E2E_MARKETING_EMAIL=... E2E_MARKETING_PASSWORD=...
   E2E_WAREHOUSE_EMAIL=... E2E_WAREHOUSE_PASSWORD=...
   E2E_SUPPORT_EMAIL=... E2E_SUPPORT_PASSWORD=...
   E2E_INVITEE_EMAIL=... E2E_INVITEE_PASSWORD=...    # 2nd account, not yet in store A
   ```
2. **Accounts:** sign each up (app `/login` → create account, or Supabase
   dashboard). Create stores `store-a` and `store-b` via `/account/stores/new`.
3. **Seed store-A roles** (Supabase SQL editor). ⚠️ Clear the legacy global role
   first so the `profiles.role='admin'` fallback doesn't grant cross-store admin
   (see caveat below):
   ```sql
   update public.profiles set role = 'customer'
   where email in ('ADMIN','MANAGER','MARKETING','WAREHOUSE','SUPPORT','INVITEE');

   insert into public.store_members (store_id, user_id, role, status)
   select s.id, p.id, v.role::store_member_role, 'active'
   from (values
     ('ADMIN','owner'), ('MANAGER','manager'), ('MARKETING','marketing'),
     ('WAREHOUSE','warehouse'), ('SUPPORT','support')
   ) as v(email, role)
   join public.profiles p on p.email = v.email
   join public.stores  s on s.slug   = 'store-a'
   on conflict (store_id, user_id) do update
     set role = excluded.role, status = 'active';
   ```
4. **Run:** `npm run build && npm run test:e2e`.

> **Legacy-fallback caveat (known finding):** `resolveRoleKey` treats a global
> `profiles.role='admin'` as admin of *any* store visited (intended only as a
> transition for the default store). So isolation/RBAC test accounts must use
> **store-membership** roles with `profiles.role='customer'`, not the global
> admin role. Recommend restricting that fallback to the default store before
> launch.

### Still recommended before launch
- A dedicated Stripe payment test (drive the hosted page with test cards).
- Coverage for `validate_coupon` / RLS via a Supabase test database.
- An invite→**accept** loop using a second seeded account.

## Setting an admin user
After signing up, in Supabase SQL editor:
```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```
