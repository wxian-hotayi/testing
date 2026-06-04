import Link from 'next/link';
import { Leaf } from 'lucide-react';
import { SITE } from '@/lib/constants';
import { NewsletterForm } from '@/features/marketing/components/newsletter-form';

const FOOTER_LINKS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Shop',
    links: [
      { href: '/products', label: 'All products' },
      { href: '/subscribe', label: 'Subscribe & save' },
      { href: '/categories/performance', label: 'Performance' },
      { href: '/categories/wellness', label: 'Daily Wellness' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/account', label: 'My account' },
      { href: '/account/orders', label: 'Track order' },
      { href: '/faq', label: 'FAQ' },
      { href: '/contact', label: 'Contact us' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/legal/privacy', label: 'Privacy Policy' },
      { href: '/legal/terms', label: 'Terms & Conditions' },
      { href: '/legal/refund', label: 'Refund Policy' },
      { href: '/legal/shipping', label: 'Shipping Policy' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="container py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold">
              <Leaf className="size-6 text-primary" aria-hidden />
              {SITE.name}
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              {SITE.tagline}.
            </p>
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold">Get 10% off your first order</p>
              <NewsletterForm source="footer" />
            </div>
          </div>

          {FOOTER_LINKS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-sm font-semibold">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t pt-6 text-xs text-muted-foreground">
          <p className="mb-2">
            These statements have not been evaluated by the relevant health
            authority. This product is not intended to diagnose, treat, cure, or
            prevent any disease. Consult a healthcare professional before use.
          </p>
          <p>
            © {SITE.name}. All rights reserved. Prices in Malaysian Ringgit (RM).
          </p>
        </div>
      </div>
    </footer>
  );
}
