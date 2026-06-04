import Link from 'next/link';
import { Plus } from 'lucide-react';
import { listProducts } from '@/features/admin/queries';
import { deleteProductAction } from '@/features/admin/actions';
import { DeleteButton } from '@/features/admin/components/delete-button';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { formatMoney } from '@/lib/money';

export default async function AdminProductsPage() {
  const products = await listProducts();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new" className={buttonVariants({ size: 'sm' })}>
          <Plus className="size-4" /> New product
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-secondary/40 text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No products. Add your first one.</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3">{formatMoney(p.price_sen)}</td>
                  <td className="p-3">
                    <span className={p.stock_quantity <= p.low_stock_threshold ? 'text-destructive' : ''}>
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td className="p-3">
                    <Badge variant={p.is_active ? 'success' : 'muted'}>
                      {p.is_active ? 'Active' : 'Draft'}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-4">
                      <Link href={`/admin/products/${p.id}`} className="text-primary hover:underline">Edit</Link>
                      <DeleteButton action={deleteProductAction} id={p.id} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
