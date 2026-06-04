import { ProductCard } from './product-card';
import { cn } from '@/lib/utils';
import type { ProductCardVM } from '../types';

export function ProductGrid({
  products,
  className,
  emptyMessage = 'No products found.',
}: {
  products: ProductCardVM[];
  className?: string;
  emptyMessage?: string;
}) {
  if (products.length === 0) {
    return (
      <p className="py-16 text-center text-muted-foreground">{emptyMessage}</p>
    );
  }
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4',
        className,
      )}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
