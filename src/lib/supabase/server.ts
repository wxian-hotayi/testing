import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { env } from '@/lib/env';
import type { Database } from '@/types/database.types';

// Element type for the `setAll` callback. Annotated explicitly because the
// `cookies` option is a union type, which blocks contextual inference of the
// callback parameter under `noImplicitAny`.
type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Server Supabase client bound to the request's cookies. Use in Server
 * Components, Route Handlers, and Server Actions. Respects RLS as the
 * authenticated user.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` is called from a Server Component where cookies are
            // read-only. Safe to ignore — middleware refreshes the session.
          }
        },
      },
    },
  );
}
