'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lock, ShieldCheck } from 'lucide-react';
import { useCart } from '@/features/cart/cart-provider';
import { startCheckoutAction } from '../actions';
import { Button, buttonVariants } from '@/components/ui/button';
import { formatMoney } from '@/lib/money';
import { Analytics } from '@/features/analytics/track';

export function CheckoutClient() {
  const { cart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);
    Analytics.beginCheckout({ value: cart.totalSen / 100, currency: 'MYR' });
    const res = await startCheckoutAction();
    if (res.ok) {
      window.location.href = res.url; // redirect to Stripe-hosted checkout
    } else {
      setError(res.error);
      setLoading(false);
    }
  }

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link href="/products" className={buttonVariants({ size: 'lg' })}>
          Shop products
        </Link>
      </div>
    );
  }

  const hasSubscription = cart.lines.some((l) => l.isSubscription);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">Checkout</h1>

      <ul className="divide-y rounded-lg border">
        {cart.lines.map((line) => (
          <li key={line.id} className="flex justify-between gap-3 p-4 text-sm">
            <span>
              {line.quantity} ×{' '}
              <span className="font-medium">{line.name}</span>
              {line.bottlesPerUnit > 1 && ` (${line.bottlesPerUnit}-pack)`}
              {line.isSubscription && (
                <span className="text-muted-foreground">
                  {' '}
                  · {line.subscriptionInterval} subscription
                </span>
              )}
            </span>
            <span className="font-semibold">{formatMoney(line.lineTotalSen)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd>{formatMoney(cart.subtotalSen)}</dd>
        </div>
        {cart.discountSen > 0 && (
          <div className="flex justify-between text-success">
            <dt>Discount {cart.coupon && `(${cart.coupon.code})`}</dt>
            <dd>−{formatMoney(cart.discountSen)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Shipping</dt>
          <dd>{cart.shippingSen === 0 ? 'Free' : formatMoney(cart.shippingSen)}</dd>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-bold">
          <dt>Total{hasSubscription ? ' due today' : ''}</dt>
          <dd>{formatMoney(cart.totalSen)}</dd>
        </div>
      </dl>

      {error && (
        <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        size="lg"
        fullWidth
        className="mt-6"
        onClick={handlePay}
        disabled={loading}
      >
        <Lock className="size-4" />
        {loading ? 'Redirecting…' : `Pay ${formatMoney(cart.totalSen)}`}
      </Button>

      <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 text-primary" />
        Secure payment via Stripe. You’ll enter your shipping &amp; card details next.
      </p>
      <Link
        href="/cart"
        className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to cart
      </Link>
    </div>
  );
}
