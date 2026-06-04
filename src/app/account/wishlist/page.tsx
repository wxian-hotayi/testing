import { getMyWishlist } from '@/features/account/queries';
import { WishlistGrid } from '@/features/account/components/wishlist-grid';

export default async function WishlistPage() {
  const products = await getMyWishlist();
  return (
    <div>
      <h2 className="mb-4 text-lg font-bold">Wishlist</h2>
      <WishlistGrid products={products} />
    </div>
  );
}
