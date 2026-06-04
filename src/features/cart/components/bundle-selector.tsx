'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { useCart } from '../cart-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatMoney, percentOff } from '@/lib/money';
import { SUBSCRIPTION_DISCOUNT_PERCENT } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { SubscriptionInterval } from '@/types/database.types';

type BundleOption = {
  id: string;
  quantity: number;
  priceSen: number;
  label: string | null;
};

/**
 * PDP purchase widget: bundle tier selection + one-time/subscribe toggle, with
 * live savings, wired to the cart. This is the core AOV surface.
 */
export function BundleSelector({
  productId,
  basePriceSen,
  bundles,
  isSubscribable,
  outOfStock = false,
}: {
  productId: string;
  basePriceSen: number;
  bundles: BundleOption[];
  isSubscribable: boolean;
  outOfStock?: boolean;
}) {
  const { add, isMutating } = useCart();
  // Default to the labelled ("Most Popular") tier, else the first.
  const defaultId =
    bundles.find((b) => b.label)?.id ?? bundles[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultId);
  const [subscribe, setSubscribe] = useState(false);
  const [interval, setInterval] = useState<SubscriptionInterval>('monthly');

  const subFactor = 1 - SUBSCRIPTION_DISCOUNT_PERCENT / 100;
  const displayPrice = (priceSen: number) =>
    subscribe ? Math.round(priceSen * subFactor) : priceSen;

  const selected = bundles.find((b) => b.id === selectedId) ?? null;
  const finalPrice = selected
    ? displayPrice(selected.priceSen)
    : displayPrice(basePriceSen);

  async function handleAdd() {
    await add({
      productId,
      bundleId: selectedId,
      isSubscription: subscribe,
      subscriptionInterval: subscribe ? interval : null,
    });
  }

  return (
    <div className="space-y-4">
      {bundles.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Choose your bundle
          </legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {bundles.map((bundle) => {
              const price = displayPrice(bundle.priceSen);
              const singleTotal = basePriceSen * bundle.quantity;
              const save = percentOff(singleTotal, price);
              const active = bundle.id === selectedId;
              return (
                <button
                  key={bundle.id}
                  type="button"
                  onClick={() => setSelectedId(bundle.id)}
                  aria-pressed={active}
                  className={cn(
                    'relative rounded-lg border-2 p-4 text-center transition-colors',
                    active
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40',
                  )}
                >
                  {bundle.label && (
                    <Badge variant="accent" className="absolute -top-2 left-1/2 -translate-x-1/2">
                      {bundle.label}
                    </Badge>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {bundle.quantity} {bundle.quantity === 1 ? 'bottle' : 'bottles'}
                  </p>
                  <p className="mt-1 text-lg font-bold">{formatMoney(price)}</p>
                  {save > 0 && (
                    <p className="text-xs font-semibold text-destructive">Save {save}%</p>
                  )}
                  {active && (
                    <Check className="absolute right-2 top-2 size-4 text-primary" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {isSubscribable && (
        <div className="rounded-lg border p-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={subscribe}
              onChange={(e) => setSubscribe(e.target.checked)}
              className="mt-1 size-4 accent-[hsl(var(--primary))]"
            />
            <span className="text-sm">
              <span className="font-semibold">
                Subscribe &amp; save {SUBSCRIPTION_DISCOUNT_PERCENT}%
              </span>
              <span className="block text-muted-foreground">
                Delivered on your schedule. Cancel anytime.
              </span>
            </span>
          </label>
          {subscribe && (
            <div className="mt-3 flex gap-2 pl-7">
              {(['monthly', 'quarterly'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setInterval(opt)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm capitalize',
                    interval === opt
                      ? 'border-primary bg-primary/5 font-semibold'
                      : 'border-border',
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Button
        size="lg"
        fullWidth
        onClick={handleAdd}
        disabled={isMutating || outOfStock}
      >
        {outOfStock
          ? 'Sold out'
          : `Add to cart · ${formatMoney(finalPrice)}`}
      </Button>
    </div>
  );
}
