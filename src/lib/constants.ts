/**
 * Central business rules. Keep revenue-affecting numbers here (not scattered
 * through components) so pricing, shipping, and loyalty logic stay consistent
 * and auditable. All monetary values are in the smallest currency unit (sen),
 * matching Stripe's integer-amount convention. RM 1 = 100 sen.
 */

export const CURRENCY = {
  code: 'MYR',
  symbol: 'RM',
  /** Stripe + DB store amounts as integer minor units (sen). */
  minorUnitsPerUnit: 100,
} as const;

/** Orders at or above this subtotal (in sen) ship free. RM 200. */
export const FREE_SHIPPING_THRESHOLD = 20_000;

/** Flat shipping fee applied below the free-shipping threshold. RM 10. */
export const FLAT_SHIPPING_FEE = 1_000;

/**
 * Default bundle pricing tiers for a single product line, in sen.
 * Individual products may override these via the `bundles` table; this is the
 * fallback the AOV engine uses when no product-specific bundle exists.
 *   1 bottle  → RM 99
 *   2 bottles → RM 179  (save RM 19)
 *   3 bottles → RM 249  (save RM 48)
 */
export const DEFAULT_BUNDLE_TIERS = [
  { quantity: 1, priceSen: 9_900 },
  { quantity: 2, priceSen: 17_900 },
  { quantity: 3, priceSen: 24_900 },
] as const;

/** Loyalty: customers earn 1 point per RM 1 spent (per 100 sen). */
export const LOYALTY_POINTS_PER_MINOR_UNIT = 1 / 100;

/** Loyalty: 100 points = RM 5 redemption value (5 sen per point). */
export const LOYALTY_POINT_REDEMPTION_VALUE_SEN = 5;

/** Referral reward granted to referrer and referee on qualifying purchase (sen). RM 20. */
export const REFERRAL_REWARD_SEN = 2_000;

/** Abandoned-cart recovery default schedule (admin-configurable in DB). */
export const ABANDONED_CART_STEPS = [
  { afterMinutes: 60, type: 'reminder' },
  { afterMinutes: 24 * 60, type: 'reminder' },
  { afterMinutes: 48 * 60, type: 'discount', discountPercent: 10 },
] as const;

export const USER_ROLES = ['customer', 'staff', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SUBSCRIPTION_INTERVALS = ['monthly', 'quarterly'] as const;
export type SubscriptionInterval = (typeof SUBSCRIPTION_INTERVALS)[number];

/** Discount applied to subscription orders vs. one-time purchase. */
export const SUBSCRIPTION_DISCOUNT_PERCENT = 15;

export const SITE = {
  name: 'Vitalis',
  tagline: 'Science-backed supplements for everyday performance',
  defaultDescription:
    'Premium supplements formulated for real results. Free shipping on orders over RM 200. Subscribe and save.',
} as const;
