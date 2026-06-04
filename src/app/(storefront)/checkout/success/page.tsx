import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { ClearCartOnMount } from '@/features/cart/components/clear-cart-on-mount';
import { buttonVariants } from '@/components/ui/button';
import { buildMetadata } from '@/lib/seo';
import { formatMoney } from '@/lib/money';

export const metadata: Metadata = buildMetadata({
  title: 'Order confirmed',
  path: '/checkout/success',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

async function findOrder(sessionId: string | undefined) {
  if (!sessionId) return null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('orders')
      .select('order_number, total_sen, email')
      .eq('stripe_checkout_session_id', sessionId)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const order = await findOrder(session_id);

  return (
    <main className="container flex flex-col items-center py-24 text-center">
      <ClearCartOnMount
        purchaseValueSen={order?.total_sen}
        orderNumber={order?.order_number}
      />
      <CheckCircle2 className="size-16 text-success" aria-hidden />
      <h1 className="mt-6 text-3xl font-bold">Thank you for your order!</h1>
      {order ? (
        <p className="mt-2 text-muted-foreground">
          Order <strong>{order.order_number}</strong> for{' '}
          <strong>{formatMoney(order.total_sen)}</strong> is confirmed. A receipt
          is on its way to {order.email}.
        </p>
      ) : (
        <p className="mt-2 max-w-md text-muted-foreground">
          Your payment was successful. Your order is being processed and a
          confirmation email will arrive shortly.
        </p>
      )}
      <div className="mt-8 flex gap-3">
        <Link href="/account/orders" className={buttonVariants({ variant: 'outline' })}>
          View my orders
        </Link>
        <Link href="/products" className={buttonVariants()}>
          Continue shopping
        </Link>
      </div>
    </main>
  );
}
