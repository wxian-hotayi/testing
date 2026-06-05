import 'server-only';

import { headers } from 'next/headers';
import { createPublicClient } from '@/lib/supabase/public';
import {
  STORE_SLUG_HEADER,
  STORE_HOST_HEADER,
  DEFAULT_STORE_SLUG,
} from './resolve';
import type { Tables } from '@/types/database.types';

export type Store = Tables<'stores'>;

/**
 * Resolve the current store for this request, using the headers the middleware
 * set from the Host. Falls back to the default store (so the single-store app
 * keeps working until storefronts are fully subdomain-scoped in MT-6).
 *
 * Reading headers() opts the caller into dynamic rendering — only call this in
 * code paths that are meant to be per-store/dynamic.
 */
export async function getCurrentStore(): Promise<Store | null> {
  try {
    const h = await headers();
    const slug = h.get(STORE_SLUG_HEADER);
    const customHost = h.get(STORE_HOST_HEADER);

    const supabase = createPublicClient();
    let query = supabase.from('stores').select('*').eq('status', 'active').limit(1);
    query = customHost
      ? query.eq('custom_domain', customHost)
      : query.eq('slug', slug || DEFAULT_STORE_SLUG);

    const { data } = await query.maybeSingle();
    if (data) return data;

    // Fall back to the default store if a subdomain didn't match a store.
    const { data: fallback } = await supabase
      .from('stores')
      .select('*')
      .eq('slug', DEFAULT_STORE_SLUG)
      .maybeSingle();
    return fallback ?? null;
  } catch (err) {
    console.warn('[tenant] getCurrentStore failed:', err);
    return null;
  }
}

/** The current store id, or null. Convenience for store-scoped queries (MT-2+). */
export async function getCurrentStoreId(): Promise<string | null> {
  const store = await getCurrentStore();
  return store?.id ?? null;
}
