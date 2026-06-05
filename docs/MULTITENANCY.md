# Multi-tenancy (SaaS multi-store) — plan & status

> Status as of 2026-06-05. **MT-1 is implemented but uncommitted.** This doc is
> the single source of truth for the phased plan — until now it lived only in
> code comments inside [0011_multitenant_core.sql](../supabase/migrations/0011_multitenant_core.sql).

## Goal

Turn the single-store Vitalis storefront into a multi-store SaaS: one platform
operator (you) hosts many independent merchant stores, each reachable at
`<slug>.app.com` (subdomain) or an optional vanity `custom_domain`. Each store
has its own catalog, orders, branding, and (eventually) its own Stripe payout
account. The existing single-store data lives under a seeded **`default`** store
so nothing breaks while columns are progressively scoped.

## Actors

| Actor | Where it lives | Notes |
|---|---|---|
| **Platform admin** (you) | `profiles.is_platform_admin` | SaaS operator. Bypasses all store checks via `is_platform_admin()`. Distinct from per-store roles. |
| **Merchant operator** | `store_members(store_id, user_id, role)` | `owner` > `admin` > `staff` (ranked by `store_role_rank()`). Manages one store. |
| **Shopper** | `profiles` + store-scoped commerce rows | No `store_members` row. Their cart/orders are scoped by `store_id` (MT-2). |

## Tenant resolution (request → store)

1. [middleware.ts](../src/lib/supabase/middleware.ts) reads the trusted `Host`,
   calls `resolveTenantFromHost()`, **strips any inbound** `x-store-*` headers
   (anti-spoofing), and sets `x-store-slug` or `x-store-host` from the Host.
2. [resolve.ts](../src/lib/tenant/resolve.ts) — pure, tested mapping:
   `acme.app.com → subdomain:acme`, `shop.acme.com → custom:<host>`,
   root/`www`/`localhost` → `default`.
3. [context.ts](../src/lib/tenant/context.ts) — `getCurrentStore()` reads those
   headers server-side (via the cookieless public client) and looks up the
   `stores` row, falling back to the `default` store until MT-6.

## Phased roadmap

### ✅ MT-1 — Tenancy spine *(implemented, uncommitted)*
- `stores`, `store_members` tables; `profiles.is_platform_admin`.
- Enums `store_status`, `store_member_role`.
- SECURITY DEFINER helpers `is_platform_admin()`, `store_role_rank()`,
  `is_store_member(store, min_role)` (avoids RLS recursion on `store_members`).
- RLS: public read of active stores; authenticated create (becomes owner);
  owner/platform-admin manage.
- Seeded `default` store (`…0000aa`) so existing data has a home.
- Host→tenant resolution wired through middleware + server context.
- **Files:** migration 0011, `src/lib/tenant/{resolve,context}.ts` (+ test),
  middleware changes, and the `stores`/`store_members` types added to
  [database.types.ts](../src/types/database.types.ts).
- **Remaining to close MT-1:** commit the work; apply 0011 to a live Supabase;
  regenerate types via `npm run db:types`.

### ✅ MT-2 — Scope commerce tables by `store_id` *(implemented, uncommitted)*
Migration [0012_multitenant_scoping.sql](../supabase/migrations/0012_multitenant_scoping.sql):
- `store_id uuid NOT NULL DEFAULT '…0000aa' references stores on delete cascade`
  added to 20 tenant-owned tables (`products`, `categories`, `bundles`,
  `product_images`, `product_relationships`, `inventory_adjustments`, `reviews`,
  `carts`, `cart_items`, `orders`, `order_items`, `coupons`,
  `coupon_redemptions`, `subscriptions`, `subscription_items`, `loyalty_accounts`,
  `loyalty_transactions`, `referrals`, `newsletter_subscribers`,
  `wishlist_items`) + a `*_store_idx` per table. The DEFAULT backfills existing
  rows to the default store (expand phase — no breakage).
- **Per-store identity**: `products(store_id, slug)`, `products(store_id, sku)`,
  `categories(store_id, slug)`, `coupons(store_id, code)`,
  `newsletter_subscribers(store_id, email)` are now unique **per store**
  (global uniques dropped).
- **`loyalty_accounts` is now per-store**: PK → `(store_id, user_id)`; the
  `apply_loyalty_transaction()` trigger upserts on that key.
- **Store-scoped RLS**: public reads require `store_is_active(store_id)`; all
  former `is_staff()` write policies → `is_store_member(store_id)` (platform
  admins pass for any store). User-owned policies (own cart/orders/…) unchanged.
- **Data layer threading**: `cart.store_id` stamped from `getCurrentStoreId()` at
  cart creation ([cart-service.ts](../src/features/cart/cart-service.ts));
  the order chain (order → items → subscription → loyalty → coupon redemption →
  referral) inherits `cart.store_id` in the webhook
  ([order-service.ts](../src/features/checkout/order-service.ts)); catalog reads
  ([catalog/queries.ts](../src/features/catalog/queries.ts)) accept an optional
  `storeId` filter.
- Types updated: `store_id` on all 20 tables in
  [database.types.ts](../src/types/database.types.ts).

**Deferred from MT-2 (intentional):**
- `email_templates` / `email_flows` / `settings` stay **global** — the
  abandoned-cart cron reads `email_flows` by key across all stores; making these
  per-store needs the cron/admin store-resolution rework → **MT-4**.
- `profiles` / `addresses` stay user-level (shared across stores).
- **Storefront read scoping**: catalog query functions are store-*capable* but
  storefront pages don't yet pass `storeId` (doing so via `headers()` would force
  the SSG/ISR catalog dynamic). Wiring per-store storefront rendering is **MT-6**.
- Admin-panel writes still default to the default store (admin has no
  Host-resolved store yet) → **MT-4**.
- **Not runtime-validated**: 0012 hasn't been applied to a live Postgres. Run
  `supabase db reset` against a real instance, then `npm run db:types`.

### ✅ MT-3 — Store provisioning / onboarding *(implemented, uncommitted)*
- Self-serve creation: any authenticated user creates a store and becomes its
  `owner` (a `store_members` row, seeded via the service-role client since the
  creator isn't a member yet). Audited as `store_created`.
- Pure slug policy ([stores/policy.ts](../src/features/stores/policy.ts)):
  DNS-label format matching `resolveTenantFromHost`, length bounds, and a
  reserved-slug set (`www`, `app`, `api`, `admin`, `checkout`, …) — unit-tested.
- Live availability check: [GET /api/stores/slug-available](../src/app/api/stores/slug-available/route.ts)
  (format + reserved + uniqueness), wired into the create form with debounce.
- UI: [/account/stores](../src/app/account/stores/page.tsx) (my stores) +
  [/account/stores/new](../src/app/account/stores/new/page.tsx) (create) +
  [/admin/store](../src/app/admin/store/page.tsx) settings (gated `store.manage`;
  name/currency/brand colour/logo — slug is immutable post-creation).
- No migration needed — the `stores` table already carries every column (0011).
- **Deferred**: store status stays `active` on create (no approval queue);
  storefront rendering per store is **MT-6**.

### ⬜ MT-4 — Merchant admin scoping
- Make the existing `/admin/*` area operate **within the caller's store**
  (`is_store_member`), not the global `is_staff()`/`is_admin()` gate.
- Platform-admin cross-store console (list/suspend stores, impersonate).
- Middleware `/admin` guard updated to store-aware membership.

### ⬜ MT-5 — Stripe Connect (per-store payouts)
- Use `stores.stripe_account_id` / `stripe_charges_enabled` (already present).
- Connect onboarding (Express/Standard); create Checkout sessions on the
  connected account; route webhooks per connected account; platform fee.

### ⬜ MT-6 — Storefront subdomain routing (remove default fallback)
- Resolve storefront strictly by subdomain/custom domain; drop the
  `default`-store fallback in `getCurrentStore()`.
- Per-store branding/theme (logo, `primary_color`, currency) applied at render.
- 404 for unknown/suspended stores; custom-domain verification flow.

## Key decisions already baked in
- **Money stays integer sen**, `currency` is per-store (`stores.currency`).
- **Anti-spoofing**: inbound `x-store-*` headers are stripped; only middleware
  sets them from the trusted `Host`.
- **No RLS recursion**: tenancy helpers are `SECURITY DEFINER` + `stable`.
- **Default store** keeps the single-store app fully working through MT-2…MT-5.

## Open questions
- MT-2 unique constraints: scope `slug`/`code`/`order_number` per store, or keep
  global? (Recommend per-store for slug/code; keep `order_number` global.)
- Shopper identity across stores: one `profiles` row shared, or per-store? (Spine
  assumes shared profile; commerce rows carry `store_id`.)
- Custom-domain TLS/verification mechanism for MT-6.
- Platform fee model for MT-5 (flat vs. percentage).

## Verified gate (restore baseline, 2026-06-05)
`typecheck` ✓ · `lint` ✓ · `test` ✓ (20) · `build` ✓. Note: the committed
`database.types.ts` had been truncated to empty by a failed `npm run db:types`;
it is now hand-reconstructed from migrations 0001–0011 (see the file header).
