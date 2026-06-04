import Link from 'next/link';
import { Gift, Package, RefreshCw } from 'lucide-react';
import {
  getMyOrders,
  getMySubscriptions,
  getLoyaltyBalance,
} from '@/features/account/queries';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/money';
import { LOYALTY_POINT_REDEMPTION_VALUE_SEN } from '@/lib/constants';

export default async function AccountDashboard() {
  const [orders, subscriptions, points] = await Promise.all([
    getMyOrders(),
    getMySubscriptions(),
    getLoyaltyBalance(),
  ]);
  const activeSubs = subscriptions.filter((s) => s.status === 'active').length;
  const pointsValue = points * LOYALTY_POINT_REDEMPTION_VALUE_SEN;

  const stats = [
    {
      icon: Gift,
      label: 'Reward points',
      value: points.toLocaleString(),
      sub: `≈ ${formatMoney(pointsValue)} to redeem`,
      href: '/account/rewards',
    },
    {
      icon: RefreshCw,
      label: 'Active subscriptions',
      value: String(activeSubs),
      sub: 'Manage deliveries',
      href: '/account/subscriptions',
    },
    {
      icon: Package,
      label: 'Total orders',
      value: String(orders.length),
      sub: 'View history',
      href: '/account/orders',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ icon: Icon, label, value, sub, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm"
          >
            <Icon className="size-5 text-primary" aria-hidden />
            <p className="mt-3 text-2xl font-bold">{value}</p>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </Link>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Recent orders</h2>
          <Link href="/account/orders" className="text-sm font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="rounded-lg border p-6 text-sm text-muted-foreground">
            No orders yet.{' '}
            <Link href="/products" className="text-primary hover:underline">
              Start shopping
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {orders.slice(0, 5).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div>
                  <p className="font-semibold">{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.placed_at ? new Date(o.placed_at).toLocaleDateString('en-MY') : '—'}
                  </p>
                </div>
                <Badge variant={o.status === 'delivered' ? 'success' : 'muted'}>
                  {o.status}
                </Badge>
                <span className="font-semibold">{formatMoney(o.total_sen)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
