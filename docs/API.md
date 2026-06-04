# API & Server Actions Reference

The app uses Next.js **Server Actions** for mutations (not REST endpoints) plus
a few **Route Handlers** for webhooks and cron. Server actions are type-safe
function calls invoked from client components.

## Route Handlers (HTTP)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/webhooks/stripe` | Stripe signature | Finalize orders, sync subscriptions. |
| GET | `/api/cron/abandoned-carts` | `CRON_SECRET` (Bearer or `?secret=`) | Send recovery emails. |
| GET | `/api/cart/recover?token=` | Cart token (unguessable) | Restore an anonymous cart, redirect to `/cart`. |
| GET | `/auth/callback?code=` | OAuth/email code | Exchange code for session. |

## Server Actions by domain
- **Cart** (`src/features/cart/actions.ts`): `getCartAction`, `addToCartAction`,
  `updateLineAction`, `removeLineAction`, `clearCartAction`, `applyCouponAction`,
  `removeCouponAction`. Return `CartActionResult` (`{ ok, cart, error? }`).
- **Checkout** (`src/features/checkout/actions.ts`): `startCheckoutAction()` →
  `{ ok, url }` (Stripe-hosted Checkout URL).
- **Auth** (`src/features/auth/actions.ts`): `signInWithPassword`,
  `signUpWithPassword`, `signInWithGoogle`, `signOut`.
- **Account** (`src/features/account/actions.ts`): profile, address CRUD,
  subscription pause/resume/skip/cancel/change-address, wishlist toggle.
- **Loyalty** (`src/features/loyalty/actions.ts`): `redeemPointsAction(points)`.
- **Referrals** (`src/features/referrals/actions.ts`): `attachReferralIfPending()`.
- **Marketing** (`src/features/marketing/actions.ts`): `subscribeNewsletter`.
- **Admin** (`src/features/admin/actions.ts`): product/category/coupon upsert +
  delete, order update/refund, review status, user role. All guarded by
  `requireStaff` (service-role client).

## Database RPCs (Postgres)
- `validate_coupon(p_code, p_subtotal_sen) → jsonb` — validate without exposing
  the coupons table (SECURITY DEFINER).
- `next_billing_date(p_from, p_interval) → date`.
- `decrement_stock(p_product_id, p_qty)` — atomic stock decrement + audit log.
- `is_staff()`, `is_admin()`, `current_user_role()` — used by RLS.

## Data access (reads)
Catalog reads use the **cookieless public client** (`src/lib/supabase/public.ts`)
so pages stay static. User-scoped reads use the **cookie server client**
(RLS-scoped). Trusted writes use the **service-role client**.
