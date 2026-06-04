import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from '@/types/database.types';

/**
 * Anonymous, COOKIELESS Supabase client for PUBLIC catalog reads (products,
 * categories, approved reviews). Because it never touches `cookies()`, pages
 * that use it can be statically generated / ISR — critical for storefront
 * performance and SEO.
 *
 * RLS applies as the `anon` role, so only public-read rows are returned. Do
 * NOT use this for user-specific data — use the cookie-bound server client
 * (`@/lib/supabase/server`) for anything that depends on the logged-in user.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
