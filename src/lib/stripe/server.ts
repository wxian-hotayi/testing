import 'server-only';

import Stripe from 'stripe';
import { getServerEnv } from '@/lib/env';

let cached: Stripe | null = null;

/**
 * Lazily-constructed Stripe client. Throws a clear error if the secret key is
 * not configured, so checkout fails loudly rather than silently. apiVersion is
 * intentionally omitted to use the SDK's pinned default.
 */
export function getStripe(): Stripe {
  if (cached) return cached;
  const { STRIPE_SECRET_KEY } = getServerEnv();
  if (!STRIPE_SECRET_KEY) {
    throw new Error(
      'STRIPE_SECRET_KEY is not configured. Add it to .env.local to enable checkout.',
    );
  }
  cached = new Stripe(STRIPE_SECRET_KEY, { typescript: true });
  return cached;
}
