import { describe, it, expect } from 'vitest';
import { buildCartView } from './totals';
import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING_FEE } from '@/lib/constants';
import type { CartLine, CartCoupon } from './types';

function makeLine(overrides: Partial<CartLine> & { lineTotalSen: number }): CartLine {
  return {
    id: 'line-1',
    productId: 'p1',
    slug: 'p1',
    name: 'Test Product',
    image: null,
    bundleId: null,
    bundleLabel: null,
    bottlesPerUnit: 1,
    quantity: 1,
    unitPriceSen: overrides.lineTotalSen,
    isSubscription: false,
    subscriptionInterval: null,
    ...overrides,
  };
}

describe('buildCartView', () => {
  it('handles an empty cart', () => {
    const v = buildCartView(null, [], null);
    expect(v.subtotalSen).toBe(0);
    expect(v.shippingSen).toBe(0);
    expect(v.totalSen).toBe(0);
    expect(v.itemCount).toBe(0);
  });

  it('charges flat shipping below the free-shipping threshold', () => {
    const v = buildCartView('c1', [makeLine({ lineTotalSen: 9900 })], null);
    expect(v.subtotalSen).toBe(9900);
    expect(v.qualifiesForFreeShipping).toBe(false);
    expect(v.shippingSen).toBe(FLAT_SHIPPING_FEE);
    expect(v.totalSen).toBe(9900 + FLAT_SHIPPING_FEE);
    expect(v.freeShippingRemainingSen).toBe(FREE_SHIPPING_THRESHOLD - 9900);
  });

  it('gives free shipping at/above the threshold', () => {
    const v = buildCartView(
      'c1',
      [makeLine({ lineTotalSen: FREE_SHIPPING_THRESHOLD })],
      null,
    );
    expect(v.qualifiesForFreeShipping).toBe(true);
    expect(v.shippingSen).toBe(0);
    expect(v.freeShippingRemainingSen).toBe(0);
    expect(v.totalSen).toBe(FREE_SHIPPING_THRESHOLD);
  });

  it('sums item counts across lines', () => {
    const v = buildCartView('c1', [
      makeLine({ id: 'a', quantity: 2, lineTotalSen: 4000 }),
      makeLine({ id: 'b', quantity: 3, lineTotalSen: 6000 }),
    ], null);
    expect(v.itemCount).toBe(5);
    expect(v.subtotalSen).toBe(10000);
  });

  it('applies a fixed-amount coupon', () => {
    const coupon: CartCoupon = { code: 'SAVE20', discountSen: 2000, freeShipping: false };
    const v = buildCartView('c1', [makeLine({ lineTotalSen: 10000 })], coupon);
    expect(v.discountSen).toBe(2000);
    expect(v.totalSen).toBe(10000 - 2000 + FLAT_SHIPPING_FEE);
  });

  it('caps the discount at the subtotal (never negative)', () => {
    const coupon: CartCoupon = { code: 'BIG', discountSen: 5000, freeShipping: false };
    const v = buildCartView('c1', [makeLine({ lineTotalSen: 1000 })], coupon);
    expect(v.discountSen).toBe(1000);
    expect(v.totalSen).toBe(0 + FLAT_SHIPPING_FEE);
  });

  it('honours a free-shipping coupon below the threshold', () => {
    const coupon: CartCoupon = { code: 'FREESHIP', discountSen: 0, freeShipping: true };
    const v = buildCartView('c1', [makeLine({ lineTotalSen: 9900 })], coupon);
    expect(v.qualifiesForFreeShipping).toBe(true);
    expect(v.shippingSen).toBe(0);
    expect(v.totalSen).toBe(9900);
  });
});
