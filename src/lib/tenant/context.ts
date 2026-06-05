import 'server-only';

import { cache } from 'react';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
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

// --- Storefront resolution (MT-6) -------------------------------------------
export type StorefrontResolution = 'matched' | 'default' | 'unknown' | 'unavailable';

/**
 * Resolve the store for a STOREFRONT request (strict, unlike getCurrentStore
 * which falls back for operator contexts):
 *   • subdomain/custom host matches an active store → 'matched'
 *   • root/default host → the default store → 'default'
 *   • subdomain/custom host with no matching active store → 'unknown' (→ 404)
 *   • query failed (e.g. tenancy migrations not applied yet, Supabase down) →
 *     'unavailable' — callers DEGRADE to the unscoped catalog rather than 404,
 *     so the storefront keeps working before MT-1..2 are live.
 *
 * Cached per request so the layout and pages share one resolution. Reads
 * headers() → opts the storefront into dynamic rendering.
 */
export const getStorefrontStore = cache(
  async (): Promise<{ store: Store | null; resolution: StorefrontResolution }> => {
    try {
      const h = await headers();
      const slug = h.get(STORE_SLUG_HEADER);
      const customHost = h.get(STORE_HOST_HEADER);
      const supabase = createPublicClient();

      if (customHost) {
        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .eq('custom_domain', customHost)
          .eq('status', 'active')
          .maybeSingle();
        if (error) return { store: null, resolution: 'unavailable' };
        return data
          ? { store: data, resolution: 'matched' }
          : { store: null, resolution: 'unknown' };
      }

      if (slug) {
        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .eq('slug', slug)
          .eq('status', 'active')
          .maybeSingle();
        if (error) return { store: null, resolution: 'unavailable' };
        return data
          ? { store: data, resolution: 'matched' }
          : { store: null, resolution: 'unknown' };
      }

      // Root / default tenant.
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', DEFAULT_STORE_SLUG)
        .eq('status', 'active')
        .maybeSingle();
      if (error || !data) return { store: null, resolution: 'unavailable' };
      return { store: data, resolution: 'default' };
    } catch (err) {
      // Re-throw Next's internal control-flow errors (dynamic-rendering bailout,
      // notFound, redirect) — they carry a string `digest` and MUST propagate so
      // static-generation detection works cleanly and isn't logged as a fault.
      if (err && typeof err === 'object' && typeof (err as { digest?: unknown }).digest === 'string') {
        throw err;
      }
      console.warn('[tenant] getStorefrontStore failed:', err);
      return { store: null, resolution: 'unavailable' };
    }
  },
);

/**
 * For storefront pages: 404 on a positively-unknown store, otherwise return the
 * (possibly null) store and its id. `storeId` is undefined when unresolved, so
 * catalog queries fall back to unscoped reads.
 */
export async function resolveStorefront(): Promise<{
  store: Store | null;
  storeId: string | undefined;
}> {
  const { store, resolution } = await getStorefrontStore();
  if (resolution === 'unknown') notFound();
  return { store, storeId: store?.id };
}
