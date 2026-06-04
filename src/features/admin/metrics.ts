import 'server-only';

import { subDays, format } from 'date-fns';
import { createAdminClient } from '@/lib/supabase/admin';

export type DashboardMetrics = {
  revenueSen: number;
  ordersCount: number;
  aovSen: number;
  payingCustomers: number;
  ltvSen: number;
  returnCustomerRate: number; // 0..1
  conversionRate: number; // 0..1 (cart → order)
  subscriptionRevenueSen: number;
  activeSubscriptions: number;
  topProducts: { name: string; units: number; revenueSen: number }[];
  trafficSources: { source: string; orders: number; revenueSen: number }[];
  lowStock: { name: string; stock: number; threshold: number }[];
  revenueByDay: { date: string; revenueSen: number }[];
};

const EMPTY: DashboardMetrics = {
  revenueSen: 0,
  ordersCount: 0,
  aovSen: 0,
  payingCustomers: 0,
  ltvSen: 0,
  returnCustomerRate: 0,
  conversionRate: 0,
  subscriptionRevenueSen: 0,
  activeSubscriptions: 0,
  topProducts: [],
  trafficSources: [],
  lowStock: [],
  revenueByDay: [],
};

/** Aggregate store KPIs for the admin dashboard (JS-side aggregation). */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const admin = createAdminClient();

    const [
      { data: orders },
      { data: items },
      { data: subs },
      { data: lowStockProducts },
      { count: totalCarts },
      { count: convertedCarts },
    ] = await Promise.all([
      admin
        .from('orders')
        .select('id, total_sen, user_id, utm_source, created_at')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(1000),
      admin
        .from('order_items')
        .select('product_name, quantity, total_sen')
        .limit(5000),
      admin
        .from('subscriptions')
        .select('recurring_total_sen')
        .eq('status', 'active'),
      admin
        .from('products')
        .select('name, stock_quantity, low_stock_threshold, track_inventory')
        .order('stock_quantity', { ascending: true })
        .limit(50),
      admin.from('carts').select('id', { count: 'exact', head: true }),
      admin
        .from('carts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'converted'),
    ]);

    const paidOrders = orders ?? [];
    const revenueSen = paidOrders.reduce((s, o) => s + o.total_sen, 0);
    const ordersCount = paidOrders.length;
    const aovSen = ordersCount ? Math.round(revenueSen / ordersCount) : 0;

    // Customer / LTV / return rate.
    const ordersByCustomer = new Map<string, number>();
    for (const o of paidOrders) {
      if (o.user_id) ordersByCustomer.set(o.user_id, (ordersByCustomer.get(o.user_id) ?? 0) + 1);
    }
    const payingCustomers = ordersByCustomer.size;
    const ltvSen = payingCustomers ? Math.round(revenueSen / payingCustomers) : 0;
    const repeat = [...ordersByCustomer.values()].filter((n) => n > 1).length;
    const returnCustomerRate = payingCustomers ? repeat / payingCustomers : 0;

    const conversionRate =
      totalCarts && totalCarts > 0 ? (convertedCarts ?? 0) / totalCarts : 0;

    // Subscriptions.
    const subscriptionRevenueSen = (subs ?? []).reduce(
      (s, x) => s + x.recurring_total_sen,
      0,
    );
    const activeSubscriptions = (subs ?? []).length;

    // Top products.
    const byProduct = new Map<string, { units: number; revenueSen: number }>();
    for (const it of items ?? []) {
      const cur = byProduct.get(it.product_name) ?? { units: 0, revenueSen: 0 };
      cur.units += it.quantity;
      cur.revenueSen += it.total_sen;
      byProduct.set(it.product_name, cur);
    }
    const topProducts = [...byProduct.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenueSen - a.revenueSen)
      .slice(0, 5);

    // Traffic sources.
    const bySource = new Map<string, { orders: number; revenueSen: number }>();
    for (const o of paidOrders) {
      const src = o.utm_source || 'direct';
      const cur = bySource.get(src) ?? { orders: 0, revenueSen: 0 };
      cur.orders += 1;
      cur.revenueSen += o.total_sen;
      bySource.set(src, cur);
    }
    const trafficSources = [...bySource.entries()]
      .map(([source, v]) => ({ source, ...v }))
      .sort((a, b) => b.revenueSen - a.revenueSen);

    // Low stock.
    const lowStock = (lowStockProducts ?? [])
      .filter((p) => p.track_inventory && p.stock_quantity <= p.low_stock_threshold)
      .map((p) => ({
        name: p.name,
        stock: p.stock_quantity,
        threshold: p.low_stock_threshold,
      }))
      .slice(0, 8);

    // Revenue by day (last 14 days).
    const days = 14;
    const buckets = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      buckets.set(format(subDays(new Date(), i), 'yyyy-MM-dd'), 0);
    }
    for (const o of paidOrders) {
      const key = format(new Date(o.created_at), 'yyyy-MM-dd');
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + o.total_sen);
    }
    const revenueByDay = [...buckets.entries()].map(([date, revenueSen]) => ({
      date,
      revenueSen,
    }));

    return {
      revenueSen,
      ordersCount,
      aovSen,
      payingCustomers,
      ltvSen,
      returnCustomerRate,
      conversionRate,
      subscriptionRevenueSen,
      activeSubscriptions,
      topProducts,
      trafficSources,
      lowStock,
      revenueByDay,
    };
  } catch (err) {
    console.warn('[admin] getDashboardMetrics failed:', err);
    return EMPTY;
  }
}
