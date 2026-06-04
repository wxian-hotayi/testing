'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { X, Plus, Minus, Trash2, Tag } from 'lucide-react';
import { useCart } from '../cart-provider';
import { getCartRecommendations } from '../recommendations';
import { FreeShippingBar } from './free-shipping-bar';
import { Button, buttonVariants } from '@/components/ui/button';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

export function CartDrawer() {
  const {
    cart,
    isOpen,
    closeCart,
    updateLine,
    removeLine,
    applyCoupon,
    removeCoupon,
    isMutating,
    lastError,
  } = useCart();
  const [code, setCode] = useState('');
  const [couponMsg, setCouponMsg] = useState<string | null>(null);

  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeCart();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeCart]);

  const productIds = cart.lines.map((l) => l.productId);
  const { data: recommendations = [] } = useQuery({
    queryKey: ['cart-recos', productIds.sort().join(',')],
    queryFn: () => getCartRecommendations(productIds, 3),
    enabled: isOpen && productIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  async function handleApplyCoupon() {
    if (!code.trim()) return;
    const ok = await applyCoupon(code);
    setCouponMsg(ok ? null : 'That code is not valid.');
    if (ok) setCode('');
  }

  return (
    <>
      {/* Overlay */}
      <div
        aria-hidden={!isOpen}
        onClick={closeCart}
        className={cn(
          'fixed inset-0 z-50 bg-black/40 transition-opacity',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={cn(
          'fixed right-0 top-0 z-50 flex h-dvh w-full max-w-md flex-col bg-background shadow-xl transition-transform duration-300',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-bold">
            Your cart{cart.itemCount > 0 && ` (${cart.itemCount})`}
          </h2>
          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="inline-flex size-9 items-center justify-center rounded-md hover:bg-secondary"
          >
            <X className="size-5" />
          </button>
        </header>

        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Link href="/products" onClick={closeCart} className={buttonVariants()}>
              Start shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              <FreeShippingBar className="mb-4" />

              <ul className="divide-y">
                {cart.lines.map((line) => (
                  <li key={line.id} className="flex gap-3 py-4">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                      {line.image && (
                        <Image
                          src={line.image}
                          alt={line.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between gap-2">
                        <Link
                          href={`/products/${line.slug}`}
                          onClick={closeCart}
                          className="text-sm font-semibold hover:text-primary"
                        >
                          {line.name}
                        </Link>
                        <button
                          onClick={() => removeLine(line.id)}
                          aria-label={`Remove ${line.name}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {line.bottlesPerUnit > 1
                          ? `${line.bottlesPerUnit}-bottle bundle`
                          : 'Single'}
                        {line.isSubscription && ' · Subscription'}
                        {line.bundleLabel && ` · ${line.bundleLabel}`}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded-md border">
                          <button
                            onClick={() => updateLine(line.id, line.quantity - 1)}
                            disabled={isMutating}
                            aria-label="Decrease quantity"
                            className="flex size-8 items-center justify-center hover:bg-secondary disabled:opacity-50"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm">{line.quantity}</span>
                          <button
                            onClick={() => updateLine(line.id, line.quantity + 1)}
                            disabled={isMutating}
                            aria-label="Increase quantity"
                            className="flex size-8 items-center justify-center hover:bg-secondary disabled:opacity-50"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold">
                          {formatMoney(line.lineTotalSen)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Cross-sell */}
              {recommendations.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-semibold">You might also like</h3>
                  <ul className="space-y-3">
                    {recommendations.map((p) => (
                      <li key={p.id} className="flex items-center gap-3">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                          {p.image && (
                            <Image src={p.image.url} alt={p.name} fill sizes="48px" className="object-cover" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{formatMoney(p.price_sen)}</p>
                        </div>
                        <AddRecoButton productId={p.id} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Coupon */}
              <div className="mt-6">
                {cart.coupon ? (
                  <div className="flex items-center justify-between rounded-md border border-dashed p-3 text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <Tag className="size-4 text-primary" />
                      {cart.coupon.code} applied
                    </span>
                    <button onClick={removeCoupon} className="text-muted-foreground hover:text-destructive">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="Discount code"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Button variant="outline" size="sm" onClick={handleApplyCoupon} disabled={isMutating}>
                      Apply
                    </Button>
                  </div>
                )}
                {couponMsg && <p className="mt-1 text-xs text-destructive">{couponMsg}</p>}
              </div>
            </div>

            {/* Summary + checkout */}
            <footer className="border-t p-4">
              {lastError && <p className="mb-2 text-xs text-destructive">{lastError}</p>}
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{formatMoney(cart.subtotalSen)}</dd>
                </div>
                {cart.discountSen > 0 && (
                  <div className="flex justify-between text-success">
                    <dt>Discount</dt>
                    <dd>−{formatMoney(cart.discountSen)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd>{cart.shippingSen === 0 ? 'Free' : formatMoney(cart.shippingSen)}</dd>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-bold">
                  <dt>Total</dt>
                  <dd>{formatMoney(cart.totalSen)}</dd>
                </div>
              </dl>
              <Link
                href="/checkout"
                onClick={closeCart}
                className={buttonVariants({ size: 'lg', fullWidth: true, className: 'mt-4' })}
              >
                Checkout · {formatMoney(cart.totalSen)}
              </Link>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}

function AddRecoButton({ productId }: { productId: string }) {
  const { add, isMutating } = useCart();
  return (
    <Button size="sm" variant="outline" onClick={() => add({ productId })} disabled={isMutating}>
      Add
    </Button>
  );
}
