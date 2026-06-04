'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export type PurchaseActivity = {
  firstName: string;
  city: string | null;
  productName: string;
  minutesAgo: number;
};

/**
 * Recent purchase activity for social-proof notifications. Sourced from REAL
 * paid orders only and anonymized to first name + city — no fabricated
 * purchases (that would be deceptive marketing). Returns [] when there are no
 * orders yet, so the toast simply doesn't render.
 */
export async function getRecentPurchaseActivity(
  limit = 8,
): Promise<PurchaseActivity[]> {
  try {
    const admin = createAdminClient();
    const { data: orders } = await admin
      .from('orders')
      .select('id, placed_at, created_at, shipping_address')
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!orders || orders.length === 0) return [];

    const ids = orders.map((o) => o.id);
    const { data: items } = await admin
      .from('order_items')
      .select('order_id, product_name')
      .in('order_id', ids);
    const itemByOrder = new Map<string, string>();
    for (const it of items ?? []) {
      if (!itemByOrder.has(it.order_id))
        itemByOrder.set(it.order_id, it.product_name);
    }

    return orders.map((o) => {
      const addr = (o.shipping_address ?? {}) as {
        recipient_name?: string;
        city?: string;
      };
      const firstName = (addr.recipient_name ?? '').split(' ')[0] || 'Someone';
      const ts = o.placed_at ?? o.created_at;
      const minutesAgo = ts
        ? Math.max(1, Math.round((Date.now() - new Date(ts).getTime()) / 60000))
        : 1;
      return {
        firstName,
        city: addr.city ?? null,
        productName: itemByOrder.get(o.id) ?? 'a product',
        minutesAgo,
      };
    });
  } catch (err) {
    console.warn('[cro] getRecentPurchaseActivity failed:', err);
    return [];
  }
}
