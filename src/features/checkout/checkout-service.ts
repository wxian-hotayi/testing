import 'server-only';

import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCartView } from '@/features/cart/cart-service';
import { getCurrentStoreId } from '@/lib/tenant/context';
import { env } from '@/lib/env';
import { CURRENCY, PLATFORM_FEE_BPS } from '@/lib/constants';
import { platformFeeSen } from '@/lib/money';
import type { CartLine } from '@/features/cart/types';

const STRIPE_CURRENCY = CURRENCY.code.toLowerCase(); // 'myr'

function lineToStripe(
  line: CartLine,
): Stripe.Checkout.SessionCreateParams.LineItem {
  const recurring: Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring | undefined =
    line.isSubscription
      ? {
          interval: 'month',
          interval_count: line.subscriptionInterval === 'quarterly' ? 3 : 1,
        }
      : undefined;

  const name =
    line.bottlesPerUnit > 1
      ? `${line.name} (${line.bottlesPerUnit}-pack)`
      : line.name;

  return {
    quantity: line.quantity,
    price_data: {
      currency: STRIPE_CURRENCY,
      unit_amount: line.unitPriceSen,
      product_data: { name },
      ...(recurring ? { recurring } : {}),
    },
  };
}

/**
 * Build and create a Stripe Checkout Session from the current cart. Pricing is
 * recomputed server-side from the cart (never trusted from the client). If the
 * cart contains any subscription line, the session uses subscription mode (with
 * one-time items billed on the first invoice); otherwise payment mode.
 *
 * Returns the hosted Checkout URL to redirect the shopper to.
 */
export async function createCheckoutSession(): Promise<{ url: string }> {
  const cart = await getCartView();
  if (cart.lines.length === 0) throw new Error('Your cart is empty.');

  const stripe = getStripe();

  // Customer email, if logged in.
  let customerEmail: string | undefined;
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    customerEmail = user?.email ?? undefined;
    userId = user?.id ?? null;
  } catch {
    /* anonymous checkout */
  }

  const hasSubscription = cart.lines.some((l) => l.isSubscription);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    cart.lines.map(lineToStripe);

  // Shipping as a one-time line item (when not free).
  if (cart.shippingSen > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: STRIPE_CURRENCY,
        unit_amount: cart.shippingSen,
        product_data: { name: 'Shipping' },
      },
    });
  }

  // Discount via an ad-hoc one-time Stripe coupon (avoids pre-syncing coupons).
  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
  if (cart.discountSen > 0) {
    const coupon = await stripe.coupons.create({
      amount_off: cart.discountSen,
      currency: STRIPE_CURRENCY,
      duration: 'once',
      name: cart.coupon?.code ?? 'Discount',
    });
    discounts = [{ coupon: coupon.id }];
  }

  const baseUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const metadata: Record<string, string> = {
    cart_id: cart.id ?? '',
    coupon_code: cart.coupon?.code ?? '',
    user_id: userId ?? '',
  };

  // --- Stripe Connect routing (MT-5) -----------------------------------------
  // If the current store has a charges-enabled connected account, route the
  // charge there (destination charge) and take the platform fee; otherwise the
  // charge stays on the platform account (default / un-onboarded stores).
  let connectAccountId: string | null = null;
  try {
    const storeId = await getCurrentStoreId();
    if (storeId) {
      const admin = createAdminClient();
      const { data: store } = await admin
        .from('stores')
        .select('stripe_account_id, stripe_charges_enabled')
        .eq('id', storeId)
        .maybeSingle();
      if (store?.stripe_account_id && store.stripe_charges_enabled) {
        connectAccountId = store.stripe_account_id;
      }
    }
  } catch (err) {
    console.warn('[checkout] Connect lookup failed; using platform account:', err);
  }

  const transferData = connectAccountId ? { destination: connectAccountId } : undefined;
  const feeSen = platformFeeSen(cart.totalSen, PLATFORM_FEE_BPS);

  const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData = {
    metadata,
    ...(transferData
      ? { application_fee_amount: feeSen, transfer_data: transferData }
      : {}),
  };
  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
    metadata,
    ...(transferData
      ? { application_fee_percent: PLATFORM_FEE_BPS / 100, transfer_data: transferData }
      : {}),
  };

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: hasSubscription ? 'subscription' : 'payment',
    line_items: lineItems,
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/cart`,
    client_reference_id: cart.id ?? undefined,
    metadata,
    shipping_address_collection: { allowed_countries: ['MY'] },
    phone_number_collection: { enabled: true },
    ...(customerEmail ? { customer_email: customerEmail } : {}),
    ...(discounts ? { discounts } : {}),
    ...(hasSubscription
      ? { subscription_data: subscriptionData }
      : { payment_intent_data: paymentIntentData }),
  };

  const session = await stripe.checkout.sessions.create(params);
  if (!session.url) throw new Error('Stripe did not return a checkout URL.');
  return { url: session.url };
}
