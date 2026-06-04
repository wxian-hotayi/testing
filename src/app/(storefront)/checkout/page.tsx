import type { Metadata } from 'next';
import { CheckoutClient } from '@/features/checkout/components/checkout-client';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Checkout',
  path: '/checkout',
  noIndex: true,
});

export default function CheckoutPage() {
  return (
    <main className="container py-12">
      <CheckoutClient />
    </main>
  );
}
