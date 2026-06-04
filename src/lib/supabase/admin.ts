import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { getServerEnv } from '@/lib/env';
import type { Database } from '@/types/database.types';

/**
 * Service-role client that BYPASSES Row Level Security. Use ONLY in trusted
 * server contexts (webhooks, cron jobs, admin mutations) where you have
 * already authorized the operation. Never expose to the browser.
 */
export function createAdminClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
