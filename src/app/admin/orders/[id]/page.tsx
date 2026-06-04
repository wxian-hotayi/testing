import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrderDetail } from '@/features/admin/queries';
import { OrderActions } from '@/features/admin/components/order-actions';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/money';

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getOrderDetail(id);
  if (!result) notFound();
  const { order, items } = result;

  const addr = (order.shipping_address ?? {}) as {
    recipient_name?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };

  return (
    <div>
      <Link href="/admin/orders" className="text-sm text-muted-foreground hover:text-foreground">
        ← All orders
      </Link>
      <div className="mt-2 mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold">{order.order_number}</h1>
        <Badge variant="muted">{order.status}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border bg-card p-5">
            <h2 className="mb-3 font-semibold">Items</h2>
            <ul className="divide-y text-sm">
              {items.map((it) => (
                <li key={it.id} className="flex justify-between gap-2 py-2">
                  <span>{it.quantity} × {it.product_name}{it.is_subscription && ' (subscription)'}</span>
                  <span className="font-medium">{formatMoney(it.total_sen)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t pt-3 text-sm">
              <Row label="Subtotal" value={formatMoney(order.subtotal_sen)} />
              {order.discount_sen > 0 && <Row label="Discount" value={`−${formatMoney(order.discount_sen)}`} />}
              <Row label="Shipping" value={order.shipping_sen === 0 ? 'Free' : formatMoney(order.shipping_sen)} />
              <Row label="Total" value={formatMoney(order.total_sen)} bold />
            </dl>
          </div>

          <div className="rounded-lg border bg-card p-5 text-sm">
            <h2 className="mb-3 font-semibold">Shipping address</h2>
            {addr.line1 ? (
              <address className="not-italic text-muted-foreground">
                {addr.recipient_name}<br />
                {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
                {addr.postal_code} {addr.city}, {addr.state}, {addr.country}
                {addr.phone && <><br />{addr.phone}</>}
              </address>
            ) : (
              <p className="text-muted-foreground">No address captured.</p>
            )}
            <p className="mt-2 text-muted-foreground">{order.email}</p>
          </div>
        </div>

        <OrderActions
          id={order.id}
          status={order.status}
          trackingNumber={order.tracking_number}
          paymentStatus={order.payment_status}
        />
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold' : ''}`}>
      <dt className={bold ? '' : 'text-muted-foreground'}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
