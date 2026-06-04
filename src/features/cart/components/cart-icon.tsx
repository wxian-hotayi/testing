'use client';

import { ShoppingBag } from 'lucide-react';
import { useCart } from '../cart-provider';

/** Header cart trigger with a live item-count badge. Opens the drawer. */
export function CartIcon() {
  const { cart, openCart } = useCart();
  const count = cart.itemCount;
  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={`Open cart, ${count} item${count === 1 ? '' : 's'}`}
      className="relative inline-flex size-10 items-center justify-center rounded-md hover:bg-secondary"
    >
      <ShoppingBag className="size-5" aria-hidden />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
