import Link from 'next/link';
import { ShieldCheck, Truck, Leaf, RefreshCw } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { SITE } from '@/lib/constants';

/**
 * Homepage. This is the Phase-0 foundation version — a real, styled hero and
 * trust strip. Phase 1 expands it with best sellers, categories, reviews,
 * social proof, FAQ, and newsletter signup pulled from Supabase.
 */
export default function HomePage() {
  return (
    <main>
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
            <Link
              href="/products"
              className={buttonVariants({ size: 'lg', className: 'px-10' })}
            >
              Shop all products
            </Link>
            <Link
              href="/subscribe"
              className={buttonVariants({ size: 'lg', variant: 'outline' })}
            >
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
    </main>
  );
}
