import { getDashboardMetrics } from '@/features/admin/metrics';
import { RevenueChart } from '@/features/admin/components/revenue-chart';
import { formatMoney } from '@/lib/money';

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export default async function AdminDashboard() {
  const m = await getDashboardMetrics();

  const stats = [
    { label: 'Revenue', value: formatMoney(m.revenueSen) },
    { label: 'Orders', value: m.ordersCount.toLocaleString() },
    { label: 'Avg order value', value: formatMoney(m.aovSen) },
    { label: 'Customer LTV', value: formatMoney(m.ltvSen) },
    { label: 'Conversion rate', value: pct(m.conversionRate) },
    { label: 'Subscription MRR', value: formatMoney(m.subscriptionRevenueSen) },
    { label: 'Return customers', value: pct(m.returnCustomerRate) },
    { label: 'Active subscriptions', value: m.activeSubscriptions.toLocaleString() },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <RevenueChart data={m.revenueByDay} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Top products">
          {m.topProducts.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-2 text-sm">
              {m.topProducts.map((p) => (
                <li key={p.name} className="flex justify-between gap-2">
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 font-medium">{formatMoney(p.revenueSen)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Traffic sources">
          {m.trafficSources.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-2 text-sm">
              {m.trafficSources.map((t) => (
                <li key={t.source} className="flex justify-between gap-2">
                  <span className="capitalize">{t.source}</span>
                  <span className="font-medium">{t.orders} orders</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Low stock alerts">
          {m.lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">All products well stocked.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {m.lowStock.map((p) => (
                <li key={p.name} className="flex justify-between gap-2">
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 font-semibold text-destructive">{p.stock} left</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground">No data yet.</p>;
}
