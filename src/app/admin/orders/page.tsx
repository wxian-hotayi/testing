import Link from 'next/link';
import { listOrders } from '@/features/admin/queries';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/money';

export default async function AdminOrdersPage() {
  const orders = await listOrders();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Orders</h1>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-secondary/40 text-left">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Status</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Total</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No orders yet.</td></tr>
            ) : orders.map((o) => (
              <tr key={o.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{o.order_number}</td>
                <td className="p-3 text-muted-foreground">{o.email}</td>
                <td className="p-3"><Badge variant="muted">{o.status}</Badge></td>
                <td className="p-3">
                  <Badge variant={o.payment_status === 'paid' ? 'success' : o.payment_status === 'refunded' ? 'destructive' : 'muted'}>
                    {o.payment_status}
                  </Badge>
                </td>
                <td className="p-3">{formatMoney(o.total_sen)}</td>
                <td className="p-3 text-right">
                  <Link href={`/admin/orders/${o.id}`} className="text-primary hover:underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
