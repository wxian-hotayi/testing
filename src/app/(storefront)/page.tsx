import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Truck, Leaf, RefreshCw, Star } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { RatingStars } from '@/components/ui/rating-stars';
import { FaqAccordion } from '@/components/ui/faq-accordion';
import { ProductGrid } from '@/features/catalog/components/product-grid';
import { JsonLd } from '@/components/seo/json-ld';
import {
  getBestSellers,
  getCategories,
  getRecentReviews,
} from '@/features/catalog/queries';
import { SITE } from '@/lib/constants';
import { FAQS } from '@/lib/faq';
import { env } from '@/lib/env';
import { NewsletterForm } from '@/features/marketing/components/newsletter-form';

export default async function HomePage() {
  const [bestSellers, categories, reviews] = await Promise.all([
    getBestSellers(4),
    getCategories(),
    getRecentReviews(3),
  ]);

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: env.NEXT_PUBLIC_SITE_URL,
    description: SITE.defaultDescription,
  };
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  return (
    <main>
      <JsonLd data={orgJsonLd} />
      <JsonLd data={faqJsonLd} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-secondary to-background">
        <div className="container flex flex-col items-center gap-6 py-20 text-center md:py-28">
          <span className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Science-backed • Third-party tested
          </span>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
            {SITE.tagline}
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            {SITE.defaultDescription}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/products" className={buttonVariants({ size: 'lg', className: 'px-10' })}>
              Shop all products
            </Link>
            <Link href="/subscribe" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
              Subscribe &amp; save 15%
            </Link>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y bg-card">
        <div className="container grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
          {[
            { icon: Truck, label: 'Free shipping over RM 200' },
            { icon: ShieldCheck, label: 'Secure checkout' },
            { icon: Leaf, label: 'Clean ingredients' },
            { icon: RefreshCw, label: 'Cancel anytime' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2 text-center">
              <Icon className="size-6 text-primary" aria-hidden />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Best sellers */}
      <section className="container py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Best sellers</h2>
            <p className="mt-1 text-muted-foreground">Our most-loved formulas.</p>
          </div>
          <Link href="/products" className="text-sm font-semibold text-primary hover:underline">
            View all →
          </Link>
        </div>
        <ProductGrid
          products={bestSellers}
          emptyMessage="Products will appear here once the catalog is connected."
        />
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="bg-secondary/40 py-16">
          <div className="container">
            <h2 className="mb-8 text-3xl font-bold tracking-tight">Shop by goal</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.slug}`}
                  className="group relative overflow-hidden rounded-xl border bg-card p-8 transition-shadow hover:shadow-md"
                >
                  {cat.image_url && (
                    <Image
                      src={cat.image_url}
                      alt=""
                      fill
                      className="object-cover opacity-20 transition-transform group-hover:scale-105"
                    />
                  )}
                  <div className="relative">
                    <h3 className="text-xl font-semibold group-hover:text-primary">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Social proof */}
      {reviews.length > 0 && (
        <section className="container py-16">
          <div className="mb-8 flex items-center gap-2">
            <Star className="size-6 fill-accent text-accent" aria-hidden />
            <h2 className="text-3xl font-bold tracking-tight">Loved by customers</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.id} className="rounded-lg border bg-card p-6">
                <RatingStars rating={r.rating} />
                {r.title && <figcaption className="mt-3 font-semibold">{r.title}</figcaption>}
                {r.body && (
                  <blockquote className="mt-2 text-sm text-muted-foreground">
                    “{r.body}”
                  </blockquote>
                )}
                <p className="mt-4 text-sm font-medium">
                  {r.author_name}{' '}
                  <span className="font-normal text-muted-foreground">
                    on {r.productName}
                  </span>
                </p>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="bg-secondary/40 py-16">
        <div className="container max-w-3xl">
          <h2 className="mb-8 text-center text-3xl font-bold tracking-tight">
            Frequently asked questions
          </h2>
          <FaqAccordion items={FAQS} />
        </div>
      </section>

      {/* Newsletter */}
      <section className="container py-16">
        <div className="mx-auto max-w-2xl rounded-2xl bg-primary px-8 py-12 text-center text-primary-foreground">
          <h2 className="text-3xl font-bold tracking-tight">Get 10% off your first order</h2>
          <p className="mx-auto mt-2 max-w-md text-primary-foreground/80">
            Join our newsletter for launches, offers, and evidence-based tips.
          </p>
          <div className="mx-auto mt-6 max-w-md text-left">
            <NewsletterForm source="homepage" />
          </div>
        </div>
      </section>
    </main>
  );
}
