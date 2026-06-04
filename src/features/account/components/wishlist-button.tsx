'use client';

import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { toggleWishlistAction } from '../actions';
import { cn } from '@/lib/utils';

/** Add/remove a product from the wishlist. Redirects to login if signed out. */
export function WishlistButton({ productId }: { productId: string }) {
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await toggleWishlistAction(productId);
      if (!res.ok) {
        window.location.href = '/login?next=/products';
        return;
      }
      setSaved(Boolean(res.added));
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <Heart className={cn('size-4', saved && 'fill-destructive text-destructive')} />
      {saved ? 'Saved to wishlist' : 'Add to wishlist'}
    </button>
  );
}
