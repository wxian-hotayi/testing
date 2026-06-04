import type { SubscriptionInterval } from '@/types/database.types';

/** A single line in the cart (one product+bundle+purchase-type combination). */
export type CartLine = {
  /** cart_items.id */
  id: string;
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  bundleId: string | null;
  bundleLabel: string | null;
  /** Bottles per bundle unit (1 for a single). Used for display only. */
  bottlesPerUnit: number;
  /** Number of bundle units of this line. */
  quantity: number;
  /** Price of one bundle unit, in sen (snapshotted at add time). */
  unitPriceSen: number;
  /** quantity * unitPriceSen */
  lineTotalSen: number;
  isSubscription: boolean;
  subscriptionInterval: SubscriptionInterval | null;
};

export type CartCoupon = {
  code: string;
  discountSen: number;
  freeShipping: boolean;
};

/** Fully computed cart, ready to render. */
export type CartView = {
  id: string | null;
  lines: CartLine[];
  itemCount: number;
  subtotalSen: number;
  discountSen: number;
  shippingSen: number;
  totalSen: number;
  freeShippingRemainingSen: number;
  qualifiesForFreeShipping: boolean;
  coupon: CartCoupon | null;
};

export const EMPTY_CART: CartView = {
  id: null,
  lines: [],
  itemCount: 0,
  subtotalSen: 0,
  discountSen: 0,
  shippingSen: 0,
  totalSen: 0,
  freeShippingRemainingSen: 0,
  qualifiesForFreeShipping: false,
  coupon: null,
};

/** Result type returned by cart mutation actions. */
export type CartActionResult =
  | { ok: true; cart: CartView }
  | { ok: false; error: string; cart: CartView };
