import { CURRENCY } from './constants';

/**
 * Money helpers. All amounts in the system are integers in minor units (sen)
 * to avoid floating-point rounding errors. Convert to display strings only at
 * the UI boundary.
 */

/** Format minor units (sen) as a localized currency string, e.g. 9900 → "RM 99.00". */
export function formatMoney(
  amountSen: number,
  opts: { showDecimals?: boolean } = {},
): string {
  const { showDecimals = true } = opts;
  const amount = amountSen / CURRENCY.minorUnitsPerUnit;
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: CURRENCY.code,
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
}

/** Convert a major-unit amount (RM) to minor units (sen). */
export function toMinor(amountMajor: number): number {
  return Math.round(amountMajor * CURRENCY.minorUnitsPerUnit);
}

/** Convert minor units (sen) to major units (RM) as a number. */
export function toMajor(amountSen: number): number {
  return amountSen / CURRENCY.minorUnitsPerUnit;
}

/** Percentage off between an original and a discounted price, rounded. */
export function percentOff(originalSen: number, discountedSen: number): number {
  if (originalSen <= 0) return 0;
  return Math.round(((originalSen - discountedSen) / originalSen) * 100);
}

/**
 * Platform commission (sen) on a charged amount, given basis points
 * (200 bps = 2%). Never negative and never exceeds the amount — Stripe rejects
 * an application fee larger than the charge.
 */
export function platformFeeSen(amountSen: number, bps: number): number {
  if (amountSen <= 0 || bps <= 0) return 0;
  return Math.min(amountSen, Math.round((amountSen * bps) / 10000));
}
