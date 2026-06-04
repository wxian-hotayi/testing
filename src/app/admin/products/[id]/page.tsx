import { notFound } from 'next/navigation';
import { getProductForEdit, listCategories } from '@/features/admin/queries';
import { ProductForm } from '@/features/admin/components/product-form';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, categories] = await Promise.all([
    getProductForEdit(id),
    listCategories(),
  ]);
  if (!result) notFound();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Edit: {result.product.name}</h1>
      <ProductForm product={result.product} categories={categories} />
    </div>
  );
}
