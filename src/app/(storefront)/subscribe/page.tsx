import type { Metadata } from 'next';
import { RefreshCw, Percent, CalendarClock, XCircle } from 'lucide-react';
import { ProductGrid } from '@/features/catalog/components/product-grid';
import { getActiveProducts } from '@/features/catalog/queries';
import { buildMetadata } from '@/lib/seo';
import { SUBSCRIPTION_DISCOUNT_PERCENT } from '@/lib/constants';

export const metadata: Metadata = buildMetadata({
  title: 'Subscribe & Save',
  description: `Subscribe to your favourite supplements and save ${SUBSCRIPTION_DISCOUNT_PERCENT}% on every order. Pause, skip, or cancel anytime.`,
  path: '/subscribe',
});

export const revalidate = 300;

export default async function SubscribePage() {
  const products = await getActiveProducts({ limit: 8 });

  const steps = [
    { icon: Percent, title: `Save ${SUBSCRIPTION_DISCOUNT_PERCENT}%`, body: 'Every recurring order is discounted automatically.' },
    { icon: CalendarClock, title: 'Your schedule', body: 'Choose monthly or quarterly delivery to match your routine.' },
    { icon: RefreshCw, title: 'Full control', body: 'Pause, skip, or change your next order from your dashboard.' },
    { icon: XCircle, title: 'No commitment', body: 'Cancel anytime — no fees, no questions.' },
  ];

  return (
    <main>
      <section className="bg-gradient-to-b from-secondary to-background">
        <div className="container py-16 text-center md:py-24">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Never run out. Save {SUBSCRIPTION_DISCOUNT_PERCENT}%.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Subscribe to your essentials and we’ll deliver on your schedule —
            discounted, flexible, and cancellable anytime. Choose a product and
            toggle “Subscribe &amp; save” on its page.
          </p>
        </div>
      </section>

      <section className="container py-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border bg-card p-6 text-center">
              <Icon className="mx-auto size-8 text-primary" aria-hidden />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-12">
        <h2 className="mb-8 text-2xl font-bold tracking-tight">
          Popular to subscribe
        </h2>
        <ProductGrid
          products={products}
          emptyMessage="Subscribable products will appear here once the catalog is connected."
        />
      </section>
    </main>
  );
}
