import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { addMonths } from 'date-fns';
import { getStripe } from '@/lib/stripe/server';
import { getServerEnv } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { finalizeOrderFromSession } from '@/features/checkout/order-service';

// Stripe webhooks need the Node runtime (raw body + crypto) and must never be
// statically optimized.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { STRIPE_WEBHOOK_SECRET } = getServerEnv();
  if (!STRIPE_WEBHOOK_SECRET) {
    return new NextResponse('Webhook secret not configured.', { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return new NextResponse('Missing signature.', { status: 400 });

  const stripe = getStripe();
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.warn('[webhook] signature verification failed:', err);
    return new NextResponse('Invalid signature.', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // payment-mode sessions must be paid; subscription-mode completion
        // means the subscription is active.
        if (session.payment_status === 'paid' || session.mode === 'subscription') {
          await finalizeOrderFromSession(session);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncSubscriptionStatus(event.data.object);
        break;
      }
      case 'invoice.paid': {
        await advanceSubscriptionBilling(event.data.object);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('[webhook] handler error:', err);
    // 500 tells Stripe to retry.
    return new NextResponse('Handler error.', { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function syncSubscriptionStatus(sub: Stripe.Subscription) {
  const admin = createAdminClient();
  const status =
    sub.status === 'active' || sub.status === 'trialing'
      ? 'active'
      : sub.status === 'past_due'
        ? 'past_due'
        : sub.status === 'canceled'
          ? 'cancelled'
          : 'active';
  await admin
    .from('subscriptions')
    .update({
      status,
      ...(sub.status === 'canceled'
        ? { cancelled_at: new Date().toISOString() }
        : {}),
    })
    .eq('stripe_subscription_id', sub.id);
}

async function advanceSubscriptionBilling(invoice: Stripe.Invoice) {
  const subId =
    typeof (invoice as Stripe.Invoice & { subscription?: string }).subscription ===
    'string'
      ? (invoice as Stripe.Invoice & { subscription?: string }).subscription
      : null;
  if (!subId) return;
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from('subscriptions')
    .select('id, interval')
    .eq('stripe_subscription_id', subId)
    .maybeSingle();
  if (!sub) return;
  const months = sub.interval === 'quarterly' ? 3 : 1;
  await admin
    .from('subscriptions')
    .update({
      next_billing_date: addMonths(new Date(), months).toISOString().slice(0, 10),
      status: 'active',
    })
    .eq('id', sub.id);
}
