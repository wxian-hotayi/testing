'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePermission } from '@/lib/rbac/actor';
import { logMembershipAudit } from '@/features/members/audit';
import { isSlugAvailable } from './queries';
import {
  slugify,
  validateSlug,
  slugErrorMessage,
  isValidStoreName,
  isValidHexColor,
} from './policy';

export type StoreActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  slug?: string;
};

/**
 * Self-serve store creation. Any authenticated user may create a store and
 * becomes its owner (a store_members row with role 'owner'). Runs via the
 * service-role client so the owner membership can be seeded atomically
 * (chicken-and-egg: the creator isn't a member yet, so RLS can't authorise it).
 */
export async function createStoreAction(
  _prev: StoreActionResult | null,
  fd: FormData,
): Promise<StoreActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Please sign in to create a store.' };

    const name = (fd.get('name')?.toString() ?? '').trim();
    const slug = slugify(fd.get('slug')?.toString() ?? '');
    const currency = (fd.get('currency')?.toString() ?? 'MYR').trim().toUpperCase();
    const primaryColor = (fd.get('primary_color')?.toString() ?? '').trim();

    if (!isValidStoreName(name)) {
      return { ok: false, error: 'Store name must be 2–80 characters.' };
    }
    const slugErr = validateSlug(slug);
    if (slugErr) return { ok: false, error: slugErrorMessage(slugErr) };
    if (primaryColor && !isValidHexColor(primaryColor)) {
      return { ok: false, error: 'Primary colour must be a hex value like #16a34a.' };
    }

    const avail = await isSlugAvailable(slug);
    if (!avail.available) {
      return { ok: false, error: 'That store address is taken — choose another.' };
    }

    const admin = createAdminClient();
    const { data: store, error } = await admin
      .from('stores')
      .insert({
        slug,
        name,
        owner_id: user.id,
        status: 'active',
        currency,
        ...(primaryColor ? { primary_color: primaryColor } : {}),
      })
      .select('id, slug')
      .single();
    if (error || !store) {
      return {
        ok: false,
        error: 'Could not create the store (the address may have just been taken).',
      };
    }

    // Creator becomes the owner.
    await admin.from('store_members').insert({
      store_id: store.id,
      user_id: user.id,
      role: 'owner',
      status: 'active',
      invited_by: user.id,
    });

    await logMembershipAudit(admin, {
      storeId: store.id,
      actorId: user.id,
      actorEmail: user.email ?? null,
      action: 'store_created',
      targetUserId: user.id,
      newValue: { slug: store.slug, role: 'owner' },
    });

    revalidatePath('/account/stores');
    return { ok: true, message: 'Store created.', slug: store.slug };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

/**
 * Update branding/settings of the CURRENT store. Slug is immutable post-creation
 * (changing the subdomain is disruptive). Gated by `store.manage`.
 */
export async function updateStoreSettingsAction(
  _prev: StoreActionResult | null,
  fd: FormData,
): Promise<StoreActionResult> {
  try {
    const { admin, actor } = await requirePermission('store.manage');
    const storeId = actor.storeId;
    if (!storeId) return { ok: false, error: 'No store resolved for this request.' };

    const name = (fd.get('name')?.toString() ?? '').trim();
    if (!isValidStoreName(name)) {
      return { ok: false, error: 'Store name must be 2–80 characters.' };
    }
    const currency = (fd.get('currency')?.toString() ?? 'MYR').trim().toUpperCase();
    const primaryColor = (fd.get('primary_color')?.toString() ?? '').trim();
    const logoUrl = (fd.get('logo_url')?.toString() ?? '').trim();
    if (primaryColor && !isValidHexColor(primaryColor)) {
      return { ok: false, error: 'Primary colour must be a hex value like #16a34a.' };
    }

    await admin
      .from('stores')
      .update({
        name,
        currency,
        primary_color: primaryColor || null,
        logo_url: logoUrl || null,
      })
      .eq('id', storeId);

    revalidatePath('/admin/store');
    return { ok: true, message: 'Store settings saved.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}
