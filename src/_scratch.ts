import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import type { Database } from '@/types/database.types';

type CookieToSet = { name: string; value: string; options: CookieOptions };

// (1) Helper-created client (known good).
export async function _viaHelper() {
  const s = await createClient();
  return s.from('profiles').select('role').eq('id', 'x').single();
}

// (2) Inline-created client, mirroring middleware exactly.
export async function _inline(request: NextRequest) {
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          void cookiesToSet;
        },
      },
    },
  );
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', 'x')
    .single();
  return profile;
}
