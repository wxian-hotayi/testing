import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { CartProvider } from '@/features/cart/cart-provider';
import { CartDrawer } from '@/features/cart/components/cart-drawer';
import { EMPTY_CART } from '@/features/cart/types';
import { ExitIntentPopup } from '@/features/cro/components/exit-intent-popup';
import { RecentPurchaseToast } from '@/features/cro/components/recent-purchase-toast';

/**
 * Storefront chrome (header + footer + cart). The cart starts empty and
 * hydrates client-side via a server action, so catalog pages stay static/ISR
 * (reading cart cookies server-side here would force them all dynamic).
 */
export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider initialCart={EMPTY_CART}>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
      <CartDrawer />
      <ExitIntentPopup />
      <RecentPurchaseToast />
    </CartProvider>
  );
}
