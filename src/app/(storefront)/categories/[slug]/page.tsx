import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductGrid } from '@/features/catalog/components/product-grid';
import { getActiveProducts, getCategoryBySlug } from '@/features/catalog/queries';
import { buildMetadata } from '@/lib/seo';
import { resolveStorefront } from '@/lib/tenant/context';

// Rendered per store; the category is scoped to the resolved tenant.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { storeId } = await resolveStorefront();
  const category = await getCategoryBySlug(slug, storeId);
  if (!category) return buildMetadata({ title: 'Category not found', noIndex: true });
  return buildMetadata({
    title: category.name,
    description: category.description ?? `Shop ${category.name} supplements.`,
    path: `/categories/${category.slug}`,
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { storeId } = await resolveStorefront();
  const [category, products] = await Promise.all([
    getCategoryBySlug(slug, storeId),
    getActiveProducts({ categorySlug: slug, storeId }),
  ]);
  if (!category) notFound();

  return (
    <main className="container py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
        {category.description && (
          <p className="mt-1 max-w-2xl text-muted-foreground">{category.description}</p>
        )}
      </header>
      <ProductGrid products={products} emptyMessage="No products in this category yet." />
    </main>
  );
}
