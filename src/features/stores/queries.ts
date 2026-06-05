import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateSlug } from './policy';
import type { Tables } from '@/types/database.types';

export type MyStore = Tables<'stores'> & { myRole: string | null };

/** Stores the current user owns or is an active member of. */
export async function listMyStores(): Promise<MyStore[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data: memberships } = await admin
    .from('store_members')
    .select('store_id, role')
    .eq('user_id', user.id)
    .neq('status', 'removed');
  const roleByStore = new Map((memberships ?? []).map((m) => [m.store_id, m.role]));

  const { data: owned } = await admin.from('stores').select('id').eq('owner_id', user.id);
  const ids = [
    ...new Set([
      ...(memberships ?? []).map((m) => m.store_id),
      ...(owned ?? []).map((s) => s.id),
    ]),
  ];
  if (ids.length === 0) return [];

  const { data: stores } = await admin
    .from('stores')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: true });

  return (stores ?? []).map((s) => ({
    ...s,
    myRole: s.owner_id === user.id ? 'owner' : (roleByStore.get(s.id) ?? null),
  }));
}

/** Format + reserved + uniqueness check for a candidate slug. */
export async function isSlugAvailable(
  slug: string,
): Promise<{ available: boolean; reason?: string }> {
  const err = validateSlug(slug);
  if (err) return { available: false, reason: err };
  const admin = createAdminClient();
  const { data } = await admin
    .from('stores')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  return data ? { available: false, reason: 'taken' } : { available: true };
}
