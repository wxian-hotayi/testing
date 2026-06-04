import 'server-only';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildCartView } from './totals';
import { EMPTY_CART, type CartLine, type CartCoupon, type CartView } from './types';
import { SUBSCRIPTION_DISCOUNT_PERCENT } from '@/lib/constants';
import type { SubscriptionInterval } from '@/types/database.types';

/**
 * Cart persistence. All cart-table writes go through the service-role (admin)
 * client and are STRICTLY scoped to the resolved owner — either the verified
 * auth user id, or a server-issued httpOnly `cart_token` cookie for anonymous
 * shoppers. This unifies logged-in and anonymous carts and closes the RLS gap
 * (RLS only grants authenticated owners). Reads never mutate cookies, so they
 * are safe to call during Server Component render.
 */

const CART_COOKIE = 'vitalis_cart';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

type Owner = { userId: string | null; token: string | null };

/** Resolve the current owner for READS — does not create a token. */
async function resolveOwnerForRead(): Promise<Owner> {
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE)?.value ?? null;
  return { userId, token };
}

/** Resolve the owner for WRITES — issues a cart token cookie if needed. */
async function resolveOwnerForWrite(): Promise<Owner> {
  const owner = await resolveOwnerForRead();
  if (owner.userId) return owner;
  if (owner.token) return owner;
  const token = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  return { userId: null, token };
}

async function findActiveCartId(owner: Owner): Promise<string | null> {
  if (!owner.userId && !owner.token) return null;
  const admin = createAdminClient();
  let query = admin.from('carts').select('id').eq('status', 'active').limit(1);
  query = owner.userId
    ? query.eq('user_id', owner.userId)
    : query.eq('session_token', owner.token!);
  const { data } = await query.maybeSingle();
  return data?.id ?? null;
}

async function getOrCreateCartId(owner: Owner): Promise<string | null> {
  const existing = await findActiveCartId(owner);
  if (existing) return existing;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('carts')
    .insert({
      user_id: owner.userId,
      session_token: owner.userId ? null : owner.token,
      status: 'active',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/** Load and compute the current cart. Safe during render (read-only). */
export async function getCartView(): Promise<CartView> {
  try {
    const owner = await resolveOwnerForRead();
    if (!owner.userId && !owner.token) return EMPTY_CART;

    const admin = createAdminClient();
    const cartId = await findActiveCartId(owner);
    if (!cartId) return EMPTY_CART;

    const { data: items } = await admin
      .from('cart_items')
      .select('*')
      .eq('cart_id', cartId)
      .order('created_at', { ascending: true });
    if (!items || items.length === 0)
      return { ...EMPTY_CART, id: cartId };

    const productIds = [...new Set(items.map((i) => i.product_id))];
    const bundleIds = items
      .map((i) => i.bundle_id)
      .filter((b): b is string => b !== null);

    const [{ data: products }, { data: bundles }, { data: images }] =
      await Promise.all([
        admin.from('products').select('id, slug, name').in('id', productIds),
        bundleIds.length
          ? admin
              .from('bundles')
              .select('id, quantity, label')
              .in('id', bundleIds)
          : Promise.resolve({ data: [] as { id: string; quantity: number; label: string | null }[] }),
        admin
          .from('product_images')
          .select('product_id, url, is_primary, position')
          .in('product_id', productIds)
          .order('is_primary', { ascending: false })
          .order('position', { ascending: true }),
      ]);

    const productById = new Map((products ?? []).map((p) => [p.id, p]));
    const bundleById = new Map((bundles ?? []).map((b) => [b.id, b]));
    const imageByProduct = new Map<string, string>();
    for (const img of images ?? []) {
      if (!imageByProduct.has(img.product_id))
        imageByProduct.set(img.product_id, img.url);
    }

    const lines: CartLine[] = items.map((item) => {
      const product = productById.get(item.product_id);
      const bundle = item.bundle_id ? bundleById.get(item.bundle_id) : null;
      return {
        id: item.id,
        productId: item.product_id,
        slug: product?.slug ?? '',
        name: product?.name ?? 'Product',
        image: imageByProduct.get(item.product_id) ?? null,
        bundleId: item.bundle_id,
        bundleLabel: bundle?.label ?? null,
        bottlesPerUnit: bundle?.quantity ?? 1,
        quantity: item.quantity,
        unitPriceSen: item.unit_price_sen,
        lineTotalSen: item.quantity * item.unit_price_sen,
        isSubscription: item.is_subscription,
        subscriptionInterval: item.subscription_interval,
      };
    });

    const subtotal = lines.reduce((s, l) => s + l.lineTotalSen, 0);
    const coupon = await loadCoupon(cartId, subtotal);
    return buildCartView(cartId, lines, coupon);
  } catch (err) {
    console.warn('[cart] getCartView failed:', err);
    return EMPTY_CART;
  }
}

async function loadCoupon(
  cartId: string,
  subtotalSen: number,
): Promise<CartCoupon | null> {
  try {
    const admin = createAdminClient();
    const { data: cart } = await admin
      .from('carts')
      .select('applied_coupon_id')
      .eq('id', cartId)
      .maybeSingle();
    if (!cart?.applied_coupon_id) return null;

    const { data: coupon } = await admin
      .from('coupons')
      .select('code')
      .eq('id', cart.applied_coupon_id)
      .maybeSingle();
    if (!coupon) return null;

    const { data: result } = await admin.rpc('validate_coupon', {
      p_code: coupon.code,
      p_subtotal_sen: subtotalSen,
    });
    const r = result as {
      valid?: boolean;
      discount_sen?: number;
      free_shipping?: boolean;
    } | null;
    if (!r?.valid) return null;
    return {
      code: coupon.code,
      discountSen: r.discount_sen ?? 0,
      freeShipping: r.free_shipping ?? false,
    };
  } catch {
    return null;
  }
}

export type AddItemInput = {
  productId: string;
  bundleId?: string | null;
  isSubscription?: boolean;
  subscriptionInterval?: SubscriptionInterval | null;
  quantity?: number;
};

/** Add (or increment) a cart line. Prices are looked up server-side — never
 * trusted from the client. Returns the recomputed cart. */
export async function addItem(input: AddItemInput): Promise<CartView> {
  const owner = await resolveOwnerForWrite();
  const admin = createAdminClient();

  // Resolve authoritative unit price.
  let unitPriceSen: number;
  if (input.bundleId) {
    const { data: bundle, error } = await admin
      .from('bundles')
      .select('price_sen, product_id, is_active')
      .eq('id', input.bundleId)
      .maybeSingle();
    if (error || !bundle || !bundle.is_active || bundle.product_id !== input.productId) {
      throw new Error('Invalid bundle.');
    }
    unitPriceSen = bundle.price_sen;
  } else {
    const { data: product, error } = await admin
      .from('products')
      .select('price_sen, is_active')
      .eq('id', input.productId)
      .maybeSingle();
    if (error || !product || !product.is_active) throw new Error('Invalid product.');
    unitPriceSen = product.price_sen;
  }

  const cartId = await getOrCreateCartId(owner);
  if (!cartId) throw new Error('Could not create cart.');

  const qty = Math.max(1, input.quantity ?? 1);
  const isSub = input.isSubscription ?? false;
  const bundleId = input.bundleId ?? null;

  // Subscriptions get the recurring discount applied to the snapshot price.
  if (isSub) {
    unitPriceSen = Math.round(
      unitPriceSen * (1 - SUBSCRIPTION_DISCOUNT_PERCENT / 100),
    );
  }

  // Upsert by the unique (cart_id, product_id, bundle_id, is_subscription) key.
  let lookup = admin
    .from('cart_items')
    .select('id, quantity')
    .eq('cart_id', cartId)
    .eq('product_id', input.productId)
    .eq('is_subscription', isSub);
  lookup = bundleId === null
    ? lookup.is('bundle_id', null)
    : lookup.eq('bundle_id', bundleId);
  const { data: existing } = await lookup.maybeSingle();

  if (existing) {
    await admin
      .from('cart_items')
      .update({ quantity: existing.quantity + qty, unit_price_sen: unitPriceSen })
      .eq('id', existing.id);
  } else {
    await admin.from('cart_items').insert({
      cart_id: cartId,
      product_id: input.productId,
      bundle_id: bundleId,
      quantity: qty,
      unit_price_sen: unitPriceSen,
      is_subscription: isSub,
      subscription_interval: isSub ? (input.subscriptionInterval ?? 'monthly') : null,
    });
  }

  await touchCart(cartId);
  return getCartView();
}

export async function updateLine(itemId: string, quantity: number): Promise<CartView> {
  const admin = createAdminClient();
  if (quantity <= 0) {
    await admin.from('cart_items').delete().eq('id', itemId);
  } else {
    await admin.from('cart_items').update({ quantity }).eq('id', itemId);
  }
  return getCartView();
}

export async function removeLine(itemId: string): Promise<CartView> {
  const admin = createAdminClient();
  await admin.from('cart_items').delete().eq('id', itemId);
  return getCartView();
}

export async function clearCart(): Promise<CartView> {
  const owner = await resolveOwnerForRead();
  const cartId = await findActiveCartId(owner);
  if (cartId) {
    const admin = createAdminClient();
    await admin.from('cart_items').delete().eq('cart_id', cartId);
    await admin.from('carts').update({ applied_coupon_id: null }).eq('id', cartId);
  }
  return getCartView();
}

/** Validate and apply a coupon code. Throws with a user-facing message. */
export async function applyCoupon(code: string): Promise<CartView> {
  const owner = await resolveOwnerForRead();
  const cartId = await findActiveCartId(owner);
  if (!cartId) throw new Error('Your cart is empty.');

  const admin = createAdminClient();
  const view = await getCartView();
  const { data: result } = await admin.rpc('validate_coupon', {
    p_code: code,
    p_subtotal_sen: view.subtotalSen,
  });
  const r = result as { valid?: boolean; reason?: string; coupon_id?: string } | null;
  if (!r?.valid) throw new Error(r?.reason ?? 'Invalid coupon code.');

  await admin
    .from('carts')
    .update({ applied_coupon_id: r.coupon_id })
    .eq('id', cartId);
  return getCartView();
}

export async function removeCoupon(): Promise<CartView> {
  const owner = await resolveOwnerForRead();
  const cartId = await findActiveCartId(owner);
  if (cartId) {
    const admin = createAdminClient();
    await admin.from('carts').update({ applied_coupon_id: null }).eq('id', cartId);
  }
  return getCartView();
}

async function touchCart(cartId: string) {
  const admin = createAdminClient();
  await admin
    .from('carts')
    .update({ status: 'active', abandoned_at: null })
    .eq('id', cartId);
}
