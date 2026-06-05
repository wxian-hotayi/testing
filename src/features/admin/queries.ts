import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentStoreId } from '@/lib/tenant/context';
import type { Tables } from '@/types/database.types';

/**
 * Admin list queries use the service-role client (RLS-bypassing), so they MUST
 * scope to the current store themselves — middleware/layout only gate *who*
 * reaches /admin, not *which store's* data they see. Scoping is defensive: when
 * no store resolves (e.g. tenancy migrations not yet applied) the filter is
 * skipped and behaviour matches the pre-multitenant app.
 */

export async function listProducts(): Promise<Tables<'products'>[]> {
  try {
    const admin = createAdminClient();
    const storeId = await getCurrentStoreId();
    let query = admin.from('products').select('*').order('created_at', { ascending: false });
    if (storeId) query = query.eq('store_id', storeId);
    const { data } = await query;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getProductForEdit(id: string) {
  try {
    const admin = createAdminClient();
    const storeId = await getCurrentStoreId();
    let productQuery = admin.from('products').select('*').eq('id', id);
    if (storeId) productQuery = productQuery.eq('store_id', storeId);
    const [{ data: product }, { data: bundles }] = await Promise.all([
      productQuery.maybeSingle(),
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
    const storeId = await getCurrentStoreId();
    let query = admin.from('categories').select('*').order('position');
    if (storeId) query = query.eq('store_id', storeId);
    const { data } = await query;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listCoupons(): Promise<Tables<'coupons'>[]> {
  try {
    const admin = createAdminClient();
    const storeId = await getCurrentStoreId();
    let query = admin.from('coupons').select('*').order('created_at', { ascending: false });
    if (storeId) query = query.eq('store_id', storeId);
    const { data } = await query;
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
    const storeId = await getCurrentStoreId();
    let query = admin
      .from('orders')
      .select(
        'id, order_number, email, status, payment_status, fulfillment_status, total_sen, created_at, tracking_number',
      )
      .order('created_at', { ascending: false })
      .limit(200);
    if (storeId) query = query.eq('store_id', storeId);
    const { data } = await query;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getOrderDetail(id: string) {
  try {
    const admin = createAdminClient();
    const storeId = await getCurrentStoreId();
    let orderQuery = admin.from('orders').select('*').eq('id', id);
    if (storeId) orderQuery = orderQuery.eq('store_id', storeId);
    const { data: order } = await orderQuery.maybeSingle();
    if (!order) return null;
    const { data: items } = await admin
      .from('order_items')
      .select('*')
      .eq('order_id', id);
    return { order, items: items ?? [] };
  } catch {
    return null;
  }
}

export async function listReviews(): Promise<
  (Tables<'reviews'> & { productName: string })[]
> {
  try {
    const admin = createAdminClient();
    const storeId = await getCurrentStoreId();
    let query = admin
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (storeId) query = query.eq('store_id', storeId);
    const { data: reviews } = await query;
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

/**
 * Platform-wide user list (global profiles). Exposed only to the platform
 * operator — the page + setUserRoleAction are gated by `platform.manage`. Store
 * operators manage their team via /admin/members (store-scoped).
 */
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
