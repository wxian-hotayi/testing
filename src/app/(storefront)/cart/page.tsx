import type { Metadata } from 'next';
import { CartPageContents } from '@/features/cart/components/cart-page-contents';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Your Cart',
  path: '/cart',
  noIndex: true,
});

export default function CartPage() {
  return (
    <main className="container py-12">
      <CartPageContents />
    </main>
  );
}
