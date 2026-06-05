import { createPublicClient } from '@/lib/supabase/public';
import type { ProductCardVM, ProductDetailVM, CategoryVM } from './types';

/**
 * Catalog data access. Every function is resilient: if Supabase is
 * unreachable (e.g. placeholder env during a build, or a transient outage) it
 * logs and returns a safe empty value instead of throwing, so pages still
 * render. Queries are composed (not embedded) to stay fully type-safe with the
 * hand-written Database types.
 */

const CARD_COLUMNS =
  'id, slug, name, subtitle, price_sen, compare_at_price_sen, rating_avg, rating_count, is_best_seller, stock_quantity, low_stock_threshold, track_inventory';

/** Attach the primary image to a set of products in one extra query. */
async function withPrimaryImages(
  rows: Omit<ProductCardVM, 'image'>[],
): Promise<ProductCardVM[]> {
  if (rows.length === 0) return [];
  try {
    const supabase = createPublicClient();
    const ids = rows.map((r) => r.id);
    const { data: images } = await supabase
      .from('product_images')
      .select('product_id, url, alt, is_primary, position')
      .in('product_id', ids)
      .order('is_primary', { ascending: false })
      .order('position', { ascending: true });

    const byProduct = new Map<string, { url: string; alt: string | null }>();
    for (const img of images ?? []) {
      if (!byProduct.has(img.product_id)) {
        byProduct.set(img.product_id, { url: img.url, alt: img.alt });
      }
    }
    return rows.map((r) => ({ ...r, image: byProduct.get(r.id) ?? null }));
  } catch (err) {
    console.warn('[catalog] withPrimaryImages failed:', err);
    return rows.map((r) => ({ ...r, image: null }));
  }
}

export async function getActiveProducts(opts?: {
  categorySlug?: string;
  limit?: number;
  /** Scope to a single store. Storefront pages pass this in MT-6; today the
   * single default store makes it optional. */
  storeId?: string;
}): Promise<ProductCardVM[]> {
  try {
    const supabase = createPublicClient();
    let query = supabase
      .from('products')
      .select(CARD_COLUMNS)
      .eq('is_active', true)
      .order('is_best_seller', { ascending: false })
      .order('rating_count', { ascending: false });
    if (opts?.storeId) query = query.eq('store_id', opts.storeId);

    if (opts?.categorySlug) {
      let catQuery = supabase
        .from('categories')
        .select('id')
        .eq('slug', opts.categorySlug);
      if (opts.storeId) catQuery = catQuery.eq('store_id', opts.storeId);
      const { data: cat } = await catQuery.maybeSingle();
      if (!cat) return [];
      query = query.eq('category_id', cat.id);
    }
    if (opts?.limit) query = query.limit(opts.limit);

    const { data, error } = await query;
    if (error) throw error;
    return withPrimaryImages(data ?? []);
  } catch (err) {
    console.warn('[catalog] getActiveProducts failed:', err);
    return [];
  }
}

export async function getBestSellers(
  limit = 4,
  storeId?: string,
): Promise<ProductCardVM[]> {
  try {
    const supabase = createPublicClient();
    let query = supabase
      .from('products')
      .select(CARD_COLUMNS)
      .eq('is_active', true)
      .eq('is_best_seller', true)
      .order('rating_count', { ascending: false })
      .limit(limit);
    if (storeId) query = query.eq('store_id', storeId);
    const { data, error } = await query;
    if (error) throw error;
    return withPrimaryImages(data ?? []);
  } catch (err) {
    console.warn('[catalog] getBestSellers failed:', err);
    return [];
  }
}

export async function getCategories(storeId?: string): Promise<CategoryVM[]> {
  try {
    const supabase = createPublicClient();
    let query = supabase
      .from('categories')
      .select('id, slug, name, description, image_url')
      .eq('is_active', true)
      .order('position', { ascending: true });
    if (storeId) query = query.eq('store_id', storeId);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.warn('[catalog] getCategories failed:', err);
    return [];
  }
}

export type RecentReviewVM = {
  id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  productName: string;
  productSlug: string;
};

/** Recent approved reviews across all products, for homepage social proof. */
export async function getRecentReviews(limit = 6): Promise<RecentReviewVM[]> {
  try {
    const supabase = createPublicClient();
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('id, author_name, rating, title, body, product_id')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    if (!reviews || reviews.length === 0) return [];

    const productIds = [...new Set(reviews.map((r) => r.product_id))];
    const { data: products } = await supabase
      .from('products')
      .select('id, name, slug')
      .in('id', productIds);
    const byId = new Map((products ?? []).map((p) => [p.id, p]));

    return reviews.map((r) => {
      const p = byId.get(r.product_id);
      return {
        id: r.id,
        author_name: r.author_name,
        rating: r.rating,
        title: r.title,
        body: r.body,
        productName: p?.name ?? 'Vitalis',
        productSlug: p?.slug ?? '',
      };
    });
  } catch (err) {
    console.warn('[catalog] getRecentReviews failed:', err);
    return [];
  }
}

export async function getCategoryBySlug(
  slug: string,
  storeId?: string,
): Promise<CategoryVM | null> {
  try {
    const supabase = createPublicClient();
    let query = supabase
      .from('categories')
      .select('id, slug, name, description, image_url')
      .eq('slug', slug)
      .eq('is_active', true);
    if (storeId) query = query.eq('store_id', storeId);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data ?? null;
  } catch (err) {
    console.warn('[catalog] getCategoryBySlug failed:', err);
    return null;
  }
}

export async function getCategorySlugs(): Promise<string[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('categories')
      .select('slug')
      .eq('is_active', true);
    if (error) throw error;
    return (data ?? []).map((r) => r.slug);
  } catch (err) {
    console.warn('[catalog] getCategorySlugs failed:', err);
    return [];
  }
}

export async function getProductSlugs(): Promise<string[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('products')
      .select('slug')
      .eq('is_active', true);
    if (error) throw error;
    return (data ?? []).map((r) => r.slug);
  } catch (err) {
    console.warn('[catalog] getProductSlugs failed:', err);
    return [];
  }
}

/** Assemble the full PDP view model. Returns null if the product is missing. */
export async function getProductBySlug(
  slug: string,
  storeId?: string,
): Promise<ProductDetailVM | null> {
  try {
    const supabase = createPublicClient();
    let productQuery = supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true);
    if (storeId) productQuery = productQuery.eq('store_id', storeId);
    const { data: product, error } = await productQuery.maybeSingle();
    if (error) throw error;
    if (!product) return null;

    const [
      { data: images },
      { data: bundles },
      { data: category },
      { data: reviews },
      { data: relationships },
    ] = await Promise.all([
      supabase
        .from('product_images')
        .select('*')
        .eq('product_id', product.id)
        .order('position', { ascending: true }),
      supabase
        .from('bundles')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_active', true)
        .order('quantity', { ascending: true }),
      product.category_id
        ? supabase
            .from('categories')
            .select('slug, name')
            .eq('id', product.category_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('reviews')
        .select('*')
        .eq('product_id', product.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('product_relationships')
        .select('related_product_id, type, position')
        .eq('product_id', product.id)
        .order('position', { ascending: true }),
    ]);

    // Resolve related + frequently-bought-together products as cards.
    const rel = relationships ?? [];
    const fbtIds = rel
      .filter((r) => r.type === 'frequently_bought_together')
      .map((r) => r.related_product_id);
    const relatedIds = rel
      .filter((r) => r.type !== 'frequently_bought_together')
      .map((r) => r.related_product_id);

    const [fbt, related] = await Promise.all([
      getProductsByIds(fbtIds),
      getProductsByIds(relatedIds),
    ]);

    return {
      ...product,
      images: images ?? [],
      bundles: bundles ?? [],
      category: category ?? null,
      reviews: reviews ?? [],
      related,
      frequentlyBoughtTogether: fbt,
    };
  } catch (err) {
    console.warn('[catalog] getProductBySlug failed:', err);
    return null;
  }
}

export async function getProductCardsByIds(
  ids: string[],
): Promise<ProductCardVM[]> {
  return getProductsByIds(ids);
}

async function getProductsByIds(ids: string[]): Promise<ProductCardVM[]> {
  if (ids.length === 0) return [];
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('products')
      .select(CARD_COLUMNS)
      .in('id', ids)
      .eq('is_active', true);
    if (error) throw error;
    // Preserve the requested ordering.
    const order = new Map(ids.map((id, i) => [id, i]));
    const sorted = (data ?? []).sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
    );
    return withPrimaryImages(sorted);
  } catch (err) {
    console.warn('[catalog] getProductsByIds failed:', err);
    return [];
  }
}
