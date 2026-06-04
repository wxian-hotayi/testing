'use server';

import { createCheckoutSession } from './checkout-service';

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Initiate Stripe Checkout and return the hosted URL to redirect to. */
export async function startCheckoutAction(): Promise<CheckoutResult> {
  try {
    const { url } = await createCheckoutSession();
    return { ok: true, url };
  } catch (err) {
    console.warn('[checkout] startCheckout failed:', err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Checkout failed. Please try again.',
    };
  }
}
