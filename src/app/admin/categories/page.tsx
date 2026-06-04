import { listCategories } from '@/features/admin/queries';
import { CategoryManager } from '@/features/admin/components/category-manager';

export default async function AdminCategoriesPage() {
  const categories = await listCategories();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Categories</h1>
      <CategoryManager categories={categories} />
    </div>
  );
}
