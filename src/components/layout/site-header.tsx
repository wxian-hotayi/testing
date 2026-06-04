import Link from 'next/link';
import { Leaf, User } from 'lucide-react';
import { SITE } from '@/lib/constants';
import { CartIcon } from '@/features/cart/components/cart-icon';

const NAV = [
  { href: '/products', label: 'Shop' },
  { href: '/subscribe', label: 'Subscribe' },
  { href: '/about', label: 'About' },
];

/**
 * Storefront header. The cart trigger is a plain link for now; Phase 2 swaps it
 * for the slide-out cart drawer with a live item count.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <Leaf className="size-6 text-primary" aria-hidden />
          {SITE.name}
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/account"
            aria-label="Account"
            className="inline-flex size-10 items-center justify-center rounded-md hover:bg-secondary"
          >
            <User className="size-5" aria-hidden />
          </Link>
          <CartIcon />
        </div>
      </div>

      {/* Mobile nav row */}
      <nav
        className="container flex items-center gap-6 border-t py-2 md:hidden"
        aria-label="Primary mobile"
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
