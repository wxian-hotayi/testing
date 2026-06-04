'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { useCart } from '../cart-provider';
import { FreeShippingBar } from './free-shipping-bar';
import { buttonVariants } from '@/components/ui/button';
import { formatMoney } from '@/lib/money';

export function CartPageContents() {
  const { cart, updateLine, removeLine, isMutating } = useCart();

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="text-muted-foreground">Find something you’ll love.</p>
        <Link href="/products" className={buttonVariants({ size: 'lg' })}>
          Shop products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="mb-6 text-2xl font-bold">Your cart ({cart.itemCount})</h1>
        <FreeShippingBar className="mb-6" />
        <ul className="divide-y border-y">
          {cart.lines.map((line) => (
            <li key={line.id} className="flex gap-4 py-5">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-md border bg-muted">
                {line.image && (
                  <Image src={line.image} alt={line.name} fill sizes="96px" className="object-cover" />
                )}
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <Link href={`/products/${line.slug}`} className="font-semibold hover:text-primary">
                    {line.name}
                  </Link>
                  <span className="font-semibold">{formatMoney(line.lineTotalSen)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {line.bottlesPerUnit > 1 ? `${line.bottlesPerUnit}-bottle bundle` : 'Single'}
                  {line.isSubscription && ` · ${line.subscriptionInterval} subscription`}
                </p>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center rounded-md border">
                    <button
                      onClick={() => updateLine(line.id, line.quantity - 1)}
                      disabled={isMutating}
                      aria-label="Decrease quantity"
                      className="flex size-9 items-center justify-center hover:bg-secondary disabled:opacity-50"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-10 text-center">{line.quantity}</span>
                    <button
                      onClick={() => updateLine(line.id, line.quantity + 1)}
                      disabled={isMutating}
                      aria-label="Increase quantity"
                      className="flex size-9 items-center justify-center hover:bg-secondary disabled:opacity-50"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeLine(line.id)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Summary */}
      <aside className="h-fit rounded-xl border bg-card p-6 lg:sticky lg:top-20">
        <h2 className="mb-4 text-lg font-bold">Order summary</h2>
        <dl className="space-y-2 text-sm">
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
          <div className="flex justify-between border-t pt-3 text-base font-bold">
            <dt>Total</dt>
            <dd>{formatMoney(cart.totalSen)}</dd>
          </div>
        </dl>
        <Link
          href="/checkout"
          className={buttonVariants({ size: 'lg', fullWidth: true, className: 'mt-6' })}
        >
          Proceed to checkout
        </Link>
        <Link
          href="/products"
          className="mt-3 block text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}
