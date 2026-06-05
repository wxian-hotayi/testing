'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/rbac/actor';
import { getStripe } from '@/lib/stripe/server';
import { env } from '@/lib/env';

export type ConnectResult = {
  ok: boolean;
  error?: string;
  url?: string;
  chargesEnabled?: boolean;
};

const RETURN_BASE = () => `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/admin/store`;

/**
 * Start (or resume) Stripe Connect onboarding for the current store. Creates an
 * Express connected account on first call, persists its id, and returns a
 * hosted Account Link URL for the merchant to complete onboarding.
 * Gated by `store.manage`. Local-first: getStripe() throws a clear error if
 * STRIPE_SECRET_KEY isn't configured (same as checkout).
 */
export async function startStripeOnboardingAction(): Promise<ConnectResult> {
  try {
    const { admin, actor } = await requirePermission('store.manage');
    const storeId = actor.storeId;
    if (!storeId) return { ok: false, error: 'No store resolved for this request.' };

    const { data: store } = await admin
      .from('stores')
      .select('name, stripe_account_id')
      .eq('id', storeId)
      .maybeSingle();
    if (!store) return { ok: false, error: 'Store not found.' };

    const stripe = getStripe();
    let accountId = store.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: actor.email ?? undefined,
        business_profile: { name: store.name },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { store_id: storeId },
      });
      accountId = account.id;
      await admin
        .from('stores')
        .update({ stripe_account_id: accountId })
        .eq('id', storeId);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${RETURN_BASE()}?connect=refresh`,
      return_url: `${RETURN_BASE()}?connect=return`,
      type: 'account_onboarding',
    });
    return { ok: true, url: link.url };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

/**
 * Re-fetch the connected account and sync `stripe_charges_enabled`. Used after
 * the merchant returns from onboarding (the webhook `account.updated` also keeps
 * this in sync). Gated by `store.manage`.
 */
export async function refreshStripeStatusAction(): Promise<ConnectResult> {
  try {
    const { admin, actor } = await requirePermission('store.manage');
    const storeId = actor.storeId;
    if (!storeId) return { ok: false, error: 'No store resolved for this request.' };

    const { data: store } = await admin
      .from('stores')
      .select('stripe_account_id')
      .eq('id', storeId)
      .maybeSingle();
    if (!store?.stripe_account_id) {
      return { ok: false, error: 'This store is not connected to Stripe yet.' };
    }

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(store.stripe_account_id);
    const chargesEnabled = account.charges_enabled ?? false;
    await admin
      .from('stores')
      .update({ stripe_charges_enabled: chargesEnabled })
      .eq('id', storeId);

    revalidatePath('/admin/store');
    return { ok: true, chargesEnabled };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}
