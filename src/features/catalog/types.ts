import type {
  Product,
  ProductImage,
  Bundle,
  Review,
  Category,
} from '@/types/database.types';

/** Compact shape used by product cards / grids (list views). */
export type ProductCardVM = Pick<
  Product,
  | 'id'
  | 'slug'
  | 'name'
  | 'subtitle'
  | 'price_sen'
  | 'compare_at_price_sen'
  | 'rating_avg'
  | 'rating_count'
  | 'is_best_seller'
  | 'stock_quantity'
  | 'low_stock_threshold'
  | 'track_inventory'
> & {
  image: { url: string; alt: string | null } | null;
};

/** Full PDP view model assembled from several queries. */
export type ProductDetailVM = Product & {
  images: ProductImage[];
  bundles: Bundle[];
  category: Pick<Category, 'slug' | 'name'> | null;
  reviews: Review[];
  related: ProductCardVM[];
  frequentlyBoughtTogether: ProductCardVM[];
};

export type CategoryVM = Pick<
  Category,
  'id' | 'slug' | 'name' | 'description' | 'image_url'
>;
