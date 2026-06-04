import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { getProductCardsByIds } from '@/features/catalog/queries';
import type {
  Profile,
  Order,
  Subscription,
  Tables,
} from '@/types/database.types';
import type { ProductCardVM } from '@/features/catalog/types';

/** The authenticated user, or null. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}

export async function getMyOrders(): Promise<Order[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

export type SubscriptionWithItems = Subscription & {
  items: (Tables<'subscription_items'> & { productName: string })[];
};

export async function getMySubscriptions(): Promise<SubscriptionWithItems[]> {
  try {
    const supabase = await createClient();
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });
    if (!subs || subs.length === 0) return [];

    const { data: items } = await supabase
      .from('subscription_items')
      .select('*')
      .in(
        'subscription_id',
        subs.map((s) => s.id),
      );

    const productIds = [...new Set((items ?? []).map((i) => i.product_id))];
    const { data: products } = productIds.length
      ? await supabase.from('products').select('id, name').in('id', productIds)
      : { data: [] as { id: string; name: string }[] };
    const nameById = new Map((products ?? []).map((p) => [p.id, p.name]));

    return subs.map((s) => ({
      ...s,
      items: (items ?? [])
        .filter((i) => i.subscription_id === s.id)
        .map((i) => ({ ...i, productName: nameById.get(i.product_id) ?? 'Product' })),
    }));
  } catch {
    return [];
  }
}

export async function getMyAddresses(): Promise<Tables<'addresses'>[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .order('is_default', { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getMyWishlist(): Promise<ProductCardVM[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('wishlist_items')
      .select('product_id')
      .order('created_at', { ascending: false });
    const ids = (data ?? []).map((w) => w.product_id);
    return getProductCardsByIds(ids);
  } catch {
    return [];
  }
}

export async function getLoyaltyBalance(): Promise<number> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;
    const { data } = await supabase
      .from('loyalty_accounts')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();
    return data?.balance ?? 0;
  } catch {
    return 0;
  }
}
