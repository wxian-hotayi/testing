import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING_FEE } from '@/lib/constants';
import type { CartLine, CartCoupon, CartView } from './types';

/**
 * Pure cart math — no DB, no I/O — so it's trivially testable and reused by the
 * cart drawer, /cart page, and checkout. Free-shipping qualification is based
 * on the merchandise subtotal (before discount), which is the customer-friendly
 * convention and matches the "RM XX away from free shipping" messaging.
 */
export function buildCartView(
  id: string | null,
  lines: CartLine[],
  coupon: CartCoupon | null,
): CartView {
  const subtotalSen = lines.reduce((sum, l) => sum + l.lineTotalSen, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  const couponDiscount = coupon ? Math.min(coupon.discountSen, subtotalSen) : 0;

  const qualifiesForFreeShipping =
    (coupon?.freeShipping ?? false) || subtotalSen >= FREE_SHIPPING_THRESHOLD;

  const shippingSen =
    lines.length === 0 || qualifiesForFreeShipping ? 0 : FLAT_SHIPPING_FEE;

  const freeShippingRemainingSen = qualifiesForFreeShipping
    ? 0
    : Math.max(0, FREE_SHIPPING_THRESHOLD - subtotalSen);

  const totalSen = Math.max(0, subtotalSen - couponDiscount) + shippingSen;

  return {
    id,
    lines,
    itemCount,
    subtotalSen,
    discountSen: couponDiscount,
    shippingSen,
    totalSen,
    freeShippingRemainingSen,
    qualifiesForFreeShipping,
    coupon: coupon
      ? { ...coupon, discountSen: couponDiscount }
      : null,
  };
}
