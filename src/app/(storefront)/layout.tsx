import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { CartProvider } from '@/features/cart/cart-provider';
import { CartDrawer } from '@/features/cart/components/cart-drawer';
import { EMPTY_CART } from '@/features/cart/types';
import { ExitIntentPopup } from '@/features/cro/components/exit-intent-popup';
import { RecentPurchaseToast } from '@/features/cro/components/recent-purchase-toast';
import { resolveStorefront } from '@/lib/tenant/context';

/**
 * Storefront chrome (header + footer + cart). Resolves the current store from
 * the Host (MT-6) to apply per-store branding and to 404 unknown subdomains.
 * Reading the tenant here makes the storefront render dynamically per store;
 * if the tenancy schema isn't live yet it degrades to the unscoped catalog.
 */
export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { store } = await resolveStorefront();
  return (
    <CartProvider initialCart={EMPTY_CART}>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader
          store={{
            name: store?.name,
            logoUrl: store?.logo_url,
            primaryColor: store?.primary_color,
          }}
        />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
      <CartDrawer />
      <ExitIntentPopup />
      <RecentPurchaseToast />
    </CartProvider>
  );
}
