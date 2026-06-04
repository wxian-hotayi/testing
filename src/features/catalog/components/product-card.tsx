import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Price } from '@/components/ui/price';
import { RatingStars } from '@/components/ui/rating-stars';
import { cn } from '@/lib/utils';
import type { ProductCardVM } from '../types';

function stockNote(p: ProductCardVM): { label: string; tone: 'low' | 'out' } | null {
  if (!p.track_inventory) return null;
  if (p.stock_quantity <= 0) return { label: 'Sold out', tone: 'out' };
  if (p.stock_quantity <= p.low_stock_threshold)
    return { label: `Only ${p.stock_quantity} left`, tone: 'low' };
  return null;
}

export function ProductCard({
  product,
  className,
}: {
  product: ProductCardVM;
  className?: string;
}) {
  const stock = stockNote(product);
  const soldOut = stock?.tone === 'out';

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.alt ?? product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn(
              'object-cover transition-transform duration-300 group-hover:scale-105',
              soldOut && 'opacity-60',
            )}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}
        {product.is_best_seller && (
          <Badge variant="accent" className="absolute left-3 top-3">
            Best seller
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex-1">
          <h3 className="font-semibold leading-snug group-hover:text-primary">
            {product.name}
          </h3>
          {product.subtitle && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {product.subtitle}
            </p>
          )}
        </div>
        <RatingStars rating={product.rating_avg} count={product.rating_count} />
        <Price
          priceSen={product.price_sen}
          compareAtSen={product.compare_at_price_sen}
          size="sm"
        />
        {stock && (
          <span
            className={cn(
              'text-xs font-semibold',
              stock.tone === 'out' ? 'text-muted-foreground' : 'text-destructive',
            )}
          >
            {stock.label}
          </span>
        )}
      </div>
    </Link>
  );
}
