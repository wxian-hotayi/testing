import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { Tables } from '@/types/database.types';

/** All admin list queries use the service-role client. The /admin layout +
 * middleware ensure only staff/admin reach these server components. */

export async function listProducts(): Promise<Tables<'products'>[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getProductForEdit(id: string) {
  try {
    const admin = createAdminClient();
    const [{ data: product }, { data: bundles }] = await Promise.all([
      admin.from('products').select('*').eq('id', id).maybeSingle(),
      admin.from('bundles').select('*').eq('product_id', id).order('quantity'),
    ]);
    return product ? { product, bundles: bundles ?? [] } : null;
  } catch {
    return null;
  }
}

export async function listCategories(): Promise<Tables<'categories'>[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('categories')
      .select('*')
      .order('position');
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listCoupons(): Promise<Tables<'coupons'>[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

export type AdminOrderRow = Pick<
  Tables<'orders'>,
  | 'id'
  | 'order_number'
  | 'email'
  | 'status'
  | 'payment_status'
  | 'fulfillment_status'
  | 'total_sen'
  | 'created_at'
  | 'tracking_number'
>;

export async function listOrders(): Promise<AdminOrderRow[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('orders')
      .select(
        'id, order_number, email, status, payment_status, fulfillment_status, total_sen, created_at, tracking_number',
      )
      .order('created_at', { ascending: false })
      .limit(200);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getOrderDetail(id: string) {
  try {
    const admin = createAdminClient();
    const [{ data: order }, { data: items }] = await Promise.all([
      admin.from('orders').select('*').eq('id', id).maybeSingle(),
      admin.from('order_items').select('*').eq('order_id', id),
    ]);
    return order ? { order, items: items ?? [] } : null;
  } catch {
    return null;
  }
}

export async function listReviews(): Promise<
  (Tables<'reviews'> & { productName: string })[]
> {
  try {
    const admin = createAdminClient();
    const { data: reviews } = await admin
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!reviews) return [];
    const ids = [...new Set(reviews.map((r) => r.product_id))];
    const { data: products } = await admin
      .from('products')
      .select('id, name')
      .in('id', ids);
    const nameById = new Map((products ?? []).map((p) => [p.id, p.name]));
    return reviews.map((r) => ({
      ...r,
      productName: nameById.get(r.product_id) ?? 'Product',
    }));
  } catch {
    return [];
  }
}

export async function listUsers(): Promise<Tables<'profiles'>[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    return data ?? [];
  } catch {
    return [];
  }
}
