import Link from 'next/link';
import Image from 'next/image';
import { Leaf, User } from 'lucide-react';
import { SITE } from '@/lib/constants';
import { CartIcon } from '@/features/cart/components/cart-icon';

const NAV = [
  { href: '/products', label: 'Shop' },
  { href: '/subscribe', label: 'Subscribe' },
  { href: '/about', label: 'About' },
];

/** Per-store branding (MT-6). Falls back to the platform defaults. */
export type StoreBranding = {
  name?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
};

/**
 * Storefront header. Shows the current store's branding (name, logo, brand
 * colour) when resolved, otherwise the platform defaults.
 */
export function SiteHeader({ store }: { store?: StoreBranding }) {
  const name = store?.name || SITE.name;
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold">
          {store?.logoUrl ? (
            <Image src={store.logoUrl} alt={name} width={24} height={24} className="size-6 rounded" />
          ) : (
            <Leaf
              className="size-6 text-primary"
              style={store?.primaryColor ? { color: store.primaryColor } : undefined}
              aria-hidden
            />
          )}
          {name}
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
