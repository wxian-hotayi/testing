'use client';

type Props = Record<string, unknown>;

declare global {
  interface Window {
    posthog?: { capture: (event: string, props?: Props) => void };
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

/** Fan a single analytics event out to PostHog, GA4, and Meta Pixel. */
export function track(event: string, props?: Props) {
  if (typeof window === 'undefined') return;
  try {
    window.posthog?.capture(event, props);
    window.gtag?.('event', event, props ?? {});
    window.fbq?.('trackCustom', event, props ?? {});
  } catch {
    /* analytics must never break the app */
  }
}

/** Standard ecommerce events for convenience. */
export const Analytics = {
  addToCart: (props?: Props) => track('add_to_cart', props),
  beginCheckout: (props?: Props) => track('begin_checkout', props),
  purchase: (props?: Props) => track('purchase', props),
  viewItem: (props?: Props) => track('view_item', props),
};
