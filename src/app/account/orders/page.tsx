import Link from 'next/link';
import { getMyOrders } from '@/features/account/queries';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/money';
import type { OrderStatus } from '@/types/database.types';

function statusVariant(status: OrderStatus) {
  if (status === 'delivered' || status === 'paid') return 'success' as const;
  if (status === 'cancelled' || status === 'refunded') return 'destructive' as const;
  return 'muted' as const;
}

export default async function OrdersPage() {
  const orders = await getMyOrders();

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold">Order history</h2>
      {orders.length === 0 ? (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">
          You haven’t placed any orders yet.{' '}
          <Link href="/products" className="text-primary hover:underline">
            Shop now
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">
                    Placed{' '}
                    {o.placed_at
                      ? new Date(o.placed_at).toLocaleDateString('en-MY', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
                  <span className="font-semibold">{formatMoney(o.total_sen)}</span>
                </div>
              </div>
              {o.tracking_url && (
                <a
                  href={o.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-primary hover:underline"
                >
                  Track shipment →
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
