'use server';

import { createPublicClient } from '@/lib/supabase/public';
import { getProductCardsByIds } from '@/features/catalog/queries';
import type { ProductCardVM } from '@/features/catalog/types';

/**
 * Cross-sell engine: given the products currently in the cart, return
 * recommended products from `product_relationships` (cross_sell / upsell /
 * frequently_bought_together), excluding anything already in the cart.
 */
export async function getCartRecommendations(
  cartProductIds: string[],
  limit = 3,
): Promise<ProductCardVM[]> {
  if (cartProductIds.length === 0) return [];
  try {
    const supabase = createPublicClient();
    const { data: rels } = await supabase
      .from('product_relationships')
      .select('related_product_id, type, position')
      .in('product_id', cartProductIds)
      .order('position', { ascending: true });

    const inCart = new Set(cartProductIds);
    const seen = new Set<string>();
    const recommended: string[] = [];
    for (const r of rels ?? []) {
      if (inCart.has(r.related_product_id) || seen.has(r.related_product_id))
        continue;
      seen.add(r.related_product_id);
      recommended.push(r.related_product_id);
      if (recommended.length >= limit) break;
    }
    if (recommended.length === 0) return [];
    return getProductCardsByIds(recommended);
  } catch (err) {
    console.warn('[cart] getCartRecommendations failed:', err);
    return [];
  }
}
