'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { LOYALTY_POINT_REDEMPTION_VALUE_SEN } from '@/lib/constants';

export type RedeemResult =
  | { ok: true; code: string; valueSen: number }
  | { ok: false; error: string };

const MIN_REDEEM = 100;

/**
 * Redeem loyalty points for a single-use, personal fixed-amount coupon.
 * The redeem ledger row is inserted first; if the balance is insufficient the
 * DB check constraint (balance >= 0) rejects it, so we never issue a coupon
 * the customer can't afford.
 */
export async function redeemPointsAction(points: number): Promise<RedeemResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Please sign in.' };
    if (!Number.isInteger(points) || points < MIN_REDEEM) {
      return { ok: false, error: `Minimum redemption is ${MIN_REDEEM} points.` };
    }

    const admin = createAdminClient();
    // Deduct first — fails on insufficient balance via the balance>=0 check.
    const { error: ledgerErr } = await admin.from('loyalty_transactions').insert({
      user_id: user.id,
      type: 'redeem',
      points: -points,
      description: `Redeemed ${points} points`,
    });
    if (ledgerErr) {
      return { ok: false, error: 'You don’t have enough points for that.' };
    }

    const valueSen = points * LOYALTY_POINT_REDEMPTION_VALUE_SEN;
    const code = `PTS-${user.id.slice(0, 4).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const { error: couponErr } = await admin.from('coupons').insert({
      code,
      description: 'Loyalty points redemption',
      discount_type: 'fixed_amount',
      discount_value: valueSen,
      usage_limit: 1,
      usage_limit_per_user: 1,
      is_active: true,
      is_automatic: true,
    });
    if (couponErr) {
      // Refund the points if the coupon couldn't be created.
      await admin.from('loyalty_transactions').insert({
        user_id: user.id,
        type: 'adjust',
        points,
        description: 'Refund: redemption failed',
      });
      return { ok: false, error: 'Could not create your reward. Points refunded.' };
    }

    revalidatePath('/account/rewards');
    return { ok: true, code, valueSen };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Redemption failed.',
    };
  }
}
