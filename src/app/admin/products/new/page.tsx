import { listCategories } from '@/features/admin/queries';
import { ProductForm } from '@/features/admin/components/product-form';

export default async function NewProductPage() {
  const categories = await listCategories();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">New product</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
