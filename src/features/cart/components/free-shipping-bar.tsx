'use client';

import { Truck } from 'lucide-react';
import { useCart } from '../cart-provider';
import { formatMoney } from '@/lib/money';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/constants';
import { cn } from '@/lib/utils';

/** Real-time free-shipping progress — a proven AOV nudge. */
export function FreeShippingBar({ className }: { className?: string }) {
  const { cart } = useCart();
  const qualifies = cart.qualifiesForFreeShipping;
  const pct = Math.min(
    100,
    Math.round((cart.subtotalSen / FREE_SHIPPING_THRESHOLD) * 100),
  );

  return (
    <div className={cn('rounded-lg bg-secondary/60 p-3', className)}>
      <p className="flex items-center gap-2 text-sm font-medium">
        <Truck className="size-4 text-primary" aria-hidden />
        {qualifies ? (
          <span className="text-success">You’ve unlocked free shipping! 🎉</span>
        ) : (
          <span>
            You’re{' '}
            <strong>{formatMoney(cart.freeShippingRemainingSen)}</strong> away
            from free shipping
          </span>
        )}
      </p>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-background"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${qualifies ? 100 : pct}%` }}
        />
      </div>
    </div>
  );
}
