import type { Metadata } from 'next';
import { ProductGrid } from '@/features/catalog/components/product-grid';
import { getActiveProducts } from '@/features/catalog/queries';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'All Products',
  description:
    'Browse our full range of science-backed supplements. Free shipping over RM 200.',
  path: '/products',
});

// Re-fetch the catalog at most every 5 minutes (ISR) for fresh stock/pricing.
export const revalidate = 300;

export default async function ProductsPage() {
  const products = await getActiveProducts();

  return (
    <main className="container py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">All products</h1>
        <p className="mt-1 text-muted-foreground">
          {products.length > 0
            ? `${products.length} science-backed formula${products.length === 1 ? '' : 's'}.`
            : 'Our catalog is being prepared.'}
        </p>
      </header>
      <ProductGrid
        products={products}
        emptyMessage="No products yet. Connect Supabase and seed the catalog to see products here."
      />
    </main>
  );
}
