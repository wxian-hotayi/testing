'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { toggleWishlistAction } from '../actions';
import { Price } from '@/components/ui/price';
import type { ProductCardVM } from '@/features/catalog/types';

export function WishlistGrid({ products }: { products: ProductCardVM[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (products.length === 0) {
    return (
      <p className="rounded-lg border p-6 text-sm text-muted-foreground">
        Your wishlist is empty. Tap the heart on any product to save it here.
      </p>
    );
  }

  function remove(productId: string) {
    startTransition(async () => {
      await toggleWishlistAction(productId);
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {products.map((p) => (
        <div key={p.id} className="overflow-hidden rounded-lg border bg-card">
          <Link href={`/products/${p.slug}`} className="relative block aspect-square bg-muted">
            {p.image && (
              <Image src={p.image.url} alt={p.image.alt ?? p.name} fill sizes="33vw" className="object-cover" />
            )}
          </Link>
          <div className="p-3">
            <Link href={`/products/${p.slug}`} className="text-sm font-semibold hover:text-primary">
              {p.name}
            </Link>
            <Price priceSen={p.price_sen} compareAtSen={p.compare_at_price_sen} size="sm" className="mt-1" />
            <button
              onClick={() => remove(p.id)}
              disabled={pending}
              className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <Heart className="size-3.5 fill-current" /> Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
