'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe/server';
import { toMinor } from '@/lib/money';
import type {
  OrderStatus,
  ReviewStatus,
  UserRole,
  DiscountType,
} from '@/types/database.types';

export type AdminResult = { ok: boolean; error?: string };

/** Verify the caller is staff/admin. Required because admin mutations use the
 * RLS-bypassing service-role client. `adminOnly` restricts to role 'admin'. */
async function requireStaff(adminOnly = false) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const role = profile?.role;
  if (!role || (role !== 'admin' && role !== 'staff')) {
    throw new Error('Forbidden.');
  }
  if (adminOnly && role !== 'admin') throw new Error('Admins only.');
  return { admin: createAdminClient(), role, userId: user.id };
}

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key)?.toString().trim();
  return v ? v : null;
}
function num(fd: FormData, key: string): number {
  return Number(fd.get(key) ?? 0) || 0;
}
function bool(fd: FormData, key: string): boolean {
  return fd.get(key) === 'on';
}

// --- Products ----------------------------------------------------------------
export async function upsertProductAction(
  _prev: AdminResult | null,
  fd: FormData,
): Promise<AdminResult> {
  try {
    const { admin } = await requireStaff();
    const id = str(fd, 'id');
    const name = str(fd, 'name');
    const slug = str(fd, 'slug');
    if (!name || !slug) return { ok: false, error: 'Name and slug are required.' };

    const benefits = (str(fd, 'benefits') ?? '')
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean);

    const row = {
      name,
      slug,
      sku: str(fd, 'sku'),
      subtitle: str(fd, 'subtitle'),
      description: str(fd, 'description'),
      category_id: str(fd, 'category_id'),
      price_sen: toMinor(num(fd, 'price')),
      compare_at_price_sen: fd.get('compare_at_price')
        ? toMinor(num(fd, 'compare_at_price'))
        : null,
      ingredients: str(fd, 'ingredients'),
      usage_instructions: str(fd, 'usage_instructions'),
      benefits,
      stock_quantity: num(fd, 'stock_quantity'),
      low_stock_threshold: num(fd, 'low_stock_threshold'),
      is_active: bool(fd, 'is_active'),
      is_featured: bool(fd, 'is_featured'),
      is_best_seller: bool(fd, 'is_best_seller'),
      is_subscribable: bool(fd, 'is_subscribable'),
    };

    if (id) {
      const { error } = await admin.from('products').update(row).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await admin.from('products').insert(row);
      if (error) throw error;
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
  revalidatePath('/admin/products');
  redirect('/admin/products');
}

export async function deleteProductAction(id: string): Promise<AdminResult> {
  try {
    const { admin } = await requireStaff();
    const { error } = await admin.from('products').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/admin/products');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

// --- Categories --------------------------------------------------------------
export async function upsertCategoryAction(
  _prev: AdminResult | null,
  fd: FormData,
): Promise<AdminResult> {
  try {
    const { admin } = await requireStaff();
    const id = str(fd, 'id');
    const name = str(fd, 'name');
    const slug = str(fd, 'slug');
    if (!name || !slug) return { ok: false, error: 'Name and slug are required.' };
    const row = {
      name,
      slug,
      description: str(fd, 'description'),
      position: num(fd, 'position'),
      is_active: bool(fd, 'is_active'),
    };
    if (id) {
      const { error } = await admin.from('categories').update(row).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await admin.from('categories').insert(row);
      if (error) throw error;
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
  revalidatePath('/admin/categories');
  redirect('/admin/categories');
}

export async function deleteCategoryAction(id: string): Promise<AdminResult> {
  try {
    const { admin } = await requireStaff();
    await admin.from('categories').delete().eq('id', id);
    revalidatePath('/admin/categories');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

// --- Coupons -----------------------------------------------------------------
export async function upsertCouponAction(
  _prev: AdminResult | null,
  fd: FormData,
): Promise<AdminResult> {
  try {
    const { admin } = await requireStaff();
    const id = str(fd, 'id');
    const code = str(fd, 'code');
    const discountType = str(fd, 'discount_type') as DiscountType | null;
    if (!code || !discountType) return { ok: false, error: 'Code and type are required.' };
    // For fixed_amount the input is RM → store sen; percentage stores the %.
    const rawValue = num(fd, 'discount_value');
    const discountValue =
      discountType === 'fixed_amount' ? toMinor(rawValue) : rawValue;
    const row = {
      code,
      description: str(fd, 'description'),
      discount_type: discountType,
      discount_value: discountValue,
      min_order_sen: toMinor(num(fd, 'min_order')),
      usage_limit_per_user: fd.get('usage_limit_per_user')
        ? num(fd, 'usage_limit_per_user')
        : null,
      is_active: bool(fd, 'is_active'),
    };
    if (id) {
      const { error } = await admin.from('coupons').update(row).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await admin.from('coupons').insert(row);
      if (error) throw error;
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
  revalidatePath('/admin/coupons');
  redirect('/admin/coupons');
}

export async function toggleCouponAction(id: string, active: boolean): Promise<AdminResult> {
  try {
    const { admin } = await requireStaff();
    await admin.from('coupons').update({ is_active: active }).eq('id', id);
    revalidatePath('/admin/coupons');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

// --- Orders ------------------------------------------------------------------
export async function updateOrderAction(
  id: string,
  patch: { status?: OrderStatus; tracking_number?: string; tracking_url?: string },
): Promise<AdminResult> {
  try {
    const { admin } = await requireStaff();
    await admin.from('orders').update(patch).eq('id', id);
    revalidatePath(`/admin/orders/${id}`);
    revalidatePath('/admin/orders');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

export async function refundOrderAction(id: string): Promise<AdminResult> {
  try {
    const { admin } = await requireStaff();
    const { data: order } = await admin
      .from('orders')
      .select('stripe_payment_intent_id, payment_status')
      .eq('id', id)
      .maybeSingle();
    if (!order) return { ok: false, error: 'Order not found.' };

    if (order.stripe_payment_intent_id) {
      try {
        await getStripe().refunds.create({
          payment_intent: order.stripe_payment_intent_id,
        });
      } catch (err) {
        console.warn('[admin] Stripe refund failed:', err);
        return { ok: false, error: 'Stripe refund failed.' };
      }
    }
    await admin
      .from('orders')
      .update({ status: 'refunded', payment_status: 'refunded' })
      .eq('id', id);
    revalidatePath(`/admin/orders/${id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

// --- Reviews -----------------------------------------------------------------
export async function setReviewStatusAction(
  id: string,
  status: ReviewStatus,
): Promise<AdminResult> {
  try {
    const { admin } = await requireStaff();
    await admin.from('reviews').update({ status }).eq('id', id);
    revalidatePath('/admin/reviews');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

// --- Users -------------------------------------------------------------------
export async function setUserRoleAction(
  id: string,
  role: UserRole,
): Promise<AdminResult> {
  try {
    const { admin } = await requireStaff(true); // admin only
    await admin.from('profiles').update({ role }).eq('id', id);
    revalidatePath('/admin/users');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}
