import 'server-only';

import type Stripe from 'stripe';
import { addMonths } from 'date-fns';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';
import { renderOrderConfirmationEmail } from '@/lib/email/templates';
import {
  REFERRAL_REWARD_SEN,
  LOYALTY_POINT_REDEMPTION_VALUE_SEN,
} from '@/lib/constants';
import type { Json, SubscriptionInterval } from '@/types/database.types';

/**
 * Turn a completed Stripe Checkout Session into a persisted order (+ items,
 * stock decrement, coupon redemption, and — for subscription mode — a
 * subscription record). Idempotent: a second call for the same session is a
 * no-op, so webhook retries are safe.
 */
export async function finalizeOrderFromSession(
  session: Stripe.Checkout.Session,
): Promise<{ created: boolean; orderId?: string }> {
  const admin = createAdminClient();

  // Idempotency guard.
  const { data: existing } = await admin
    .from('orders')
    .select('id')
    .eq('stripe_checkout_session_id', session.id)
    .maybeSingle();
  if (existing) return { created: false, orderId: existing.id };

  const cartId = session.metadata?.cart_id || session.client_reference_id || null;
  const userId = session.metadata?.user_id || null;
  const couponCode = session.metadata?.coupon_code || null;

  // Load the cart's items to snapshot order lines.
  let items: {
    product_id: string;
    bundle_id: string | null;
    quantity: number;
    unit_price_sen: number;
    is_subscription: boolean;
    subscription_interval: SubscriptionInterval | null;
  }[] = [];
  if (cartId) {
    const { data } = await admin
      .from('cart_items')
      .select('product_id, bundle_id, quantity, unit_price_sen, is_subscription, subscription_interval')
      .eq('cart_id', cartId);
    items = data ?? [];
  }

  // Product name/sku snapshots.
  const productIds = [...new Set(items.map((i) => i.product_id))];
  const { data: products } = productIds.length
    ? await admin.from('products').select('id, name, sku').in('id', productIds)
    : { data: [] as { id: string; name: string; sku: string | null }[] };
  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  const subtotalSen = items.reduce(
    (s, i) => s + i.quantity * i.unit_price_sen,
    0,
  );
  const totalSen = session.amount_total ?? subtotalSen;
  const discountSen = session.total_details?.amount_discount ?? 0;
  const shippingSen = Math.max(0, totalSen - subtotalSen + discountSen);
  const taxSen = session.total_details?.amount_tax ?? 0;
  const loyaltyEarned = Math.floor(totalSen / 100); // 1 pt / RM1

  const shippingAddress = extractAddress(session);

  // Create a subscription record first (so the order can reference it).
  let subscriptionId: string | null = null;
  if (session.mode === 'subscription' && userId) {
    subscriptionId = await createSubscription(session, userId, items, productById);
  }

  // Insert the order.
  const { data: order, error: orderErr } = await admin
    .from('orders')
    .insert({
      user_id: userId || null,
      email: session.customer_details?.email ?? 'unknown@example.com',
      status: 'paid',
      payment_status: 'paid',
      fulfillment_status: 'unfulfilled',
      subtotal_sen: subtotalSen,
      discount_sen: discountSen,
      shipping_sen: shippingSen,
      tax_sen: taxSen,
      total_sen: totalSen,
      loyalty_points_earned: loyaltyEarned,
      currency: (session.currency ?? 'myr').toUpperCase(),
      coupon_id: null,
      subscription_id: subscriptionId,
      cart_id: cartId,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === 'string' ? session.payment_intent : null,
      shipping_address: shippingAddress,
      billing_address: shippingAddress,
      placed_at: new Date().toISOString(),
    })
    .select('id, order_number')
    .single();
  if (orderErr || !order) {
    console.error('[order] insert failed:', orderErr);
    throw new Error('Failed to create order.');
  }

  // Order items + stock decrement.
  if (items.length > 0) {
    await admin.from('order_items').insert(
      items.map((i) => {
        const p = productById.get(i.product_id);
        return {
          order_id: order.id,
          product_id: i.product_id,
          bundle_id: i.bundle_id,
          product_name: p?.name ?? 'Product',
          product_sku: p?.sku ?? null,
          quantity: i.quantity,
          unit_price_sen: i.unit_price_sen,
          total_sen: i.quantity * i.unit_price_sen,
          is_subscription: i.is_subscription,
        };
      }),
    );
    await Promise.all(
      items.map((i) =>
        admin.rpc('decrement_stock', {
          p_product_id: i.product_id,
          p_qty: i.quantity,
        }),
      ),
    );
  }

  // Coupon redemption.
  if (couponCode) {
    await recordCouponRedemption(couponCode, userId, order.id, discountSen);
  }

  // Loyalty points earned (the ledger trigger maintains the balance).
  if (userId && loyaltyEarned > 0) {
    await admin.from('loyalty_transactions').insert({
      user_id: userId,
      type: 'earn',
      points: loyaltyEarned,
      description: `Order ${order.order_number}`,
      order_id: order.id,
    });
  }

  // Referral reward (consumes a pending referral, rewards both parties once).
  if (userId) {
    await grantReferralReward(userId, order.id);
  }

  // Order confirmation email (best-effort).
  const email = session.customer_details?.email;
  if (email) {
    const firstName = session.customer_details?.name?.split(' ')[0] ?? '';
    const { subject, html } = renderOrderConfirmationEmail({
      firstName,
      orderNumber: order.order_number,
      totalSen,
      items: items.map((i) => ({
        name: productById.get(i.product_id)?.name ?? 'Product',
        quantity: i.quantity,
        totalSen: i.quantity * i.unit_price_sen,
      })),
    });
    await sendEmail({
      to: email,
      subject,
      html,
      flow: 'post_purchase',
      templateKey: 'post_purchase_thanks',
      userId,
      relatedOrderId: order.id,
    });
  }

  // Convert the cart.
  if (cartId) {
    await admin
      .from('carts')
      .update({ status: 'converted', recovered_at: null })
      .eq('id', cartId);
  }

  return { created: true, orderId: order.id };
}

function extractAddress(session: Stripe.Checkout.Session): Json {
  const cd = session.customer_details;
  // Shipping details location varies by API version; check both.
  const withShipping = session as Stripe.Checkout.Session & {
    shipping_details?: { name?: string | null; address?: Stripe.Address | null };
    collected_information?: {
      shipping_details?: { name?: string | null; address?: Stripe.Address | null };
    };
  };
  const sd =
    withShipping.collected_information?.shipping_details ??
    withShipping.shipping_details;
  const addr = sd?.address ?? cd?.address ?? null;
  return {
    recipient_name: sd?.name ?? cd?.name ?? null,
    phone: cd?.phone ?? null,
    line1: addr?.line1 ?? null,
    line2: addr?.line2 ?? null,
    city: addr?.city ?? null,
    state: addr?.state ?? null,
    postal_code: addr?.postal_code ?? null,
    country: addr?.country ?? 'MY',
  } as Json;
}

async function createSubscription(
  session: Stripe.Checkout.Session,
  userId: string,
  items: { product_id: string; quantity: number; unit_price_sen: number; is_subscription: boolean; subscription_interval: SubscriptionInterval | null }[],
  productById: Map<string, { id: string; name: string; sku: string | null }>,
): Promise<string | null> {
  const admin = createAdminClient();
  const subItems = items.filter((i) => i.is_subscription);
  if (subItems.length === 0) return null;

  const interval = subItems[0]?.subscription_interval ?? 'monthly';
  const monthsToAdd = interval === 'quarterly' ? 3 : 1;
  const recurringTotal = subItems.reduce(
    (s, i) => s + i.quantity * i.unit_price_sen,
    0,
  );

  const { data: sub, error } = await admin
    .from('subscriptions')
    .insert({
      user_id: userId,
      status: 'active',
      interval,
      next_billing_date: addMonths(new Date(), monthsToAdd)
        .toISOString()
        .slice(0, 10),
      recurring_total_sen: recurringTotal,
      stripe_subscription_id:
        typeof session.subscription === 'string' ? session.subscription : null,
      stripe_customer_id:
        typeof session.customer === 'string' ? session.customer : null,
    })
    .select('id')
    .single();
  if (error || !sub) {
    console.warn('[order] subscription insert failed:', error);
    return null;
  }

  await admin.from('subscription_items').insert(
    subItems.map((i) => ({
      subscription_id: sub.id,
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price_sen: i.unit_price_sen,
    })),
  );
  void productById;
  return sub.id;
}

async function recordCouponRedemption(
  code: string,
  userId: string | null,
  orderId: string,
  discountSen: number,
) {
  const admin = createAdminClient();
  const { data: coupon } = await admin
    .from('coupons')
    .select('id, times_used')
    .eq('code', code)
    .maybeSingle();
  if (!coupon) return;
  await admin.from('coupon_redemptions').insert({
    coupon_id: coupon.id,
    user_id: userId || null,
    order_id: orderId,
    discount_sen: discountSen,
  });
  await admin
    .from('coupons')
    .update({ times_used: coupon.times_used + 1 })
    .eq('id', coupon.id);
  await admin.from('orders').update({ coupon_id: coupon.id }).eq('id', orderId);
}

/**
 * If the buyer was referred and has a pending referral, reward both parties
 * with loyalty points (idempotent — the referral is marked 'rewarded').
 */
async function grantReferralReward(userId: string, orderId: string) {
  const admin = createAdminClient();
  const { data: referral } = await admin
    .from('referrals')
    .select('id, referrer_id, referee_id')
    .eq('referee_id', userId)
    .eq('status', 'pending')
    .maybeSingle();
  if (!referral) return;

  const rewardPoints = Math.round(
    REFERRAL_REWARD_SEN / LOYALTY_POINT_REDEMPTION_VALUE_SEN,
  );

  await admin.from('loyalty_transactions').insert([
    {
      user_id: referral.referrer_id,
      type: 'referral',
      points: rewardPoints,
      description: 'Referral reward (your friend ordered)',
    },
    {
      user_id: userId,
      type: 'referral',
      points: rewardPoints,
      description: 'Referral welcome reward',
    },
  ]);

  await admin
    .from('referrals')
    .update({
      status: 'rewarded',
      reward_points: rewardPoints,
      qualifying_order_id: orderId,
      rewarded_at: new Date().toISOString(),
    })
    .eq('id', referral.id);
}
