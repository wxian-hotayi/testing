import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, ShieldCheck, Truck, RefreshCw } from 'lucide-react';
import { ProductGallery } from '@/features/catalog/components/product-gallery';
import { ProductGrid } from '@/features/catalog/components/product-grid';
import { BundleSelector } from '@/features/cart/components/bundle-selector';
import { WishlistButton } from '@/features/account/components/wishlist-button';
import { RatingStars } from '@/components/ui/rating-stars';
import { Price } from '@/components/ui/price';
import { Badge } from '@/components/ui/badge';
import { JsonLd } from '@/components/seo/json-ld';
import { getProductBySlug } from '@/features/catalog/queries';
import { buildMetadata } from '@/lib/seo';
import { toMajor } from '@/lib/money';
import { SITE } from '@/lib/constants';
import { env } from '@/lib/env';
import { resolveStorefront } from '@/lib/tenant/context';

// Rendered per store; the product is scoped to the resolved tenant.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { storeId } = await resolveStorefront();
  const product = await getProductBySlug(slug, storeId);
  if (!product) return buildMetadata({ title: 'Product not found', noIndex: true });
  return buildMetadata({
    title: product.meta_title ?? product.name,
    description:
      product.meta_description ?? product.subtitle ?? SITE.defaultDescription,
    path: `/products/${product.slug}`,
    image: product.images[0]?.url,
    type: 'product',
  });
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { storeId } = await resolveStorefront();
  const product = await getProductBySlug(slug, storeId);
  if (!product) notFound();

  const benefits = Array.isArray(product.benefits)
    ? product.benefits.filter((b): b is string => typeof b === 'string')
    : [];
  const inStock = !product.track_inventory || product.stock_quantity > 0;
  const lowStock =
    product.track_inventory &&
    product.stock_quantity > 0 &&
    product.stock_quantity <= product.low_stock_threshold;

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.subtitle ?? product.description ?? undefined,
    image: product.images.map((i) => i.url),
    sku: product.sku ?? undefined,
    brand: { '@type': 'Brand', name: SITE.name },
    offers: {
      '@type': 'Offer',
      price: toMajor(product.price_sen).toFixed(2),
      priceCurrency: 'MYR',
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${env.NEXT_PUBLIC_SITE_URL}/products/${product.slug}`,
    },
    ...(product.rating_count > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating_avg,
        reviewCount: product.rating_count,
      },
    }),
    ...(product.reviews.length > 0 && {
      review: product.reviews.slice(0, 10).map((r) => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: r.author_name },
        reviewRating: {
          '@type': 'Rating',
          ratingValue: r.rating,
          bestRating: 5,
        },
        name: r.title ?? undefined,
        reviewBody: r.body ?? undefined,
      })),
    }),
  };

  return (
    <main className="container py-8">
      <JsonLd data={productJsonLd} />

      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:text-foreground">Products</Link>
        {product.category && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/categories/${product.category.slug}`} className="hover:text-foreground">
              {product.category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />

        <div>
          {product.is_best_seller && <Badge variant="accent">Best seller</Badge>}
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            {product.name}
          </h1>
          {product.subtitle && (
            <p className="mt-2 text-lg text-muted-foreground">{product.subtitle}</p>
          )}

          <div className="mt-3">
            <RatingStars rating={product.rating_avg} count={product.rating_count} />
          </div>

          <div className="mt-5">
            <Price priceSen={product.price_sen} compareAtSen={product.compare_at_price_sen} size="lg" />
          </div>

          {lowStock && (
            <p className="mt-2 text-sm font-semibold text-destructive">
              Only {product.stock_quantity} left in stock — order soon.
            </p>
          )}
          {!inStock && (
            <p className="mt-2 text-sm font-semibold text-muted-foreground">
              Currently sold out.
            </p>
          )}

          {benefits.length > 0 && (
            <ul className="mt-6 space-y-2">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  {b}
                </li>
              ))}
            </ul>
          )}

          {/* Interactive bundle selection + add-to-cart (AOV engine). */}
          <div className="mt-8">
            <BundleSelector
              productId={product.id}
              basePriceSen={product.price_sen}
              isSubscribable={product.is_subscribable}
              outOfStock={!inStock}
              bundles={product.bundles.map((b) => ({
                id: b.id,
                quantity: b.quantity,
                priceSen: b.price_sen,
                label: b.label,
              }))}
            />
            <WishlistButton productId={product.id} />
          </div>

          {/* Trust badges */}
          <div className="mt-8 grid grid-cols-3 gap-3 border-t pt-6 text-center text-xs text-muted-foreground">
            <div className="flex flex-col items-center gap-1">
              <Truck className="size-5 text-primary" aria-hidden /> Free over RM 200
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="size-5 text-primary" aria-hidden /> Secure checkout
            </div>
            <div className="flex flex-col items-center gap-1">
              <RefreshCw className="size-5 text-primary" aria-hidden /> Cancel anytime
            </div>
          </div>
        </div>
      </div>

      {/* Detail sections */}
      <div className="mt-16 grid gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          {product.description && (
            <section>
              <h2 className="mb-3 text-2xl font-bold">About this product</h2>
              <p className="leading-relaxed text-muted-foreground">{product.description}</p>
            </section>
          )}
          {product.ingredients && (
            <section>
              <h2 className="mb-3 text-2xl font-bold">Ingredients</h2>
              <p className="leading-relaxed text-muted-foreground">{product.ingredients}</p>
            </section>
          )}
          {product.usage_instructions && (
            <section>
              <h2 className="mb-3 text-2xl font-bold">How to use</h2>
              <p className="leading-relaxed text-muted-foreground">{product.usage_instructions}</p>
            </section>
          )}
        </div>

        {/* Reviews */}
        <aside>
          <h2 className="mb-4 text-2xl font-bold">Reviews</h2>
          {product.reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            <ul className="space-y-5">
              {product.reviews.slice(0, 8).map((r) => (
                <li key={r.id} className="border-b pb-4 last:border-0">
                  <RatingStars rating={r.rating} size={14} />
                  {r.title && <p className="mt-1 font-semibold">{r.title}</p>}
                  {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.author_name}
                    {r.is_verified_purchase && ' · Verified purchase'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {product.frequentlyBoughtTogether.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">Frequently bought together</h2>
          <ProductGrid products={product.frequentlyBoughtTogether} />
        </section>
      )}

      {product.related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">You may also like</h2>
          <ProductGrid products={product.related} />
        </section>
      )}
    </main>
  );
}
