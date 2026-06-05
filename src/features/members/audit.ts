import 'server-only';

import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database.types';

type Admin = ReturnType<typeof createAdminClient>;

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export async function clientIp(): Promise<string | null> {
  try {
    const h = await headers();
    const xff = h.get('x-forwarded-for');
    if (xff) return xff.split(',')[0]?.trim() ?? null;
    return h.get('x-real-ip');
  } catch {
    return null;
  }
}

export type AuditEntry = {
  storeId: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetUserId?: string | null;
  targetEmail?: string | null;
  oldValue?: Json;
  newValue?: Json;
};

/**
 * Append a row to membership_audit. Never throws — auditing must not break the
 * action it records.
 */
export async function logMembershipAudit(admin: Admin, entry: AuditEntry): Promise<void> {
  try {
    await admin.from('membership_audit').insert({
      store_id: entry.storeId,
      actor_id: entry.actorId,
      actor_email: entry.actorEmail,
      action: entry.action,
      target_user_id: entry.targetUserId ?? null,
      target_email: entry.targetEmail ?? null,
      old_value: entry.oldValue ?? null,
      new_value: entry.newValue ?? null,
      ip_address: await clientIp(),
    });
  } catch (err) {
    console.warn('[members] audit write failed:', err);
  }
}
