'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/server';
import type { UpdateTables } from '@/types/database.types';

export type ActionResult = { ok: boolean; error?: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');
  return { supabase, user };
}

// --- Profile -----------------------------------------------------------------
export async function updateProfileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const fullName = formData.get('full_name')?.toString() ?? null;
    const phone = formData.get('phone')?.toString() ?? null;
    const marketing = formData.get('marketing_opt_in') === 'on';
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, marketing_opt_in: marketing })
      .eq('id', user.id);
    if (error) throw error;
    revalidatePath('/account/profile');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

// --- Addresses ---------------------------------------------------------------
const addressSchema = z.object({
  recipient_name: z.string().min(1),
  phone: z.string().optional(),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postal_code: z.string().min(1),
  country: z.string().default('MY'),
});

export async function saveAddressAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const id = formData.get('id')?.toString() || null;
    const parsed = addressSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, error: 'Please complete all required fields.' };
    const isDefault = formData.get('is_default') === 'on';

    if (id) {
      const { error } = await supabase
        .from('addresses')
        .update({ ...parsed.data, is_default: isDefault })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('addresses')
        .insert({ ...parsed.data, is_default: isDefault, user_id: user.id });
      if (error) throw error;
    }
    revalidatePath('/account/addresses');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    revalidatePath('/account/addresses');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

// --- Subscription self-service ----------------------------------------------
async function updateOwnSubscription(
  id: string,
  patch: UpdateTables<'subscriptions'>,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from('subscriptions')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    revalidatePath('/account/subscriptions');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

export async function pauseSubscriptionAction(id: string) {
  return updateOwnSubscription(id, { status: 'paused' });
}
export async function resumeSubscriptionAction(id: string) {
  return updateOwnSubscription(id, { status: 'active' });
}
export async function skipNextAction(id: string, skip: boolean) {
  return updateOwnSubscription(id, { skip_next: skip });
}
export async function changeSubscriptionAddressAction(id: string, addressId: string) {
  return updateOwnSubscription(id, { shipping_address_id: addressId });
}

export async function cancelSubscriptionAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    // Best-effort cancel in Stripe (at period end); never block the DB update.
    if (sub?.stripe_subscription_id) {
      try {
        await getStripe().subscriptions.update(sub.stripe_subscription_id, {
          cancel_at_period_end: true,
        });
      } catch (err) {
        console.warn('[account] Stripe cancel failed:', err);
      }
    }

    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    revalidatePath('/account/subscriptions');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

// --- Wishlist ----------------------------------------------------------------
export async function toggleWishlistAction(productId: string): Promise<ActionResult & { added?: boolean }> {
  try {
    const { supabase, user } = await requireUser();
    const { data: existing } = await supabase
      .from('wishlist_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle();
    if (existing) {
      await supabase.from('wishlist_items').delete().eq('id', existing.id);
      revalidatePath('/account/wishlist');
      return { ok: true, added: false };
    }
    await supabase.from('wishlist_items').insert({ user_id: user.id, product_id: productId });
    revalidatePath('/account/wishlist');
    return { ok: true, added: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}
